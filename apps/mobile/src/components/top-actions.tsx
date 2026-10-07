import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { easeOut, useReduceMotion } from "@/lib/motion";
import { useMyName } from "@/lib/profile";
import { useUnreadCount } from "@/lib/unread";
import { control, motion, radius, space, useTheme } from "@/theme";
import { Avatar } from "./avatar";
import { T } from "./text";

/** Top right of the main sections: notifications with the unread count, then the account. */
export function TopActions() {
  const { c } = useTheme();
  const unread = useUnreadCount();
  const name = useMyName();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push("/notifiche")}
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `Notifiche, ${unread} da leggere` : "Notifiche"}
        style={({ pressed }) => [styles.button, pressed && { backgroundColor: c.bgSubtle }]}
      >
        <Bell unread={unread} color={c.textPrimary} />
        {unread > 0 && (
          <View style={[styles.badge, { backgroundColor: c.accentFill, borderColor: c.bgApp }]}>
            <T variant="caption" tone="onAccent" maxFontSizeMultiplier={1.2}>
              {unread > 99 ? "99+" : unread}
            </T>
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => router.push("/account")}
        accessibilityRole="button"
        accessibilityLabel="Account"
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      >
        <Avatar name={name} size={32} />
      </Pressable>
    </View>
  );
}

/**
 * The bell (A6): when a notification arrives while the screen is open, it swings once from its top,
 * 0, 14, -10, 6, 0 degrees in 320 ms. Never when a screen opens, never with Reduce Motion.
 */
function Bell({ unread, color }: { unread: number; color: string }) {
  const reduce = useReduceMotion();
  const [swing] = useState(() => new Animated.Value(0));
  const seen = useRef(unread);
  useEffect(() => {
    const grew = unread > seen.current;
    seen.current = unread;
    if (!grew || reduce) return;
    swing.setValue(0);
    const run = Animated.timing(swing, { toValue: 1, duration: motion.slow, easing: easeOut, useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [unread, reduce, swing]);
  const rotate = swing.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ["0deg", "14deg", "-10deg", "6deg", "0deg"] });
  return (
    <Animated.View style={[styles.bell, { transform: [{ rotate }] }]}>
      <Ionicons name="notifications-outline" size={24} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bell: { transformOrigin: "50% 2px" },
  row: { flexDirection: "row", alignItems: "center", gap: space[1], marginRight: -space[2] },
  button: {
    width: control.touch,
    height: control.touch,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
