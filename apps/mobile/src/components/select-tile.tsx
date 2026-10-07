import type { ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { radius, space, useTheme } from "@/theme";

/**
 * A choice drawn as a card. Selected uses the Carta selection style: 2 px Fiamma border on the subtle
 * Fiamma fill (padding shrinks by 1 so nothing moves).
 */
export function SelectTile({
  selected,
  onPress,
  accessibilityLabel,
  multi = false,
  style,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  multi?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.tile,
        selected
          ? { borderWidth: 2, padding: space[4] - 1, borderColor: c.accentFill, backgroundColor: c.accentSubtle }
          : { borderColor: c.borderDefault, backgroundColor: pressed ? c.bgSubtle : c.bgSurface },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { borderWidth: 1, borderRadius: radius.lg, padding: space[4], gap: space[3], minHeight: 44 },
});
