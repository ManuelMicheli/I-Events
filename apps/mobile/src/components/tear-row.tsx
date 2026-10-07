import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState, type ReactNode } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { easeOut, useReduceMotion } from "@/lib/motion";
import { motion, space, useTheme } from "@/theme";
import { T } from "./text";

/** How far the row has to travel, as a share of its width, before letting go tears it. */
const TEAR_AT = 0.4;

/**
 * "Lo strappo" (A7), the check-in of the event day: the row follows the finger to the right 1:1 and,
 * let go past 40% of its width, tears off (on, turning 4 degrees, fading in 240 ms) and comes back
 * checked in. Short of that it slides back. The row's own button does the same without the gesture.
 */
export function TearRow({ enabled, onTear, children }: { enabled: boolean; onTear: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const [x] = useState(() => new Animated.Value(0));
  const [torn] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const responder = useMemo(() => {
    const back = () => Animated.timing(x, { toValue: 0, duration: motion.base, easing: easeOut, useNativeDriver: true }).start();
    const tear = () => {
      const away = reduce
        ? Animated.timing(torn, { toValue: 1, duration: motion.fast, useNativeDriver: true })
        : Animated.parallel([
            Animated.timing(x, { toValue: width, duration: motion.moderate, easing: easeOut, useNativeDriver: true }),
            Animated.timing(torn, { toValue: 1, duration: motion.moderate, easing: easeOut, useNativeDriver: true }),
          ]);
      away.start(() => {
        onTear();
        x.setValue(0);
        // The row comes back in place, now checked in.
        Animated.timing(torn, { toValue: 0, duration: motion.fast, easing: easeOut, useNativeDriver: true }).start();
      });
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => enabled && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => x.setValue(Math.max(0, g.dx)),
      onPanResponderRelease: (_, g) => (g.dx > width * TEAR_AT ? tear() : back()),
      onPanResponderTerminate: back,
    });
  }, [enabled, onTear, width, reduce, x, torn]);

  const reveal = width > 0 ? x.interpolate({ inputRange: [0, width * TEAR_AT], outputRange: [0, 1], extrapolate: "clamp" }) : 0;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {enabled && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.under, { backgroundColor: c.successBg, opacity: reveal }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Ionicons name="checkmark-circle" size={20} color={c.success} />
          <T variant="calloutStrong" tone="success">
            Check-in
          </T>
        </Animated.View>
      )}
      <Animated.View
        {...responder.panHandlers}
        style={{
          backgroundColor: c.bgSurface,
          opacity: torn.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ translateX: x }, { rotate: torn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", reduce ? "0deg" : "4deg"] }) }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  under: { flexDirection: "row", alignItems: "center", gap: space[2], paddingHorizontal: space[4] },
});
