import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { initials } from "@/lib/format";
import { radius, useTheme } from "@/theme";
import { T } from "./text";

/**
 * An agency's or supplier's logo on a square tile, as on the website; its initials when there is
 * none or it fails to load. A logo sits on white in both themes, because most are drawn for white.
 */
export function OrgLogo({ name, src, size = 40 }: { name: string; src: string | null; size?: 40 | 64 }) {
  const { c } = useTheme();
  const [failed, setFailed] = useState(false);
  const logo = !!src && !failed;
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size === 64 ? radius.md : radius.sm, borderColor: c.borderDefault, backgroundColor: logo ? "#FFFFFF" : c.bgSubtle },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {logo ? (
        <Image source={{ uri: src }} resizeMode="contain" onError={() => setFailed(true)} style={{ width: size - (size === 64 ? 16 : 10), height: size - (size === 64 ? 16 : 10) }} />
      ) : (
        <T variant={size === 64 ? "title3" : "label"} tone="secondary" maxFontSizeMultiplier={1.2}>
          {initials(name)}
        </T>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
