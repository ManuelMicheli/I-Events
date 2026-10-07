"use client";

import { CalendarIcon, CompassIcon, TicketIcon, useBecame } from "@/components/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The public area's sections: in the top bar from 640 px, in the tab bar at the bottom on phones
 * (Carta item 23: icons 24, Didascalia label, active Grafite with the filled icon, others carta/600).
 */
const SECTIONS = [
  { href: "/eventi", label: "Esplora", icon: Compass },
  { href: "/eventi/calendario", label: "Calendario", icon: Calendar },
  { href: "/biglietti", label: "Biglietti", icon: Ticket },
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

/** Each icon moves when its section opens (A10): the needle settles, a sheet tears off, the stub tugs. */
function Compass({ filled }: IconProps) {
  return <CompassIcon filled={filled} play={useBecame(filled)} />;
}

function Calendar({ filled }: IconProps) {
  return <CalendarIcon filled={filled} play={useBecame(filled)} />;
}

function Ticket({ filled }: IconProps) {
  return <TicketIcon filled={filled} tug={useBecame(filled)} />;
}
