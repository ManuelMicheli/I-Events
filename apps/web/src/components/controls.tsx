"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Carta controls (carta-componenti-spec.md, items 3, 4 and 7) built on native inputs, so forms,
 * keyboards and screen readers keep working: chips, the switch, the segmented control and the stepper.
 */

type Option = { value: string; label: string };

const TICK = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="chip-tick shrink-0">
    <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** The tick of a chosen chip, for chips drawn as links. */
export const ChipTick = () => TICK;

/** A row of chip links: one line that scrolls sideways on phones, with the chosen chip brought into view. */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    const on = row.current?.querySelector<HTMLElement>("[aria-current]");
    if (on && row.current && row.current.scrollWidth > row.current.clientWidth) row.current.scrollLeft = on.offsetLeft - row.current.offsetLeft - 16;
  }, []);
  return (
    <nav ref={row} aria-label={label} className="-mx-4 -mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {children}
    </nav>
  );
}

type ChipsProps = { legend: string; options: Option[]; name?: string; hideLegend?: boolean; error?: string } & (
  | { multiple?: false; value: string | undefined; onChange: (value: string) => void }
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

/** Filter chips (item 7): one choice (radios) or several (checkboxes); the chosen ones get the tick. */
export function Chips(props: ChipsProps) {
  const { legend, options, hideLegend, error } = props;
  const auto = useId();
  const name = props.name ?? auto;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className={hideLegend ? "sr-only" : "mb-2 text-label font-medium"}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = props.multiple ? props.value.includes(o.value) : props.value === o.value;
          return (
            <label key={o.value} className="chip">
              <input
                type={props.multiple ? "checkbox" : "radio"}
                name={name}
                value={o.value}
                checked={checked}
                onChange={(e) => {
                  if (props.multiple) props.onChange(e.target.checked ? [...props.value, o.value] : props.value.filter((v) => v !== o.value));
                  else props.onChange(o.value);
                }}
                className="ghost"
              />
              <span>
                {TICK}
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </fieldset>
  );
}

/** One chip for a plain form (no state): a checkbox or radio that posts with the form. */
export function ChipInput({ type = "checkbox", name, value, label, defaultChecked }: { type?: "checkbox" | "radio"; name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="chip">
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} className="ghost" />
      <span>
        {TICK}
        {label}
      </span>
    </label>
  );
}

/** Switch (item 3): a whole row you can tap, the label on the left and the pill on the right. */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
  name,
  defaultChecked,
  disabled,
}: {
  label: string;
  hint?: ReactNode;
  name?: string;
  disabled?: boolean;
} & ({ checked: boolean; onChange: (on: boolean) => void; defaultChecked?: never } | { checked?: never; onChange?: never; defaultChecked?: boolean })) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        name={name}
        disabled={disabled}
        {...(onChange ? { checked, onChange: (e) => onChange(e.target.checked) } : { defaultChecked })}
      />
    </label>
  );
}

/** Segmented control (item 4): two to four choices side by side on a Carta track. */
export function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  hideLegend,
  name: formName,
}: {
  legend: string;
  options: { value: T; label: string }[];
  /** null while nothing is chosen yet. */
  value: T | null;
  onChange: (value: T) => void;
  hideLegend?: boolean;
  /** Set it to send the choice with the form. */
  name?: string;
}) {
  const id = useId();
  const name = formName ?? id;
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className={hideLegend ? "sr-only" : "mb-2 text-label font-medium"}>{legend}</legend>
      <div className="segmented" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="ghost" />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Number stepper: minus, the number in mono, plus. The field still takes typing. */
export function Stepper({
  id,
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  id?: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number | undefined) => void;
  label: string;
}) {
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const base = value ?? min ?? 0;
  const btn =
    "flex size-12 shrink-0 items-center justify-center text-text hover:bg-surface disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent sm:size-10";
  return (
    <div className="stepper inline-flex h-12 w-fit items-stretch overflow-hidden rounded-ui border border-control bg-bg sm:h-10">
      {/* The field comes first in the markup so a wrapping <label> points at it, not at the minus. */}
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="order-2 w-16 min-w-0 border-x border-border bg-transparent text-center"
      />
      <button type="button" className={`order-1 ${btn}`} aria-label={`${label}: meno ${step}`} disabled={value !== undefined && min !== undefined && value <= min} onClick={() => onChange(clamp(base - step))}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" className={`order-3 ${btn}`} aria-label={`${label}: più ${step}`} disabled={value !== undefined && max !== undefined && value >= max} onClick={() => onChange(clamp(value === undefined ? (min ?? 0) : base + step))}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
