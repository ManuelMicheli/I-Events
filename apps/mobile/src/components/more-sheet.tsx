import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { fonts, radius, space, useTheme } from "@/theme";
import { NavIcon, type NavIconName } from "./nav-icons";
import { Sheet } from "./sheet";
import { T } from "./text";

export type MoreItem = { href: Href; label: string; icon: NavIconName; count?: number };

/**
 * Altro, as on the website's phone layout: a sheet from the bottom with the sections that do not fit
 * in the tab bar, each with its icon (it moves when touched) and what waits there.
 */
export function MoreSheet({ visible, items, onClose }: { visible: boolean; items: MoreItem[]; onClose: () => void }) {
  return (
    <Sheet visible={visible} title="Altre sezioni" onClose={onClose}>
      <View style={styles.list}>
        {items.map((item) => (
          <Row key={item.label} item={item} onClose={onClose} />
        ))}
      </View>
    </Sheet>
  );
}

function Row({ item, onClose }: { item: MoreItem; onClose: () => void }) {
  const { c } = useTheme();
  const [play, setPlay] = useState(0);
  const count = item.count ?? 0;
  return (
    <Pressable
      onPressIn={() => setPlay((n) => n + 1)}
      onPress={() => {
        onClose();
        router.push(item.href);
      }}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${item.label}, ${count} da guardare` : item.label}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <NavIcon name={item.icon} color={c.textPrimary} hole={c.bgElevated} filled={false} play={play} />
      <T variant="body" numberOfLines={1} style={styles.label}>
        {item.label}
      </T>
      {count > 0 && (
        <T variant="mono" tone="secondary" style={styles.count}>
          {count > 99 ? "99+" : count}
        </T>
      )}
      <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space[3], marginHorizontal: -space[2], paddingHorizontal: space[2], borderRadius: radius.sm },
  label: { flex: 1 },
  count: { fontFamily: fonts.mono["500"] },
});
