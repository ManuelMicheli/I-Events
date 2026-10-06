import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { errorMessage } from "@/lib/errors";
import { radius, space, useTheme } from "@/theme";
import { Button } from "./button";
import { T } from "./text";

type Icon = ComponentProps<typeof Ionicons>["name"];

/** Empty list: says what will appear here and, when there is one, the next step. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: Icon;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  const { c } = useTheme();
  return (
    <View style={styles.box}>
      <View style={[styles.iconCircle, { backgroundColor: c.bgSubtle }]}>
        <Ionicons name={icon} size={24} color={c.textSecondary} />
      </View>
      <T variant="title3" style={styles.center}>
        {title}
      </T>
      <T variant="callout" tone="secondary" style={styles.center}>
        {body}
      </T>
      {action && <Button variant="secondary" label={action.label} onPress={action.onPress} />}
    </View>
  );
}

/** Something failed to load: what happened and a way to try again. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <View style={[styles.iconCircle, { backgroundColor: c.dangerBg }]}>
        <Ionicons name="alert-circle-outline" size={24} color={c.danger} />
      </View>
      <T variant="title3" style={styles.center}>
        Non riusciamo a caricare
      </T>
      <T variant="callout" tone="secondary" style={styles.center}>
        {errorMessage(error)}
      </T>
      <Button variant="secondary" icon="refresh" label="Riprova" onPress={onRetry} />
    </View>
  );
}

/**
 * Placeholder cards with the shape of the real ones. They appear only after 200 ms, so a fast load
 * never flickers.
 */
export function CardSkeletons({ count = 3 }: { count?: number }) {
  const { c } = useTheme();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  const block = (width: number | `${number}%`, height: number) => (
    <View style={{ width, height, borderRadius: radius.sm, backgroundColor: c.bgSubtle }} />
  );
  return (
    <View style={styles.skeletons} accessibilityLabel="Caricamento" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.skeletonCard, { backgroundColor: c.bgSurface, borderColor: c.borderDefault }]}>
          {block(96, 24)}
          {block("80%", 26)}
          {block("50%", 22)}
          {block("60%", 18)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", gap: space[3], paddingVertical: space[8], paddingHorizontal: space[4] },
  iconCircle: { width: 48, height: 48, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center", maxWidth: 340 },
  skeletons: { gap: space[3] },
  skeletonCard: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space[4], gap: space[3] },
});
