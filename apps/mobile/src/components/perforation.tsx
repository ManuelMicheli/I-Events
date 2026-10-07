import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { easeInOut, easeOut, useReduceMotion } from "@/lib/motion";
import { motion } from "@/theme";

const DASHES = 6;
const STEP = 200;
const CYCLE = STEP * DASHES;

/**
 * A1 "Perforazione": the wait, in place of a spinner. Six dashes; one at a time goes dark for 200 ms,
 * as if running along the ticket's perforation (cycle 1200 ms). `late` keeps it hidden for the first
 * 200 ms, so short waits show nothing. With Reduce Motion the six pulse together every 1.5 s.
 */
export function Perforation({ color, size = "m", late = false, label }: { color: string; size?: "s" | "m"; late?: boolean; label?: string }) {
  const reduce = useReduceMotion();
  const [clock] = useState(() => new Animated.Value(0));
  const [shown] = useState(() => new Animated.Value(late ? 0 : 1));

  useEffect(() => {
    if (!late) return;
    const appear = Animated.timing(shown, { toValue: 1, duration: motion.fast, delay: 200, easing: easeOut, useNativeDriver: true });
    appear.start();
    return () => appear.stop();
  }, [shown, late]);

  useEffect(() => {
    clock.setValue(0);
    const loop = Animated.loop(Animated.timing(clock, { toValue: 1, duration: reduce ? 1500 : CYCLE, easing: (t) => t, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [clock, reduce]);

  const dash = size === "s" ? styles.small : styles.medium;
  return (
    <Animated.View
      style={[styles.row, size === "s" && styles.rowSmall, { opacity: shown }]}
      accessible={Boolean(label)}
      accessibilityRole={label ? "progressbar" : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      accessibilityElementsHidden={!label}
    >
      {Array.from({ length: DASHES }, (_, i) => {
        // Each dash is dark in its own sixth of the cycle: up over the first half, down over the second.
        const start = i / DASHES;
        const opacity = reduce
          ? clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] })
          : clock.interpolate({
              inputRange: [0, start, start + 0.5 / DASHES, start + 1 / DASHES, 1],
              outputRange: [0.3, 0.3, 1, 0.3, 0.3],
              easing: easeInOut,
            });
        return <Animated.View key={i} style={[dash, { backgroundColor: color, opacity }]} />;
      })}
    </Animated.View>
  );
}

/** A full-width wait for a screen or a block: the perforation centred with room around it. */
export function PerforationBlock({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.block}>
      <Perforation color={color} label={label} late />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowSmall: { gap: 3 },
  medium: { width: 12, height: 3, borderRadius: 2 },
  small: { width: 6, height: 2, borderRadius: 1 },
  block: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
