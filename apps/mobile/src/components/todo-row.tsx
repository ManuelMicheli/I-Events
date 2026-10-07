import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { control, radius, space, useTheme } from "@/theme";
import { Avatar } from "./avatar";
import { LiveDot } from "./badge";
import { Button } from "./button";
import { T } from "./text";

/** Something waiting for the user: live dot, who it is about, what happened, and the action. */
export function TodoRow({ who, text, action, onPress }: { who: string; text: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.row}>
      <LiveDot />
      <Avatar name={who} />
      <T variant="callout" style={styles.flex}>
        {text}
      </T>
      <Button variant="secondary" size="small" label={action} accessibilityLabel={`${action}: ${text}`} onPress={onPress} />
    </View>
  );
}

/** A task with its checkbox: ticking it marks it done, and it can be unticked again right away. */
export function TaskRow({
  title,
  detail,
  due,
  late,
  initialDone = false,
  onToggle,
}: {
  title: string;
  detail?: string;
  due: string;
  late: boolean;
  /** Already done when the list loaded: shown ticked and struck through, and can be reopened. */
  initialDone?: boolean;
  onToggle: (done: boolean) => Promise<void>;
}) {
  const { c } = useTheme();
  const [done, setDone] = useState(initialDone);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    const next = !done;
    setDone(next);
    setBusy(true);
    try {
      await onToggle(next);
    } catch {
      setDone(!next);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable
      onPress={toggle}
      disabled={busy}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done, busy }}
      accessibilityLabel={[title, detail, due].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.row, styles.pressable, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: done ? c.textPrimary : c.borderControl,
            backgroundColor: done ? c.textPrimary : "transparent",
          },
        ]}
      >
        {done && <Ionicons name="checkmark" size={16} color={c.bgApp} />}
      </View>
      <View style={styles.flex}>
        <T variant="callout" tone={done ? "secondary" : "primary"} style={done && styles.struck}>
          {title}
        </T>
        {detail && (
          <T variant="caption" tone="secondary" numberOfLines={2}>
            {detail}
          </T>
        )}
      </View>
      <T variant="mono" tone={late && !done ? "danger" : "secondary"}>
        {due}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: control.l,
    paddingVertical: space[2],
  },
  pressable: { marginHorizontal: -space[2], paddingHorizontal: space[2], borderRadius: radius.sm },
  flex: { flex: 1, gap: space[1] },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  struck: { textDecorationLine: "line-through" },
});
