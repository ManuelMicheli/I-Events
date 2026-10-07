import { StyleSheet, View } from "react-native";
import { initials } from "@/lib/format";
import { radius, useTheme } from "@/theme";
import { T } from "./text";

/** Round avatar with the two initials of a person or organization, on Carta subtle with a hairline. */
export function Avatar({ name, size = 40 }: { name: string | null | undefined; size?: 32 | 40 }) {
  const { c } = useTheme();
  return (
    <View
      style={[styles.avatar, { width: size, height: size, backgroundColor: c.bgSubtle, borderColor: c.borderStrong }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <T variant={size === 32 ? "caption" : "label"} maxFontSizeMultiplier={1.2}>
        {initials(name)}
      </T>
    </View>
  );
}

/** Overlapping avatars, at most three and then "+N". */
export function AvatarStack({ names }: { names: string[] }) {
  const { c } = useTheme();
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return (
    <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shown.map((n, i) => (
        <View key={`${n}-${i}`} style={i > 0 && styles.overlap}>
          <Avatar name={n} size={32} />
        </View>
      ))}
      {rest > 0 && (
        <View style={[styles.avatar, styles.overlap, styles.more, { backgroundColor: c.bgSubtle, borderColor: c.borderStrong }]}>
          <T variant="caption" maxFontSizeMultiplier={1.2}>
            +{rest}
          </T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stack: { flexDirection: "row", alignItems: "center" },
  overlap: { marginLeft: -8 },
  more: { width: 32, height: 32 },
});
