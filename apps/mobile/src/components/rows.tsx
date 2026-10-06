import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { control, space, useTheme } from "@/theme";
import { T } from "./text";

/** Label above value, for facts on a detail card (date, place, client). */
export function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.info}>
      <T variant="label" tone="secondary">
        {label}
      </T>
      <T variant={mono ? "mono" : "body"} style={mono ? styles.monoValue : undefined}>
        {value}
      </T>
    </View>
  );
}

/** Tappable list row, at least 48 high, with an optional trailing element. */
export function ListRow({
  title,
  subtitle,
  trailing,
  onPress,
  selected = false,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
}) {
  const { c } = useTheme();
  const body = (
    <>
      <View style={styles.texts}>
        <T variant="bodyStrong">{title}</T>
        {subtitle && (
          <T variant="callout" tone="secondary">
            {subtitle}
          </T>
        )}
      </View>
      {trailing}
      {selected && <Ionicons name="checkmark" size={24} color={c.textPrimary} accessibilityLabel="Selezionata" />}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, styles.pressable, pressed && { backgroundColor: c.bgSubtle }]}
    >
      {body}
    </Pressable>
  );
}

export function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.borderStrong }} />;
}

const styles = StyleSheet.create({
  info: { gap: space[1] },
  monoValue: { fontSize: 15, lineHeight: 22 },
  row: { minHeight: control.l, flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[3] },
  pressable: { marginHorizontal: -space[2], paddingHorizontal: space[2], borderRadius: 8 },
  texts: { flex: 1, gap: space[1] },
});
