"use client";

import { Chips, Stepper, Toggle } from "@/components/controls";
import { Field, Input, Select } from "@/components/ui";
import type { Question } from "@i-events/core";

type Props = { question: Question; value: unknown; onChange: (value: unknown) => void; error?: string; idPrefix: string };

/** One question of a service category, rendered by its type. Empty values are removed (undefined). */
export function QuestionField({ question: q, value, onChange, error, idPrefix }: Props) {
  const label = q.required ? `${q.label.it} *` : q.label.it;
  const id = `${idPrefix}-${q.key}`;
  switch (q.type) {
    case "text":
      return (
        <Field label={label} error={error}>
          {q.multiline ? (
            <textarea
              id={id}
              rows={3}
              className="rounded-ui border border-border bg-bg p-3"
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value || undefined)}
            />
          ) : (
            <Input id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)} />
          )}
        </Field>
      );
    case "number":
      return (
        <Field label={q.unit ? `${label} (${q.unit})` : label} error={error}>
          {q.max !== undefined && q.max <= 100 ? (
            <Stepper id={id} label={q.label.it} min={q.min} max={q.max} value={value as number | undefined} onChange={(n) => onChange(n)} />
          ) : (
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={q.min}
            max={q.max}
            value={value === undefined ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
          )}
        </Field>
      );
    case "boolean":
      return (
        <Toggle label={q.label.it} checked={value === true} onChange={(on) => onChange(on ? true : undefined)} />
      );
    case "select":
      if (q.options.length <= 8)
        return (
          <Chips
            legend={label}
            options={q.options.map((o) => ({ value: o.value, label: o.label.it }))}
            value={value as string | undefined}
            onChange={(v) => onChange(v)}
            error={error}
          />
        );
      return (
        <Field label={label} error={error}>
          <Select id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
            <option value="">Scegli…</option>
            {q.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label.it}
              </option>
            ))}
          </Select>
        </Field>
      );
    case "multiselect":
      return (
        <Chips
          multiple
          legend={label}
          options={q.options.map((o) => ({ value: o.value, label: o.label.it }))}
          value={(value as string[] | undefined) ?? []}
          onChange={(next) => onChange(next.length ? next : undefined)}
          error={error}
        />
      );
  }
}
