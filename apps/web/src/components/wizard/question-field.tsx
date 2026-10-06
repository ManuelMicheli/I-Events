"use client";

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
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={q.min}
            max={q.max}
            value={value === undefined ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </Field>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked ? true : undefined)} />
          {q.label.it}
        </label>
      );
    case "select":
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
    case "multiselect": {
      const selected = (value as string[] | undefined) ?? [];
      return (
        <fieldset className="flex flex-col gap-1.5 text-sm">
          <legend className="mb-1 font-medium">{label}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {q.options.map((o) => (
              <label key={o.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value);
                    onChange(next.length ? next : undefined);
                  }}
                />
                {o.label.it}
              </label>
            ))}
          </div>
          {error && <span className="text-danger">{error}</span>}
        </fieldset>
      );
    }
  }
}
