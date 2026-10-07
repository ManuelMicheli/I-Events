"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The public area's sections: in the top bar from 640 px, in the tab bar at the bottom on phones
 * (Carta item 23: icons 24, Didascalia label, active Grafite with the filled icon, others carta/600).
 */
const SECTIONS = [
  { href: "/eventi", label: "Esplora", icon: Compass },
  { href: "/eventi/calendario", label: "Calendario", icon: Calendar },
  { href: "/biglietti", label: "Biglietti", icon: TicketIcon },
] as const;

function activeHref(pathname: string) {
  if (pathname.startsWith("/eventi/calendario")) return "/eventi/calendario";
  if (pathname.startsWith("/biglietti") || pathname.startsWith("/biglietto")) return "/biglietti";
  if (pathname.startsWith("/eventi")) return "/eventi";
  return null;
}

export function TopNav() {
  const active = activeHref(usePathname());
  return (
    <nav aria-label="Sezioni" className="hidden sm:block">
      <ul className="flex items-center gap-1">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              aria-current={active === s.href ? "page" : undefined}
              className={`flex min-h-10 items-center rounded-ui border px-4 text-sm font-medium transition-colors duration-[120ms] ${
                active === s.href ? "border-border-strong bg-bg text-text" : "border-transparent text-muted hover:bg-surface hover:text-text"
              }`}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function TabBar() {
  const active = activeHref(usePathname());
  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-app/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <ul className="grid h-14 grid-cols-3">
        {SECTIONS.map((s) => {
          const on = active === s.href;
          const Icon = s.icon;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs ${on ? "font-medium text-text" : "text-muted"}`}
              >
                <Icon filled={on} />
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { filled: boolean };

function Compass({ filled }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
      <path
        d="M15.5 8.5l-2 5-5 2 2-5 5-2z"
        stroke={filled ? "var(--color-app)" : "currentColor"}
        fill={filled ? "var(--color-app)" : "none"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Calendar({ filled }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
      <path d="M8 3.25v4M16 3.25v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.75 10h16.5" stroke={filled ? "var(--color-app)" : "currentColor"} strokeWidth="1.5" />
    </svg>
  );
}

function TicketIcon({ filled }: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5.75h14a1.75 1.75 0 0 1 1.75 1.75v2.25a2.25 2.25 0 0 0 0 4.5v2.25A1.75 1.75 0 0 1 19 18.25H5a1.75 1.75 0 0 1-1.75-1.75v-2.25a2.25 2.25 0 0 0 0-4.5V7.5A1.75 1.75 0 0 1 5 5.75z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
      <path d="M9.5 8.5v7" stroke={filled ? "var(--color-app)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2" />
    </svg>
  );
}
