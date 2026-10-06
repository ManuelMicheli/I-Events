import { useState, type ReactNode } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { motion } from "@/theme";

/** Pressable that shrinks to 0.98 on touch-down, the Carta press feedback. */
export function PressableScale({
  style,
  children,
  ...props
}: Omit<PressableProps, "style" | "children"> & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (value: number, duration: number) => Animated.timing(scale, { toValue: value, duration, useNativeDriver: true }).start();
  return (
    <Pressable
      onPressIn={(e) => {
        to(0.98, motion.fast);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1, motion.base);
        props.onPressOut?.(e);
      }}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
