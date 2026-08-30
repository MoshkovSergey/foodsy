// Package models — доменные типы и DTO API ФУДСИ.
package models

import "time"

type User struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	FirstName string    `json:"first_name"`
	IsStaff   bool      `json:"is_staff"`
	CreatedAt time.Time `json:"-"`
}

type Tag struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Color string `json:"color"`
}

type Ingredient struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// RecipeIn — ингредиенты при создании рецепта.
type RecipeIngredientIn struct {
	ID     int64  `json:"id"`     // id ингредиента из справочника
	Name   string `json:"name"`   // либо новый ингредиент
	Amount string `json:"amount"`
}

type RecipeOut struct {
	ID           int64                  `json:"id"`
	Name         string                 `json:"name"`
	Text         string                 `json:"text"`
	Image        string                 `json:"image"`
	CookingTime  int                    `json:"cooking_time"`
	Servings     int                    `json:"servings"`
	Tags         []Tag                  `json:"tags"`
	Author       User                   `json:"author"`
	Ingredients  []RecipeIngredientOut  `json:"ingredients"`
	IsFavorited  bool                   `json:"is_favorited"`
	IsInCart     bool                   `json:"is_in_shopping_cart"`
	Favorites    int                    `json:"favorites"`
	CreatedAt    time.Time              `json:"pub_date"`
}

type RecipeIngredientOut struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Amount string `json:"amount"`
}

// Запросы

type SignupRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Name     string `json:"first_name"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type TokenResponse struct {
	AuthToken string `json:"auth_token"`
}

type RecipeCreateRequest struct {
	Name         string                 `json:"name"`
	Text         string                 `json:"text"`
	Image        string                 `json:"image"`
	CookingTime  int                    `json:"cooking_time"`
	Servings     int                    `json:"servings"`
	Tags         []string               `json:"tags"` // слагi тегов
	Ingredients  []RecipeIngredientIn   `json:"ingredients"`
}

// Paginated — формат DRF-подобной пагинации, который ждёт фронтенд.
type Paginated[T any] struct {
	Count   int    `json:"count"`
	Next    *string `json:"next"`
	Previous *string `json:"previous"`
	Results []T    `json:"results"`
}

// RecipeFilter — параметры GET /api/recipes/
type RecipeFilter struct {
	Tags        []string
	Author      *int64
	IsFavorited bool
	Page        int
	Limit       int
}
