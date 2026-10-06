import Ionicons from "@expo/vector-icons/Ionicons";
import { ORG_TYPE_LABEL, ROLE_LABEL } from "@i-events/core";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSession } from "@/lib/session";
import { control, space, useTheme } from "@/theme";
import { Divider, ListRow } from "./rows";
import { Sheet } from "./sheet";
import { T } from "./text";

/** The organization the screen is about; with more than one, a tap opens the list to switch. */
export function OrgSwitcher() {
  const { c } = useTheme();
  const { orgs, activeOrg, setActiveOrg } = useSession();
  const [open, setOpen] = useState(false);
  if (!activeOrg) return null;
  const label = `${activeOrg.name} · ${ORG_TYPE_LABEL[activeOrg.type]}`;
  if (orgs.length < 2)
    return (
      <T variant="callout" tone="secondary" numberOfLines={1}>
        {label}
      </T>
    );
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Cambia organizzazione`}
        hitSlop={space[1]}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.6 }]}
      >
        <T variant="callout" tone="secondary" numberOfLines={1} style={styles.flex}>
          {label}
        </T>
        <Ionicons name="chevron-down" size={16} color={c.textSecondary} />
      </Pressable>
      <Sheet visible={open} title="Organizzazione" onClose={() => setOpen(false)}>
        <View>
          {orgs.map((o, i) => (
            <View key={o.id}>
              {i > 0 && <Divider />}
              <ListRow
                title={o.name}
                subtitle={`${ORG_TYPE_LABEL[o.type]} · ${ROLE_LABEL[o.role]}`}
                selected={o.id === activeOrg.id}
                onPress={() => {
                  setActiveOrg(o.id);
                  setOpen(false);
                }}
              />
            </View>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: space[1], minHeight: control.touch, alignSelf: "flex-start", maxWidth: "100%" },
  flex: { flexShrink: 1 },
});
