/** Carta button classes, shared by the server-safe ButtonLink and the client Button. */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export type Variant = "primary" | "secondary" | "tertiary" | "danger";
export type Size = "s" | "m" | "l";

export const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 text-center font-medium transition-[background-color,transform,color] duration-[120ms] ease-out active:scale-[0.98] disabled:pointer-events-none disabled:bg-surface disabled:text-disabled disabled:border-transparent";
export const BUTTON_SIZE: Record<Size, string> = {
  // Small buttons keep 32 px but reach 44 px for the finger; medium ones are 44 px on phones.
  s: "relative min-h-8 rounded-[8px] px-3 py-1 text-label after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
  m: "min-h-11 rounded-ui px-4 py-2 text-sm sm:min-h-10",
  l: "min-h-12 rounded-ui px-5 py-3 text-sm",
};
export const BUTTON_VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-text hover:bg-accent-hover",
  secondary: "border border-border-strong bg-bg text-text hover:bg-surface",
  tertiary: "text-text hover:bg-surface",
  danger: "bg-danger text-on-danger hover:opacity-90",
};

export function buttonClass(variant: Variant = "primary", size: Size = "m", className?: string) {
  return cx(BUTTON_BASE, BUTTON_SIZE[size], BUTTON_VARIANT[variant], className);
}
