import { Pressable, StyleSheet, View } from "react-native";
import { control, radius, space, useTheme } from "@/theme";
import { T } from "./text";

/**
 * Segmented control (Carta item 4), as on the website: two to four choices side by side on a Carta
 * track, one always chosen. The chosen one lifts off the track (white with a light shadow; in dark
 * mode the pressed surface). 44 high, labels wrap instead of overflowing, at most 480 wide.
 * `kind="tabs"` switches parts of a screen; a choice in a form is a radio group.
 */
export function Segmented<V extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  kind = "tabs",
}: {
  value: V;
  options: { value: V; label: string; accessibilityLabel?: string }[];
  onChange: (v: V) => void;
  accessibilityLabel?: string;
  kind?: "tabs" | "choice";
}) {
  const { c, scheme } = useTheme();
  const tabs = kind === "tabs";
  return (
    <View
      style={[styles.track, { backgroundColor: c.bgSubtle }]}
      role={tabs ? "tablist" : "radiogroup"}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            role={tabs ? "tab" : "radio"}
            aria-selected={tabs ? on : undefined}
            aria-checked={tabs ? undefined : on}
            accessibilityLabel={o.accessibilityLabel}
            style={[styles.segment, on && (scheme === "dark" ? { backgroundColor: c.bgPressed } : [styles.lift, { backgroundColor: c.bgSurface }])]}
          >
            <T variant={on ? "calloutStrong" : "callout"} tone={on ? "primary" : "secondary"} style={styles.center}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", width: "100%", maxWidth: 480, borderRadius: radius.md, padding: space[1], gap: space[1] },
  segment: {
    flex: 1,
    minHeight: control.touch,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.sm,
  },
  // Carta shadow 1 (none in dark mode, where the pressed surface lifts it).
  lift: { boxShadow: "0 1px 2px rgba(28,27,25,0.06), 0 1px 1px rgba(28,27,25,0.04)" },
  center: { textAlign: "center" },
});
