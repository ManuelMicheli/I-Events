import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, useTheme } from "@/theme";
import { T } from "./text";

type Props = {
  /** Large title for the main tabs; pushed screens get theirs from the navigation header. */
  title?: string;
  header?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Scrolling page on Carta with 16 side margins, safe areas and pull to refresh. */
export function Screen({ title, header, children, refreshing = false, onRefresh }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: c.bgApp }}
      contentContainerStyle={[styles.content, { paddingTop: title ? insets.top + space[4] : space[4] }]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textSecondary} /> : undefined}
    >
      {(title || header) && (
        <View style={styles.header}>
          {title && (
            <T variant="title1" accessibilityRole="header">
              {title}
            </T>
          )}
          {header}
        </View>
      )}
      {children}
    </ScrollView>
  );
}

/** A titled group of content on a page. */
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <T variant="title3" accessibilityRole="header" style={styles.flex}>
          {title}
        </T>
        {aside}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space[4], paddingBottom: space[8], gap: space[8] },
  header: { gap: space[3] },
  section: { gap: space[3] },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flexShrink: 1 },
});
