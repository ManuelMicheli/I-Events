import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { easeOut, useReduceMotion } from "@/lib/motion";
import { control, fonts, radius, space, type as typeScale, useTheme } from "@/theme";
import { T } from "./text";

/**
 * Carta controls (carta-componenti-spec.md, items 3 and 7, and the stepper), as on the website: the
 * switch, the checkbox and the number stepper. Chips are in chip.tsx, the segmented control in
 * segmented.tsx, the confirmation in confirm.tsx.
 */

/** Switch (item 3): the whole row takes the tap, label and hint on the left, the 36 x 20 pill on the right. */
export function Toggle({
  label,
  hint,
  value,
  onChange,
  disabled = false,
  tone = "primary",
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  /** "secondary" for a quiet option under a field, such as the internal note in a conversation. */
  tone?: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      role="switch"
      aria-checked={value}
      aria-disabled={disabled || undefined}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={[styles.toggle, disabled && styles.off]}
    >
      <View style={styles.texts}>
        <T variant={tone === "primary" ? "calloutStrong" : "callout"} tone={tone}>
          {label}
        </T>
        {hint && (
          <T variant="caption" tone="secondary">
            {hint}
          </T>
        )}
      </View>
      <SwitchPill on={value} />
    </Pressable>
  );
}

/** On in Grafite, off in the control grey; the white knob slides 16 in 160 ms (in dark mode, on, it takes the page colour). */
function SwitchPill({ on }: { on: boolean }) {
  const { c, scheme } = useTheme();
  const reduce = useReduceMotion();
  const [x] = useState(() => new Animated.Value(on ? 16 : 0));
  useEffect(() => {
    if (reduce) x.setValue(on ? 16 : 0);
    else Animated.timing(x, { toValue: on ? 16 : 0, duration: 160, easing: easeOut, useNativeDriver: true }).start();
  }, [on, reduce, x]);
  return (
    <View style={[styles.pill, { backgroundColor: on ? c.textPrimary : c.borderControl }]}>
      <Animated.View style={[styles.knob, { backgroundColor: on && scheme === "dark" ? c.bgApp : "#FFFFFF", transform: [{ translateX: x }] }]} />
    </View>
  );
}

/** Checkbox, 20 on a phone: radius 4, 1.5 border in the control grey; ticked, filled in Grafite with the mark in the page colour. */
export function CheckBox({ checked }: { checked: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[styles.box, { borderColor: checked ? c.textPrimary : c.borderControl, backgroundColor: checked ? c.textPrimary : "transparent" }]}>
      {checked && (
        <Svg width={14} height={14} viewBox="0 0 12 12" fill="none">
          <Path d="M2.5 6.25l2.25 2.25 4.75-5" stroke={c.bgApp} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

/** A checkbox with its label, the whole row (44 high) takes the tap. */
export function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.check, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <CheckBox checked={checked} />
      <T variant="callout" style={styles.texts}>
        {label}
      </T>
    </Pressable>
  );
}

/**
 * Number stepper: minus, the number in mono, plus, 48 high on a phone, in one bordered box. The
 * number still takes typing; a value outside min and max goes back to the last good one when the
 * field is left.
 */
export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number | undefined) => void;
  /** What is counted, for the screen reader: "Quanti eventi?". */
  label: string;
}) {
  const { c, scheme } = useTheme();
  // While the field is being typed in it shows what was typed; otherwise the value.
  const [typed, setTyped] = useState<string | null>(null);
  const focused = typed !== null;
  const shown = typed ?? (value === undefined ? "" : String(value));
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const base = value ?? min ?? 0;
  const lowest = value !== undefined && min !== undefined && value <= min;
  const highest = value !== undefined && max !== undefined && value >= max;
  const ring = scheme === "dark" ? "rgba(241,236,228,0.16)" : "rgba(28,27,25,0.08)";

  const button = (sign: -1 | 1, off: boolean) => (
    <Pressable
      onPress={() => onChange(sign < 0 ? clamp(base - step) : clamp(value === undefined ? (min ?? 0) : base + step))}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${sign < 0 ? "meno" : "più"} ${step}`}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d={sign < 0 ? "M3.5 8h9" : "M8 3.5v9M3.5 8h9"} stroke={off ? c.textDisabled : c.textPrimary} strokeWidth={1.5} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );

  return (
    <View style={[styles.ring, { borderColor: focused ? ring : "transparent" }]}>
      <View style={[styles.stepper, { backgroundColor: c.bgSurface, borderColor: focused ? c.focus : c.borderControl }]}>
        {button(-1, lowest)}
        <TextInput
          value={shown}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, "").slice(0, 6);
            setTyped(digits);
            if (digits === "") return onChange(undefined);
            const n = Number(digits);
            if (n === clamp(n)) onChange(n);
          }}
          onFocus={() => setTyped(shown)}
          onBlur={() => setTyped(null)}
          keyboardType="number-pad"
          selectTextOnFocus
          accessibilityLabel={label}
          selectionColor={c.accentFill}
          maxFontSizeMultiplier={1.6}
          style={[styles.input, { color: c.textPrimary, borderColor: c.borderStrong }]}
        />
        {button(1, highest)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { minHeight: control.touch, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[4] },
  off: { opacity: 0.5 },
  texts: { flex: 1, minWidth: 0 },
  pill: { width: 36, height: 20, borderRadius: radius.full, padding: 2 },
  knob: { width: 16, height: 16, borderRadius: radius.full, boxShadow: "0 1px 2px rgba(28,27,25,0.2)" },
  box: { width: 20, height: 20, borderRadius: radius.xs, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  check: { minHeight: control.touch, flexDirection: "row", alignItems: "center", gap: space[3], marginHorizontal: -space[2], paddingHorizontal: space[2], borderRadius: radius.sm },
  // The focus halo sits outside the box without moving it.
  ring: { alignSelf: "flex-start", borderWidth: 4, borderRadius: radius.md + 4, margin: -4 },
  stepper: { flexDirection: "row", alignItems: "stretch", height: control.l, borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  step: { width: control.l, alignItems: "center", justifyContent: "center" },
  input: {
    width: 64,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    textAlign: "center",
    fontFamily: fonts.mono["500"],
    fontSize: typeScale.body.fontSize,
    paddingVertical: 0,
    outlineWidth: 0,
  },
});
