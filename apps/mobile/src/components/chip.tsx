import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { control, radius, space, useTheme } from "@/theme";
import { T } from "./text";

/**
 * Filter chip: a 32 high pill inside a 44 high touch area. Selected uses the Carta selection style
 * (Fiamma border on the subtle Fiamma fill, with a tick), the text stays Grafite.
 */
export function Chip({
  label,
  selected,
  onPress,
  multi = false,
  leading,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  /** Before the label, such as the event type's square. */
  leading?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={label}
      style={styles.touch}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.pill,
            {
              borderColor: selected ? c.accentFill : c.borderStrong,
              backgroundColor: selected ? c.accentSubtle : pressed ? c.bgSubtle : c.bgSurface,
            },
          ]}
        >
          {selected && <Ionicons name="checkmark" size={16} color={c.textPrimary} />}
          {leading}
          <T variant="label" numberOfLines={1}>
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

/** One line of chips that scrolls sideways, edge to edge on the page. */
export function ChipRow({ children, accessibilityLabel }: { children: ReactNode; accessibilityLabel: string }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </ScrollView>
  );
}

/** Chips that wrap onto more lines, for picking several values in a form. */
export function ChipWrap({ children }: { children: ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

const styles = StyleSheet.create({
  touch: { minHeight: control.touch, justifyContent: "center" },
  pill: {
    height: control.s,
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  bleed: { marginHorizontal: -space[4], flexGrow: 0 },
  row: { paddingHorizontal: space[4], gap: space[2] },
  wrap: { flexDirection: "row", flexWrap: "wrap", columnGap: space[2] },
});
