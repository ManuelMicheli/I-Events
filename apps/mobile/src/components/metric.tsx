import { StyleSheet, View } from "react-native";
import { space } from "@/theme";
import { Card } from "./card";
import { T } from "./text";

export type MetricValue = { label: string; value: string; note?: string; onPress?: () => void };

/** One indicator: what it counts, the number in Mono metrica, a short line of context. */
export function Metric({ label, value, note, onPress }: MetricValue) {
  return (
    <Card style={styles.card} onPress={onPress} accessibilityLabel={[label, value, note].filter(Boolean).join(", ")}>
      <T variant="callout" tone="secondary" numberOfLines={2}>
        {label}
      </T>
      <T variant="monoMetric" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </T>
      {note && (
        <T variant="caption" tone="secondary" numberOfLines={2}>
          {note}
        </T>
      )}
    </Card>
  );
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
