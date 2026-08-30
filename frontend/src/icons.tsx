// Кастомные инлайн-иконки ФУДГРАМА — рисованы под проект, stroke = currentColor.
import React from "react";

type P = { className?: string; strokeWidth?: number };
const base = (p: P) => ({
  className: p.className ?? "w-5 h-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: p.strokeWidth ?? 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
});

export const IconLogo = ({ className = "w-8 h-8" }: P) => (
  <svg viewBox="0 0 32 32" className={className} fill="none">
    <path d="M7 15.5h18v5.5a6.5 6.5 0 0 1-6.5 6.5h-5A6.5 6.5 0 0 1 7 21v-5.5Z" fill="#ffb03a" />
    <path d="M4.5 15.5h23" stroke="#ff5d45" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M25 17.5c1.8 0 2.8-1 2.8-2.5S26.6 12.5 25 12.7" stroke="#ffb03a" strokeWidth="2" strokeLinecap="round" />
    <path d="M12.5 11.5c0-1.8 1.4-2 1.4-3.8M17.5 11.5c0-1.8 1.4-2 1.4-3.8" stroke="#3ed6c3" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3c.6 2.6-1.8 4-2.6 5.8-.7 1.6-.4 3 .6 4.2-.9-.3-1.9-1.2-2.3-2.4C6.6 12.2 6 13.7 6 15a6 6 0 0 0 12 0c0-3.4-2.2-5-3.2-7.4C14 5.7 14.6 4.4 12 3Z" />
    <path d="M12 21a3.2 3.2 0 0 1-3.2-3.2c0-1.7 1.4-2.6 3.2-4.3 1.8 1.7 3.2 2.6 3.2 4.3A3.2 3.2 0 0 1 12 21Z" />
  </svg>
);

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconHeart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.2S4 15.3 4 9.9C4 7 6.2 5 8.7 5c1.6 0 2.8.8 3.3 1.7C12.5 5.8 13.7 5 15.3 5 17.8 5 20 7 20 9.9c0 5.4-8 10.3-8 10.3Z" />
  </svg>
);

export const IconBasket = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 10h16l-1.3 8.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8L4 10Z" />
    <path d="M8.5 10 12 3.5 15.5 10M9.5 13.5v3M14.5 13.5v3" />
  </svg>
);

export const IconUsers = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <path d="M15.5 5.7a3.2 3.2 0 0 1 0 5.7M17.7 14.9c1.6.8 2.6 2.4 2.9 4.6" />
  </svg>
);

export const IconChef = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 13.5a4 4 0 0 1-.8-7.9 5 5 0 0 1 9.7-1.2A4.5 4.5 0 0 1 17 13.4V17H7v-3.5Z" />
    <path d="M7 20h10M10 13.5V17M14 13.5V17" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="10.8" cy="10.8" r="6.3" />
    <path d="m20 20-4.8-4.8" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4v10.5M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
  </svg>
);

export const IconArrowLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </svg>
);

export const IconArrowRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
    <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8L12 4Z" />
  </svg>
);

export const IconFilter = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6.5h16M7 12h10M10 17.5h4" />
  </svg>
);

export const IconLogout = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7M10.5 12H21m0 0-3.5-3.5M21 12l-3.5 3.5" />
  </svg>
);

export const IconFire = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 20.5h8M9.5 20.5v-6m5 6v-6M6.5 14.5 12 4l5.5 10.5h-11Z" />
  </svg>
);

export const IconBook = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 6.5c-1.8-1.6-4.5-2-8-1.5v13.5c3.5-.5 6.2-.1 8 1.5 1.8-1.6 4.5-2 8-1.5V5c-3.5-.5-6.2-.1-8 1.5Z" />
    <path d="M12 6.5V20" />
  </svg>
);

export const IconList = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSpark = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21M5.8 5.8l3 3M15.2 15.2l3 3M18.2 5.8l-3 3M8.8 15.2l-3 3" />
  </svg>
);

export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.4 3.8 5.3 3.8 8.5s-1.3 6.1-3.8 8.5c-2.5-2.4-3.8-5.3-3.8-8.5s1.3-6.1 3.8-8.5Z" />
  </svg>
);

export const Steam = ({ className = "w-10 h-10" }: P) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path className="steam-path" d="M12 32c0-4 4-5 4-9s-4-5-4-9" />
    <path className="steam-path s2" d="M20 34c0-4 4-5 4-9s-4-5-4-9" />
    <path className="steam-path s3" d="M28 32c0-4 4-5 4-9s-4-5-4-9" />
  </svg>
);
