import React, { useEffect, useState } from "react";
import { Recipe, authorById, formatDate, plural, tagById } from "../data";
import { Avatar, FoodImg, SubscribeBtn } from "./Cards";
import { Steam } from "../icons";
import {
  IconBasket,
  IconBook,
  IconCheck,
  IconClock,
  IconClose,
  IconDownload,
  IconHeart,
  IconList,
  IconUsers,
} from "../icons";

export interface Toast {
  id: number;
  kind: "ok" | "info" | "warn";
  text: string;
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [onClose]);
}

/* ── Модалка рецепта ───────────────────────────────────────────────────── */
export function RecipeModal({
  recipe,
  isFav,
  inCart,
  isSub,
  onClose,
  onFav,
  onCart,
  onSub,
}: {
  recipe: Recipe;
  isFav: boolean;
  inCart: boolean;
  isSub: boolean;
  onClose: () => void;
  onFav: () => void;
  onCart: () => void;
  onSub: () => void;
}) {
  useEscape(onClose);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const author = authorById(recipe.authorId);
  const toggleIng = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="fixed inset-0 z-80 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
      <div className="fade-bg absolute inset-0 bg-coal/85 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-in relative flex flex-col w-full sm:max-w-4xl max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-line bg-panel shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
        <button
          onClick={onClose}
          className="icon-btn absolute top-4 right-4 z-20 grid place-items-center w-10 h-10 rounded-full bg-coal/70 border border-line text-mute hover:text-coral"
          aria-label="Закрыть"
        >
          <IconClose className="w-5 h-5" />
        </button>

        <div className="grid flex-1 min-h-0 md:grid-cols-[0.95fr_1.05fr] grid-rows-[auto_minmax(0,1fr)] md:grid-rows-1">
          <div className="relative h-60 md:h-auto min-h-0 bg-deep overflow-hidden">
            <FoodImg src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-coal/80 via-transparent to-transparent" />
            <Steam className="absolute bottom-16 left-1/2 -translate-x-1/2 w-14 h-14 text-ink/70" />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
              {recipe.tags.map((t) => {
                const tag = tagById(t);
                return (
                  <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coal/70 backdrop-blur-sm border border-line/70 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                    {tag.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="overflow-y-auto min-h-0 p-6 sm:p-8 hscroll">
            <p className="font-mono text-[11px] text-dim uppercase tracking-[0.2em]">
              рецепт №{String(recipe.id).padStart(3, "0")} · {formatDate(recipe.publishedAt)}
            </p>
            <h2 className="mt-2 display-xl text-2xl sm:text-3xl font-extrabold">{recipe.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-mute">{recipe.description}</p>

            <div className="mt-5 flex items-center gap-3 p-3 rounded-2xl border border-line bg-coal/40">
              <Avatar author={author} size="w-10 h-10 text-sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{author.name}</p>
                <p className="text-[11px] text-dim">автор рецепта</p>
              </div>
              <SubscribeBtn subscribed={isSub} onClick={onSub} compact />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: IconClock, label: `${recipe.time} мин`, sub: "на готовку" },
                { icon: IconUsers, label: `${recipe.servings}`, sub: "порций" },
                { icon: IconHeart, label: `${(recipe.favorites + (isFav ? 1 : 0)).toLocaleString("ru-RU")}`, sub: "в избранном" },
              ].map((m, i) => (
                <div key={i} className="rounded-xl border border-line bg-coal/40 py-3">
                  <m.icon className="w-4 h-4 mx-auto text-saffron" />
                  <p className="mt-1.5 text-sm font-extrabold tabular">{m.label}</p>
                  <p className="text-[10px] text-dim">{m.sub}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-7 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.15em] text-mute">
              <IconList className="w-4 h-4 text-leaf" /> Ингредиенты
              <span className="ml-auto text-[10px] normal-case tracking-normal text-dim font-mono">
                {checked.size}/{recipe.ingredients.length}
              </span>
            </h3>
            <ul className="mt-3 space-y-1.5">
              {recipe.ingredients.map((ing, i) => {
                const done = checked.has(i);
                return (
                  <li key={i}>
                    <button
                      onClick={() => toggleIng(i)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                        done
                          ? "border-leaf/40 bg-leaf/5 text-mute line-through"
                          : "border-line bg-coal/40 hover:border-line2 text-ink"
                      }`}
                    >
                      <span
                        className={`grid place-items-center w-5 h-5 rounded-md border shrink-0 transition-colors ${
                          done ? "bg-leaf border-leaf text-coal" : "border-line2"
                        }`}
                      >
                        {done && <IconCheck className="w-3 h-3" strokeWidth={2.6} />}
                      </span>
                      <span className="flex-1">{ing.name}</span>
                      <span className="font-mono text-xs text-mute">{ing.amount}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <h3 className="mt-7 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.15em] text-mute">
              <IconBook className="w-4 h-4 text-coral" /> Приготовление
            </h3>
            <ol className="mt-3 space-y-3">
              {recipe.steps.map((s, i) => (
                <li key={i} className="flex gap-3.5">
                  <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-linear-to-br from-coral/20 to-saffron/20 border border-coral/30 font-mono text-xs font-bold text-saffron">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-ink/90 pt-1">{s}</p>
                </li>
              ))}
            </ol>

            <div className="sticky bottom-0 mt-8 -mx-6 sm:-mx-8 px-6 sm:px-8 pt-5 pb-5 border-t border-line/50 bg-linear-to-t from-panel via-panel/95 to-transparent flex flex-wrap gap-3">
              <button
                onClick={onFav}
                className={`min-w-[min(100%,12rem)] min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-full px-3 py-3 text-center text-sm font-extrabold border transition-colors ${
                  isFav
                    ? "bg-coral/15 border-coral/60 text-coral"
                    : "border-line2 text-ink hover:border-coral/60 hover:text-coral"
                }`}
              >
                <IconHeart className="w-4.5 h-4.5" filled={isFav} />
                {isFav ? "В избранном" : "В избранное"}
              </button>
              <button
                onClick={onCart}
                className={`min-w-[min(100%,12rem)] min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-full px-3 py-3 text-center text-sm font-extrabold border transition-colors ${
                  inCart
                    ? "bg-mint/15 border-mint/60 text-mint"
                    : "border-line2 text-ink hover:border-mint/60 hover:text-mint"
                }`}
              >
                <IconBasket className="w-4.5 h-4.5" />
                {inCart ? "В списке покупок" : "В список покупок"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Drawer списка покупок ─────────────────────────────────────────────── */
export function CartDrawer({
  items,
  onClose,
  onRemove,
  onClear,
  onDownload,
}: {
  items: Recipe[];
  onClose: () => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onDownload: () => void;
}) {
  useEscape(onClose);
  const uniqueIngredients = new Set(items.flatMap((r) => r.ingredients.map((i) => i.name.toLowerCase()))).size;

  return (
    <div className="fixed inset-0 z-80" role="dialog" aria-modal="true" aria-label="Список покупок">
      <div className="fade-bg absolute inset-0 bg-coal/80 backdrop-blur-sm" onClick={onClose} />
      <aside className="drawer-in absolute right-0 top-0 h-full w-full max-w-md border-l border-line bg-panel flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-line">
          <span className="grid place-items-center w-10 h-10 rounded-full bg-mint/10 text-mint">
            <IconBasket className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-base font-extrabold">Список покупок</h2>
            <p className="text-[11px] text-dim font-mono">
              {items.length} {plural(items.length, "рецепт", "рецепта", "рецептов")} · {uniqueIngredients}{" "}
              {plural(uniqueIngredients, "позиция", "позиции", "позиций")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="icon-btn grid place-items-center w-9 h-9 rounded-full border border-line text-mute hover:text-coral"
            aria-label="Закрыть список"
          >
            <IconClose className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hscroll px-6 py-5 space-y-3">
          {items.length === 0 && (
            <div className="h-full grid place-items-center text-center">
              <div>
                <IconBasket className="w-12 h-12 mx-auto text-line2" />
                <p className="mt-4 text-sm font-bold">Пока пусто</p>
                <p className="mt-1.5 text-xs text-mute leading-relaxed max-w-55">
                  Добавляйте рецепты кнопкой «В покупки» — соберём общий список ингредиентов.
                </p>
              </div>
            </div>
          )}
          {items.map((r) => (
            <div key={r.id} className="group flex gap-3 rounded-2xl border border-line bg-coal/40 p-3 hover:border-line2 transition-colors">
              <FoodImg src={r.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug line-clamp-2">{r.title}</p>
                <p className="mt-1 text-[11px] text-dim font-mono">
                  {r.ingredients.length} {plural(r.ingredients.length, "ингредиент", "ингредиента", "ингредиентов")} · {r.time} мин
                </p>
              </div>
              <button
                onClick={() => onRemove(r.id)}
                className="icon-btn self-start grid place-items-center w-8 h-8 rounded-full text-mute hover:text-coral hover:bg-coral/10"
                aria-label={`Убрать «${r.title}» из списка`}
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line p-5 space-y-3 bg-deep/60">
            <button
              onClick={onDownload}
              className="liquid-btn w-full rounded-full py-3.5 text-sm font-extrabold text-coal"
            >
              <span className="absolute inset-0.5 rounded-full bg-mint flex items-center justify-center gap-2">
                <IconDownload className="w-4.5 h-4.5" strokeWidth={2.2} />
                Скачать список (.txt)
              </span>
            </button>
            <button
              onClick={onClear}
              className="w-full rounded-full py-2.5 text-xs font-bold text-mute hover:text-coral border border-line hover:border-coral/40 transition-colors"
            >
              Очистить список
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ── Модалка входа ─────────────────────────────────────────────────────── */
export function LoginModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (email: string, name: string) => Promise<void>;
}) {
  useEscape(onClose);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(email, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не получилось войти, попробуйте ещё раз");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fade-bg absolute inset-0 bg-coal/85 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-in relative w-full max-w-sm rounded-3xl border border-line bg-panel p-7">
        <button
          onClick={onClose}
          className="icon-btn absolute top-4 right-4 grid place-items-center w-9 h-9 rounded-full border border-line text-mute hover:text-coral"
          aria-label="Закрыть"
        >
          <IconClose className="w-4 h-4" />
        </button>

        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-saffron">POST /api/auth/token/login</p>
        <h2 className="mt-2 display-xl text-xl font-extrabold">Вход в ФУДСИ</h2>
        <p className="mt-2 text-xs text-mute leading-relaxed">
          Демо-режим: подойдёт любой email. Токен выдаёт Go-бэкенд, в браузере — симуляция.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-[11px] font-bold text-mute uppercase tracking-wider">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shef@kuhnya.ru"
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-line bg-coal/60 px-4 py-3 text-sm outline-none focus:border-saffron/60 transition-colors placeholder:text-dim"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-mute uppercase tracking-wider">Имя (необязательно)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как вас называть на кухне"
              className="mt-1.5 w-full rounded-xl border border-line bg-coal/60 px-4 py-3 text-sm outline-none focus:border-saffron/60 transition-colors placeholder:text-dim"
            />
          </label>
          {error && <p className="text-xs text-coral font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="liquid-btn w-full rounded-full py-3.5 text-sm font-extrabold text-coal disabled:opacity-60"
          >
            <span className="absolute inset-0.5 rounded-full bg-saffron grid place-items-center">
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-coal/30 border-t-coal animate-spin" />
                  Получаем токен…
                </span>
              ) : (
                "Войти и готовить"
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Тосты ─────────────────────────────────────────────────────────────── */
export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-90 space-y-2.5 max-w-[calc(100vw-2.5rem)]" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`toast-in flex items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md ${
            t.kind === "ok"
              ? "bg-leaf/10 border-leaf/40 text-leaf"
              : t.kind === "warn"
                ? "bg-coral/10 border-coral/40 text-coral"
                : "bg-saffron/10 border-saffron/40 text-saffron"
          }`}
        >
          <span
            className={`grid place-items-center w-6 h-6 rounded-full shrink-0 ${
              t.kind === "ok" ? "bg-leaf/20" : t.kind === "warn" ? "bg-coral/20" : "bg-saffron/20"
            }`}
          >
            {t.kind === "ok" ? <IconCheck className="w-3.5 h-3.5" strokeWidth={2.6} /> : <IconHeart className="w-3 h-3" filled />}
          </span>
          <span className="text-xs font-bold text-ink">{t.text}</span>
        </button>
      ))}
    </div>
  );
}
