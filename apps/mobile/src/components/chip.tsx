import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { control, radius, space, useTheme } from "@/theme";
import { T } from "./text";

/** The tick of a chosen chip, as on the website. */
export function ChipTick({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <Path d="M3.5 8.5l3 3 6-7" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Filter chip (Carta item 7), as on the website's phone layout: a 44 high pill, 15 text, border in
 * the strong line colour. Chosen: Fiamma border on the subtle Fiamma fill, with the tick; the text
 * stays Grafite.
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
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      accessibilityLabel={label}
      style={styles.touch}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.pill,
            selected && styles.pillOn,
            {
              borderColor: selected ? c.accentFill : c.borderStrong,
              backgroundColor: selected ? c.accentSubtle : pressed ? c.bgSubtle : c.bgSurface,
            },
          ]}
        >
          {selected && <ChipTick color={c.textPrimary} />}
          {leading}
          <T variant="callout" numberOfLines={1}>
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
    height: control.touch,
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  // The tick brings its own air on the left.
  pillOn: { paddingLeft: space[3] },
  bleed: { marginHorizontal: -space[4], flexGrow: 0 },
  row: { paddingHorizontal: space[4], gap: space[2] },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
