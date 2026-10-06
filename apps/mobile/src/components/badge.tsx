import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, type ComponentProps } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { radius, space, useTheme } from "@/theme";
import { T, type Tone } from "./text";

export type BadgeTone = "accent" | "neutral" | "success" | "warning" | "danger" | "outline";

/**
 * Status pill, 24 high. Colour never carries the meaning alone: every tone comes with its label and
 * the stronger ones with an icon or the live dot.
 */
export function Badge({
  label,
  tone = "neutral",
  icon,
  live = false,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: ComponentProps<typeof Ionicons>["name"];
  live?: boolean;
}) {
  const { c } = useTheme();
  const look: Record<BadgeTone, { bg: string; fg: string; tone: Tone; border?: string }> = {
    accent: { bg: c.accentSubtle, fg: c.accentText, tone: "accent" },
    neutral: { bg: c.bgSubtle, fg: c.textSecondary, tone: "secondary" },
    success: { bg: c.successBg, fg: c.success, tone: "success" },
    warning: { bg: c.warningBg, fg: c.warning, tone: "warning" },
    danger: { bg: c.dangerBg, fg: c.danger, tone: "danger" },
    outline: { bg: "transparent", fg: c.textSecondary, tone: "secondary", border: c.borderStrong },
  };
  const l = look[tone];
  return (
    <View style={[styles.badge, { backgroundColor: l.bg, borderColor: l.border ?? "transparent" }]}>
      {live && <LiveDot />}
      {icon && <Ionicons name={icon} size={14} color={l.fg} />}
      <T variant="label" tone={l.tone} numberOfLines={1} style={styles.label}>
        {label}
      </T>
    </View>
  );
}

/** The live dot: Fiamma, with a halo that breathes every 2 s. Still when Reduce Motion is on. */
export function LiveDot() {
  const { c } = useTheme();
  const [halo] = useState(() => new Animated.Value(0));
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(halo, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [halo, reduce]);

  return (
    <View style={styles.dotBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {!reduce && (
        <Animated.View
          style={[
            styles.halo,
            {
              backgroundColor: c.accentFill,
              opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
              transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
            },
          ]}
        />
      )}
      <View style={[styles.dot, { backgroundColor: c.accentFill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: space[2],
    flexDirection: "row",
    alignItems: "center",
    gap: space[1],
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  label: { flexShrink: 1 },
  dotBox: { width: 8, height: 8, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 8, height: 8, borderRadius: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
