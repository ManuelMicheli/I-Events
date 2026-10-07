import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { fonts, space, useTheme } from "@/theme";
import { T } from "./text";

/** The I-Events symbol ("Biglietto"): a ticket with the i cut out and the Fiamma dot. */
/** `color` paints the ticket for dark grounds, such as an event cover. */
export function LogoSymbol({ width = 48, color }: { width?: number; color?: string }) {
  const { c } = useTheme();
  return (
    <Svg width={width} height={(width * 52) / 80} viewBox="10 24 80 52" accessibilityLabel="I-Events" accessibilityRole="image">
      <Path
        fillRule="evenodd"
        fill={color ?? c.textPrimary}
        d="M20 24H80A10 10 0 0 1 90 34V43A7 7 0 0 0 90 57V66A10 10 0 0 1 80 76H20A10 10 0 0 1 10 66V57A7 7 0 0 0 10 43V34A10 10 0 0 1 20 24ZM45 51A5 5 0 0 1 55 51V65A5 5 0 0 1 45 65Z"
      />
      <Circle cx={50} cy={36} r={6} fill="#FF4626" />
    </Svg>
  );
}

/** Symbol and "I-Events" wordmark (Bricolage 600), as at the top left of the website on the phone. */
export function Logo() {
  return (
    <View style={styles.logo} accessible accessibilityLabel="I-Events" accessibilityRole="image">
      <LogoSymbol width={32} />
      <T variant="title3" style={styles.word} maxFontSizeMultiplier={1.2}>
        I‑Events
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { flexDirection: "row", alignItems: "center", gap: space[2] },
  word: { fontFamily: fonts.sans["600"], fontSize: 18, lineHeight: 24, letterSpacing: -0.18 },
});
