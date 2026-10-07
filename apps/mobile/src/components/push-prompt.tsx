import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { usePushPermission } from "@/lib/use-push-permission";
import { space, useTheme } from "@/theme";
import { Button } from "./button";
import { GearIcon } from "./icons";
import { Card } from "./card";
import { T } from "./text";

const DISMISSED_KEY = "ie-push-prompt-dismissed";

/**
 * On the notifications screen: invites the person to turn push on, or tells them how when the system
 * blocks it. "Non ora" hides it on this phone; the account screen keeps the switch.
 */
export function PushPrompt() {
  const { c } = useTheme();
  const { state, enabling, enable } = usePushPermission();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then(
      (v) => setDismissed(v === "1"),
      () => setDismissed(false),
    );
  }, []);

  if (dismissed !== false || !state || state === "unsupported" || state === "granted") return null;
  const blocked = state === "blocked";
  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, "1").catch(() => {});
  };
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: c.accentSubtle }]}>
          <Ionicons name={blocked ? "notifications-off-outline" : "notifications-outline"} size={24} color={c.accentText} />
        </View>
        <View style={styles.texts}>
          <T variant="bodyStrong">{blocked ? "Le notifiche sono spente" : "Avvisi sul telefono"}</T>
          <T variant="callout" tone="secondary">
            {blocked
              ? "Per riceverle, attivale per I-Events nelle impostazioni del telefono."
              : "Ti avvisiamo appena arriva una richiesta, una proposta o un messaggio."}
          </T>
        </View>
      </View>
      <View style={styles.actions}>
        {blocked ? (
          <Button label="Impostazioni" leading={(color, pressed) => <GearIcon color={color} turn={pressed} />} onPress={() => Linking.openSettings()} />
        ) : (
          <Button label="Attiva le notifiche" loading={enabling} onPress={enable} />
        )}
        <Button variant="tertiary" label="Non ora" onPress={dismiss} />
      </View>
    </Card>
  );
}

/** On the account screen: whether push is on for this phone, with the way to turn it on. */
export function PushSetting() {
  const { state, enabling, enable } = usePushPermission();
  if (!state || state === "unsupported") return null;
  const on = state === "granted";
  return (
    <Card style={styles.card}>
      <View style={styles.texts}>
        <T variant="bodyStrong">Notifiche sul telefono</T>
        <T variant="callout" tone="secondary">
          {on
            ? "Attive. Puoi spegnerle dalle impostazioni del telefono."
            : state === "blocked"
              ? "Spente. Puoi attivarle dalle impostazioni del telefono."
              : "Spente. Attivale per sapere subito cosa succede."}
        </T>
      </View>
      {!on &&
        (state === "blocked" ? (
          <Button variant="secondary" label="Impostazioni" leading={(color, pressed) => <GearIcon color={color} turn={pressed} />} onPress={() => Linking.openSettings()} />
        ) : (
          <Button variant="secondary" label="Attiva le notifiche" loading={enabling} onPress={enable} />
        ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[4] },
  head: { flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: space[1] },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
