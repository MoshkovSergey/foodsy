import React, { useEffect, useRef, useState } from "react";
import { RECIPES, Session, plural } from "../data";
import { IconBasket, IconLogo, IconLogout, IconUsers, IconHeart, IconSpark } from "../icons";

export type View = "feed" | "favs" | "subs";

export const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Scroll-reveal обёртка ─────────────────────────────────────────────── */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      el.classList.add("on");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("on");
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Scramble-заголовок (дешифровка) ───────────────────────────────────── */
const GLYPHS = "▓▒░ЖШКХ#/<>_";
export function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const [out, setOut] = useState(() => (prefersReduced() ? text : ""));
  useEffect(() => {
    if (prefersReduced()) {
      setOut(text);
      return;
    }
    let frame = 0;
    const total = 26;
    const id = setInterval(() => {
      frame++;
      const progress = frame / total;
      const settled = Math.floor(progress * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") s += " ";
        else if (i < settled) s += text[i];
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (frame >= total) {
        setOut(text);
        clearInterval(id);
      }
    }, 42);
    return () => clearInterval(id);
  }, [text]);
  return <span className={className}>{out || "\u00A0"}</span>;
}

/* ── Анимированный счётчик ─────────────────────────────────────────────── */
export function Counter({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(prefersReduced() ? to : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      setVal(to);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(to * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref} className="tabular">
      {val.toLocaleString("ru-RU")}
      {suffix}
    </span>
  );
}

/* ── Liquid-шапка (в духе sedracoin) ───────────────────────────────────── */
export function LiquidHeader({
  view,
  onView,
  cartCount,
  favCount,
  subCount,
  session,
  onCart,
  onLogin,
  onLogout,
}: {
  view: View;
  onView: (v: View) => void;
  cartCount: number;
  favCount: number;
  subCount: number;
  session: Session | null;
  onCart: () => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 28);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const tabs: { id: View; label: string; count?: number }[] = [
    { id: "feed", label: "Лента" },
    { id: "favs", label: "Избранное", count: favCount },
    { id: "subs", label: "Подписки", count: subCount },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-3 pt-3 sm:pt-4">
      <div
        className={`liquid-shell w-full max-w-6xl rounded-2xl border border-line/80 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.8)] transition-all duration-500 ${
          scrolled ? "py-2" : "py-3"
        }`}
      >
        <div className="relative z-10 flex items-center gap-2 sm:gap-4 px-3 sm:px-5">
          <button
            onClick={() => onView("feed")}
            className="group flex items-center gap-2.5 shrink-0"
            aria-label="ФУДГРАМ — на главную"
          >
            <IconLogo className="w-8 h-8 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110" />
            <span className="font-display text-sm sm:text-base font-extrabold tracking-tight hidden sm:inline">
              ФУД<span className="text-saffron">ГРАМ</span>
            </span>
          </button>

          <nav className="flex items-center gap-1 sm:gap-2 mx-auto" aria-label="Основная навигация">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onView(t.id)}
                className={`navlink px-2 sm:px-3.5 py-2 rounded-full text-[11px] sm:text-sm font-semibold transition-colors ${
                  view === t.id ? "active text-ink" : "text-mute hover:text-ink"
                }`}
              >
                {t.label}
                {typeof t.count === "number" && t.count > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-saffron/15 text-saffron text-[10px] font-bold tabular">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onCart}
              className="icon-btn relative grid place-items-center w-10 h-10 rounded-full border border-line bg-coal/60 text-ink hover:border-saffron/60 hover:text-saffron"
              aria-label={`Список покупок, ${cartCount} ${plural(cartCount, "рецепт", "рецепта", "рецептов")}`}
            >
              <IconBasket className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="pop absolute -top-1 -right-1 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-[10px] font-extrabold text-coal"
                >
                  {cartCount}
                </span>
              )}
            </button>

            {session ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-line bg-coal/60">
                  <span
                    className="grid place-items-center w-6 h-6 rounded-full text-[11px] font-extrabold text-coal"
                    style={{ background: "linear-gradient(135deg,#ffb03a,#ff5d45)" }}
                  >
                    {session.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold max-w-[90px] truncate">{session.name}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="icon-btn grid place-items-center w-10 h-10 rounded-full border border-line bg-coal/60 text-mute hover:text-coral hover:border-coral/50"
                  aria-label="Выйти"
                  title="Выйти"
                >
                  <IconLogout className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="liquid-btn rounded-full px-3 sm:px-5 py-2.5 text-[11px] sm:text-sm font-extrabold text-coal"
              >
                <span className="absolute inset-[2px] rounded-full bg-saffron grid place-items-center transition-colors group-hover:bg-amber2">
                  <span className="relative z-10">Войти</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── Бегущая строка ────────────────────────────────────────────────────── */
export function Ticker() {
  const items = [
    ...RECIPES.slice(0, 10).map((r) => r.title),
    "1 287× рибай забрали в избранное",
    "рамен варится 2,5 часа — и это того стоит",
    "никаких сливок в карбонаре",
  ];
  const row = (keyPrefix: string) =>
    items.map((t, i) => (
      <span key={`${keyPrefix}-${i}`} className="flex items-center shrink-0">
        <span className="mx-5 sm:mx-7 text-sm font-semibold text-mute whitespace-nowrap">{t}</span>
        <IconSpark className="w-3.5 h-3.5 text-saffron/70 shrink-0" />
      </span>
    ));
  return (
    <div className="marquee relative overflow-hidden border-y border-line/70 bg-deep/60 py-3.5" aria-hidden="true">
      <div className="marquee-track">
        {row("a")}
        {row("b")}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-coal to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-coal to-transparent" />
    </div>
  );
}

/* ── Футер с картой API ────────────────────────────────────────────────── */
const ENDPOINTS: { method: string; path: string; note: string }[] = [
  { method: "GET", path: "/api/recipes/", note: "лента + фильтры по тегам, автору, избранному" },
  { method: "POST", path: "/api/auth/token/login", note: "JWT-токен сессии" },
  { method: "POST", path: "/api/recipes/{id}/favorite/", note: "в избранное / из избранного" },
  { method: "POST", path: "/api/recipes/{id}/shopping_cart/", note: "в список покупок" },
  { method: "GET", path: "/api/recipes/shopping_cart/", note: "скачать список .txt" },
  { method: "POST", path: "/api/users/{id}/subscribe/", note: "подписка на автора" },
];

export function Footer({ onView }: { onView: (v: View) => void }) {
  return (
    <footer className="relative mt-24 border-t border-line/70 bg-deep/50">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-saffron/50 to-transparent" />
      <div className="max-w-6xl mx-auto px-5 py-14 relative">
        <div
          className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 display-xl font-black text-[19vw] sm:text-[10rem] leading-none text-hollow opacity-40 select-none whitespace-nowrap"
          aria-hidden="true"
        >
          ФУДГРАМ
        </div>

        <div className="relative grid gap-12 md:grid-cols-[1.2fr_1fr_0.8fr] pt-16">
          <div>
            <div className="flex items-center gap-2.5">
              <IconLogo className="w-9 h-9" />
              <span className="font-display text-lg font-extrabold">
                ФУД<span className="text-saffron">ГРАМ</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-mute max-w-sm">
              Социальная сеть рецептов по мотивам{" "}
              <span className="text-ink font-semibold">Foodgram</span>: публикуйте блюда, подписывайтесь на
              авторов, собирайте избранное и выгружайте список покупок одним файлом.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Go 1.27", "PostgreSQL 16", "pgx/v5", "React 18", "Tailwind 4"].map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-full border border-line bg-panel text-[11px] font-bold text-mute hover:text-saffron hover:border-saffron/40 transition-colors cursor-default"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-mute">API-контракт</h3>
            <ul className="mt-4 space-y-2.5">
              {ENDPOINTS.map((e) => (
                <li key={e.path} className="group">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        e.method === "GET" ? "bg-mint/10 text-mint" : "bg-coral/10 text-coral"
                      }`}
                    >
                      {e.method}
                    </span>
                    <code className="font-mono text-xs text-ink group-hover:text-saffron transition-colors">{e.path}</code>
                  </div>
                  <p className="text-[11px] text-dim mt-0.5 pl-1">{e.note}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-mute">Разделы</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {(
                [
                  ["feed", "Лента рецептов", IconSpark],
                  ["favs", "Избранное", IconHeart],
                  ["subs", "Подписки", IconUsers],
                ] as const
              ).map(([v, label, Ic]) => (
                <li key={v}>
                  <button
                    onClick={() => {
                      onView(v);
                      window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
                    }}
                    className="flex items-center gap-2.5 text-mute hover:text-saffron transition-colors group"
                  >
                    <Ic className="w-4 h-4 text-dim group-hover:text-saffron transition-colors" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[11px] text-dim leading-relaxed">
              Учебный проект-реинтерпретация. Демо-режим: данные живут в браузере; при заданном{" "}
              <code className="font-mono text-mute">VITE_API_URL</code> клиент переключается на Go-бэкенд из папки{" "}
              <code className="font-mono text-mute">backend/</code>.
            </p>
          </div>
        </div>

        <div className="relative mt-12 pt-6 border-t border-line/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-dim">© 2026 ФУДГРАМ · готовьте с удовольствием</p>
          <p className="text-xs text-dim flex items-center gap-1.5">
            сделано на кухне <IconSpark className="w-3.5 h-3.5 text-saffron" /> frontend / backend monorepo
          </p>
        </div>
      </div>
    </footer>
  );
}
