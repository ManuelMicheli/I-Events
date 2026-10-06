import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Line } from "react-native-svg";
import { radius, space, useTheme } from "@/theme";
import { PressableScale } from "./pressable-scale";

/** Surface for grouped content: white on Carta, hairline border, radius 16, padding 16. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const look = [styles.card, { backgroundColor: c.bgSurface, borderColor: c.borderDefault }, style];
  if (!onPress) return <View style={look}>{children}</View>;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={look}>
      {children}
    </PressableScale>
  );
}

const NOTCH = 8;

/**
 * The ticket notch: a dashed line across the card with a half-circle cut on each side, the I-Events
 * signature on event cards. Sits directly inside a Card (it reaches out over the card padding).
 */
export function TicketDivider() {
  const { c } = useTheme();
  const notch = { backgroundColor: c.bgApp, borderColor: c.borderDefault };
  return (
    <View style={styles.divider} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={[styles.notch, styles.notchLeft, notch]} />
      <Svg height={1} style={styles.line}>
        <Line x1="0" y1="0.5" x2="100%" y2="0.5" stroke={c.borderStrong} strokeWidth={1} strokeDasharray="4 4" />
      </Svg>
      <View style={[styles.notch, styles.notchRight, notch]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space[4], gap: space[3], overflow: "hidden" },
  divider: { flexDirection: "row", alignItems: "center", marginHorizontal: -space[4] - 1, gap: space[2] },
  notch: { width: NOTCH, height: NOTCH * 2, borderWidth: StyleSheet.hairlineWidth },
  notchLeft: { borderTopRightRadius: NOTCH, borderBottomRightRadius: NOTCH, borderLeftWidth: 0 },
  notchRight: { borderTopLeftRadius: NOTCH, borderBottomLeftRadius: NOTCH, borderRightWidth: 0 },
  line: { flex: 1 },
});
