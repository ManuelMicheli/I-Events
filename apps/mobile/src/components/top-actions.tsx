import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useMyName } from "@/lib/profile";
import { useUnreadCount } from "@/lib/unread";
import { control, radius, space, useTheme } from "@/theme";
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
        <Ionicons name="notifications-outline" size={24} color={c.textPrimary} />
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

const styles = StyleSheet.create({
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
