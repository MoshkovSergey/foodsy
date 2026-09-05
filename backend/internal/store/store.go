// Package store — доступ к PostgreSQL через pgx/v5.
package store

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/MoshkovSergey/foodsy/backend/internal/models"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

var (
	ErrNotFound      = errors.New("not found")
	ErrAlreadyExists = errors.New("already exists")
)

type Store struct {
	pool *pgxpool.Pool
}

func New(ctx context.Context, dsn string) (*Store, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse dsn: %w", err)
	}
	cfg.MaxConns = 16
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("new pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() { s.pool.Close() }

// Migrate накатывает все .sql-файлы из migrations/ по порядку.
func (s *Store) Migrate(ctx context.Context) error {
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return err
	}
	var names []string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	for _, name := range names {
		sql, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		if _, err := s.pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("apply %s: %w", name, err)
		}
	}
	return nil
}

// ─── Пользователи ──────────────────────────────────────────────────────────

func (s *Store) CreateUser(ctx context.Context, email, username, firstName, passHash string) (models.User, error) {
	var u models.User
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (email, username, first_name, password_hash)
		VALUES (lower($1), $2, $3, $4)
		RETURNING id, email, username, first_name, is_staff`,
		email, username, firstName, passHash,
	).Scan(&u.ID, &u.Email, &u.Username, &u.FirstName, &u.IsStaff)
	if err != nil {
		if isUniqueViolation(err) {
			return u, ErrAlreadyExists
		}
		return u, err
	}
	return u, nil
}

func (s *Store) UserByEmail(ctx context.Context, email string) (models.User, string, error) {
	var u models.User
	var hash string
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, username, first_name, is_staff, password_hash
		FROM users WHERE email = lower($1)`, email,
	).Scan(&u.ID, &u.Email, &u.Username, &u.FirstName, &u.IsStaff, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return u, "", ErrNotFound
	}
	return u, hash, err
}

func (s *Store) UserByID(ctx context.Context, id int64) (models.User, error) {
	var u models.User
	err := s.pool.QueryRow(ctx, `
		SELECT id, email, username, first_name, is_staff FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.Username, &u.FirstName, &u.IsStaff)
	if errors.Is(err, pgx.ErrNoRows) {
		return u, ErrNotFound
	}
	return u, err
}

func (s *Store) SubscriptionCount(ctx context.Context, authorID int64) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, `SELECT count(*) FROM subscriptions WHERE author_id = $1`, authorID).Scan(&n)
	return n, err
}

// ─── Рецепты ───────────────────────────────────────────────────────────────

const recipeBaseCols = `r.id, r.name, r.text, r.image, r.cooking_time, r.servings, r.created_at,
	a.id, a.email, a.username, a.first_name, a.is_staff,
	COALESCE((SELECT count(*) FROM favorites f WHERE f.recipe_id = r.id), 0)`

func (s *Store) CreateRecipe(ctx context.Context, authorID int64, req models.RecipeCreateRequest) (models.RecipeOut, error) {
	var out models.RecipeOut
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `
		INSERT INTO recipes (author_id, name, text, image, cooking_time, servings)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		authorID, req.Name, req.Text, req.Image, req.CookingTime, req.Servings,
	).Scan(&out.ID)
	if err != nil {
		return out, err
	}

	for _, tagSlug := range req.Tags {
		if _, err := tx.Exec(ctx, `
			INSERT INTO recipe_tags (recipe_id, tag_id)
			SELECT $1, id FROM tags WHERE slug = $2`, out.ID, tagSlug); err != nil {
			return out, err
		}
	}

	for _, ing := range req.Ingredients {
		id := ing.ID
		if id == 0 {
			err := tx.QueryRow(ctx, `
				INSERT INTO ingredients (name) VALUES (lower($1))
				ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
				RETURNING id`, ing.Name).Scan(&id)
			if err != nil {
				return out, err
			}
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount)
			VALUES ($1, $2, $3)`, out.ID, id, ing.Amount); err != nil {
			return out, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return out, err
	}
	return s.RecipeByID(ctx, out.ID, authorID)
}

func (s *Store) RecipeByID(ctx context.Context, id, viewerID int64) (models.RecipeOut, error) {
	var r models.RecipeOut
	query := `
		SELECT ` + recipeBaseCols + `
		FROM recipes r JOIN users a ON a.id = r.author_id
		WHERE r.id = $1`
	err := s.scanRecipe(s.pool.QueryRow(ctx, query, id), &r)
	if errors.Is(err, pgx.ErrNoRows) {
		return r, ErrNotFound
	}
	if err != nil {
		return r, err
	}
	if err := s.enrichRecipes(ctx, []models.RecipeOut{r}, viewerID); err != nil {
		return r, err
	}
	return r, nil
}

// ListRecipes — лента с фильтрами и пагинацией. viewerID = 0 для анонимов.
func (s *Store) ListRecipes(ctx context.Context, f models.RecipeFilter, viewerID int64) (models.Paginated[models.RecipeOut], int64, error) {
	var (
		page  models.Paginated[models.RecipeOut]
		args  []any
		conds []string
		total int64
	)
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 || f.Limit > 100 {
		f.Limit = 6
	}

	if len(f.Tags) > 0 {
		args = append(args, f.Tags)
		conds = append(conds, fmt.Sprintf(`
			EXISTS (SELECT 1 FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
			        WHERE rt.recipe_id = r.id AND t.slug = ANY($%d))`, len(args)))
	}
	if f.Author != nil {
		args = append(args, *f.Author)
		conds = append(conds, fmt.Sprintf(`r.author_id = $%d`, len(args)))
	}
	if f.IsFavorited && viewerID > 0 {
		conds = append(conds, fmt.Sprintf(`
			EXISTS (SELECT 1 FROM favorites fav WHERE fav.recipe_id = r.id AND fav.user_id = $%d)`,
			func() int { args = append(args, viewerID); return len(args) }()))
	}

	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	countQ := `SELECT count(*) FROM recipes r` + where
	if err := s.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return page, 0, err
	}

	args = append(args, f.Limit, (f.Page-1)*f.Limit)
	dataQ := `
		SELECT ` + recipeBaseCols + `
		FROM recipes r JOIN users a ON a.id = r.author_id` + where + `
		ORDER BY r.created_at DESC
		LIMIT $` + fmt.Sprint(len(args)-1) + ` OFFSET $` + fmt.Sprint(len(args))

	rows, err := s.pool.Query(ctx, dataQ, args...)
	if err != nil {
		return page, 0, err
	}
	defer rows.Close()

	var recipes []models.RecipeOut
	for rows.Next() {
		var r models.RecipeOut
		if err := s.scanRecipe(rows, &r); err != nil {
			return page, 0, err
		}
		recipes = append(recipes, r)
	}
	if err := rows.Err(); err != nil {
		return page, 0, err
	}
	if err := s.enrichRecipes(ctx, recipes, viewerID); err != nil {
		return page, 0, err
	}

	page.Results = recipes
	page.Count = int(total)
	return page, total, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func (s *Store) scanRecipe(row rowScanner, r *models.RecipeOut) error {
	return row.Scan(
		&r.ID, &r.Name, &r.Text, &r.Image, &r.CookingTime, &r.Servings, &r.CreatedAt,
		&r.Author.ID, &r.Author.Email, &r.Author.Username, &r.Author.FirstName, &r.Author.IsStaff,
		&r.Favorites,
	)
}

// enrichRecipes догружает теги, ингредиенты и пользовательские флаги одним батчем.
func (s *Store) enrichRecipes(ctx context.Context, recipes []models.RecipeOut, viewerID int64) error {
	if len(recipes) == 0 {
		return nil
	}
	byID := make(map[int64]int, len(recipes))
	ids := make([]int64, len(recipes))
	for i, r := range recipes {
		ids[i] = r.ID
		byID[r.ID] = i
		recipes[i].Tags = []models.Tag{}
		recipes[i].Ingredients = []models.RecipeIngredientOut{}
	}

	tagRows, err := s.pool.Query(ctx, `
		SELECT rt.recipe_id, t.id, t.name, t.slug, t.color
		FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
		WHERE rt.recipe_id = ANY($1)`, ids)
	if err != nil {
		return err
	}
	defer tagRows.Close()
	for tagRows.Next() {
		var rid int64
		var t models.Tag
		if err := tagRows.Scan(&rid, &t.ID, &t.Name, &t.Slug, &t.Color); err != nil {
			return err
		}
		if i, ok := byID[rid]; ok {
			recipes[i].Tags = append(recipes[i].Tags, t)
		}
	}

	ingRows, err := s.pool.Query(ctx, `
		SELECT ri.recipe_id, i.id, i.name, ri.amount
		FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
		WHERE ri.recipe_id = ANY($1)
		ORDER BY ri.id`, ids)
	if err != nil {
		return err
	}
	defer ingRows.Close()
	for ingRows.Next() {
		var rid int64
		var ing models.RecipeIngredientOut
		if err := ingRows.Scan(&rid, &ing.ID, &ing.Name, &ing.Amount); err != nil {
			return err
		}
		if i, ok := byID[rid]; ok {
			recipes[i].Ingredients = append(recipes[i].Ingredients, ing)
		}
	}

	if viewerID > 0 {
		flagRows, err := s.pool.Query(ctx, `
			SELECT recipe_id, true FROM favorites WHERE user_id = $1 AND recipe_id = ANY($2)
			UNION ALL
			SELECT recipe_id, false FROM shopping_cart WHERE user_id = $1 AND recipe_id = ANY($2)`,
			viewerID, ids)
		if err != nil {
			return err
		}
		defer flagRows.Close()
		for flagRows.Next() {
			var rid int64
			var isFav bool
			if err := flagRows.Scan(&rid, &isFav); err != nil {
				return err
			}
			if i, ok := byID[rid]; ok {
				if isFav {
					recipes[i].IsFavorited = true
				} else {
					recipes[i].IsInCart = true
				}
			}
		}
	}
	return nil
}

// Toggle-операции: возвращают true, если запись добавлена.
func (s *Store) toggle(ctx context.Context, table string, userID, recipeID int64) (bool, error) {
	res, err := s.pool.Exec(ctx, fmt.Sprintf(`DELETE FROM %s WHERE user_id = $1 AND recipe_id = $2`, table), userID, recipeID)
	if err != nil {
		return false, err
	}
	if res.RowsAffected() > 0 {
		return false, nil
	}
	_, err = s.pool.Exec(ctx, fmt.Sprintf(`INSERT INTO %s (user_id, recipe_id) VALUES ($1, $2)`, table), userID, recipeID)
	return true, err
}

func (s *Store) ToggleFavorite(ctx context.Context, userID, recipeID int64) (bool, error) {
	return s.toggle(ctx, "favorites", userID, recipeID)
}

func (s *Store) ToggleCart(ctx context.Context, userID, recipeID int64) (bool, error) {
	return s.toggle(ctx, "shopping_cart", userID, recipeID)
}

func (s *Store) ToggleSubscription(ctx context.Context, authorID, subscriberID int64) (bool, error) {
	if authorID == subscriberID {
		return false, errors.New("cannot subscribe to yourself")
	}
	res, err := s.pool.Exec(ctx,
		`DELETE FROM subscriptions WHERE author_id = $1 AND subscriber_id = $2`, authorID, subscriberID)
	if err != nil {
		return false, err
	}
	if res.RowsAffected() > 0 {
		return false, nil
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO subscriptions (author_id, subscriber_id) VALUES ($1, $2)`, authorID, subscriberID)
	return true, err
}

// ShoppingCart — агрегированный список покупок для скачивания.
func (s *Store) ShoppingCart(ctx context.Context, userID int64) (string, time.Time, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT r.name, i.name, ri.amount
		FROM shopping_cart sc
		JOIN recipes r ON r.id = sc.recipe_id
		JOIN recipe_ingredients ri ON ri.recipe_id = r.id
		JOIN ingredients i ON i.id = ri.ingredient_id
		WHERE sc.user_id = $1
		ORDER BY r.id, ri.id`, userID)
	if err != nil {
		return "", time.Time{}, err
	}
	defer rows.Close()

	type entry struct{ amounts, recipes []string }
	agg := map[string]*entry{}
	var order []string
	recipeCount := map[string]bool{}

	for rows.Next() {
		var recipeName, ingName, amount string
		if err := rows.Scan(&recipeName, &ingName, &amount); err != nil {
			return "", time.Time{}, err
		}
		key := strings.ToLower(ingName)
		e, ok := agg[key]
		if !ok {
			e = &entry{}
			agg[key] = e
			order = append(order, key)
		}
		if !contains(e.amounts, amount) {
			e.amounts = append(e.amounts, amount)
		}
		if !contains(e.recipes, recipeName) {
			e.recipes = append(e.recipes, recipeName)
		}
		recipeCount[recipeName] = true
	}

	var b strings.Builder
	b.WriteString("СПИСОК ПОКУПОК • ФУДСИ\n")
	b.WriteString(strings.Repeat("═", 34) + "\n\n")
	for _, key := range order {
		e := agg[key]
		name := strings.ToUpper(key[:1]) + key[1:]
		fmt.Fprintf(&b, "☐ %s — %s\n    → %s\n", name, strings.Join(e.amounts, " / "), strings.Join(e.recipes, ", "))
	}
	fmt.Fprintf(&b, "\nРецептов в списке: %d\nСоставлено: %s\n",
		len(recipeCount), time.Now().Format("02.01.2006 15:04"))
	return b.String(), time.Now(), nil
}

func contains(ss []string, s string) bool {
	for _, v := range ss {
		if v == s {
			return true
		}
	}
	return false
}

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "SQLSTATE 23505")
}
