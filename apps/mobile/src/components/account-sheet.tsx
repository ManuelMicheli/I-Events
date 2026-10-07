import Ionicons from "@expo/vector-icons/Ionicons";
import { ORG_TYPE_LABEL } from "@i-events/core";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMyName } from "@/lib/profile";
import { useSession } from "@/lib/session";
import { radius, space, useTheme } from "@/theme";
import { Avatar } from "./avatar";
import { GearIcon, LogoutIcon, PlusIcon } from "./icons";
import { Divider } from "./rows";
import { Sheet } from "./sheet";
import { T } from "./text";

/**
 * Who you are and where you work (Carta items 8 and 11), as the website's account menu: the avatar in
 * the top bar opens it, with the organisations to switch between, Nuovo account and Esci. The app
 * adds its own settings (notifications, contacts from the phone) under "Account e notifiche".
 */
export function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const { session, orgs, activeOrg, setActiveOrg, signOut } = useSession();
  const name = useMyName();
  const email = session?.user.email ?? "";
  const shown = name ?? (email.split("@")[0] || "Account");
  const go = (href: "/nuovo-account" | "/account") => {
    onClose();
    router.push(href);
  };
  return (
    <Sheet visible={visible} title="Account" onClose={onClose}>
      <View style={styles.body}>
        <View style={styles.who}>
          <Avatar name={shown} size={40} />
          <View style={styles.flex}>
            <T variant="bodyStrong" numberOfLines={1}>
              {shown}
            </T>
            <T variant="callout" tone="secondary" numberOfLines={1}>
              {email}
            </T>
          </View>
        </View>
        <Divider />
        {orgs.length > 1 ? (
          <View accessibilityRole="radiogroup" accessibilityLabel="Organizzazione">
            <T variant="label" tone="secondary" style={styles.groupLabel}>
              Organizzazione
            </T>
            <ScrollView style={styles.orgs} bounces={false}>
              {orgs.map((o) => {
                const on = o.id === activeOrg?.id;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => {
                      setActiveOrg(o.id);
                      onClose();
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${o.name} · ${ORG_TYPE_LABEL[o.type]}`}
                    style={({ pressed }) => [styles.item, pressed && { backgroundColor: c.bgSubtle }]}
                  >
                    <T variant="body" numberOfLines={1} style={styles.flex}>
                      {o.name}{" "}
                      <T variant="body" tone="secondary">
                        · {ORG_TYPE_LABEL[o.type]}
                      </T>
                    </T>
                    {on && <Ionicons name="checkmark" size={20} color={c.textPrimary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          activeOrg && (
            <T variant="callout" tone="secondary" numberOfLines={1} style={styles.groupLabel}>
              {activeOrg.name} · {ORG_TYPE_LABEL[activeOrg.type]}
            </T>
          )
        )}
        <Item label="Nuovo account" icon={(color, pressed) => <PlusIcon color={color} turn={pressed} />} onPress={() => go("/nuovo-account")} />
        <Item label="Account e notifiche" icon={(color, pressed) => <GearIcon color={color} turn={pressed} />} onPress={() => go("/account")} />
        <Divider />
        <Item
          label="Esci"
          icon={(color, pressed) => <LogoutIcon color={color} play={pressed} />}
          onPress={() => {
            onClose();
            signOut();
          }}
        />
      </View>
    </Sheet>
  );
}

function Item({ label, icon, onPress }: { label: string; icon: (color: string, pressed: boolean) => ReactNode; onPress: () => void }) {
  const { c } = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      style={[styles.item, pressed && { backgroundColor: c.bgSubtle }]}
    >
      {icon(c.textPrimary, pressed)}
      <T variant="body" numberOfLines={1} style={styles.flex}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[1] },
  who: { flexDirection: "row", alignItems: "center", gap: space[3], paddingBottom: space[2] },
  flex: { flex: 1, minWidth: 0 },
  groupLabel: { paddingTop: space[2], paddingBottom: space[1] },
  orgs: { maxHeight: 240 },
  item: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: space[3], marginHorizontal: -space[2], paddingHorizontal: space[2], borderRadius: radius.sm },
});
