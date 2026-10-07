import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { easeOut, useReduceMotion } from "@/lib/motion";
import { motion, space } from "@/theme";
import { Card } from "./card";
import { T } from "./text";

export type MetricValue = { label: string; value: string; note?: string; onPress?: () => void };

/** One indicator: what it counts, the number in Mono metrica, a short line of context. */
export function Metric({ label, value, note, onPress }: MetricValue) {
  const shown = useCountUp(label, value);
  return (
    <Card style={styles.card} onPress={onPress} accessibilityLabel={[label, value, note].filter(Boolean).join(", ")}>
      <T variant="callout" tone="secondary" numberOfLines={2}>
        {label}
      </T>
      <T variant="monoMetric" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {shown}
      </T>
      {note && (
        <T variant="caption" tone="secondary" numberOfLines={2}>
          {note}
        </T>
      )}
    </Card>
  );
}

/** Indicators already counted in this session: they count only the first time (A5), never on return. */
const counted = new Set<string>();

/**
 * A5: the first time an indicator appears in the session its number counts up to the value in 320 ms
 * (ease-out, tabular figures), "45%" included. Values without a number, and Reduce Motion, show at once.
 */
function useCountUp(key: string, value: string) {
  const reduce = useReduceMotion();
  const match = /^(\d+)(.*)$/.exec(value);
  const target = match ? Number(match[1]) : 0;
  const [play] = useState(() => !counted.has(key) && target > 0);
  // The number on its way up; null once it has arrived (then the value shows as given).
  const [n, setN] = useState<number | null>(play ? 0 : null);

  useEffect(() => {
    counted.add(key);
    if (!play || reduce) return;
    const progress = new Animated.Value(0);
    const id = progress.addListener(({ value: t }) => setN(Math.round(t * target)));
    const run = Animated.timing(progress, { toValue: 1, duration: motion.slow, easing: easeOut, useNativeDriver: false });
    run.start(() => setN(null));
    return () => {
      run.stop();
      progress.removeListener(id);
    };
  }, [key, play, reduce, target]);

  return match && play && !reduce && n !== null ? `${n}${match[2]}` : value;
}

/** Indicators two per row, the same height in each row. */
export function MetricGrid({ items }: { items: MetricValue[] }) {
  const rows: MetricValue[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((m) => (
            <View key={m.label} style={styles.cell}>
              <Metric {...m} />
            </View>
          ))}
          {row.length === 1 && <View style={styles.cell} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space[3] },
  row: { flexDirection: "row", gap: space[3] },
  cell: { flex: 1 },
  card: { flex: 1, gap: space[2] },
});
