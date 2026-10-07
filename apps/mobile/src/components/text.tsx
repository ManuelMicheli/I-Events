import { Text, type TextProps } from "react-native";
import { fonts, type, useTheme, type Palette, type TypeVariant } from "@/theme";

export type Tone = "primary" | "secondary" | "disabled" | "accent" | "onAccent" | "danger" | "onDanger" | "success" | "warning" | "info";

const toneColor = (c: Palette, tone: Tone) =>
  ({
    primary: c.textPrimary,
    secondary: c.textSecondary,
    disabled: c.textDisabled,
    accent: c.accentText,
    onAccent: c.onAccent,
    danger: c.danger,
    onDanger: c.onDanger,
    success: c.success,
    warning: c.warning,
    info: c.info,
  })[tone];

/** Text in one of the Carta styles. Grows with the system text size, up to twice as large. */
export function T({ variant = "body", tone = "primary", style, ...props }: TextProps & { variant?: TypeVariant; tone?: Tone }) {
  const { c } = useTheme();
  const { mono, ...s } = type[variant] as (typeof type)[TypeVariant] & { mono?: boolean };
  const face = mono
    ? { fontFamily: fonts.mono[s.fontWeight === "400" ? "400" : "500"], fontVariant: ["tabular-nums" as const] }
    : { fontFamily: fonts.sans[s.fontWeight] };
  return (
    <Text
      maxFontSizeMultiplier={2}
      style={[{ fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, color: toneColor(c, tone) }, face, style]}
      {...props}
    />
  );
}
