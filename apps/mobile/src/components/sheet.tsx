import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, space, useTheme } from "@/theme";
import { T } from "./text";

/** Bottom sheet: radius 24 on top, a handle, closes on the scrim or the back gesture. */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
        />
        <View
          style={[styles.sheet, { backgroundColor: c.bgElevated, paddingBottom: Math.max(insets.bottom, space[4]) + space[2] }]}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          <T variant="title3" accessibilityRole="header">
            {title}
          </T>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: space[4], paddingTop: space[2], gap: space[4] },
  handle: { width: 36, height: 4, borderRadius: radius.full, alignSelf: "center", marginBottom: space[2] },
});
