import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Line } from "react-native-svg";
import { cardShadow, radius, space, useTheme } from "@/theme";
import { PressableScale } from "./pressable-scale";

/**
 * Surface for grouped content: white on Carta, hairline border, radius 18, padding 16, floating on a wide
 * soft shadow as on the website (Wharf reference).
 */
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
  const { c, scheme } = useTheme();
  // Two layers: the outer one casts the shadow and takes the card's place in the layout, the inner one
  // clips the content to the radius (on iOS a clipping view cannot cast a shadow).
  const { outer, inner } = splitStyle(style);
  const shadow = cardShadow[scheme];
  const body = <View style={[styles.card, { backgroundColor: c.bgSurface, borderColor: c.borderDefault }, inner]}>{children}</View>;
  if (!onPress) return <View style={[styles.shadow, shadow, outer]}>{body}</View>;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      pressableStyle={outer.flex !== undefined ? { flex: outer.flex } : undefined}
      style={[styles.shadow, shadow, outer]}
    >
      {body}
    </PressableScale>
  );
}

/** Style keys that place the card in its parent; the rest shape its inside. */
const PLACE = new Set(["flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf", "width", "minWidth", "maxWidth", "height", "minHeight", "maxHeight", "position", "top", "right", "bottom", "left", "zIndex", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "marginHorizontal", "marginVertical"]);

function splitStyle(style: StyleProp<ViewStyle>) {
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (PLACE.has(k) ? outer : inner)[k] = v;
  // A card stretched by its parent stretches its inside too.
  if (outer.flex !== undefined || outer.height !== undefined || outer.minHeight !== undefined) inner.flexGrow = 1;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
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
  shadow: { borderRadius: radius.card, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: space[4], gap: space[3], overflow: "hidden" },
  divider: { flexDirection: "row", alignItems: "center", marginHorizontal: -space[4] - 1, gap: space[2] },
  notch: { width: NOTCH, height: NOTCH * 2, borderWidth: StyleSheet.hairlineWidth },
  notchLeft: { borderTopRightRadius: NOTCH, borderBottomRightRadius: NOTCH, borderLeftWidth: 0 },
  notchRight: { borderTopLeftRadius: NOTCH, borderBottomLeftRadius: NOTCH, borderRightWidth: 0 },
  line: { flex: 1 },
});
