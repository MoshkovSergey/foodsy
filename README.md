# ФУДСИ — социальная сеть рецептов

Моно-репозиторий: весь frontend — в `frontend/`, весь backend — в `backend/`.

```
.
├── frontend/          # React 18 + Vite + Tailwind 4 (тёмная «liquid»-тема)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js # сборка в корневой dist/
│   └── src/           # App, api-клиент, данные, компоненты, иконки
├── backend/           # Go 1.27 + PostgreSQL 16 (pgx/v5), JWT, docker-compose
│   ├── cmd/server/
│   ├── internal/api|models|store/
│   └── docker-compose.yml
└── package.json       # тонкий лаунчер: npm run build → cd frontend && vite build
```

## Быстрый старт

```bash
# фронтенд (демо-режим, из корня или из frontend/)
npm install
npm run dev

# бэкенд
cd backend && docker compose up --build

# связать: frontend/.env.local → VITE_API_URL=http://localhost:8000
```

`npm run build` собирает прод-версию в `dist/` (из корня или из `frontend/` — результат одинаковый).

## Стек

Frontend: React 18, TypeScript, Vite 6, Tailwind CSS 4, кастомные SVG-иконки.
Backend: Go 1.27 (net/http ServeMux), PostgreSQL 16, pgx/v5, golang-jwt/v5, bcrypt, Docker.
