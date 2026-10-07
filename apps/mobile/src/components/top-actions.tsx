import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMyName } from "@/lib/profile";
import { useSession } from "@/lib/session";
import { useUnreadArrivals, useUnreadCount } from "@/lib/unread";
import { control, radius, space, useTheme } from "@/theme";
import { AccountSheet } from "./account-sheet";
import { Avatar } from "./avatar";
import { LiveDot } from "./badge";
import { BellIcon, LensIcon } from "./icons";

/**
 * Top right of the main sections, as on the website: search, the bell with a live dot when something
 * is unread (the count is in the label and on the Notifiche screen), then the avatar with the account.
 */
export function TopActions() {
  const { c } = useTheme();
  const unread = useUnreadCount();
  const name = useMyName();
  const { session } = useSession();
  const [account, setAccount] = useState(false);
  const shown = name ?? (session?.user.email?.split("@")[0] || "Account");
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.push("/cerca")}
        accessibilityRole="button"
        accessibilityLabel="Trova richieste, eventi e contatti"
        style={({ pressed }) => [styles.button, pressed && { backgroundColor: c.bgSubtle }]}
      >
        {({ pressed }) => <LensIcon color={c.textPrimary} look={pressed} />}
      </Pressable>
      <Pressable
        onPress={() => router.push("/notifiche")}
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `Notifiche, ${unread} non lette` : "Notifiche"}
        style={({ pressed }) => [styles.button, pressed && { backgroundColor: c.bgSubtle }]}
      >
        <Bell color={c.textPrimary} />
        {unread > 0 && (
          <View style={[styles.dot, { borderColor: c.bgApp, backgroundColor: c.bgApp }]}>
            <LiveDot />
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => setAccount(true)}
        accessibilityRole="button"
        accessibilityLabel={`Account di ${shown}`}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      >
        <Avatar name={shown} size={32} />
      </Pressable>
      <AccountSheet visible={account} onClose={() => setAccount(false)} />
    </View>
  );
}

/**
 * The bell (A6, A10): when new notifications arrive while the app is open, it rings once, clapper
 * and all. Never when a screen opens; with Reduce Motion it stays still.
 */
function Bell({ color }: { color: string }) {
  return <BellIcon ring={useUnreadArrivals()} color={color} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[1], marginRight: -space[2], flexShrink: 0 },
  button: {
    width: control.touch,
    height: control.touch,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  // On the bell's shoulder, ringed in the page colour so it stands off the outline.
  dot: { position: "absolute", top: 9, right: 10, borderRadius: radius.full, borderWidth: 2 },
});
