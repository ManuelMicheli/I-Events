import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { buttonClass, type Size, type Variant } from "./button-styles";

/** Carta primitives (specs in design-research/carta-componenti-spec.md). Screens compose these. */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export { Button } from "./button";
export { buttonClass };

export function ButtonLink({ variant = "primary", size = "m", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-label font-medium">{label}</span>
      <span className="flex flex-col gap-1">
        {children}
        {hint && !error && <span className="text-xs text-muted">{hint}</span>}
        {error && (
          <span className="flex items-start gap-1 text-xs text-danger">
            <AlertIcon />
            {error}
          </span>
        )}
      </span>
    </label>
  );
}

const FIELD = "min-h-12 w-full min-w-0 rounded-ui border border-control bg-bg px-3 sm:min-h-10";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(FIELD, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(FIELD, "pr-8", className)} {...props} />;
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-card border border-border bg-bg p-4 sm:p-6", className)}>
      {(title || action) && (
        <header className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {title && <h2 className="text-xl font-medium">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-2 rounded-ui px-4 py-3 text-sm",
        tone === "info" && "bg-surface text-text",
        tone === "error" && "bg-danger-bg text-danger",
        tone === "success" && "bg-success-bg text-success",
      )}
    >
      {tone === "error" && <AlertIcon className="mt-1" />}
      {tone === "success" && <CheckIcon className="mt-1" />}
      <span>{children}</span>
    </p>
  );
}

export type BadgeTone = "neutral" | "accent" | "warning" | "success" | "outline";

/** A state as a small pill. Accent only for what needs the user now ("Nuova", "2 preventivi nuovi"). */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        tone === "neutral" && "bg-surface text-text",
        tone === "accent" && "bg-accent-subtle text-accent-ink",
        tone === "warning" && "bg-warning-bg text-warning",
        tone === "success" && "bg-success-bg text-success",
        tone === "outline" && "border border-border-strong text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-card bg-surface px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

/** The I-Events symbol ("Biglietto"): a ticket with the i cut out and the Fiamma dot. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <svg width="32" height="21" viewBox="10 24 80 52" aria-hidden className="shrink-0">
        <path
          fillRule="evenodd"
          fill="currentColor"
          d="M20 24H80A10 10 0 0 1 90 34V43A7 7 0 0 0 90 57V66A10 10 0 0 1 80 76H20A10 10 0 0 1 10 66V57A7 7 0 0 0 10 43V34A10 10 0 0 1 20 24ZM45 51A5 5 0 0 1 55 51V65A5 5 0 0 1 45 65Z"
        />
        <circle cx="50" cy="36" r="6" fill="var(--color-accent)" />
      </svg>
      <span className="text-lg font-semibold tracking-[-0.01em]">I&#8209;Events</span>
    </span>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={cx("shrink-0", className)}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75v3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.9" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={cx("shrink-0", className)}>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
