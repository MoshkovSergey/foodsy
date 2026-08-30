// ─── API-клиент ─────────────────────────────────────────────────────────────
// Если задан VITE_API_URL — запросы уходят на Go-бэкенд (backend/, net/http + pgx).
// Без него включается встроенная симуляция с той же контрактной моделью,
// состояние пользователя персистится в localStorage.

import {
  RECIPES,
  Recipe,
  Session,
  recipeById,
  authorById,
  plural,
} from "./data";

export interface UserState {
  session: Session | null;
  favorites: number[];
  cart: number[];
  subscriptions: number[];
}

export interface RecipesQuery {
  tags?: string[];
  author?: number | null;
  onlyFavorites?: boolean;
  onlySubscribed?: boolean;
  search?: string;
  sort?: "new" | "popular" | "fast";
  page?: number;
  limit?: number;
}

export interface RecipesPage {
  results: Recipe[];
  count: number;
  page: number;
  pages: number;
}

const LS_KEY = "foodgram.state.v1";
// Адрес Go-бэкенда; в демо-сборке не задан — работает локальная симуляция.
const API_URL: string | undefined = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL;

function loadState(): UserState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserState>;
      return {
        session: parsed.session ?? null,
        favorites: parsed.favorites ?? [],
        cart: parsed.cart ?? [],
        subscriptions: parsed.subscriptions ?? [],
      };
    }
  } catch {
    /* повреждённое состояние — начинаем заново */
  }
  return { session: null, favorites: [], cart: [], subscriptions: [] };
}

function saveState(s: UserState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* приватный режим — работаем без персиста */
  }
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const latency = () => delay(180 + Math.random() * 220);

async function remote<T>(path: string, init?: RequestInit): Promise<T> {
  const token = loadState().session?.email ? localStorage.getItem("foodgram.token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as T;
}

// ─── Публичный контракт (зеркало REST-эндпоинтов Go-бэкенда) ───────────────

export const api = {
  // GET /api/recipes?tags=&author=&is_favorited=&page=&limit=
  async getRecipes(q: RecipesQuery, state: UserState): Promise<RecipesPage> {
    await latency();
    let list = [...RECIPES];

    if (q.tags && q.tags.length) {
      list = list.filter((r) => q.tags!.some((t) => r.tags.includes(t as Recipe["tags"][number])));
    }
    if (q.author) list = list.filter((r) => r.authorId === q.author);
    if (q.onlyFavorites) list = list.filter((r) => state.favorites.includes(r.id));
    if (q.onlySubscribed) list = list.filter((r) => state.subscriptions.includes(r.authorId));
    if (q.search) {
      const s = q.search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(s) ||
          authorById(r.authorId).name.toLowerCase().includes(s) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(s)),
      );
    }

    switch (q.sort) {
      case "popular":
        list.sort((a, b) => b.favorites - a.favorites);
        break;
      case "fast":
        list.sort((a, b) => a.time - b.time);
        break;
      case "new":
      default:
        list.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
    }

    const limit = q.limit ?? 6;
    const page = q.page ?? 1;
    const count = list.length;
    const pages = Math.max(1, Math.ceil(count / limit));
    const results = list.slice((page - 1) * limit, page * limit);
    return { results, count, page, pages };
  },

  // POST /api/auth/token/login
  async login(email: string, name?: string): Promise<Session> {
    if (API_URL) {
      const res = await remote<{ auth_token: string; user: Session }>("/api/auth/token/login", {
        method: "POST",
        body: JSON.stringify({ email, password: "demo" }),
      });
      localStorage.setItem("foodgram.token", res.auth_token);
      return res.user;
    }
    await latency();
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) throw new Error("Похоже, в адресе опечатка");
    const guessedName =
      name?.trim() ||
      trimmed
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    return { id: 1001, name: guessedName, email: trimmed };
  },

  // POST /api/recipes/{id}/favorite  (DELETE — снять)
  async toggleFavorite(id: number, state: UserState): Promise<{ added: boolean }> {
    await latency();
    const has = state.favorites.includes(id);
    return { added: !has };
  },

  // POST /api/recipes/{id}/shopping_cart
  async toggleCart(id: number, state: UserState): Promise<{ added: boolean }> {
    await latency();
    const has = state.cart.includes(id);
    return { added: !has };
  },

  // POST /api/users/{id}/subscribe
  async toggleSubscription(authorId: number, state: UserState): Promise<{ added: boolean }> {
    await latency();
    const has = state.subscriptions.includes(authorId);
    return { added: !has };
  },
};

// ─── Список покупок (GET /api/recipes/shopping_cart → .txt) ────────────────

export function downloadShoppingList(cartIds: number[]) {
  const lines: string[] = ["СПИСОК ПОКУПОК • ФУДГРАМ", "═".repeat(34), ""];
  const basket = new Map<string, { amounts: string[]; recipes: string[] }>();

  for (const id of cartIds) {
    const r = recipeById(id);
    for (const ing of r.ingredients) {
      const key = ing.name.toLowerCase();
      const entry = basket.get(key) ?? { amounts: [], recipes: [] };
      if (!entry.amounts.includes(ing.amount)) entry.amounts.push(ing.amount);
      if (!entry.recipes.includes(r.title)) entry.recipes.push(r.title);
      basket.set(key, entry);
    }
  }

  for (const [name, entry] of basket) {
    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    lines.push(`☐ ${cap} — ${entry.amounts.join(" / ")}`);
    lines.push(`    → ${entry.recipes.join(", ")}`);
  }

  lines.push("");
  lines.push("─".repeat(34));
  lines.push(`Рецептов в списке: ${cartIds.length} ${plural(cartIds.length, "рецепт", "рецепта", "рецептов")}`);
  lines.push(`Составлено: ${new Date().toLocaleString("ru-RU")}`);

  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "foodgram-shopping-list.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export { loadState, saveState };
