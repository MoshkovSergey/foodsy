-- ФУДГРАМ: схема PostgreSQL
-- Применяется автоматически при старте сервера (store.Migrate).

CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT,
    username      VARCHAR(150) NOT NULL UNIQUE,
    first_name    VARCHAR(150) NOT NULL DEFAULT '',
    password_hash TEXT         NOT NULL,
    is_staff      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS tags (
    id    BIGSERIAL PRIMARY KEY,
    name  VARCHAR(64) NOT NULL UNIQUE,      -- Завтрак, Обед, Ужин, Десерт
    slug  VARCHAR(64) NOT NULL UNIQUE,      -- breakfast, lunch, dinner, dessert
    color VARCHAR(7)  NOT NULL DEFAULT '#FFFFFF'
);

CREATE TABLE IF NOT EXISTS ingredients (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recipes (
    id           BIGSERIAL PRIMARY KEY,
    author_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(256) NOT NULL,
    text         TEXT         NOT NULL,                    -- описание
    image        TEXT         NOT NULL DEFAULT '',
    cooking_time INT          NOT NULL CHECK (cooking_time > 0),  -- минуты
    servings     INT          NOT NULL DEFAULT 1,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id            BIGSERIAL PRIMARY KEY,
    recipe_id     BIGINT       NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id BIGINT       NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    amount        VARCHAR(64)  NOT NULL,
    UNIQUE (recipe_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id    BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE IF NOT EXISTS favorites (
    user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS shopping_cart (
    user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    author_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscriber_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (author_id, subscriber_id),
    CHECK (author_id <> subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_recipes_author    ON recipes (author_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created   ON recipes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fav_recipe        ON favorites (recipe_id);
CREATE INDEX IF NOT EXISTS idx_sub_subscriber    ON subscriptions (subscriber_id);

-- Справочник тегов
INSERT INTO tags (name, slug, color) VALUES
    ('Завтрак', 'breakfast', '#ffb03a'),
    ('Обед',    'lunch',     '#3ed6c3'),
    ('Ужин',    'dinner',    '#ff5d45'),
    ('Десерт',  'dessert',   '#8fe388')
ON CONFLICT (slug) DO NOTHING;
