import type { Question } from "@i-events/core";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme";
import { Chip, ChipWrap } from "./chip";
import { Stepper, Toggle } from "./controls";
import { T } from "./text";
import { InlineError, TextField } from "./text-field";

/** One question of a service, drawn by its type as on the website: chips, switch, stepper or field. Empty values become undefined. */
export function QuestionField({
  question: q,
  value,
  onChange,
  error,
}: {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const label = q.required ? `${q.label.it} *` : q.label.it;
  switch (q.type) {
    case "text":
      return (
        <TextField
          label={label}
          value={(value as string | undefined) ?? ""}
          error={error}
          multiline={q.multiline}
          textAlignVertical={q.multiline ? "top" : undefined}
          style={q.multiline ? styles.multiline : undefined}
          onChangeText={(t) => onChange(t === "" ? undefined : t)}
        />
      );
    case "number":
      // A small count (at most 100) takes the stepper, as on the website; bigger numbers are typed.
      if (q.max !== undefined && q.max <= 100)
        return (
          <View style={styles.group}>
            <T variant="label" tone="secondary">
              {q.unit ? `${label} (${q.unit})` : label}
            </T>
            <Stepper label={q.label.it} min={q.min} max={q.max} value={value as number | undefined} onChange={(n) => onChange(n)} />
            {error && <InlineError message={error} />}
          </View>
        );
      return (
        <TextField
          label={q.unit ? `${label} (${q.unit})` : label}
          value={value === undefined ? "" : String(value)}
          error={error}
          keyboardType="number-pad"
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, "").slice(0, 9);
            onChange(digits === "" ? undefined : Number(digits));
          }}
        />
      );
    case "boolean":
      return <Toggle label={q.label.it} value={value === true} onChange={(on) => onChange(on ? true : undefined)} />;
    case "select":
      return (
        <Choices label={label} error={error}>
          {q.options.map((o) => (
            <Chip key={o.value} label={o.label.it} selected={value === o.value} onPress={() => onChange(value === o.value ? undefined : o.value)} />
          ))}
        </Choices>
      );
    case "multiselect": {
      const selected = (value as string[] | undefined) ?? [];
      return (
        <Choices label={label} error={error}>
          {q.options.map((o) => (
            <Chip
              key={o.value}
              multi
              label={o.label.it}
              selected={selected.includes(o.value)}
              onPress={() => {
                const next = selected.includes(o.value) ? selected.filter((v) => v !== o.value) : [...selected, o.value];
                onChange(next.length ? next : undefined);
              }}
            />
          ))}
        </Choices>
      );
    }
  }
}

/** A label over a set of chips, with the error under them. */
export function Choices({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.group} accessibilityLabel={label}>
      <T variant="label" tone="secondary">
        {label}
      </T>
      <ChipWrap>{children}</ChipWrap>
      {error && <InlineError message={error} />}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[1] },
  multiline: { minHeight: 96 },
});
