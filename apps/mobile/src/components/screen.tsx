import type { ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space, useTheme } from "@/theme";
import { Logo } from "./logo";
import { T } from "./text";

type Props = {
  /** Large title for the main tabs; pushed screens get theirs from the navigation header. */
  title?: string;
  /**
   * The main sections' top bar, as on the website's phone layout: the logo on the left (back to Home)
   * and these on the right (search, notifications, the account); the large title comes under it.
   */
  actions?: ReactNode;
  header?: ReactNode;
  /** Pinned under the scrolling content, above the tab bar: a main action such as "Nuova richiesta". */
  footer?: ReactNode;
  /** The footer as a full-width bar on the page colour, for screens whose actions sit side by side (the wizard). */
  footerBar?: boolean;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Scrolling page on Carta with 16 side margins, safe areas and pull to refresh. */
export function Screen({ title, actions, header, footer, footerBar = false, children, refreshing = false, onRefresh }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const page = (
    <ScrollView
      style={{ backgroundColor: c.bgApp }}
      contentContainerStyle={[styles.content, { paddingTop: actions ? insets.top + space[2] : title ? insets.top + space[4] : space[4] }, footer ? (footerBar ? styles.roomForBar : styles.roomForFooter) : null]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.textSecondary} /> : undefined}
    >
      {(title || header || actions) && (
        <View style={styles.header}>
          {actions && (
            <View style={styles.bar}>
              <Pressable
                onPress={() => router.navigate("/")}
                accessibilityRole="link"
                accessibilityLabel="I-Events, home"
                style={({ pressed }) => [styles.home, pressed && { opacity: 0.6 }]}
              >
                <Logo />
              </Pressable>
              {actions}
            </View>
          )}
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
  if (!footer) return page;
  return (
    <View style={[styles.fill, { backgroundColor: c.bgApp }]}>
      {page}
      {footerBar ? (
        <View
          style={[
            styles.footerBarBox,
            { backgroundColor: c.bgApp, borderTopColor: c.borderDefault, paddingBottom: Math.max(space[4], insets.bottom) },
          ]}
        >
          {footer}
        </View>
      ) : (
        <View style={styles.footer}>{footer}</View>
      )}
    </View>
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
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3], minHeight: 44 },
  home: { minHeight: 44, justifyContent: "center", flexShrink: 1 },
  fill: { flex: 1 },
  roomForFooter: { paddingBottom: space[16] + space[8] },
  roomForBar: { paddingBottom: space[16] * 2 + space[8] },
  footer: { position: "absolute", right: space[4], bottom: space[4] },
  footerBarBox: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  section: { gap: space[3] },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flexShrink: 1 },
});
