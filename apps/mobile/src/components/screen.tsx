import { Children, Fragment, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { router } from "expo-router";
import { Animated, Easing, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useReduceMotion } from "@/lib/motion";
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
      style={styles.fill}
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
      <Cascade>{children}</Cascade>
    </ScrollView>
  );
  return (
    <View style={[styles.fill, { backgroundColor: c.bgApp }]}>
      <Glow />
      {page}
      {!footer ? null : footerBar ? (
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

/** The paper's glow at the top right, as on the website (Wharf reference): light from a window, fixed. */
function Glow() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const h = 420;
  return (
    <Svg pointerEvents="none" width={width} height={h} style={styles.glow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Defs>
        <RadialGradient id="glow-a" cx={width} cy={-h * 0.1} rx={width * 1.1} ry={h} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={c.glowA} />
          <Stop offset="0.7" stopColor={c.glowA} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="glow-b" cx={width * 0.78} cy={-h * 0.08} rx={width * 0.75} ry={h * 0.8} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={c.glowB} />
          <Stop offset="0.72" stopColor={c.glowB} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={h} fill="url(#glow-a)" />
      <Rect width={width} height={h} fill="url(#glow-b)" />
    </Svg>
  );
}

/** Fragments are opened, so each block of the page arrives on its own. */
function blocks(children: ReactNode): ReactElement[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? blocks(child.props.children) : isValidElement(child) ? [child] : [],
  );
}

const typeName = (el: ReactElement) => (typeof el.type === "string" ? el.type : ((el.type as { displayName?: string; name?: string }).displayName ?? (el.type as { name?: string }).name ?? "x"));

/**
 * A page arrives in steps, as on the website: each block rises 8 px and fades in, 40 ms after the one
 * before (the first ten), 480 ms with a soft landing. A block that takes another's place (the content after
 * the skeletons) arrives again; one that stays does not move. Reduce Motion: a 120 ms fade.
 */
function Cascade({ children }: { children: ReactNode }) {
  const items = blocks(children);
  return (
    <>
      {items.map((el, i) => {
        const key = `${i}:${typeName(el)}:${el.key ?? ""}`;
        return (
          <Arrive key={key} index={i}>
            {el}
          </Arrive>
        );
      })}
    </>
  );
}

function Arrive({ index, children }: { index: number; children: ReactNode }) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const run = Animated.timing(t, {
      toValue: 1,
      duration: reduce ? 120 : 480,
      delay: reduce ? 0 : Math.min(index, 9) * 40,
      easing: arriveEase,
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [t, index, reduce]);
  const translateY = reduce ? 0 : t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return <Animated.View style={[styles.block, { opacity: t, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** The website's cubic-bezier(0.22, 1, 0.36, 1). */
const arriveEase = Easing.bezier(0.22, 1, 0.36, 1);

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
  // A block keeps the page's spacing for whatever it holds.
  block: { gap: space[8] },
  glow: { position: "absolute", top: 0, left: 0 },
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
