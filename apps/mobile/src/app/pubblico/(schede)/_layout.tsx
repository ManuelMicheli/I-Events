import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, useTheme } from "@/theme";

type Icon = ComponentProps<typeof Ionicons>["name"];
const icon = (on: Icon, off: Icon) =>
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? on : off} size={24} color={color} />;
  };

/** The public tab bar (Carta item 23): Esplora, Calendario, Biglietti; filled icon when active. */
export default function PublicTabs() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.textPrimary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.bgApp, borderTopColor: c.borderDefault, height: 56 + insets.bottom, paddingBottom: insets.bottom },
        tabBarLabelStyle: { fontFamily: fonts.sans["500"], fontSize: 12, lineHeight: 16 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Esplora", tabBarIcon: icon("compass", "compass-outline") }} />
      <Tabs.Screen name="calendario" options={{ title: "Calendario", tabBarIcon: icon("calendar", "calendar-outline") }} />
      <Tabs.Screen name="biglietti" options={{ title: "Biglietti", tabBarIcon: icon("ticket", "ticket-outline") }} />
    </Tabs>
  );
}
