import { useState } from "react";
import { parseItalianDate } from "@/lib/format";
import { TextField } from "./text-field";

const toText = (iso: string | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

/** Digits only, with the slashes put in while typing: 1411 → 14/11. */
function mask(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
}

/** A date typed as GG/MM/AAAA with the number pad. The value is ISO (2026-11-14) or undefined. */
export function DateField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  error?: string;
  hint?: string;
}) {
  const [text, setText] = useState(() => toText(value));
  const [touched, setTouched] = useState(false);
  const wrong = touched && text !== "" && parseItalianDate(text) === null;
  return (
    <TextField
      label={label}
      value={text}
      placeholder="GG/MM/AAAA"
      keyboardType="number-pad"
      maxLength={10}
      error={error ?? (wrong ? "Scrivi la data come 14/11/2026" : undefined)}
      hint={hint}
      onBlur={() => setTouched(true)}
      onChangeText={(raw) => {
        const next = mask(raw);
        setText(next);
        onChange(next === "" ? undefined : (parseItalianDate(next) ?? undefined));
      }}
    />
  );
}
