"use client";

import { useId, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, type Size, type Variant } from "./button-styles";
import { Perforation } from "./perforation";

const BUSY_INK: Record<Variant, string> = {
  primary: "text-accent-text",
  secondary: "text-text",
  tertiary: "text-text",
  danger: "text-on-danger",
};

/** The last button pressed: the one that shows the wait when a form or a transition is pending. */
let lastPressed: string | null = null;

/**
 * The Carta button. While it sends (A2) its label fades and the small perforation runs in its place:
 * same width, same colour, no clicks. Submit buttons find out on their own from the form; buttons
 * that start work themselves say so with `pending`. Only the button that was pressed shows it.
 */
export function Button({
  variant = "primary",
  size = "m",
  className,
  pending,
  disabled,
  onClick,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; pending?: boolean }) {
  const form = useFormStatus();
  const id = useId();
  const source = pending ?? (props.type === "submit" && form.pending);
  const busy = Boolean(source) && lastPressed === id;
  const canBeBusy = pending !== undefined || props.type === "submit";

  return (
    <button
      {...props}
      disabled={busy ? undefined : disabled}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      className={buttonClass(variant, size, [canBeBusy && "relative", busy && "text-transparent", className].filter(Boolean).join(" "))}
      onClick={(e) => {
        if (source) {
          e.preventDefault();
          return;
        }
        lastPressed = id;
        onClick?.(e);
      }}
    >
      {children}
      {busy && (
        <span aria-hidden className={`absolute inset-0 flex items-center justify-center ${BUSY_INK[variant]}`}>
          <Perforation size="s" />
        </span>
      )}
    </button>
  );
}
