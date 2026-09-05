# ФУДСИ — социальная сеть рецептов

Моно-репозиторий: весь frontend — в `frontend/`, весь backend — в `backend/`.

```.
├── frontend/              # React 18 + Vite + Tailwind 4 (тёмная «liquid»-тема)
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js     # сборка в корневой dist/
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/               # App, api-клиент, данные, компоненты, иконки
├── backend/               # Go 1.27 + PostgreSQL 16 (pgx/v5), JWT, docker-compose
│   ├── cmd/server/
│   ├── internal/api|models|store/
│   └── docker-compose.yml
└── package.json           # тонкий лаунчер: npm run build → cd frontend && vite build
```

## Быстрый старт

```bash
# фронтенд (демо-режим)
cd frontend
npm install
npm run dev                 # http://localhost:3000

# бэкенд
cd backend && docker compose up --build   # API на :8000, PostgreSQL на :5432
```

`npm run build` собирает прод-версию в корневой `dist/` — из корня моно-репо
(`npm run build`) или из `frontend/` — результат одинаковый.

## Frontend

React 18 + TypeScript + Vite 6 + Tailwind CSS 4, тёмная «liquid»-тема
(шрифты Unbounded / Manrope / JetBrains Mono).

```frontend/
├── index.html              # входная страница, шрифты, favicon
├── vite.config.js          # сборка в ../dist (корень моно-репо)
├── tsconfig.json
├── .env.example            # VITE_API_URL — адрес Go-бэкенда
└── src/
    ├── main.tsx            # монтирование React
    ├── App.tsx             # композиция: лента, избранное, подписки, покупки
    ├── data.ts             # домен: авторы, рецепты, теги, ингредиенты
    ├── api.ts              # клиент API (демо-симуляция ⇄ реальный бэкенд)
    ├── icons.tsx           # собственные SVG-иконки
    └── components/         # шапка/подвал, карточки, оверлеи
```

Запуск из `frontend/`:

```bash
npm install                 # разрешит дерево зависимостей и дополнит package-lock.json
npm run dev                 # http://localhost:3000
npm run build               # прод-сборка в ../dist
```

> `package-lock.json` лежит в репозитории как стартовый (корневая запись,
> lockfileVersion 3): при первом `npm install` npm сам допишет полное дерево
> транзитивных зависимостей с integrity-хешами.

Из корня моно-репо тоже работает: `npm run dev` / `npm run build`
(корневой package.json делегирует команды сюда).

### Возможности

- **Лента** — фильтры по тегам (завтрак/обед/ужин/десерт), поиск по блюду,
  ингредиенту и повару, сортировки «новые / популярные / быстрые», пагинация.
- **Избранное** — сердечки со счётчиками, отдельная вкладка.
- **Подписки** — карточки поваров, фильтр ленты «только подписки».
- **Список покупок** — ингредиенты из выбранных рецептов агрегируются
  и скачиваются файлом `.txt`.
- **Рецепт дня** — витрина, обновляется раз в сутки.
- Демо-вход (любой email), состояние персистится в localStorage.

## Backend

REST API: Go 1.27 (net/http ServeMux, без фреймворков), PostgreSQL 16 через
`pgx/v5`, JWT-токены (`Authorization: Token <jwt>`), автомиграции при старте.

```bash
cd backend
docker compose up --build
```

Или вручную (PostgreSQL уже поднят):

```bash
export FOODSY_DB="postgres://foodsy:foodsy@localhost:5432/foodsy?sslmode=disable"
export FOODSY_JWT_SECRET="change-me"
go run ./cmd/server         # :8000
```

Подробнее об эндпоинтах — в `backend/README.md`.

## Подключение frontend к backend

```bash
cd frontend
cp .env.example .env.local  # VITE_API_URL=http://localhost:8000
npm run dev
```

Без `VITE_API_URL` приложение работает в демо-режиме на встроенной симуляции
того же REST-контракта, что реализует `backend/`.

Для production с одним доменом используйте same-origin API:

```bash
cp .env.production.example .env.production
npm run build
```

В `.env.production` должно быть:

```env
VITE_API_URL=/api
```

Готовая конфигурация Nginx находится в `deploy/nginx/foodsy.conf`. Она отдаёт
статический frontend и проксирует `/api/` на Go API, работающий на
`127.0.0.1:8000`.

## Стек

- **Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS 4, кастомные SVG-иконки.
- **Backend:** Go 1.27 (net/http ServeMux), PostgreSQL 16, pgx/v5, golang-jwt/v5, bcrypt, Docker.
