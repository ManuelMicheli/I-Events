import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, type EasingFunction } from "react-native";
import Svg, { Path } from "react-native-svg";

/**
 * The parts every icon in motion (A10) is built from: keyframes like the website's CSS, the layers
 * that move, and the hooks that play them. See icons.tsx and nav-icons.tsx.
 */

/** A keyframe: where in the animation (0-100), the value, and the easing up to the next keyframe. */
export type Frame = [at: number, value: number, easing?: EasingFunction];

export const swing = Easing.bezier(0.45, 0, 0.55, 1);
export const strain = Easing.bezier(0.5, 0, 0.8, 0.4);
export const give = Easing.bezier(0.2, 0.6, 0.3, 1);

/** The keyframes from wherever the value is now: the first one only gives the easing of the first step. */
export function steps(v: Animated.Value, frames: Frame[], duration: number, native = true) {
  const all = frames.slice(1).map(([at, value], i) => {
    const [from, , easing] = frames[i]!;
    return Animated.timing(v, { toValue: value, duration: ((at - from) / 100) * duration, easing: easing ?? Easing.linear, useNativeDriver: native });
  });
  return Animated.sequence(all);
}

export function keyframes(v: Animated.Value, frames: Frame[], duration: number, native = true) {
  v.setValue(frames[0]![1]);
  return steps(v, frames, duration, native);
}

/** A change of state that eases, like a CSS transition. */
export function ease(v: Animated.Value, toValue: number, duration: number, easing: EasingFunction) {
  return Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
}

/** One value per moving property, kept for the life of the icon. */
export function useValues<K extends string>(rest: Record<K, number>) {
  const [values] = useState(() => Object.fromEntries(Object.entries(rest).map(([k, n]) => [k, new Animated.Value(n as number)])) as Record<K, Animated.Value>);
  return values;
}

/** A moment of an animation, in ms from its start, when something else happens (a haptic tap). */
export type Cue = [ms: number, run: () => void];

/** Runs one animation at a time, with its cues, and stops both when the icon goes away. */
export function usePlayer() {
  const running = useRef<{ animation: Animated.CompositeAnimation; timers: ReturnType<typeof setTimeout>[] } | null>(null);
  useEffect(
    () => () => {
      running.current?.animation.stop();
      running.current?.timers.forEach(clearTimeout);
    },
    [],
  );
  return (animation: Animated.CompositeAnimation, cues: Cue[] = []) => {
    running.current?.animation.stop();
    running.current?.timers.forEach(clearTimeout);
    running.current = { animation, timers: cues.map(([ms, run]) => setTimeout(run, ms)) };
    animation.start();
  };
}

export const deg = (v: Animated.Value) => v.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] });

/** A layer that moves: the whole icon box, turning around (x, y) of the grid. */
export function Part({ k, origin, style, children }: { k: number; origin: [number, number]; style?: object; children: ReactNode }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: `${origin[0] * k}px ${origin[1] * k}px` }, style]}>
      {children}
    </Animated.View>
  );
}

/** The drawing of one layer, on the icon's grid. */
export function Draw({ size, grid, children }: { size: number; grid: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${grid} ${grid}`} fill="none" style={StyleSheet.absoluteFill}>
      {children}
    </Svg>
  );
}

export function Box({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      {children}
    </View>
  );
}

/**
 * Calls `run` each time `value` changes, with the new value and the one before; on the first render
 * only when it differs from `from`, the value it is taken to come from (by default, itself).
 */
export function useOnChange<T>(value: T, run: (value: T, before: T) => void, from: T = value) {
  const last = useRef(from);
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });
  useEffect(() => {
    if (value === last.current) return;
    const before = last.current;
    last.current = value;
    latest.current(value, before);
  }, [value]);
}

/**
 * Calls `play` each time `trigger` changes to a value that is not 0 or false (a new count, or true:
 * the finger on the button); never on the first render.
 */
export function usePlay(trigger: number | boolean, play: () => void) {
  useOnChange(trigger, (t) => t !== 0 && t !== false && play());
}

export const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The icons below are drawn on a 20 grid, like the website's; their lines stay 1.5 wide at any size. */
export const grid20 = (size: number) => {
  const k = size / 20;
  return { k, w: (n: number) => n / k };
};
