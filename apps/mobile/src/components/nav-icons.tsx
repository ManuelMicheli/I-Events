import { Animated, Easing } from "react-native";
import { Circle, Path, Rect } from "react-native-svg";
import { easeOut, useReduceMotion } from "@/lib/motion";
import { AnimatedPath, Box, deg, Draw, grid20, keyframes, Part, swing, usePlay, usePlayer, useValues, type Frame } from "./icon-kit";
import { CalendarIcon, LensIcon, TicketIcon } from "./icons";

/**
 * The icons of the sections (A10), as in the website's menu: outlined at rest, filled on the
 * section you are in, and each moves in its own way when its tab is touched (`play` changes). The
 * cut-outs of a filled icon take `hole`, the colour behind it. Drawn on the 20 grid of the website;
 * the lines stay 1.5 wide at any size.
 */
export type NavIconName = "home" | "requests" | "events" | "tasks" | "contacts" | "search" | "links" | "profile" | "team" | "availability" | "messages";

type Props = { color: string; hole: string; filled: boolean; play: number; size?: number };

export function NavIcon({ name, ...p }: Props & { name: NavIconName }) {
  switch (name) {
    case "home":
      return <HomeIcon {...p} />;
    case "requests":
      return <InboxIcon {...p} />;
    case "events":
      return <TicketIcon color={p.color} hole={p.hole} filled={p.filled} tug={p.play} size={p.size ?? 24} />;
    case "tasks":
      return <TasksIcon {...p} />;
    case "contacts":
      return <ContactsIcon {...p} />;
    case "search":
      return <LensIcon color={p.color} hole={p.hole} filled={p.filled} look={p.play} size={p.size ?? 24} />;
    case "links":
      return <LinksIcon {...p} />;
    case "profile":
      return <PersonIcon {...p} />;
    case "team":
      return <TeamIcon {...p} />;
    case "availability":
      return <CalendarIcon color={p.color} hole={p.hole} filled={p.filled} play={p.play} />;
    case "messages":
      return <BubbleIcon {...p} />;
  }
}

/** The same keyframes as the pin of Luogo: crouch, hop, land. */
const HOP = [
  [0, [0, 1, 1], Easing.bezier(0.3, 0, 0.5, 1)],
  [14, [0, 1.06, 0.92], Easing.bezier(0.2, 0.6, 0.35, 1)],
  [40, [-3.5, 0.97, 1.04], Easing.bezier(0.55, 0, 0.9, 0.45)],
  [60, [0, 1.07, 0.9], swing],
  [78, [0, 0.98, 1.02], swing],
  [100, [0, 1, 1], undefined],
] as const;
const hop = (i: 0 | 1 | 2): Frame[] => HOP.map(([at, values, easing]) => [at, values[i], easing]);

/** A nod, damped: the head dips and turns, comes back past and settles (ps-nod). */
const NOD = [0, 26, 52, 76, 100];
const nod = (values: number[]): Frame[] => NOD.map((at, i) => [at, values[i]!, i === 0 ? Easing.bezier(0.3, 0, 0.4, 1) : i < 3 ? swing : undefined]);
const nodTurn = nod([0, 8, -4, 1.5, 0]);
const nodDip = nod([0, 0.75, 0, 0, 0]);

/** Home: the house crouches, hops and lands, 680 ms. */
function HomeIcon({ color, hole, filled, play, size = 24 }: Props) {
  const reduce = useReduceMotion();
  const v = useValues({ y: 0, sx: 1, sy: 1 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    player(Animated.parallel([keyframes(v.y, hop(0), 680), keyframes(v.sx, hop(1), 680), keyframes(v.sy, hop(2), 680)]));
  });
  const { k, w } = grid20(size);
  return (
    <Box size={size}>
      <Part k={k} origin={[10, 17.25]} style={{ transform: [{ translateY: Animated.multiply(v.y, k) }, { scaleX: v.sx }, { scaleY: v.sy }] }}>
        <Draw size={size} grid={20}>
          <Path
            d="M3.75 8.75L10 3.5l6.25 5.25v6.75a1.75 1.75 0 0 1-1.75 1.75h-9a1.75 1.75 0 0 1-1.75-1.75Z"
            stroke={color}
            strokeWidth={w(1.5)}
            strokeLinejoin="round"
            fill={filled ? color : "none"}
          />
          <Path d="M8.25 17.25v-3.5a1.75 1.75 0 0 1 3.5 0v3.5" stroke={filled ? hole : color} strokeWidth={w(1.5)} strokeLinejoin="round" />
        </Draw>
      </Part>
    </Box>
  );
}

/** Richieste: a request drops into the tray with a turn and the tray gives, 680 ms. */
function InboxIcon({ color, hole, filled, play, size = 24 }: Props) {
  const reduce = useReduceMotion();
  const v = useValues({ sheet: 1, sheetY: 0, sheetTurn: 0, tray: 0, wide: 1 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    const d = 680;
    const fall = Easing.bezier(0.55, 0, 0.9, 0.45);
    const land = Easing.bezier(0.2, 0.6, 0.35, 1);
    const give = Easing.bezier(0.3, 0, 0.5, 1);
    player(
      Animated.parallel([
        keyframes(v.sheet, [[0, 0, fall], [12, 1], [100, 1]], d),
        keyframes(v.sheetY, [[0, -6, fall], [36, 1, land], [56, 0], [100, 0]], d),
        keyframes(v.sheetTurn, [[0, -14, fall], [36, 0, land], [56, 0], [100, 0]], d),
        keyframes(v.tray, [[0, 0], [24, 0, give], [36, 1, swing], [52, -0.25], [68, 0], [100, 0]], d),
        keyframes(v.wide, [[0, 1], [24, 1, give], [36, 1.04, swing], [52, 0.99], [68, 1], [100, 1]], d),
      ]),
    );
  });
  const { k, w } = grid20(size);
  return (
    <Box size={size}>
      <Part k={k} origin={[10, 16.5]} style={{ transform: [{ translateY: Animated.multiply(v.tray, k) }, { scaleX: v.wide }] }}>
        <Draw size={size} grid={20}>
          <Path
            d="M2.75 11.25l2.1-5.6a1.75 1.75 0 0 1 1.64-1.15h7.02a1.75 1.75 0 0 1 1.64 1.15l2.1 5.6v3.5a1.75 1.75 0 0 1-1.75 1.75H4.5a1.75 1.75 0 0 1-1.75-1.75Z"
            stroke={color}
            strokeWidth={w(1.5)}
            strokeLinejoin="round"
            fill={filled ? color : "none"}
          />
          <Path d="M2.75 11.25h3.75l1 1.75h5l1-1.75h3.75" stroke={filled ? hole : color} strokeWidth={w(1.5)} strokeLinejoin="round" />
        </Draw>
      </Part>
      {/* The sheet turns around the corner of the grid, as on the website (an SVG element's own origin). */}
      <Part k={k} origin={[0, 0]} style={{ opacity: v.sheet, transform: [{ translateY: Animated.multiply(v.sheetY, k) }, { rotate: deg(v.sheetTurn) }] }}>
        <Draw size={size} grid={20}>
          <Path d="M7.5 8.5h5" stroke={filled ? hole : color} strokeWidth={w(1.5)} strokeLinecap="round" />
        </Draw>
      </Part>
    </Box>
  );
}

/** Attività: the tick draws itself again, 420 ms. */
function TasksIcon({ color, hole, filled, play, size = 24 }: Props) {
  const reduce = useReduceMotion();
  const v = useValues({ dash: 0 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    player(keyframes(v.dash, [[0, 12, easeOut], [100, 0]], 420, false));
  });
  const { w } = grid20(size);
  return (
    <Box size={size}>
      <Draw size={size} grid={20}>
        <Rect x="3.25" y="3.25" width="13.5" height="13.5" rx="3" stroke={color} strokeWidth={w(1.5)} fill={filled ? color : "none"} />
        <AnimatedPath
          d="M6.75 10.25l2.25 2.25 4.25-4.75"
          stroke={filled ? hole : color}
          strokeWidth={w(1.5)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="12"
          strokeDashoffset={v.dash}
        />
      </Draw>
    </Box>
  );
}

/** Rubrica: the card on its rings lifts its page and the person on it nods, 640 ms. */
function ContactsIcon({ color, hole, filled, play, size = 24 }: Props) {
  const reduce = useReduceMotion();
  const v = useValues({ card: 0, turn: 0, dip: 0 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    const d = 640;
    player(
      Animated.parallel([
        keyframes(v.card, [[0, 0, Easing.bezier(0.3, 0, 0.4, 1)], [30, -6, swing], [62, 2, swing], [100, 0]], d),
        Animated.sequence([Animated.delay(80), Animated.parallel([keyframes(v.turn, nodTurn, d), keyframes(v.dip, nodDip, d)])]),
      ]),
    );
  });
  const { k, w } = grid20(size);
  const ink = filled ? hole : color;
  return (
    <Box size={size}>
      <Part k={k} origin={[4.25, 10]} style={{ transform: [{ rotate: deg(v.card) }] }}>
        <Draw size={size} grid={20}>
          <Rect x="4.25" y="2.75" width="12" height="14.5" rx="2" stroke={color} strokeWidth={w(1.5)} fill={filled ? color : "none"} />
        </Draw>
        <Part k={k} origin={[10, 12]} style={{ transform: [{ translateY: Animated.multiply(v.dip, k) }, { rotate: deg(v.turn) }] }}>
          <Draw size={size} grid={20}>
            <Circle cx="10.25" cy="8.25" r="2" stroke={ink} strokeWidth={w(1.5)} />
            <Path d="M7 13.75a3.25 3.25 0 0 1 6.5 0" stroke={ink} strokeWidth={w(1.5)} strokeLinecap="round" />
          </Draw>
        </Part>
      </Part>
      <Draw size={size} grid={20}>
        <Path d="M2.75 6.5h2.5M2.75 13.5h2.5" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" />
      </Draw>
    </Box>
  );
}

/** Collegate: the two links pull apart a little and snap back together, 600 ms; filled, the lines are bolder. */
function LinksIcon({ color, filled, play, size = 24 }: Props) {
  const reduce = useReduceMotion();
  const v = useValues({ pull: 0 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    player(keyframes(v.pull, [[0, 0, Easing.bezier(0.3, 0, 0.4, 1)], [35, 1.25, Easing.bezier(0.6, 0, 0.4, 1)], [60, -0.4, swing], [100, 0]], 600));
  });
  const { k, w } = grid20(size);
  const width = w(filled ? 2 : 1.5);
  const out = Animated.multiply(v.pull, k);
  const back = Animated.multiply(v.pull, -k);
  return (
    <Box size={size}>
      <Part k={k} origin={[10, 10]} style={{ transform: [{ translateX: out }, { translateY: back }] }}>
        <Draw size={size} grid={20}>
          <Path d="M9.25 6l1.5-1.5a3.18 3.18 0 0 1 4.5 4.5l-1.5 1.5" stroke={color} strokeWidth={width} strokeLinecap="round" />
        </Draw>
      </Part>
      <Part k={k} origin={[10, 10]} style={{ transform: [{ translateX: back }, { translateY: out }] }}>
        <Draw size={size} grid={20}>
          <Path d="M10.75 14l-1.5 1.5a3.18 3.18 0 0 1-4.5-4.5l1.5-1.5" stroke={color} strokeWidth={width} strokeLinecap="round" />
        </Draw>
      </Part>
      <Draw size={size} grid={20}>
        <Path d="M8 12l4-4" stroke={color} strokeWidth={width} strokeLinecap="round" />
      </Draw>
    </Box>
  );
}

/** Profilo: the head nods, damped; the shoulders follow, 640 ms. */
function PersonIcon({ color, filled, play, size = 24 }: Props) {
  const reduce = useReduceMotion();
  const v = useValues({ turn: 0, dip: 0, sx: 1, sy: 1 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    const d = 640;
    const follow = (a: number): Frame[] => [[0, 1, Easing.bezier(0.3, 0, 0.4, 1)], [30, a, swing], [60, 1], [100, 1]];
    player(
      Animated.parallel([
        keyframes(v.turn, nodTurn, d),
        keyframes(v.dip, nodDip, d),
        Animated.sequence([Animated.delay(60), Animated.parallel([keyframes(v.sx, follow(1.04), d), keyframes(v.sy, follow(0.95), d)])]),
      ]),
    );
  });
  const { k, w } = grid20(size);
  return (
    <Box size={size}>
      <Part k={k} origin={[10, 17]} style={{ transform: [{ scaleX: v.sx }, { scaleY: v.sy }] }}>
        <Draw size={size} grid={20}>
          <Path d="M3.75 17a6.25 6.25 0 0 1 12.5 0Z" stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" fill={filled ? color : "none"} />
        </Draw>
      </Part>
      <Part k={k} origin={[10, 12]} style={{ transform: [{ translateY: Animated.multiply(v.dip, k) }, { rotate: deg(v.turn) }] }}>
        <Draw size={size} grid={20}>
          <Circle cx="10" cy="6.75" r="3.25" stroke={color} strokeWidth={w(1.5)} fill={filled ? color : "none"} />
        </Draw>
      </Part>
    </Box>
  );
}

/** Team: the two heads nod one after the other, 640 ms. */
function TeamIcon({ color, filled, play, size = 24 }: Props) {
  const reduce = useReduceMotion();
  const v = useValues({ frontTurn: 0, frontDip: 0, backTurn: 0, backDip: 0 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    const d = 640;
    player(
      Animated.parallel([
        keyframes(v.frontTurn, nodTurn, d),
        keyframes(v.frontDip, nodDip, d),
        Animated.sequence([Animated.delay(120), Animated.parallel([keyframes(v.backTurn, nodTurn, d), keyframes(v.backDip, nodDip, d)])]),
      ]),
    );
  });
  const { k, w } = grid20(size);
  const fill = filled ? color : "none";
  return (
    <Box size={size}>
      <Part k={k} origin={[13.75, 11]} style={{ transform: [{ translateY: Animated.multiply(v.backDip, k) }, { rotate: deg(v.backTurn) }] }}>
        <Draw size={size} grid={20}>
          <Circle cx="13.75" cy="6.5" r="2.25" stroke={color} strokeWidth={w(1.5)} fill={fill} />
          <Path d="M13.25 11.3a4.25 4.25 0 0 1 4.5 4.2v.75h-3" stroke={color} strokeWidth={w(1.5)} strokeLinecap="round" strokeLinejoin="round" />
        </Draw>
      </Part>
      <Part k={k} origin={[7.75, 12]} style={{ transform: [{ translateY: Animated.multiply(v.frontDip, k) }, { rotate: deg(v.frontTurn) }] }}>
        <Draw size={size} grid={20}>
          <Circle cx="7.75" cy="7.25" r="2.75" stroke={color} strokeWidth={w(1.5)} fill={fill} />
          <Path d="M2.5 16.75a5.25 5.25 0 0 1 10.5 0Z" stroke={color} strokeWidth={w(1.5)} strokeLinejoin="round" fill={fill} />
        </Draw>
      </Part>
    </Box>
  );
}

/**
 * Messaggi, only in the app (the website keeps conversations inside each request): the speech bubble
 * of Messaggio, with the same pop, 420 ms.
 */
function BubbleIcon({ color, hole, filled, play, size = 24 }: Props) {
  const reduce = useReduceMotion();
  const v = useValues({ body: 1 });
  const player = usePlayer();
  usePlay(play, () => {
    if (reduce) return;
    player(keyframes(v.body, [[0, 1, Easing.bezier(0.5, 0, 0.8, 0.4)], [25, 0.92, Easing.bezier(0.2, 0.7, 0.3, 1)], [65, 1.05, swing], [100, 1]], 420));
  });
  const { k, w } = grid20(size);
  const ink = filled ? hole : color;
  return (
    <Box size={size}>
      <Part k={k} origin={[5.5, 17.25]} style={{ transform: [{ scale: v.body }] }}>
        <Draw size={size} grid={20}>
          <Path
            d="M5 3.75h10a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9.25L5.5 17.25v-3H5a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z"
            stroke={color}
            strokeWidth={w(1.5)}
            strokeLinejoin="round"
            fill={filled ? color : "none"}
          />
          <Circle cx="7" cy="9" r="1" fill={ink} />
          <Circle cx="10" cy="9" r="1" fill={ink} />
          <Circle cx="13" cy="9" r="1" fill={ink} />
        </Draw>
      </Part>
    </Box>
  );
}
