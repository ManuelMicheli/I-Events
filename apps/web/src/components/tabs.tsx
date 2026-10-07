import Link from "next/link";

export type Tab = { key: string; label: string; href: string; count?: number };

/**
 * Tabs of a page (Carta): the sections of one object, each a link so it can be shared and opened
 * again. The active one is in text with a 2 px line under it, the others muted. On a phone the row
 * scrolls sideways under the edge of the screen.
 */
export function PageTabs({ label, tabs, active }: { label: string; tabs: Tab[]; active: string }) {
  return (
    <nav aria-label={label} className="relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-6 border-b border-border">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`relative -mb-px flex min-h-11 items-center gap-2 border-b-2 text-sm font-medium transition-colors duration-[180ms] ${
                  on ? "border-text text-text" : "border-transparent text-muted hover:text-text"
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="font-mono text-xs tabular-nums text-muted">{t.count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
