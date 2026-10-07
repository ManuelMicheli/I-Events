import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { control, radius, space, useTheme } from "@/theme";
import { T, type Tone } from "./text";

type Variant = "primary" | "secondary" | "tertiary" | "destructive";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  disabled?: boolean;
  /** Stretches to the container width; otherwise the button is as wide as its label. */
  block?: boolean;
  /** Where a label-wide button sits in its container. */
  align?: "start" | "center";
  /** "small" fits inside a list row: 44 high, the smallest touch target, with a shorter label. */
  size?: "large" | "small";
  accessibilityHint?: string;
  accessibilityLabel?: string;
};

/**
 * Carta button, 48 high (L, the mobile default). The label never leaves the button: it wraps onto a
 * second line and the button grows. While loading the label stays in place, hidden under a spinner,
 * so the width does not change.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  block = false,
  align = "start",
  size = "large",
  accessibilityHint,
  accessibilityLabel,
}: Props) {
  const { c } = useTheme();
  const [pressed, setPressed] = useState(false);
  const off = disabled || loading;
  const look = {
    primary: { bg: pressed ? c.accentPressed : c.accentFill, border: "transparent", tone: "onAccent" as Tone, spinner: c.onAccent },
    secondary: { bg: pressed ? c.bgSubtle : c.bgSurface, border: c.borderStrong, tone: "primary" as Tone, spinner: c.textPrimary },
    tertiary: { bg: pressed ? c.bgSubtle : "transparent", border: "transparent", tone: "primary" as Tone, spinner: c.textPrimary },
    destructive: { bg: c.danger, border: "transparent", tone: "onDanger" as Tone, spinner: c.onDanger },
  }[variant];
  const disabledLook = disabled && !loading;
  const toneColor = { onAccent: c.onAccent, primary: c.textPrimary, onDanger: c.onDanger }[look.tone as "onAccent" | "primary" | "onDanger"];

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed: p }) => [
        styles.base,
        size === "small" && styles.small,
        {
          backgroundColor: disabledLook && variant !== "tertiary" ? c.bgSubtle : look.bg,
          borderColor: disabledLook ? "transparent" : look.border,
          alignSelf: block ? "stretch" : align === "center" ? "center" : "flex-start",
          transform: [{ scale: p ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.content, loading && styles.hidden]}>
        {icon && <Ionicons name={icon} size={20} color={disabledLook ? c.textDisabled : toneColor} />}
        <T variant={size === "small" ? "calloutStrong" : "bodyStrong"} tone={disabledLook ? "disabled" : look.tone} style={styles.label}>
          {label}
        </T>
      </View>
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color={look.spinner} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: control.l,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space[5],
    paddingVertical: space[2],
    justifyContent: "center",
  },
  small: { minHeight: control.touch, paddingHorizontal: space[4], paddingVertical: space[1] },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[2] },
  label: { textAlign: "center", flexShrink: 1 },
  hidden: { opacity: 0 },
});
