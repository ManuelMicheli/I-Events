import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { radius, space, useTheme } from "@/theme";
import { T, type Tone } from "./text";

type NoticeTone = "neutral" | "success" | "warning" | "danger";

/** A sentence about the state of the page, on a soft background with its icon; an action may follow. */
export function Notice({ tone = "neutral", children, action }: { tone?: NoticeTone; children: string; action?: ReactNode }) {
  const { c } = useTheme();
  const look: Record<NoticeTone, { bg: string; fg: string; tone: Tone; icon: ComponentProps<typeof Ionicons>["name"] }> = {
    neutral: {
      bg: c.bgSubtle,
      fg: c.textPrimary,
      tone: "primary",
      icon: "information-circle-outline",
    },
    success: { bg: c.successBg, fg: c.success, tone: "success", icon: "checkmark-circle-outline" },
    warning: { bg: c.warningBg, fg: c.warning, tone: "warning", icon: "alert-circle-outline" },
    danger: { bg: c.dangerBg, fg: c.danger, tone: "danger", icon: "alert-circle-outline" },
  };
  const l = look[tone];
  return (
    <View style={[styles.box, { backgroundColor: l.bg }]} accessibilityRole="summary">
      <View style={styles.row}>
        <Ionicons name={l.icon} size={20} color={l.fg} style={styles.icon} />
        <T variant="callout" tone={l.tone} style={styles.flex}>
          {children}
        </T>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: space[4], gap: space[3] },
  row: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  icon: { marginTop: 1 },
  flex: { flex: 1 },
});
