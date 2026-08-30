import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUTHORS,
  RECIPES,
  TAGS,
  Recipe,
  Session,
  authorById,
  plural,
  recipeById,
  tagById,
} from "./data";
import { RecipesPage, api, downloadShoppingList, loadState, saveState } from "./api";
import { Counter, Footer, LiquidHeader, Reveal, Scramble, Ticker, View, prefersReduced } from "./components/Chrome";
import { AuthorCard, EmptyState, Pagination, RecipeCard, SkeletonCard, SubscribeBtn } from "./components/Cards";
import { CartDrawer, LoginModal, RecipeModal, Toast, Toasts } from "./components/Overlays";
import {
  IconArrowRight,
  IconBasket,
  IconChef,
  IconClose,
  IconFilter,
  IconFlame,
  IconHeart,
  IconSearch,
  IconSpark,
  IconUsers,
  Steam,
} from "./icons";

type Sort = "new" | "popular" | "fast";

export default function App() {
  /* ── состояние ── */
  const [view, setView] = useState<View>("feed");
  const [user, setUser] = useState(() => loadState());
  const [tags, setTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [onlySubs, setOnlySubs] = useState(false);
  const [authorFilter, setAuthorFilter] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RecipesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pending = useRef<(() => void) | null>(null);
  const fetchSeq = useRef(0);
  const toastId = useRef(0);

  const persist = (next: typeof user) => {
    setUser(next);
    saveState(next);
  };

  const toast = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  /* ── загрузка ленты ── */
  useEffect(() => {
    if (view === "subs") {
      setLoading(false);
      return;
    }
    const seq = ++fetchSeq.current;
    setLoading(true);
    api
      .getRecipes(
        {
          tags,
          author: authorFilter,
          onlyFavorites: view === "favs",
          onlySubscribed: onlySubs,
          search: query,
          sort,
          page,
          limit: 6,
        },
        user,
      )
      .then((res) => {
        if (seq !== fetchSeq.current) return;
        setData(res);
        setLoading(false);
      });
  }, [view, tags, authorFilter, onlySubs, query, sort, page, user]);

  const resetPage = () => setPage(1);

  /* ── действия (с гейтом авторизации) ── */
  const requireAuth = (action: () => void) => {
    if (user.session) {
      action();
    } else {
      pending.current = action;
      setLoginOpen(true);
      toast("info", "Сначала войдите — это быстро");
    }
  };

  const toggleFav = (r: Recipe) =>
    requireAuth(() => {
      void api.toggleFavorite(r.id, user).then(({ added }) => {
        persist({
          ...user,
          favorites: added ? [...user.favorites, r.id] : user.favorites.filter((x) => x !== r.id),
        });
        toast(added ? "ok" : "info", added ? `«${r.title}» — в избранном` : "Убрали из избранного");
      });
    });

  const toggleCart = (r: Recipe) =>
    requireAuth(() => {
      void api.toggleCart(r.id, user).then(({ added }) => {
        persist({
          ...user,
          cart: added ? [...user.cart, r.id] : user.cart.filter((x) => x !== r.id),
        });
        toast(added ? "ok" : "info", added ? "Ингредиенты добавлены в покупки" : "Убрали из списка покупок");
      });
    });

  const toggleSub = (authorId: number) =>
    requireAuth(() => {
      void api.toggleSubscription(authorId, user).then(({ added }) => {
        persist({
          ...user,
          subscriptions: added
            ? [...user.subscriptions, authorId]
            : user.subscriptions.filter((x) => x !== authorId),
        });
        toast(
          added ? "ok" : "info",
          added ? `Вы подписались на ${authorById(authorId).name}` : `Отписка от ${authorById(authorId).name}`,
        );
      });
    });

  const doLogin = async (email: string, name: string) => {
    const session: Session = await api.login(email, name);
    persist({ ...user, session });
    setLoginOpen(false);
    toast("ok", `Добро пожаловать, ${session.name}!`);
    const act = pending.current;
    pending.current = null;
    if (act) window.setTimeout(act, 250);
  };

  const logout = () => {
    persist({ ...user, session: null });
    toast("info", "Вы вышли из аккаунта");
  };

  /* ── производные ── */
  const dayIndex = Math.floor(Date.now() / 86400000) % RECIPES.length;
  const featured = RECIPES[dayIndex];
  const featuredAuthor = authorById(featured.authorId);
  const cartItems = user.cart.filter((id) => RECIPES.some((r) => r.id === id)).map(recipeById);
  const totalFavorites = useMemo(() => RECIPES.reduce((s, r) => s + r.favorites, 0) + user.favorites.length, [user.favorites]);
  const openRecipe = openId ? recipeById(openId) : null;

  const changeView = (v: View) => {
    setView(v);
    setAuthorFilter(null);
    setPage(1);
    window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
  };

  const scrollToFeed = () => {
    changeView("feed");
    window.setTimeout(() => {
      document.getElementById("feed")?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" });
    }, 60);
  };

  const tagCount = (id: string) => RECIPES.filter((r) => r.tags.includes(id as Recipe["tags"][number])).length;

  const renderCard = (r: Recipe, i: number) => (
    <Reveal key={r.id} delay={(i % 3) * 90} className="h-full">
      <RecipeCard
        recipe={r}
        isFav={user.favorites.includes(r.id)}
        inCart={user.cart.includes(r.id)}
        isSub={user.subscriptions.includes(r.authorId)}
        onOpen={() => setOpenId(r.id)}
        onFav={() => toggleFav(r)}
        onCart={() => toggleCart(r)}
        onSub={() => toggleSub(r.authorId)}
      />
    </Reveal>
  );

  /* ── разметка ── */
  return (
    <div className="grain relative min-h-screen">
      <div className="ambient" aria-hidden="true" />

      <LiquidHeader
        view={view}
        onView={changeView}
        cartCount={user.cart.length}
        favCount={user.favorites.length}
        subCount={user.subscriptions.length}
        session={user.session}
        onCart={() => setCartOpen(true)}
        onLogin={() => setLoginOpen(true)}
        onLogout={logout}
      />

      <main className="relative z-10">
        {/* ───────── ОТКРЫВАЮЩАЯ СЦЕНА: кухня в эфире ───────── */}
        <section className="relative max-w-6xl mx-auto px-5 pt-32 sm:pt-40 pb-16">
          <p
            className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 display-xl font-black text-[22vw] leading-none text-hollow opacity-30 select-none whitespace-nowrap"
            aria-hidden="true"
          >
            КУХНЯ
          </p>

          <div className="relative grid lg:grid-cols-[1.02fr_0.98fr] gap-12 lg:gap-10 items-center">
            <div>
              <Reveal>
                <p className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-saffron">
                  <span className="w-2 h-2 rounded-full bg-coral pulse-dot" />
                  соцсеть рецептов · эфир кухни
                </p>
                <h1 className="mt-5 display-xl font-black text-[clamp(2.4rem,6.2vw,4.6rem)]">
                  <Scramble text="СЕГОДНЯ" />
                  <br />
                  <span className="text-saffron">ГОТОВЯТ:</span>
                </h1>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed text-mute">
                  Лента живых рецептов: фильтруйте по тегам, подписывайтесь на поваров, собирайте избранное
                  и выгружайте <span className="text-ink font-semibold">список покупок</span> одним файлом —
                  как в Foodsy — только с огоньком.
                </p>
              </Reveal>

              <Reveal delay={140}>
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={scrollToFeed}
                    className="liquid-btn rounded-full px-7 py-3.5 text-sm font-extrabold text-coal group"
                  >
                    <span className="absolute inset-[2px] rounded-full bg-saffron flex items-center gap-2 transition-colors group-hover:bg-amber2">
                      Смотреть ленту
                      <IconArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </button>
                  <button
                    onClick={() => setCartOpen(true)}
                    className="inline-flex items-center gap-2.5 rounded-full border border-line2 px-6 py-3.5 text-sm font-bold text-ink hover:border-mint/60 hover:text-mint transition-colors"
                  >
                    <IconBasket className="w-4.5 h-4.5" />
                    Список покупок
                    {user.cart.length > 0 && (
                      <span className="grid place-items-center min-w-[20px] h-5 px-1 rounded-full bg-mint/15 text-mint text-[11px] font-extrabold tabular">
                        {user.cart.length}
                      </span>
                    )}
                  </button>
                </div>
              </Reveal>

              <Reveal delay={240}>
                <dl className="mt-12 grid grid-cols-3 gap-4 max-w-md">
                  {[
                    { v: RECIPES.length, s: "", l: "рецептов в ленте" },
                    { v: totalFavorites, s: "", l: "добавили в избранное" },
                    { v: AUTHORS.length, s: "", l: "поваров онлайн" },
                  ].map((x, i) => (
                    <div key={i} className="border-l-2 border-line pl-4 hover:border-saffron transition-colors">
                      <dt className="sr-only">{x.l}</dt>
                      <dd className="display-xl text-2xl sm:text-3xl font-extrabold text-ink">
                        <Counter to={x.v} suffix={x.s} />
                      </dd>
                      <dd className="mt-1 text-[11px] text-dim leading-tight">{x.l}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            {/* Рецепт дня */}
            <Reveal delay={180}>
              <article
                className="rcard group relative cursor-pointer overflow-hidden rounded-3xl border border-line bg-panel"
                onClick={() => setOpenId(featured.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setOpenId(featured.id)}
              >
                <div className="relative aspect-[16/11] overflow-hidden">
                  <img src={featured.image} alt={featured.title} className="rcard-img w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/25 to-transparent" />
                  <div className="rcard-sheen" />
                  <Steam className="absolute top-6 right-6 w-12 h-12 text-saffron/80" />

                  <span className="absolute top-5 left-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-coral text-coal text-[11px] font-extrabold uppercase tracking-wider">
                    <IconFlame className="w-3.5 h-3.5" strokeWidth={2.2} />
                    Рецепт дня
                  </span>

                  <div className="absolute bottom-0 inset-x-0 p-6">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {featured.tags.map((t) => {
                        const tag = tagById(t);
                        return (
                          <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coal/70 backdrop-blur-sm border border-line/70 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                            {tag.label}
                          </span>
                        );
                      })}
                    </div>
                    <h2 className="display-xl text-xl sm:text-2xl font-extrabold leading-tight group-hover:text-saffron transition-colors">
                      {featured.title}
                    </h2>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-xs font-bold text-ink/90">
                        <span
                          className="grid place-items-center w-6 h-6 rounded-full text-[10px] font-extrabold text-coal"
                          style={{ background: `linear-gradient(135deg, ${featuredAuthor.hue}, #ffb03a)` }}
                        >
                          {featuredAuthor.name.charAt(0)}
                        </span>
                        {featuredAuthor.name}
                        <span className="text-dim font-mono font-normal">· {featured.time} мин</span>
                      </p>
                      <span className="text-[11px] font-bold text-mute inline-flex items-center gap-1.5 group-hover:text-saffron transition-colors">
                        Открыть рецепт
                        <IconArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <div className="mt-4 flex items-center justify-between gap-3 px-2">
                <div className="flex items-center gap-2 text-[11px] text-dim font-mono">
                  <IconSpark className="w-3.5 h-3.5 text-saffron" />
                  обновляется каждые сутки
                </div>
                <button
                  onClick={() => toggleFav(featured)}
                  className={`icon-btn inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-3 py-1.5 border ${
                    user.favorites.includes(featured.id)
                      ? "border-coral/50 bg-coral/10 text-coral"
                      : "border-line text-mute hover:text-coral"
                  }`}
                >
                  <IconHeart className="w-3.5 h-3.5" filled={user.favorites.includes(featured.id)} />
                  <span className="tabular">{(featured.favorites + (user.favorites.includes(featured.id) ? 1 : 0)).toLocaleString("ru-RU")}</span>
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        <Ticker />

        {/* ───────── ЛЕНТА / ИЗБРАННОЕ ───────── */}
        {view !== "subs" && (
          <section id="feed" className="max-w-6xl mx-auto px-5 pt-16 sm:pt-20 scroll-mt-24">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-dim">
                    GET /api/recipes/{view === "favs" && "?is_favorited=true"}
                  </p>
                  <h2 className="mt-2 display-xl text-2xl sm:text-3xl font-extrabold">
                    {view === "favs" ? (
                      <>
                        Избранное <span className="text-coral">♥</span>
                      </>
                    ) : (
                      "Лента рецептов"
                    )}
                  </h2>
                </div>
                {data && !loading && (
                  <p className="text-xs text-dim font-mono">
                    {data.count} {plural(data.count, "рецепт", "рецепта", "рецептов")}
                    {authorFilter ? ` · ${authorById(authorFilter).name}` : ""}
                  </p>
                )}
              </div>
            </Reveal>

            {/* панель фильтров */}
            <Reveal delay={90}>
              <div className="mt-6 rounded-2xl border border-line bg-panel/70 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по тегам">
                  {TAGS.map((t) => {
                    const active = tags.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTags((prev) => (active ? prev.filter((x) => x !== t.id) : [...prev, t.id]));
                          resetPage();
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                          active
                            ? "border-transparent text-coal"
                            : "border-line2 text-mute hover:text-ink hover:border-line2"
                        }`}
                        style={active ? { background: t.color } : undefined}
                        aria-pressed={active}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "#0b0e13" : t.color }} />
                        {t.label}
                        <span className={`font-mono text-[10px] ${active ? "text-coal/70" : "text-dim"}`}>{tagCount(t.id)}</span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => {
                      setOnlySubs((v) => !v);
                      resetPage();
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all ml-auto ${
                      onlySubs ? "border-mint/60 bg-mint/10 text-mint" : "border-line2 text-mute hover:text-mint"
                    }`}
                    aria-pressed={onlySubs}
                  >
                    <IconUsers className="w-3.5 h-3.5" />
                    Только подписки
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="relative flex-1">
                    <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        resetPage();
                      }}
                      placeholder="Найти блюдо, ингредиент или повара…"
                      className="w-full rounded-xl border border-line bg-coal/60 pl-11 pr-10 py-3 text-sm outline-none focus:border-saffron/60 transition-colors placeholder:text-dim"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-coral transition-colors"
                        aria-label="Очистить поиск"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    )}
                  </label>

                  <div className="flex items-center gap-2">
                    <IconFilter className="w-4 h-4 text-dim shrink-0" />
                    <div className="flex rounded-xl border border-line bg-coal/60 p-1">
                      {(
                        [
                          ["new", "Сначала новые"],
                          ["popular", "Популярные"],
                          ["fast", "Быстрые"],
                        ] as [Sort, string][]
                      ).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => {
                            setSort(v);
                            resetPage();
                          }}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                            sort === v ? "bg-saffron text-coal shadow-sm" : "text-mute hover:text-ink"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(authorFilter !== null || tags.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-dim">Активные фильтры:</span>
                    {authorFilter !== null && (
                      <button
                        onClick={() => {
                          setAuthorFilter(null);
                          resetPage();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-saffron/10 border border-saffron/40 text-saffron font-bold hover:bg-saffron/20 transition-colors"
                      >
                        {authorById(authorFilter).name}
                        <IconClose className="w-3 h-3" />
                      </button>
                    )}
                    {tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTags((prev) => prev.filter((x) => x !== t));
                          resetPage();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-panel2 border border-line2 text-mute font-bold hover:text-coral transition-colors"
                      >
                        {tagById(t as Recipe["tags"][number]).label}
                        <IconClose className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>

            {/* сетка */}
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : (data?.results ?? []).map(renderCard)}

              {!loading && data && data.count === 0 && (
                <EmptyState
                  title={view === "favs" ? "В избранном пока пусто" : "Ничего не нашлось"}
                  text={
                    view === "favs"
                      ? "Жмите на сердечко у рецепта — он появится здесь и в вашей статистике вкуса."
                      : "Попробуйте сбросить фильтры или поискать другое блюдо — на кухне точно что-то готовится."
                  }
                  actionLabel={view === "favs" ? "Открыть ленту" : "Сбросить фильтры"}
                  onAction={() => {
                    if (view === "favs") {
                      changeView("feed");
                    } else {
                      setTags([]);
                      setQuery("");
                      setAuthorFilter(null);
                      setOnlySubs(false);
                      resetPage();
                    }
                  }}
                />
              )}
            </div>

            {!loading && data && (
              <Pagination
                page={page}
                pages={data.pages}
                onPage={(p) => {
                  setPage(p);
                  document.getElementById("feed")?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" });
                }}
              />
            )}
          </section>
        )}

        {/* ───────── ПОДПИСКИ ───────── */}
        {view === "subs" && (
          <section className="max-w-6xl mx-auto px-5 pt-16 sm:pt-20">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-dim">GET /api/users/subscriptions/</p>
              <h2 className="mt-2 display-xl text-2xl sm:text-3xl font-extrabold">
                Ваши подписки <span className="text-mint">→</span>
              </h2>
              <p className="mt-3 text-sm text-mute max-w-lg leading-relaxed">
                Повара, чьи рецепты первыми появляются в ленте. {user.subscriptions.length > 0
                  ? `Сейчас их ${user.subscriptions.length}.`
                  : "Пока никого — загляните в «Авторов недели» ниже."}
              </p>
            </Reveal>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {user.subscriptions.length === 0 ? (
                <EmptyState
                  title="Подписок пока нет"
                  text="Подпишитесь на поваров, чтобы видеть их новые рецепты в ленте с фильтром «Только подписки»."
                  actionLabel="Выбрать поваров"
                  onAction={() => {
                    changeView("feed");
                    window.setTimeout(() => {
                      document.getElementById("authors")?.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" });
                    }, 80);
                  }}
                />
              ) : (
                AUTHORS.filter((a) => user.subscriptions.includes(a.id)).map((a, i) => (
                  <Reveal key={a.id} delay={(i % 3) * 90} className="h-full">
                    <AuthorCard
                      author={a}
                      isSub
                      onSub={() => toggleSub(a.id)}
                      onShowRecipes={() => {
                        setAuthorFilter(a.id);
                        changeView("feed");
                        window.setTimeout(scrollToFeed, 60);
                      }}
                      onOpenRecipe={(id) => setOpenId(id)}
                    />
                  </Reveal>
                ))
              )}
            </div>
          </section>
        )}

        {/* ───────── АВТОРЫ НЕДЕЛИ ───────── */}
        <section id="authors" className="max-w-6xl mx-auto px-5 pt-20 sm:pt-24">
          <Reveal>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-dim">GET /api/users/</p>
                <h2 className="mt-2 display-xl text-2xl sm:text-3xl font-extrabold">
                  Авторы <span className="text-leaf">недели</span>
                </h2>
              </div>
              <p className="text-xs text-dim font-mono max-w-xs text-right">
                {AUTHORS.length} {plural(AUTHORS.length, "повар", "повара", "поваров")} · подписка открывает фильтр ленты
              </p>
            </div>
          </Reveal>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {AUTHORS.map((a, i) => (
              <Reveal key={a.id} delay={(i % 3) * 90} className="h-full">
                <AuthorCard
                  author={a}
                  isSub={user.subscriptions.includes(a.id)}
                  onSub={() => toggleSub(a.id)}
                  onShowRecipes={() => {
                    setAuthorFilter(a.id);
                    changeView("feed");
                    window.setTimeout(scrollToFeed, 60);
                  }}
                  onOpenRecipe={(id) => setOpenId(id)}
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────── КАК ЭТО РАБОТАЕТ ───────── */}
        <section className="max-w-6xl mx-auto px-5 pt-20 sm:pt-24">
          <Reveal>
            <div className="relative rounded-3xl border border-line bg-panel/60 overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  background:
                    "radial-gradient(600px 200px at 15% 0%, rgba(255,93,69,0.18), transparent 60%), radial-gradient(600px 200px at 85% 100%, rgba(62,214,195,0.14), transparent 60%)",
                }}
              />
              <div className="relative grid md:grid-cols-3">
                {[
                  {
                    n: "01",
                    icon: IconChef,
                    t: "Готовьте и публикуйте",
                    d: "Рецепт с ингредиентами, шагами и тегами — завтрак, обед, ужин или десерт. Лента покажет его всем.",
                    c: "#ff5d45",
                  },
                  {
                    n: "02",
                    icon: IconHeart,
                    t: "Подписывайтесь и сохраняйте",
                    d: "Сердечко — в избранное, подписка на повара — его новые блюда первыми в вашей ленте.",
                    c: "#ffb03a",
                  },
                  {
                    n: "03",
                    icon: IconBasket,
                    t: "Собирайте покупки",
                    d: "Добавьте рецепты в корзину — сервис сложит ингредиенты в единый список и отдаст файлом .txt.",
                    c: "#3ed6c3",
                  },
                ].map((s, i) => (
                  <div key={s.n} className={`p-8 sm:p-10 ${i > 0 ? "md:border-l border-line/70" : ""} group`}>
                    <div className="flex items-center gap-4">
                      <span className="display-xl text-4xl font-black text-hollow group-hover:text-ink/20 transition-colors">{s.n}</span>
                      <span
                        className="grid place-items-center w-11 h-11 rounded-2xl border transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
                        style={{ borderColor: `${s.c}55`, background: `${s.c}14`, color: s.c }}
                      >
                        <s.icon className="w-5 h-5" />
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-base font-bold">{s.t}</h3>
                    <p className="mt-2.5 text-[13px] leading-relaxed text-mute">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <div className="relative z-10">
        <Footer onView={changeView} />
      </div>

      {/* ───────── оверлеи ───────── */}
      {openRecipe && (
        <RecipeModal
          recipe={openRecipe}
          isFav={user.favorites.includes(openRecipe.id)}
          inCart={user.cart.includes(openRecipe.id)}
          isSub={user.subscriptions.includes(openRecipe.authorId)}
          onClose={() => setOpenId(null)}
          onFav={() => toggleFav(openRecipe)}
          onCart={() => toggleCart(openRecipe)}
          onSub={() => toggleSub(openRecipe.authorId)}
        />
      )}
      {cartOpen && (
        <CartDrawer
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onRemove={(id) => {
            const r = recipeById(id);
            persist({ ...user, cart: user.cart.filter((x) => x !== id) });
            toast("info", `«${r.title}» убран из списка`);
          }}
          onClear={() => {
            persist({ ...user, cart: [] });
            toast("info", "Список покупок очищен");
          }}
          onDownload={() => {
            downloadShoppingList(user.cart);
            toast("ok", "Список покупок скачан");
          }}
        />
      )}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onSubmit={doLogin} />}

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
