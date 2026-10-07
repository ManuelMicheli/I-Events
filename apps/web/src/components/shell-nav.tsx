"use client";

import { MenuIcon } from "./icons";
import { NavIcon, type NavIconName } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NavItem = { href: string; label: string; icon: NavIconName };
/** How many things wait in a section ("Richieste 3"), by its href. */
export type NavCounts = Record<string, number>;

/** The area home (e.g. /pro) is active only on itself; other items also on their sub-pages. */
function isActive(pathname: string, href: string, items: NavItem[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`) || href.lastIndexOf("/") === 0) return false;
  return !items.some((i) => i.href !== href && i.href.startsWith(`${href}/`) && (pathname === i.href || pathname.startsWith(`${i.href}/`)));
}

const countLabel = (n: number) => (n === 1 ? "1 nuova" : `${n} nuove`);

/** Sidebar items (Carta item 21): icon 20 and label, the count in mono on the right. */
export function NavList({ items, counts = {}, all = items, onNavigate }: { items: NavItem[]; counts?: NavCounts; all?: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sezioni">
      <ul className="flex flex-col gap-1">
        {items.map((n) => {
          const active = isActive(pathname, n.href, all);
          const count = counts[n.href] ?? 0;
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`ic-host flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm transition-colors duration-[120ms] [--ic-cut:var(--color-surface)] lg:min-h-9 ${
                  active ? "bg-surface font-medium text-text" : "text-muted hover:bg-surface hover:text-text"
                }`}
              >
                <NavIcon name={n.icon} filled={active} />
                <span className="min-w-0 flex-1 truncate">{n.label}</span>
                {count > 0 && (
                  <>
                    <span aria-hidden className="font-mono text-xs text-text tabular-nums">
                      {count > 99 ? "99+" : count}
                    </span>
                    <span className="sr-only">, {countLabel(count)}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const OTHER_TITLES: [string, string][] = [
  ["/notifiche", "Notifiche"],
  ["/impostazioni", "Impostazioni"],
];

/** The page title in the top bar: the section you are in. */
export function PageTitle({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const title = items.find((i) => isActive(pathname, i.href, items))?.label ?? OTHER_TITLES.find(([p]) => pathname.startsWith(p))?.[1];
  return title ? <p className="hidden min-w-0 truncate text-xl font-medium lg:block">{title}</p> : null;
}

/**
 * Below 1024 px the sections sit in a tab bar at the bottom (Carta item 23): the first three, then
 * "Altro", which opens the others in a sheet from the bottom (item 14).
 */
export function TabBar({ items, counts }: { items: NavItem[]; counts: NavCounts }) {
  const pathname = usePathname();
  const main = items.slice(0, 3);
  const rest = items.slice(3);
  // Remember on which page the sheet was opened: navigating anywhere else closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const more = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const restActive = rest.some((i) => isActive(pathname, i.href, items));
  const restCount = rest.reduce((s, i) => s + (counts[i.href] ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    sheet.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenOn(null);
      more.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const tab = (on: boolean) => `ic-host relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-xs [--ic-cut:var(--color-app)] ${on ? "font-medium text-text" : "text-muted"}`;

  return (
    <>
      <nav aria-label="Sezioni principali" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-app/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className="mx-auto grid h-14 max-w-[560px] grid-cols-4">
          {main.map((n) => {
            const on = isActive(pathname, n.href, items);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={on ? "page" : undefined} className={tab(on)}>
                  <span className="relative">
                    <NavIcon name={n.icon} filled={on} />
                    <TabCount n={counts[n.href] ?? 0} />
                  </span>
                  {n.label}
                  {(counts[n.href] ?? 0) > 0 && <span className="sr-only">, {countLabel(counts[n.href]!)}</span>}
                </Link>
              </li>
            );
          })}
          <li>
            <button ref={more} type="button" onClick={() => setOpenOn(open ? null : pathname)} aria-expanded={open} aria-controls="altre-sezioni" className={tab(restActive || open)}>
              <span className="relative">
                <MenuIcon open={open} />
                <TabCount n={restCount} />
              </span>
              Altro
              {restCount > 0 && <span className="sr-only">, {countLabel(restCount)}</span>}
            </button>
          </li>
        </ul>
      </nav>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="veil absolute inset-0" onClick={() => setOpenOn(null)} aria-hidden />
          <div
            ref={sheet}
            id="altre-sezioni"
            role="dialog"
            aria-modal="true"
            aria-label="Altre sezioni"
            className="sheet absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[24px] bg-bg px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-3"
          >
            <div aria-hidden className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />
            <NavList items={rest} all={items} counts={counts} onNavigate={() => setOpenOn(null)} />
          </div>
        </div>
      )}
    </>
  );
}

function TabCount({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span aria-hidden className="absolute -top-1.5 left-[calc(100%-6px)] box-content inline-flex h-4 min-w-2 items-center justify-center rounded-full border-2 border-app bg-accent px-1 font-mono text-[10px] leading-none text-accent-text">
      {n > 9 ? "9+" : n}
    </span>
  );
}
