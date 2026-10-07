import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, type EasingFunction } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { haptics } from "@/lib/haptics";
import { easeInOut, easeOut, useReduceMotion } from "@/lib/motion";

/**
 * Icons in motion (A10, "Carta e inchiostro"), as on the website: each icon is drawn in parts that
 * move on their own, like paper and metal would. The bell swings from its hook and the clapper
 * follows late, the ticket tears along its perforation, the calendar loses a sheet, the compass
 * needle settles. They move only when something happens (an arrival, a tap, a section opened),
 * never when a screen opens; with Reduce Motion every icon is simply in its final state. Where the
 * website moves an icon when the pointer is over its button, the app moves it when the finger
 * presses the button. The bell and the check-in ticket are also felt: a light tap for each strike
 * of the bell, a firmer one when the ticket gives (none with Reduce Motion, as they ride the motion).
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

/** The keyframes from wherever the value is now: the first one only gives the easing of the first step. */
function steps(v: Animated.Value, frames: Frame[], duration: number, native = true) {
  const all = frames.slice(1).map(([at, value], i) => {
    const [from, , easing] = frames[i]!;
    return Animated.timing(v, { toValue: value, duration: ((at - from) / 100) * duration, easing: easing ?? Easing.linear, useNativeDriver: native });
  });
  return Animated.sequence(all);
}

function keyframes(v: Animated.Value, frames: Frame[], duration: number, native = true) {
  v.setValue(frames[0]![1]);
  return steps(v, frames, duration, native);
}

/** A change of state that eases, like a CSS transition. */
function ease(v: Animated.Value, toValue: number, duration: number, easing: EasingFunction) {
  return Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
}

/** One value per moving property, kept for the life of the icon. */
function useValues<K extends string>(rest: Record<K, number>) {
  const [values] = useState(() => Object.fromEntries(Object.entries(rest).map(([k, n]) => [k, new Animated.Value(n as number)])) as Record<K, Animated.Value>);
  return values;
}

/** A moment of an animation, in ms from its start, when something else happens (a haptic tap). */
type Cue = [ms: number, run: () => void];

/** Runs one animation at a time, with its cues, and stops both when the icon goes away. */
function usePlayer() {
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

/**
 * Calls `run` each time `value` changes, with the new value and the one before; on the first render
 * only when it differs from `from`, the value it is taken to come from (by default, itself).
 */
function useOnChange<T>(value: T, run: (value: T, before: T) => void, from: T = value) {
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
function usePlay(trigger: number | boolean, play: () => void) {
  useOnChange(trigger, (t) => t !== 0 && t !== false && play());
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
      // A light tap as each sound line appears: the two strikes of the clapper.
      [
        [0.16 * d, haptics.light],
        [0.34 * d, haptics.light],
      ],
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
        // A firmer tap when the paper gives.
        [[0.28 * d, haptics.medium]],
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

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The icons below are drawn on a 20 grid, like the website's; their lines stay 1.5 wide at any size. */
const grid20 = (size: number) => {
  const k = size / 20;
  return { k, w: (n: number) => n / k };
};

/**
 * Invia: the paper plane. While `lean` is true (the finger on the button) it lifts a little towards
 * where it will go; each change of `sent` (a message gone) flies it off top right with a short
 * trail, and a new one glides in from bottom left, 760 ms.
 */
export function SendIcon({ color, sent = 0, lean = false, size = 20 }: { color: string; sent?: number; lean?: boolean; size?: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ fly: 0, opacity: 1, scale: 1, trail: 0, trailShift: 0, lean: 0 });
  const player = usePlayer();
  useOnChange(lean, (on) => (reduce ? v.lean.setValue(0) : ease(v.lean, on ? 1 : 0, 180, easeOut).start()));
  usePlay(sent, () => {
    if (reduce) return;
    const d = 760;
    const pull = Easing.bezier(0.3, 0, 0.5, 1);
    const go = Easing.bezier(0.55, 0, 0.9, 0.45);
    const land = Easing.bezier(0.2, 0.7, 0.3, 1);
    player(
      Animated.parallel([
        keyframes(v.fly, [[0, 0, pull], [16, -1, go], [46, 9], [47, -6, land], [100, 0]], d),
        keyframes(v.opacity, [[0, 1, pull], [16, 1, go], [46, 0], [47, 0, land], [100, 1]], d),
        keyframes(v.scale, [[0, 1, pull], [16, 1, go], [46, 0.7], [47, 0.7, land], [100, 1]], d),
        keyframes(v.trail, [[0, 0], [18, 0], [28, 0.8], [44, 0], [100, 0]], d),
        keyframes(v.trailShift, [[0, 0], [18, 0], [44, 3], [100, 3]], d),
      ]),
    );
  });
  const { k, w } = grid20(size);
  // Up and to the right: the same amount on both axes, the other way round on y.
  const along = Animated.multiply(Animated.add(v.fly, v.lean), k);
  const trailAlong = Animated.multiply(v.trailShift, k);
  return (
    <Box size={size}>
      <Part k={k} origin={[2.75, 17.25]} style={{ opacity: v.trail, transform: [{ translateX: trailAlong }, { translateY: Animated.multiply(trailAlong, -1) }] }}>
        <Draw size={size} grid={20}>
          <Path d="M2.75 17.25l3-3" stroke={color} strokeWidth={w(1.25)} strokeLinecap="round" />
        </Draw>
      </Part>
      <Part
        k={k}
        origin={[10, 10]}
        style={{ opacity: v.opacity, transform: [{ translateX: along }, { translateY: Animated.multiply(along, -1) }, { scale: v.scale }] }}
      >
        <Draw size={size} grid={20}>
          <Path d="M17.25 2.75L2.75 8.5l5.75 3 3 5.75 5.75-14.5Z" stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" />
          <Path d="M8.5 11.5l8.75-8.75" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" />
        </Draw>
      </Part>
    </Box>
  );
}

/**
 * Messaggio: the speech bubble of an empty conversation. When `writing` turns true (the reply field
 * has the focus) it pops once and its three dots type, one after the other, for as long as it stays true.
 */
export function MessageIcon({ color, writing, size = 20 }: { color: string; writing: boolean; size?: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ body: 1, o1: 1, o2: 1, o3: 1, y1: 0, y2: 0, y3: 0 });
  const player = usePlayer();
  useOnChange(writing, (on) => {
    const rest = () => {
      for (const o of [v.o1, v.o2, v.o3]) o.setValue(1);
      for (const y of [v.y1, v.y2, v.y3]) y.setValue(0);
      v.body.setValue(1);
    };
    if (!on || reduce) {
      player(Animated.parallel([]));
      return rest();
    }
    const type = (o: Animated.Value, y: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.parallel([
            steps(o, [[0, 0.45, easeInOut], [25, 1, easeInOut], [50, 0.45], [100, 0.45]], 1200),
            steps(y, [[0, 0, easeInOut], [25, -1.5, easeInOut], [50, 0], [100, 0]], 1200),
          ]),
        ),
      ]);
    player(
      Animated.parallel([
        keyframes(v.body, [[0, 1, strain], [25, 0.92, Easing.bezier(0.2, 0.7, 0.3, 1)], [65, 1.05, swing], [100, 1]], 420),
        type(v.o1, v.y1, 420),
        type(v.o2, v.y2, 580),
        type(v.o3, v.y3, 740),
      ]),
    );
  });
  const { k, w } = grid20(size);
  const dot = (cx: number, o: Animated.Value, y: Animated.Value) => (
    <Part k={k} origin={[cx, 9]} style={{ opacity: o, transform: [{ translateY: Animated.multiply(y, k) }] }}>
      <Draw size={size} grid={20}>
        <Circle cx={cx} cy="9" r="1" fill={color} />
      </Draw>
    </Part>
  );
  return (
    <Box size={size}>
      <Part k={k} origin={[5.5, 17.25]} style={{ transform: [{ scale: v.body }] }}>
        <Draw size={size} grid={20}>
          <Path
            d="M5 3.75h10a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9.25L5.5 17.25v-3H5a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
            stroke={color}
            strokeWidth={w(1.5)}
            strokeLinejoin="round"
          />
        </Draw>
        {dot(7, v.o1, v.y1)}
        {dot(10, v.o2, v.y2)}
        {dot(13, v.o3, v.y3)}
      </Part>
    </Box>
  );
}

/** Elimina: while `open` is true (the finger on the button, the question still open) the lid lifts on its left hinge and overshoots a little, like a real lid. */
export function TrashIcon({ color, open, size = 20 }: { color: string; open: boolean; size?: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ lid: 0 });
  useOnChange(open, (on) => (reduce ? v.lid.setValue(on ? 1 : 0) : ease(v.lid, on ? 1 : 0, 260, Easing.bezier(0.34, 1.56, 0.64, 1)).start()));
  const { k, w } = grid20(size);
  return (
    <Box size={size}>
      <Part
        k={k}
        origin={[3.25, 5.5]}
        style={{ transform: [{ translateY: Animated.multiply(v.lid, -1.25 * k) }, { rotate: v.lid.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-16deg"] }) }] }}
      >
        <Draw size={size} grid={20}>
          <Path d="M3.25 5.5h13.5" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" />
          <Path d="M7.75 5.5V4A1.25 1.25 0 0 1 9 2.75h2A1.25 1.25 0 0 1 12.25 4v1.5" stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" />
        </Draw>
      </Part>
      <Draw size={size} grid={20}>
        <Path
          d="M4.75 5.5l.75 10.25a1.75 1.75 0 0 0 1.75 1.5h5.5a1.75 1.75 0 0 0 1.75-1.5l.75-10.25"
          stroke={color}
          strokeWidth={w(1.5)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M8.5 8.75v5.25M11.5 8.75v5.25" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" />
      </Draw>
    </Box>
  );
}

/** Importa: each time `play` changes (or turns true) the arrow drops into the tray, which gives a little, and a new arrow comes down from above, 680 ms. */
export function ImportIcon({ color, play, size = 20 }: { color: string; play: number | boolean; size?: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ arrow: 0, opacity: 1, tray: 0, wide: 1 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    const d = 680;
    const drop = Easing.bezier(0.55, 0, 0.9, 0.45);
    const land = Easing.bezier(0.2, 0.7, 0.3, 1);
    const give2 = Easing.bezier(0.3, 0, 0.5, 1);
    player(
      Animated.parallel([
        keyframes(v.arrow, [[0, 0, drop], [34, 4.5], [35, -5, land], [80, 0.5, swing], [100, 0]], d),
        keyframes(v.opacity, [[0, 1, drop], [34, 0], [35, 0, land], [80, 1, swing], [100, 1]], d),
        keyframes(v.tray, [[0, 0], [24, 0, give2], [36, 1, swing], [52, -0.25], [68, 0], [100, 0]], d),
        keyframes(v.wide, [[0, 1], [24, 1, give2], [36, 1.04, swing], [52, 0.99], [68, 1], [100, 1]], d),
      ]),
    );
  });
  const { k, w } = grid20(size);
  return (
    <Box size={size}>
      <Part k={k} origin={[10, 7.5]} style={{ opacity: v.opacity, transform: [{ translateY: Animated.multiply(v.arrow, k) }] }}>
        <Draw size={size} grid={20}>
          <Path d="M10 2.75v9.25M6.25 8.5L10 12.25l3.75-3.75" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" strokeLinejoin="round" />
        </Draw>
      </Part>
      <Part k={k} origin={[10, 16.75]} style={{ transform: [{ translateY: Animated.multiply(v.tray, k) }, { scaleX: v.wide }] }}>
        <Draw size={size} grid={20}>
          <Path d="M3 12.25v2.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" strokeLinejoin="round" />
        </Draw>
      </Part>
    </Box>
  );
}

/**
 * Salva, the draft's sheet: while `saving` its two lines write themselves over and over; once
 * `saved` they give way to a tick. The tick draws itself only when a save has just finished, not
 * when the screen opens on a saved draft.
 */
export function SaveIcon({ color, saving, saved, size = 20 }: { color: string; saving: boolean; saved: boolean; size?: number }) {
  const reduce = useReduceMotion();
  const mode = saving ? "saving" : saved ? "saved" : "idle";
  const start = mode === "saved";
  const v = useValues({ o1: start ? 0 : 1, o2: start ? 0 : 1, s1: 1, s2: 1, tick: start ? 1 : 0, dash: 0 });
  const player = usePlayer();
  // From "idle": shown only while saving or once saved, the icon may first appear with a save under way.
  useOnChange(mode, (m, before) => {
    if (m === "saving" && !reduce) {
      v.tick.setValue(0);
      const write = (o: Animated.Value, s: Animated.Value) =>
        Animated.loop(
          Animated.parallel([
            keyframes(o, [[0, 0, easeInOut], [12, 1, easeInOut], [100, 1]], 900),
            keyframes(s, [[0, 0.1, easeInOut], [55, 1], [100, 1]], 900),
          ]),
        );
      // Both lines start blank: the second one waits its turn that way, as on the website.
      return player(Animated.parallel([write(v.o1, v.s1), Animated.sequence([Animated.delay(150), write(v.o2, v.s2)])]));
    }
    if (m === "saved" && before === "saving" && !reduce) {
      v.tick.setValue(1);
      v.dash.setValue(10);
      return player(
        Animated.parallel([
          ease(v.o1, 0, 160, easeOut),
          ease(v.o2, 0, 160, easeOut),
          ease(v.s1, 1, 160, easeOut),
          ease(v.s2, 1, 160, easeOut),
          Animated.sequence([Animated.delay(60), Animated.timing(v.dash, { toValue: 0, duration: 320, easing: easeOut, useNativeDriver: false })]),
        ]),
      );
    }
    player(Animated.parallel([]));
    for (const o of [v.o1, v.o2]) o.setValue(m === "saved" ? 0 : 1);
    for (const x of [v.s1, v.s2]) x.setValue(1);
    v.tick.setValue(m === "saved" ? 1 : 0);
    v.dash.setValue(0);
  }, "idle");
  const { k, w } = grid20(size);
  const line = (d: string, o: Animated.Value, s: Animated.Value) => (
    <Part k={k} origin={[7.25, 12]} style={{ opacity: o, transform: [{ scaleX: s }] }}>
      <Draw size={size} grid={20}>
        <Path d={d} stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" />
      </Draw>
    </Part>
  );
  return (
    <Box size={size}>
      <Draw size={size} grid={20}>
        <Path d="M5.5 2.75h5.75l4 4v9.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z" stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" />
        <Path d="M11.25 2.75v3a1 1 0 0 0 1 1h3" stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" />
      </Draw>
      {line("M7.25 10.5h5.5", v.o1, v.s1)}
      {line("M7.25 13.5h3.5", v.o2, v.s2)}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: v.tick }]}>
        <Draw size={size} grid={20}>
          <AnimatedPath
            d="M7 12.25l2.25 2.25 4-4.5"
            stroke={color}
            strokeWidth={w(1.5)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="10"
            strokeDashoffset={v.dash}
          />
        </Draw>
      </Animated.View>
    </Box>
  );
}

/** Luogo: each change of `hop` makes the pin crouch, hop and land, and the ground answers with a ring, 680 ms. */
export function PlaceIcon({ color, hop, size = 20 }: { color: string; hop: number; size?: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ y: 0, sx: 1, sy: 1, ground: 0, ring: 0.5 });
  const player = usePlayer();
  usePlay(hop, () => {
    if (reduce) return;
    const d = 680;
    const crouch = Easing.bezier(0.3, 0, 0.5, 1);
    const spring = Easing.bezier(0.2, 0.6, 0.35, 1);
    const fall = Easing.bezier(0.55, 0, 0.9, 0.45);
    const at = (y: number, sx: number, sy: number) => [y, sx, sy] as const;
    const frames = [
      [0, at(0, 1, 1), crouch],
      [14, at(0, 1.06, 0.92), spring],
      [40, at(-3.5, 0.97, 1.04), fall],
      [60, at(0, 1.07, 0.9), swing],
      [78, at(0, 0.98, 1.02), swing],
      [100, at(0, 1, 1), undefined],
    ] as const;
    const track = (i: 0 | 1 | 2): Frame[] => frames.map(([p, value, easing]) => [p, value[i], easing]);
    player(
      Animated.parallel([
        keyframes(v.y, track(0), d),
        keyframes(v.sx, track(1), d),
        keyframes(v.sy, track(2), d),
        keyframes(v.ground, [[0, 0], [58, 0], [62, 0.7, easeOut], [100, 0]], d),
        keyframes(v.ring, [[0, 0.5], [58, 0.5], [62, 0.8, easeOut], [100, 1.5]], d),
      ]),
    );
  });
  const { k, w } = grid20(size);
  return (
    <Box size={size}>
      <Part k={k} origin={[10, 18.25]} style={{ opacity: v.ground, transform: [{ scale: v.ring }] }}>
        <Draw size={size} grid={20}>
          <Ellipse cx="10" cy="18.25" rx="3.25" ry="0.75" stroke={color} strokeWidth={w(1.25)} />
        </Draw>
      </Part>
      <Part k={k} origin={[10, 17.5]} style={{ transform: [{ translateY: Animated.multiply(v.y, k) }, { scaleX: v.sx }, { scaleY: v.sy }] }}>
        <Draw size={size} grid={20}>
          <G>
            <Path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 0 0-11 0c0 4.4 5.5 9 5.5 9z" stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" />
            <Circle cx="10" cy="8.5" r="2" stroke={color} strokeWidth={w(1.5)} />
          </G>
        </Draw>
      </Part>
    </Box>
  );
}

const GEAR =
  "M8.75 4.39L9.12 2.55H10.88L11.25 4.39L13.08 5.15L14.64 4.11L15.89 5.36L14.85 6.92L15.61 8.75L17.45 9.12V10.88L15.61 11.25L14.85 13.08L15.89 14.64L14.64 15.89L13.08 14.85L11.25 15.61L10.88 17.45H9.12L8.75 15.61L6.92 14.85L5.36 15.89L4.11 14.64L5.15 13.08L4.39 11.25L2.55 10.88V9.12L4.39 8.75L5.15 6.92L4.11 5.36L5.36 4.11L6.92 5.15Z";

/** Impostazioni: each time `turn` changes (or turns true) the gear turns by one tooth with the weight of metal: it runs past and settles, 720 ms. */
export function GearIcon({ color, turn, size = 20 }: { color: string; turn: number | boolean; size?: number }) {
  const reduce = useReduceMotion();
  const v = useValues({ wheel: 0 });
  const player = usePlayer();
  usePlay(turn, () => {
    if (reduce) return;
    // Eight teeth: 45 degrees on, the gear looks as it did, so each turn starts again from 0.
    player(keyframes(v.wheel, [[0, 0, Easing.bezier(0.3, 0, 0.3, 1)], [60, 53, swing], [82, 43, swing], [100, 45]], 720));
  });
  const { k, w } = grid20(size);
  return (
    <Box size={size}>
      <Part k={k} origin={[10, 10]} style={{ transform: [{ rotate: deg(v.wheel) }] }}>
        <Draw size={size} grid={20}>
          <Path d={GEAR} stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" />
          <Circle cx="10" cy="10" r="2.5" stroke={color} strokeWidth={w(1.5)} />
        </Draw>
      </Part>
    </Box>
  );
}
