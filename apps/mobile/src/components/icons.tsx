import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, type EasingFunction } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { easeInOut, useReduceMotion } from "@/lib/motion";

/**
 * Icons in motion (A10, "Carta e inchiostro"), as on the website: each icon is drawn in parts that
 * move on their own, like paper and metal would. The bell swings from its hook and the clapper
 * follows late, the ticket tears along its perforation, the calendar loses a sheet, the compass
 * needle settles. They move only when something happens (an arrival, a tap, a section opened),
 * never when a screen opens; with Reduce Motion every icon is simply in its final state.
 *
 * Every moving part is its own layer of the same size, so it turns around the point of the 20/24
 * grid where the real object would hinge. The keyframes are the ones under A10 in the website's
 * globals.css.
 */

/** A keyframe: where in the animation (0-100), the value, and the easing up to the next keyframe. */
type Frame = [at: number, value: number, easing?: EasingFunction];

const swing = Easing.bezier(0.45, 0, 0.55, 1);
const strain = Easing.bezier(0.5, 0, 0.8, 0.4);
const give = Easing.bezier(0.2, 0.6, 0.3, 1);

function keyframes(v: Animated.Value, frames: Frame[], duration: number) {
  v.setValue(frames[0]![1]);
  const steps = frames.slice(1).map(([at, value], i) => {
    const [from, , easing] = frames[i]!;
    return Animated.timing(v, { toValue: value, duration: ((at - from) / 100) * duration, easing: easing ?? Easing.linear, useNativeDriver: true });
  });
  return Animated.sequence(steps);
}

/** One value per moving property, kept for the life of the icon. */
function useValues<K extends string>(rest: Record<K, number>) {
  const [values] = useState(() => Object.fromEntries(Object.entries(rest).map(([k, n]) => [k, new Animated.Value(n as number)])) as Record<K, Animated.Value>);
  return values;
}

/** Runs one animation at a time and stops it when the icon goes away. */
function usePlayer() {
  const running = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => () => running.current?.stop(), []);
  return (animation: Animated.CompositeAnimation) => {
    running.current?.stop();
    running.current = animation;
    animation.start();
  };
}

const deg = (v: Animated.Value) => v.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] });

/** A layer that moves: the whole icon box, turning around (x, y) of the grid. */
function Part({ k, origin, style, children }: { k: number; origin: [number, number]; style?: object; children: ReactNode }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: `${origin[0] * k}px ${origin[1] * k}px` }, style]}>
      {children}
    </Animated.View>
  );
}

/** The drawing of one layer, on the icon's grid. */
function Draw({ size, grid, children }: { size: number; grid: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${grid} ${grid}`} fill="none" style={StyleSheet.absoluteFill}>
      {children}
    </Svg>
  );
}

function Box({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      {children}
    </View>
  );
}

/** Calls `run` each time `value` changes, with the new value; never on the first render. */
function useOnChange<T>(value: T, run: (value: T) => void) {
  const last = useRef(value);
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });
  useEffect(() => {
    if (value === last.current) return;
    last.current = value;
    latest.current(value);
  }, [value]);
}

/** Calls `play` each time `trigger` changes to a value that is not 0; never on the first render. */
function usePlay(trigger: number, play: () => void) {
  useOnChange(trigger, (t) => t !== 0 && play());
}

/**
 * The bell: each time `ring` changes it swings from its hook, the clapper lags and strikes and two
 * sound lines answer, 900 ms. Drawn on a 20 grid; the lines stay 1.5 wide at any size.
 */
export function BellIcon({ ring, color, size = 24 }: { ring: number; color: string; size?: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ body: 0, clapper: 0, waveL: 0, waveR: 0, shiftL: 0, shiftR: 0, scale: 1 });
  const player = usePlayer();
  usePlay(ring, () => {
    if (reduce) return;
    const d = 900;
    const sound: Frame[] = [[0, 0], [10, 0], [16, 0.9], [28, 0], [34, 0.6], [48, 0], [100, 0]];
    const out = (s: number): Frame[] => [[0, s], [10, s], [16, 0], [28, -1.5 * Math.sign(s)], [34, 0], [48, -1.5 * Math.sign(s)], [100, 0]];
    player(
      Animated.parallel([
        keyframes(v.body, [[0, 0, Easing.bezier(0.3, 0, 0.4, 1)], [14, 17, swing], [32, -13, swing], [50, 8, swing], [66, -4.5, swing], [82, 2, swing], [100, 0]], d),
        keyframes(v.clapper, [[0, 0], [6, 0, swing], [20, -16, swing], [38, 13, swing], [56, -8, swing], [72, 4, swing], [88, -1.5], [100, 0]], d),
        keyframes(v.waveL, sound, d),
        keyframes(v.waveR, sound, d),
        keyframes(v.shiftL, out(1), d),
        keyframes(v.shiftR, out(-1), d),
        keyframes(v.scale, [[0, 0.8], [10, 0.8], [16, 1], [28, 1.05], [34, 1], [48, 1.05], [100, 1]], d),
      ]),
    );
  });
  const k = size / 20;
  const w = (n: number) => n / k;
  const wave = (shift: Animated.Value) => ({ transform: [{ translateX: Animated.multiply(shift, k) }, { scale: v.scale }] });
  return (
    <Box size={size}>
      <Part k={k} origin={[10, 1.75]} style={{ transform: [{ rotate: deg(v.body) }] }}>
        <Draw size={size} grid={20}>
          <Path d="M10 1.75V3" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" />
          <Path d="M5 8a5 5 0 0 1 10 0v3.5l1.5 2.5h-13L5 11.5V8Z" stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" />
        </Draw>
        <Part k={k} origin={[10, 14]} style={{ transform: [{ rotate: deg(v.clapper) }] }}>
          <Draw size={size} grid={20}>
            <Path d="M8 16.5a2 2 0 0 0 4 0" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" />
          </Draw>
        </Part>
      </Part>
      <Part k={k} origin={[1.75, 8.25]} style={[{ opacity: v.waveL }, wave(v.shiftL)]}>
        <Draw size={size} grid={20}>
          <Path d="M1.75 5.5q-1.25 2.75 0 5.5" stroke={color} strokeWidth={w(1.25)} strokeLinecap="round" />
        </Draw>
      </Part>
      <Part k={k} origin={[18.25, 8.25]} style={[{ opacity: v.waveR }, wave(v.shiftR)]}>
        <Draw size={size} grid={20}>
          <Path d="M18.25 5.5q1.25 2.75 0 5.5" stroke={color} strokeWidth={w(1.25)} strokeLinecap="round" />
        </Draw>
      </Part>
    </Box>
  );
}

const STUB = "M9.5 5.75H5A1.75 1.75 0 0 0 3.25 7.5v2.25a2.25 2.25 0 0 1 0 4.5v2.25A1.75 1.75 0 0 0 5 18.25h4.5";
const BODY = "M9.5 5.75H19a1.75 1.75 0 0 1 1.75 1.75v2.25a2.25 2.25 0 0 0 0 4.5v2.25A1.75 1.75 0 0 1 19 18.25H9.5";
/** The ragged line of a tear, five teeth down the perforation: both halves keep the same line, so they fit. */
const RAGGED = "M9.5 5.75" + " l.6 1.25 -.6 1.25".repeat(5);
/** Where the stub hangs once torn off: it hinges on the foot of the perforation. */
const HANG = { x: -1.75, y: 2.25, turn: -20 };

/**
 * The ticket: a stub and a body that meet at the perforation. When `torn` turns true the stub
 * strains, gives and swings out to hang off a ragged edge (an arrival checked in); back to false it
 * mends. Each change of `tug` tears it and lets it snap back (Biglietti opened).
 */
export function TicketIcon({
  color,
  hole,
  filled = false,
  torn = false,
  tug = 0,
  size = 24,
}: {
  color: string;
  /** The colour behind the icon, for the perforation of the filled ticket. */
  hole?: string;
  filled?: boolean;
  torn?: boolean;
  tug?: number;
  size?: number;
}) {
  const reduce = useReduceMotion();
  const v = useValues({ x: torn ? HANG.x : 0, y: torn ? HANG.y : 0, turn: torn ? HANG.turn : 0, body: 0, edge: torn ? 1 : 0, perf: torn ? 0 : 1 });
  const player = usePlayer();

  const settle = (on: boolean) => {
    v.x.setValue(on ? HANG.x : 0);
    v.y.setValue(on ? HANG.y : 0);
    v.turn.setValue(on ? HANG.turn : 0);
    v.body.setValue(0);
    v.edge.setValue(on ? 1 : 0);
    v.perf.setValue(on ? 0 : 1);
  };

  useOnChange(torn, (torn) => {
    if (reduce) return settle(torn);
    if (torn) {
      const d = 640;
      player(
        Animated.parallel([
          keyframes(v.x, [[0, 0, strain], [28, -0.25, give], [56, HANG.x, swing], [78, HANG.x, swing], [100, HANG.x]], d),
          keyframes(v.y, [[0, 0, strain], [28, 0, give], [56, HANG.y, swing], [78, HANG.y, swing], [100, HANG.y]], d),
          keyframes(v.turn, [[0, 0, strain], [28, -3, give], [56, -24, swing], [78, -17.5, swing], [100, HANG.turn]], d),
          keyframes(v.body, [[0, 0, strain], [28, 1.5, give], [48, -1], [70, 0], [100, 0]], d),
          keyframes(v.edge, [[0, 0], [30, 0], [40, 1], [100, 1]], d),
          keyframes(v.perf, [[0, 1], [30, 1], [38, 0], [100, 0]], d),
        ]),
      );
    } else {
      const d = 320;
      v.body.setValue(0);
      v.perf.setValue(1);
      player(
        Animated.parallel([
          keyframes(v.x, [[0, HANG.x, easeInOut], [100, 0]], d),
          keyframes(v.y, [[0, HANG.y, easeInOut], [100, 0]], d),
          keyframes(v.turn, [[0, HANG.turn, easeInOut], [100, 0]], d),
          keyframes(v.edge, [[0, 1], [70, 1], [100, 0]], d),
        ]),
      );
    }
  });

  usePlay(tug, () => {
    if (reduce || torn) return;
    const d = 760;
    const pull = Easing.bezier(0.6, 0, 0.4, 1);
    player(
      Animated.parallel([
        keyframes(v.x, [[0, 0, strain], [22, -0.25, give], [44, -1.25], [58, -1.25, pull], [82, 0, swing], [100, 0]], d),
        keyframes(v.y, [[0, 0, strain], [22, 0, give], [44, 1.5], [58, 1.5, pull], [82, 0, swing], [100, 0]], d),
        keyframes(v.turn, [[0, 0, strain], [22, -3, give], [44, -17], [58, -15, pull], [82, 1.5, swing], [100, 0]], d),
        keyframes(v.body, [[0, 0, strain], [28, 1.5, give], [48, -1], [70, 0], [100, 0]], d),
        keyframes(v.edge, [[0, 0], [26, 0], [34, 1], [70, 1], [80, 0], [100, 0]], d),
        keyframes(v.perf, [[0, 1], [26, 1], [32, 0], [74, 0], [82, 1], [100, 1]], d),
      ]),
    );
  });

  const k = size / 24;
  const edge = (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.edge }]}>
      <Draw size={size} grid={24}>
        <Path d={RAGGED} stroke={color} strokeWidth={1.25} strokeLinejoin="round" />
      </Draw>
    </Animated.View>
  );
  return (
    <Box size={size}>
      <Part k={k} origin={[9.5, 18.25]} style={{ transform: [{ rotate: deg(v.body) }] }}>
        <Draw size={size} grid={24}>
          <Path d={BODY} stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill={filled ? color : "none"} />
        </Draw>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.perf }]}>
          <Draw size={size} grid={24}>
            <Path d="M9.5 8.5v7" stroke={filled && hole ? hole : color} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="1.5 2" />
          </Draw>
        </Animated.View>
        {edge}
      </Part>
      <Part
        k={k}
        origin={[9.5, 18.25]}
        style={{ transform: [{ translateX: Animated.multiply(v.x, k) }, { translateY: Animated.multiply(v.y, k) }, { rotate: deg(v.turn) }] }}
      >
        <Draw size={size} grid={24}>
          <Path d={STUB} stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill={filled ? color : "none"} />
        </Draw>
        {edge}
      </Part>
    </Box>
  );
}

/** The compass of Esplora: each change of `play` swings the needle round; it overshoots north twice and settles, 880 ms. */
export function CompassIcon({ color, hole, filled, play }: { color: string; hole: string; filled: boolean; play: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ needle: 0 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    player(keyframes(v.needle, [[0, -150, Easing.bezier(0.2, 0.6, 0.35, 1)], [38, 24, swing], [60, -11, swing], [80, 4, swing], [100, 0]], 880));
  });
  const size = 24;
  return (
    <Box size={size}>
      <Draw size={size} grid={24}>
        <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} fill={filled ? color : "none"} />
      </Draw>
      <Part k={1} origin={[12, 12]} style={{ transform: [{ rotate: deg(v.needle) }] }}>
        <Draw size={size} grid={24}>
          <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke={filled ? hole : color} fill={filled ? hole : "none"} strokeWidth={1.5} strokeLinejoin="round" />
        </Draw>
      </Part>
    </Box>
  );
}

/** The calendar: each change of `play` tears today's sheet off the pad: the rings dip, the sheet turns and falls, 700 ms. */
export function CalendarIcon({ color, hole, filled, play }: { color: string; hole: string; filled: boolean; play: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ sheet: 0, x: 0, y: 0, turn: 0, rings: 0 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    const d = 700;
    const fall = Easing.bezier(0.4, 0, 0.9, 0.6);
    player(
      Animated.parallel([
        keyframes(v.sheet, [[0, 1, strain], [24, 1, fall], [100, 0]], d),
        keyframes(v.x, [[0, 0, strain], [24, 0, fall], [100, 2.5]], d),
        keyframes(v.y, [[0, 0, strain], [24, 0.25, fall], [100, 8]], d),
        keyframes(v.turn, [[0, 0, strain], [24, 3, fall], [100, 18]], d),
        keyframes(v.rings, [[0, 0, strain], [22, 1, give], [44, 0], [100, 0]], d),
      ]),
    );
  });
  const size = 24;
  return (
    <Box size={size}>
      <Draw size={size} grid={24}>
        <Rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" stroke={color} strokeWidth={1.5} fill={filled ? color : "none"} />
        <Path d="M3.75 10h16.5" stroke={filled ? hole : color} strokeWidth={1.5} />
      </Draw>
      <Part k={1} origin={[12, 5.25]} style={{ transform: [{ translateY: v.rings }] }}>
        <Draw size={size} grid={24}>
          <Path d="M8 3.25v4M16 3.25v4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Draw>
      </Part>
      <Part k={1} origin={[3.75, 10]} style={{ opacity: v.sheet, transform: [{ translateX: v.x }, { translateY: v.y }, { rotate: deg(v.turn) }] }}>
        <Draw size={size} grid={24}>
          <Path
            d="M3.75 10h16.5v7.75a2.5 2.5 0 0 1-2.5 2.5H6.25a2.5 2.5 0 0 1-2.5-2.5Z"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            fill={filled ? color : hole}
          />
        </Draw>
      </Part>
    </Box>
  );
}
