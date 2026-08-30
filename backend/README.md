# ФУДСИ · backend

REST API социальной сети рецептов: **Go 1.27** (net/http, без фреймворков), **PostgreSQL 16** через `pgx/v5`,
JWT-токены в стиле `Authorization: Token <jwt>`.

## Структура

```
backend/
├── cmd/server/main.go            # запуск, миграции, graceful shutdown
├── internal/
│   ├── api/handlers.go           # REST-хендлеры, JWT, CORS
│   ├── models/models.go          # доменные типы и DTO
│   └── store/
│       ├── store.go              # pgx-хранилище
│       └── migrations/001_init.sql
├── docker-compose.yml            # PostgreSQL + API одной командой
├── Dockerfile
└── go.mod
```

## Быстрый старт

```bash
cd backend
docker compose up --build        # API на :8000, PostgreSQL на :5432
```

или вручную:

```bash
export FOODSY_DB="postgres://foodsy:foodsy@localhost:5432/foodsy?sslmode=disable"
export FOODSY_JWT_SECRET="change-me"
go run ./cmd/server
```

Миграции накатываются автоматически при старте.

## Эндпоинты

| Метод  | Путь                              | Описание                                  |
|--------|-----------------------------------|-------------------------------------------|
| GET    | `/api/healthz`                    | живой ли сервис                           |
| POST   | `/api/users/`                     | регистрация + токен                       |
| POST   | `/api/auth/token/login`           | вход по email/паролю                      |
| GET    | `/api/users/me`                   | текущий пользователь                      |
| GET    | `/api/recipes/?tags=&author=&is_favorited=&page=&limit=` | лента с фильтрами и пагинацией |
| GET    | `/api/recipes/{id}/`              | рецепт целиком                            |
| POST   | `/api/recipes/`                   | публикация рецепта (auth)                 |
| POST/DELETE | `/api/recipes/{id}/favorite/` | избранное (auth)                          |
| POST/DELETE | `/api/recipes/{id}/shopping_cart/` | список покупок (auth)                  |
| GET    | `/api/recipes/shopping_cart/`     | скачать список `.txt` (auth)              |
| POST/DELETE | `/api/users/{id}/subscribe/`  | подписка на автора (auth)                 |

## Подключение фронтенда

```bash
# frontend/.env.local
VITE_API_URL=http://localhost:8000
```

Без `VITE_API_URL` фронтенд работает в демо-режиме на встроенной симуляции того же контракта.
