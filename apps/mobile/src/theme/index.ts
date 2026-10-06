import { useColorScheme } from "react-native";
import { dark, light, type Palette } from "./tokens";

export * from "./tokens";

/** The Carta palette for the system appearance, light or dark. */
export function useTheme(): { c: Palette; scheme: "light" | "dark" } {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { c: scheme === "dark" ? dark : light, scheme };
}
