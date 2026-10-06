import Ionicons from "@expo/vector-icons/Ionicons";
import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { control, fonts, radius, space, type, useTheme } from "@/theme";
import { T } from "./text";

type Props = TextInputProps & { label: string; error?: string; hint?: string };

/** Labelled text field, 48 high. The error sits right under the field, with an icon. */
export const TextField = forwardRef<TextInput, Props>(function TextField({ label, error, hint, style, onFocus, onBlur, ...props }, ref) {
  const { c, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const ring = scheme === "dark" ? "rgba(241,236,228,0.16)" : "rgba(28,27,25,0.08)";
  return (
    <View style={styles.group}>
      <T variant="label" tone="secondary" nativeID={`${label}-label`}>
        {label}
      </T>
      <View style={[styles.ring, { borderColor: focused ? ring : "transparent" }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${label}-label`}
          placeholderTextColor={c.textSecondary}
          selectionColor={c.accentFill}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: c.textPrimary,
              backgroundColor: c.bgSurface,
              borderColor: error ? c.danger : focused ? c.focus : c.borderControl,
              fontFamily: fonts.sans,
            },
            style,
          ]}
          maxFontSizeMultiplier={2}
          {...props}
        />
      </View>
      {error ? (
        <InlineError message={error} />
      ) : hint ? (
        <T variant="caption" tone="secondary">
          {hint}
        </T>
      ) : null}
    </View>
  );
});

/** Error message next to what caused it: colour, icon and text together. */
export function InlineError({ message }: { message: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.message} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Ionicons name="alert-circle" size={16} color={c.danger} style={styles.icon} />
      <T variant="callout" tone="danger" style={styles.flex}>
        {message}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  ring: { borderWidth: 3, borderRadius: radius.md + 3, margin: -3 },
  input: {
    minHeight: control.l,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: type.body.fontSize,
  },
  message: { flexDirection: "row", gap: space[1], alignItems: "flex-start" },
  icon: { marginTop: 3 },
  flex: { flex: 1 },
});
