"use client";

import { MenuIcon } from "./icons";
import { NavIcon, type NavIconName } from "./nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: NavIconName };

/** The area home (e.g. /pro) is active only on itself; other items also on their sub-pages. */
function isActive(pathname: string, href: string, items: NavItem[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`) || href.lastIndexOf("/") === 0) return false;
  return !items.some((i) => i.href !== href && i.href.startsWith(`${href}/`) && (pathname === i.href || pathname.startsWith(`${i.href}/`)));
}

export function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sezioni">
      <ul className="flex flex-col gap-1">
        {items.map((n) => {
          const active = isActive(pathname, n.href, items);
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
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Below 1024 px the sections open from the top bar; the panel closes on navigation and Esc. */
export function MobileMenu({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  // Remember on which page the menu was opened: navigating anywhere else closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="menu-sezioni"
        className="flex min-h-11 items-center gap-2 rounded-ui px-3 text-sm font-medium hover:bg-surface"
      >
        <MenuIcon open={open} />
        Menu
      </button>
      {open && (
        <div id="menu-sezioni" className="absolute inset-x-0 top-14 z-20 max-h-[calc(100dvh-56px)] overflow-y-auto border-b border-border bg-app px-4 pb-6 pt-2 shadow-2 sm:px-6">
          <NavList items={items} onNavigate={() => setOpen(false)} />
          <div className="mt-4 border-t border-border pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
