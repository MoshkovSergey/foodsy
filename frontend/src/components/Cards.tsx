import React from "react";
import { Author, Recipe, authorById, formatDate, plural, recipesByAuthor, tagById } from "../data";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBasket,
  IconBook,
  IconClock,
  IconHeart,
  IconPlus,
  IconUsers,
} from "../icons";

/* ── Мини-аватар автора ────────────────────────────────────────────────── */
export function Avatar({ author, size = "w-8 h-8 text-[11px]" }: { author: Author; size?: string }) {
  const initials = author.name
    .split(" ")
    .map((w) => w[0])
    .join("");
  return (
    <span
      className={`grid place-items-center rounded-full font-extrabold text-coal shrink-0 ${size}`}
      style={{ background: `linear-gradient(135deg, ${author.hue}, #ffb03a)` }}
    >
      {initials}
    </span>
  );
}

/* ── Кнопка подписки ───────────────────────────────────────────────────── */
export function SubscribeBtn({
  subscribed,
  onClick,
  compact = false,
}: {
  subscribed: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`icon-btn shrink-0 inline-flex items-center gap-1.5 rounded-full font-bold transition-colors ${
        compact ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-xs"
      } ${
        subscribed
          ? "bg-leaf/10 text-leaf border border-leaf/40 hover:border-leaf"
          : "border border-line2 text-mute hover:text-saffron hover:border-saffron/60"
      }`}
    >
      {subscribed ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-leaf pulse-dot" />
          Вы подписаны
        </>
      ) : (
        <>
          <IconPlus className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
          Подписаться
        </>
      )}
    </button>
  );
}

/* ── Карточка рецепта ──────────────────────────────────────────────────── */
export function RecipeCard({
  recipe,
  isFav,
  inCart,
  isSub,
  onOpen,
  onFav,
  onCart,
  onSub,
}: {
  recipe: Recipe;
  isFav: boolean;
  inCart: boolean;
  isSub: boolean;
  onOpen: () => void;
  onFav: () => void;
  onCart: () => void;
  onSub: () => void;
}) {
  const author = authorById(recipe.authorId);
  const favCount = recipe.favorites + (isFav ? 1 : 0);

  return (
    <article
      className="rcard group relative flex flex-col h-full overflow-hidden rounded-2xl border border-line bg-panel cursor-pointer"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      aria-label={`Рецепт: ${recipe.title}`}
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-deep">
        <img
          src={recipe.image}
          alt={recipe.title}
          loading="lazy"
          className="rcard-img w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coal/70 via-transparent to-transparent" />
        <div className="rcard-sheen" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
          {recipe.tags.map((t) => {
            const tag = tagById(t);
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coal/70 backdrop-blur-sm border border-line/70 text-[10px] font-bold"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                {tag.label}
              </span>
            );
          })}
        </div>

        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coal/70 backdrop-blur-sm border border-line/70 font-mono text-[11px] font-bold text-amber2">
          <IconClock className="w-3.5 h-3.5" />
          {recipe.time} мин
        </span>

        {inCart && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mint text-coal text-[10px] font-extrabold">
            <IconBasket className="w-3.5 h-3.5" strokeWidth={2.2} />в списке покупок
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-display text-[15px] font-bold leading-snug group-hover:text-saffron transition-colors">
          {recipe.title}
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-mute line-clamp-2">{recipe.description}</p>

        <div className="mt-4 flex items-center gap-2.5">
          <Avatar author={author} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate">{author.name}</p>
            <p className="text-[10px] text-dim font-mono">{formatDate(recipe.publishedAt)}</p>
          </div>
          <SubscribeBtn subscribed={isSub} onClick={onSub} compact />
        </div>

        <div className="mt-4 pt-4 border-t border-line/70 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFav();
            }}
            className={`icon-btn inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs font-bold ${
              isFav
                ? "border-coral/50 bg-coral/10 text-coral"
                : "border-line2 text-mute hover:text-coral hover:border-coral/50"
            }`}
            aria-label={isFav ? "Убрать из избранного" : "В избранное"}
          >
            <span className={isFav ? "heart-burst" : ""}>
              <IconHeart className="w-4 h-4" filled={isFav} />
            </span>
            <span className="tabular">{favCount.toLocaleString("ru-RU")}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCart();
            }}
            className={`icon-btn inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs font-bold ${
              inCart
                ? "border-mint/50 bg-mint/10 text-mint"
                : "border-line2 text-mute hover:text-mint hover:border-mint/50"
            }`}
            aria-label={inCart ? "Убрать из списка покупок" : "В список покупок"}
          >
            <IconBasket className="w-4 h-4" />
            {inCart ? "В списке" : "В покупки"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── Скелетон загрузки ─────────────────────────────────────────────────── */
export function SkeletonCard() {
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="skeleton aspect-[3/2]" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="flex justify-between pt-3">
          <div className="skeleton h-8 w-24 rounded-full" />
          <div className="skeleton h-8 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Карточка автора (подписки) ────────────────────────────────────────── */
export function AuthorCard({
  author,
  isSub,
  onSub,
  onShowRecipes,
  onOpenRecipe,
}: {
  author: Author;
  isSub: boolean;
  onSub: () => void;
  onShowRecipes: () => void;
  onOpenRecipe: (id: number) => void;
}) {
  const recipes = recipesByAuthor(author.id);
  const totalFavs = recipes.reduce((s, r) => s + r.favorites, 0);

  return (
    <article className="rcard relative flex flex-col h-full overflow-hidden rounded-2xl border border-line bg-panel p-6">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${author.hue}, transparent)` }}
      />
      <div className="flex items-start gap-4">
        <Avatar author={author} size="w-14 h-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold">{author.name}</h3>
          <p className="mt-1 text-xs leading-relaxed text-mute line-clamp-2">{author.bio}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5 text-xs">
        <span className="flex items-center gap-1.5 text-ink font-bold">
          <IconBook className="w-4 h-4 text-saffron" />
          {recipes.length} {plural(recipes.length, "рецепт", "рецепта", "рецептов")}
        </span>
        <span className="flex items-center gap-1.5 text-mute">
          <IconHeart className="w-4 h-4 text-coral" filled />
          {totalFavs.toLocaleString("ru-RU")}
        </span>
        <span className="flex items-center gap-1.5 text-mute">
          <IconUsers className="w-4 h-4 text-mint" />
          {(isSub ? 1240 : 1239).toLocaleString("ru-RU")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {recipes.slice(0, 3).map((r) => (
          <button
            key={r.id}
            onClick={() => onOpenRecipe(r.id)}
            className="group/thumb relative aspect-[4/3] overflow-hidden rounded-lg border border-line"
            aria-label={`Открыть: ${r.title}`}
          >
            <img src={r.image} alt={r.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-110" />
            <span className="absolute inset-0 bg-coal/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity grid place-items-center">
              <IconArrowRight className="w-4 h-4 text-saffron" />
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-line/70 flex items-center justify-between gap-3">
        <SubscribeBtn subscribed={isSub} onClick={onSub} />
        <button
          onClick={onShowRecipes}
          className="text-xs font-bold text-mute hover:text-saffron transition-colors inline-flex items-center gap-1.5 group"
        >
          Рецепты
          <IconArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </article>
  );
}

/* ── Пагинация ─────────────────────────────────────────────────────────── */
export function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="icon-btn grid place-items-center w-10 h-10 rounded-full border border-line2 text-mute disabled:opacity-30 hover:text-saffron hover:border-saffron/50"
        aria-label="Предыдущая страница"
      >
        <IconArrowLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
            p === page
              ? "bg-saffron text-coal scale-110 shadow-[0_0_24px_-4px_rgba(255,176,58,0.5)]"
              : "border border-line2 text-mute hover:text-ink hover:border-line2/80"
          }`}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        className="icon-btn grid place-items-center w-10 h-10 rounded-full border border-line2 text-mute disabled:opacity-30 hover:text-saffron hover:border-saffron/50"
        aria-label="Следующая страница"
      >
        <IconArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Пустое состояние ──────────────────────────────────────────────────── */
export function EmptyState({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <svg viewBox="0 0 96 96" className="w-24 h-24" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="38" stroke="#242e42" strokeWidth="2" strokeDasharray="5 7" />
        <path d="M30 52h36v10a12 12 0 0 1-12 12H42a12 12 0 0 1-12-12V52Z" stroke="#ffb03a" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M26 52h44" stroke="#ff5d45" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M40 46c0-4 3-4.5 3-9M52 46c0-4 3-4.5 3-9" stroke="#3ed6c3" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <h3 className="mt-6 font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-mute max-w-sm leading-relaxed">{text}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 liquid-btn rounded-full px-6 py-3 text-sm font-extrabold text-coal"
        >
          <span className="absolute inset-[2px] rounded-full bg-saffron">{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
