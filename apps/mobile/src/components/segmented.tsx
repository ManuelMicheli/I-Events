import { Pressable, StyleSheet, View } from "react-native";
import { control, radius, space, useTheme } from "@/theme";
import { T } from "./text";

/** Two to four choices side by side, one always selected: 44 high, labels wrap instead of overflowing. */
export function Segmented<V extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
}: {
  value: V;
  options: { value: V; label: string; accessibilityLabel?: string }[];
  onChange: (v: V) => void;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: c.bgSubtle }]} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityLabel={o.accessibilityLabel}
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: c.bgSurface, borderColor: c.borderDefault }]}
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
  segmented: { flexDirection: "row", borderRadius: radius.md, padding: space[1], gap: space[1] },
  segment: {
    flex: 1,
    minHeight: control.touch,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  center: { textAlign: "center" },
});
