import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      className={cx(
        "inline-flex h-10 items-center justify-center rounded-ui px-4 text-sm font-medium disabled:opacity-50",
        variant === "primary" && "bg-accent text-accent-text",
        variant === "secondary" && "border border-border bg-bg",
        variant === "danger" && "border border-danger text-danger",
        className,
      )}
      {...props}
    />
  );
}

export function ButtonLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx("inline-flex h-10 items-center justify-center rounded-ui bg-accent px-4 text-sm font-medium text-accent-text", className)}
      {...props}
    />
  );
}

export function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && !error && <span className="text-muted">{hint}</span>}
      {error && <span className="text-danger">{error}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx("h-10 rounded-ui border border-border bg-bg px-3", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx("h-10 rounded-ui border border-border bg-bg px-3", className)} {...props} />;
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-ui border border-border bg-bg p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
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
        "rounded-ui border px-3 py-2 text-sm",
        tone === "info" && "border-border bg-surface",
        tone === "error" && "border-danger text-danger",
        tone === "success" && "border-success text-success",
      )}
    >
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-ui bg-surface px-4 py-6 text-center text-sm text-muted">{children}</p>;
}
