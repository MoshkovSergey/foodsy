// Package api — HTTP-слой ФУДГРАМА: net/http ServeMux (Go 1.22+),
// JWT-аутентификация в стиле «Token <jwt>», CORS для фронтенда.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/foodgram/backend/internal/models"
	"github.com/foodgram/backend/internal/store"
)

type ctxKey string

const userIDKey ctxKey = "userID"

type Server struct {
	store     *store.Store
	jwtSecret []byte
	log       *slog.Logger
}

func NewServer(s *store.Store, jwtSecret string, log *slog.Logger) *Server {
	return &Server{store: s, jwtSecret: []byte(jwtSecret), log: log}
}

// ─── маршруты ──────────────────────────────────────────────────────────────

func (srv *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "foodgram-api"})
	})

	// auth
	mux.HandleFunc("POST /api/users/", srv.handleSignup)
	mux.HandleFunc("POST /api/auth/token/login", srv.handleLogin)
	mux.HandleFunc("POST /api/auth/token/logout", srv.withAuth(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	mux.HandleFunc("GET /api/users/me", srv.withAuth(srv.handleMe))

	// recipes
	mux.HandleFunc("GET /api/recipes/", srv.handleListRecipes)
	mux.HandleFunc("GET /api/recipes/shopping_cart/", srv.withAuth(srv.handleShoppingCartDownload))
	mux.HandleFunc("GET /api/recipes/{id}/", srv.handleGetRecipe)
	mux.HandleFunc("POST /api/recipes/", srv.withAuth(srv.handleCreateRecipe))
	mux.HandleFunc("POST /api/recipes/{id}/favorite/", srv.withAuth(srv.handleToggleFavorite))
	mux.HandleFunc("DELETE /api/recipes/{id}/favorite/", srv.withAuth(srv.handleToggleFavorite))
	mux.HandleFunc("POST /api/recipes/{id}/shopping_cart/", srv.withAuth(srv.handleToggleCart))
	mux.HandleFunc("DELETE /api/recipes/{id}/shopping_cart/", srv.withAuth(srv.handleToggleCart))

	// subscriptions
	mux.HandleFunc("POST /api/users/{id}/subscribe/", srv.withAuth(srv.handleToggleSubscribe))
	mux.HandleFunc("DELETE /api/users/{id}/subscribe/", srv.withAuth(srv.handleToggleSubscribe))

	return srv.withCORS(srv.withLogging(mux))
}

// ─── middleware ────────────────────────────────────────────────────────────

func (srv *Server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (srv *Server) withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		srv.log.Info("request",
			"method", r.Method, "path", r.URL.Path, "took", time.Since(start).String())
	})
}

// withAuth — обязательная авторизация; кладёт userID в контекст.
func (srv *Server) withAuth(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := srv.parseAuth(r)
		if !ok {
			writeErr(w, http.StatusUnauthorized, "Требуется токен авторизации")
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), userIDKey, uid)))
	}
}

// parseAuth — «Token <jwt>» или «Bearer <jwt>».
func (srv *Server) parseAuth(r *http.Request) (int64, bool) {
	h := r.Header.Get("Authorization")
	tokenStr := ""
	switch {
	case strings.HasPrefix(h, "Token "):
		tokenStr = strings.TrimPrefix(h, "Token ")
	case strings.HasPrefix(h, "Bearer "):
		tokenStr = strings.TrimPrefix(h, "Bearer ")
	}
	if tokenStr == "" {
		return 0, false
	}
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return srv.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return 0, false
	}
	sub, err := token.Claims.GetSubject()
	if err != nil {
		return 0, false
	}
	uid, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		return 0, false
	}
	return uid, true
}

func (srv *Server) issueToken(userID int64) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   strconv.FormatInt(userID, 10),
		Issuer:    "foodgram",
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(srv.jwtSecret)
}

// ─── auth handlers ─────────────────────────────────────────────────────────

func (srv *Server) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req models.SignupRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Email == "" || req.Password == "" || req.Username == "" {
		writeErr(w, http.StatusBadRequest, "email, username и password обязательны")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось создать пользователя")
		return
	}
	u, err := srv.store.CreateUser(r.Context(), req.Email, req.Username, req.Name, string(hash))
	if err != nil {
		if errors.Is(err, store.ErrAlreadyExists) {
			writeErr(w, http.StatusBadRequest, "Пользователь с таким email уже существует")
			return
		}
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	token, err := srv.issueToken(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "token")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"auth_token": token, "user": u})
}

func (srv *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	u, hash, err := srv.store.UserByEmail(r.Context(), req.Email)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		writeErr(w, http.StatusUnauthorized, "Неверный email или пароль")
		return
	}
	token, err := srv.issueToken(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "token")
		return
	}
	writeJSON(w, http.StatusOK, models.TokenResponse{AuthToken: token})
}

func (srv *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	u, err := srv.store.UserByID(r.Context(), r.Context().Value(userIDKey).(int64))
	if err != nil {
		writeErr(w, http.StatusNotFound, "пользователь не найден")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// ─── recipe handlers ───────────────────────────────────────────────────────

func (srv *Server) handleListRecipes(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := models.RecipeFilter{
		Tags:        splitNonEmpty(q["tags"], ","),
		IsFavorited: q.Get("is_favorited") == "true",
		Page:        atoiOr(q.Get("page"), 1),
		Limit:       atoiOr(q.Get("limit"), 6),
	}
	if a := q.Get("author"); a != "" {
		id, err := strconv.ParseInt(a, 10, 64)
		if err == nil {
			filter.Author = &id
		}
	}
	viewerID, _ := srv.parseAuth(r) // анонимы тоже читают ленту

	page, _, err := srv.store.ListRecipes(r.Context(), filter, viewerID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if page.Results == nil {
		page.Results = []models.RecipeOut{}
	}
	writeJSON(w, http.StatusOK, page)
}

func (srv *Server) handleGetRecipe(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "некорректный id рецепта")
		return
	}
	viewerID, _ := srv.parseAuth(r)
	rec, err := srv.store.RecipeByID(r.Context(), id, viewerID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeErr(w, http.StatusNotFound, "Рецепт не найден")
			return
		}
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, rec)
}

func (srv *Server) handleCreateRecipe(w http.ResponseWriter, r *http.Request) {
	var req models.RecipeCreateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Name == "" || req.CookingTime <= 0 || len(req.Ingredients) == 0 {
		writeErr(w, http.StatusBadRequest, "Название, время готовки и ингредиенты обязательны")
		return
	}
	uid := r.Context().Value(userIDKey).(int64)
	rec, err := srv.store.CreateRecipe(r.Context(), uid, req)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, rec)
}

func (srv *Server) handleToggleFavorite(w http.ResponseWriter, r *http.Request) {
	srv.toggleRecipeLink(w, r, srv.store.ToggleFavorite, "избранном")
}

func (srv *Server) handleToggleCart(w http.ResponseWriter, r *http.Request) {
	srv.toggleRecipeLink(w, r, srv.store.ToggleCart, "списке покупок")
}

func (srv *Server) toggleRecipeLink(
	w http.ResponseWriter,
	r *http.Request,
	fn func(ctx context.Context, userID, recipeID int64) (bool, error),
	where string,
) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "некорректный id рецепта")
		return
	}
	uid := r.Context().Value(userIDKey).(int64)
	added, err := fn(r.Context(), uid, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	status := http.StatusCreated
	msg := fmt.Sprintf("Рецепт добавлен в %s", where)
	if !added {
		status = http.StatusNoContent
		msg = fmt.Sprintf("Рецепт убран из %s", where)
	}
	if status == http.StatusNoContent {
		w.WriteHeader(status)
		return
	}
	writeJSON(w, status, map[string]string{"detail": msg})
}

func (srv *Server) handleShoppingCartDownload(w http.ResponseWriter, r *http.Request) {
	uid := r.Context().Value(userIDKey).(int64)
	text, at, err := srv.store.ShoppingCart(r.Context(), uid)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="foodgram-shopping-list.txt"`)
	http.ServeContent(w, r, "foodgram-shopping-list.txt", at, strings.NewReader(text))
}

// ─── subscription handlers ─────────────────────────────────────────────────

func (srv *Server) handleToggleSubscribe(w http.ResponseWriter, r *http.Request) {
	authorID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "некорректный id автора")
		return
	}
	uid := r.Context().Value(userIDKey).(int64)
	added, err := srv.store.ToggleSubscription(r.Context(), authorID, uid)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if !added {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"detail": "Подписка оформлена"})
}

// ─── helpers ───────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"detail": msg})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(dst); err != nil {
		writeErr(w, http.StatusBadRequest, "Некорректный JSON в теле запроса")
		return false
	}
	return true
}

func atoiOr(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 {
		return def
	}
	return n
}

// splitNonEmpty разбирает повторяющиеся и comma-separated параметры.
func splitNonEmpty(vals []string, sep string) []string {
	var out []string
	for _, v := range vals {
		for _, part := range strings.Split(v, sep) {
			if p := strings.TrimSpace(part); p != "" {
				out = append(out, p)
			}
		}
	}
	return out
}
