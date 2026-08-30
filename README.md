# ФУДГРАМ — социальная сеть рецептов

Реинтерпретация [Foodgram](https://github.com/AVKharkova/foodgram) в виде моно-репозитория:

```
.
├── frontend/          # React 18 + Vite + Tailwind CSS 4 (тёмная «liquid»-тема)
│   ├── src/
│   │   ├── App.tsx           # композиция: лента, избранное, подписки, покупки
│   │   ├── data.ts           # домен: авторы, рецепты, теги, ингредиенты
│   │   ├── api.ts            # клиент API (демо-симуляция ⇄ реальный Go-бэкенд)
│   │   ├── icons.tsx         # собственные SVG-иконки
│   │   └── components/       # шапка, карточки, оверлеи
│   └── .env.example          # VITE_API_URL для подключения бэкенда
├── backend/           # Go 1.27 + PostgreSQL 16 (pgx/v5), JWT, docker-compose
│   ├── cmd/server/
│   ├── internal/api|models|store/
│   └── docker-compose.yml
└── src/App.tsx        # тонкая точка входа сборки, реэкспортирует frontend/src/App
```

## Что умеет

- **Лента рецептов** — фильтры по тегам (завтрак/обед/ужин/десерт), поиск по блюду,
  ингредиенту и повару, сортировки «новые / популярные / быстрые», пагинация.
- **Избранное** — сердечки со счётчиками, отдельная вкладка.
- **Подписки на авторов** — фильтр ленты «только подписки», карточки поваров.
- **Список покупок** — ингредиенты из выбранных рецептов складываются в единый
  список и скачиваются файлом `.txt`.
- **Рецепт дня** — детерминированная витрина, обновляется раз в сутки.
- **Демо-вход** — любой email; состояние персистится в localStorage.

## Запуск

```bash
# фронтенд (демо-режим)
npm install && npm run dev

# бэкенд
cd backend && docker compose up --build

# связать: frontend/.env.local → VITE_API_URL=http://localhost:8000
npm run dev
```

## Стек

Frontend: React 18, TypeScript, Vite 6, Tailwind CSS 4, кастомные SVG-иконки.
Backend: Go 1.27 (net/http ServeMux), PostgreSQL 16, pgx/v5, golang-jwt/v5, bcrypt, Docker.
