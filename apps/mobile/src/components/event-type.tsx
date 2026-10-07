import { EVENT_TYPE_INFO, type CoverPattern, type EventType } from "@i-events/core";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { radius, space, useTheme } from "@/theme";
import { T } from "./text";

/**
 * The event's ink on screen ("Carta e inchiostro"), as on the website: the 8 px type square, the
 * neutral type chip and the generated cover. Inks never go on buttons, links, states or selection.
 */

/** "Il punto è il live, il quadratino è il tipo": 8x8, radius 2, in the ink's fill tone. */
export function TypeSquare({ type }: { type: EventType | null | undefined }) {
  const { scheme } = useTheme();
  if (!type) return null;
  const { ink } = EVENT_TYPE_INFO[type];
  return <View style={[styles.square, { backgroundColor: scheme === "dark" ? ink.darkFill : ink.fill }]} />;
}

/** The type next to a title: a neutral chip with the square, never a coloured pill (those are states). */
export function TypeChip({ type }: { type: EventType | null | undefined }) {
  const { c } = useTheme();
  if (!type) return null;
  return (
    <View style={[styles.chip, { borderColor: c.borderStrong, backgroundColor: c.bgSurface }]}>
      <TypeSquare type={type} />
      <T variant="label">{EVENT_TYPE_INFO[type].label}</T>
    </View>
  );
}

/** Generated cover: deep ink background with a tone-on-tone texture filling the square. */
export function EventCover({ type, size = 48 }: { type: EventType; size?: 48 | 64 }) {
  const { scheme } = useTheme();
  const { ink, pattern } = EVENT_TYPE_INFO[type];
  return (
    <View
      style={[
        styles.cover,
        { width: size, height: size, backgroundColor: ink.deep },
        scheme === "dark" && { borderWidth: 1, borderColor: "rgba(241,236,228,0.08)" },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" fill="none" stroke={ink.text} strokeWidth={4}>
        <Pattern pattern={pattern} color={ink.text} />
      </Svg>
    </View>
  );
}

/** Six textures from circles, lines and arcs: records, a spotlight, the audience, arcades, the stage, lanes. */
function Pattern({ pattern, color }: { pattern: CoverPattern; color: string }) {
  switch (pattern) {
    case "rings":
      return (
        <>
          {[16, 32, 48, 64, 80, 96, 112, 128].map((r) => (
            <Circle key={r} cx={100} cy={100} r={r} />
          ))}
        </>
      );
    case "rays":
      return (
        <>
          {[8, 20, 32, 44, 56, 68, 80].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return <Line key={deg} x1={100} y1={0} x2={100 - 160 * Math.cos(a)} y2={160 * Math.sin(a)} />;
          })}
        </>
      );
    case "dots":
      return (
        <G fill={color} stroke="none">
          {Array.from({ length: 49 }, (_, i) => (
            <Circle key={i} cx={8 + (i % 7) * 14} cy={8 + Math.floor(i / 7) * 14} r={2.5} />
          ))}
        </G>
      );
    case "arches":
      return (
        <>
          <Path d="M8 104V50a20 20 0 0 1 40 0v54M15 104V50a13 13 0 0 1 26 0v54" />
          <Path d="M52 104V50a20 20 0 0 1 40 0v54M59 104V50a13 13 0 0 1 26 0v54" />
        </>
      );
    case "frames":
      return (
        <>
          {[6, 18, 30, 42].map((d) => (
            <Rect key={d} x={d} y={d} width={100 - 2 * d} height={100 - 2 * d} rx={4} />
          ))}
        </>
      );
    case "lanes":
      return (
        <>
          {Array.from({ length: 13 }, (_, i) => -96 + i * 16).map((x) => (
            <Line key={x} x1={x} y1={100} x2={x + 100} y2={0} />
          ))}
        </>
      );
  }
}

const styles = StyleSheet.create({
  square: { width: 8, height: 8, borderRadius: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space[2],
    minHeight: 32,
    paddingHorizontal: space[3],
    borderRadius: radius.full,
    borderWidth: 1,
  },
  cover: { borderRadius: radius.md, overflow: "hidden" },
});
