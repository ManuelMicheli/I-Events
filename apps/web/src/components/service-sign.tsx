import { inkVars } from "@/components/event-type";
import type { EventType } from "@i-events/core";
import type { ReactNode } from "react";

/**
 * The sign of each service ("Carta e inchiostro", point 3): an outline icon, stroke 1.5, 20 in a
 * 32 tile with radius 8. Outside an event the tile is carta/100 with the icon in text; inside an
 * event the tile takes the ink's background and the icon the ink's text (5.7:1 or more).
 */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

// The seal of "Permessi e SIAE": ten scallops around a circle, drawn once.
const SEAL = (() => {
  const n = 10;
  const pt = (i: number) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return `${(12 + 7.4 * Math.cos(a)).toFixed(2)} ${(12 + 7.4 * Math.sin(a)).toFixed(2)}`;
  };
  return `M${pt(0)}${Array.from({ length: n }, (_, i) => `A2.5 2.5 0 0 1 ${pt(i + 1)}`).join("")}Z`;
})();

const SIGNS: Record<string, ReactNode> = {
  // Regia
  organization: (
    <>
      <path d="M8.5 4.75H6.75A1.5 1.5 0 0 0 5.25 6.25v13.25a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V6.25a1.5 1.5 0 0 0-1.5-1.5H15.5" />
      <rect x="8.5" y="3" width="7" height="3.5" rx="1" />
      <path d="M9 11.5h6M9 15h4.5" />
    </>
  ),
  permits: (
    <>
      <path d={SEAL} />
      <path d="M9 12.25l2.1 2.1 4-4.1" />
    </>
  ),
  // Spazio
  venue: (
    <>
      <path d="M12 21s-6.5-5.5-6.5-11a6.5 6.5 0 0 1 13 0c0 5.5-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  setup: (
    <>
      <path d="M20 4c-3.2.6-7.3 4.4-9.2 7.2l2 2C15.6 11.3 19.4 7.2 20 4Z" />
      <path d="M10.8 11.2c-2.2-.1-3.8 1.4-3.8 3.6 0 1.7-.9 2.9-2.7 3.4 1.2 1.2 3 1.6 4.6 1.6 2.7 0 4.3-1.9 3.9-6.6" />
    </>
  ),
  logistics: (
    <>
      <path d="M13.5 16.75V6.5a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v9.25a1 1 0 0 0 1 1h.6M9 16.75h6.2M18.8 16.75h.7a1 1 0 0 0 1-1V13l-2.6-3.5h-4.4" />
      <circle cx="7" cy="17" r="1.9" />
      <circle cx="17" cy="17" r="1.9" />
    </>
  ),
  // Palco
  av: (
    <>
      <path d="M4.5 9.25h2.75L11.5 5.5v13l-4.25-3.75H4.5a1 1 0 0 1-1-1v-3.5a1 1 0 0 1 1-1Z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.75 7a7 7 0 0 1 0 10" />
    </>
  ),
  entertainment: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 6.25A5.75 5.75 0 0 1 17.75 12" />
    </>
  ),
  media: (
    <>
      <path d="M4.5 8h2.75l1.5-2.5h6.5L16.75 8h2.75a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.25" r="3.5" />
    </>
  ),
  // Accoglienza
  staffing: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M10 7h4" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M8.25 17.5c.8-1.7 2.2-2.6 3.75-2.6s2.95.9 3.75 2.6" />
    </>
  ),
  catering: (
    <>
      <path d="M8 3.5h8l.45 4.6a4.47 4.47 0 0 1-8.9 0Z" />
      <path d="M7.75 7.5h8.5M12 12.6v7.9M8.75 20.5h6.5" />
    </>
  ),
  security: (
    <>
      <path d="M12 3.5l7 2.6v5.4c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6.1Z" />
      <path d="M9 12l2.1 2.1L15 10.2" />
    </>
  ),
  cleaning: (
    <>
      <path d="M20 4l-6.25 6.25" />
      <path d="M11.25 8.75l4 4" />
      <path d="M11.25 8.75L6.9 13.1C5.1 14.9 4.4 17.4 4.4 19.6c2.2 0 4.7-.7 6.5-2.5l4.35-4.35" />
      <path d="M8.2 18.3l1.6-1.6M6.1 16.4l1.6-1.6" />
    </>
  ),
};

const OTHER = (
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeWidth="2.25" />
  </>
);

/** The bare sign, 20 by default, in the current colour. */
export function ServiceIcon({ service, size = 20, className }: { service: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cx("shrink-0", className)}
    >
      {SIGNS[service] ?? OTHER}
    </svg>
  );
}

/** The sign in its 32 tile; `type` puts it in the event's ink. */
export function ServiceSign({ service, type, className }: { service: string; type?: EventType | null; className?: string }) {
  return (
    <span
      aria-hidden
      style={type ? inkVars(type) : undefined}
      className={cx(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-[8px]",
        type
          ? "bg-[var(--ink-bg)] text-[var(--ink-text)] dark:bg-[color-mix(in_srgb,var(--ink-fill-dark)_18%,transparent)] dark:text-[var(--ink-text-dark)]"
          : "bg-surface text-text",
        className,
      )}
    >
      <ServiceIcon service={service} />
    </span>
  );
}
