import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCheckinAutoSync } from "@/lib/checkin-queue";
import { usePushNotifications } from "@/lib/open-notification";
import { useActiveOrg } from "@/lib/session";
import { fonts, useTheme } from "@/theme";

type Icon = ComponentProps<typeof Ionicons>["name"];
const icon = (on: Icon, off: Icon) =>
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? on : off} size={24} color={color} />;
  };

/**
 * Home, Richieste, Eventi, Messaggi, as in the Carta designs; notifications and the account sit top right.
 * Suppliers work on booking requests only, so they get Home and Richieste. Outline icons, filled when
 * active; the bar is 56 high plus the safe area.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  const org = useActiveOrg();
  usePushNotifications();
  useCheckinAutoSync();
  const insets = useSafeAreaInsets();
  const supplier = org.type === "supplier";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.textPrimary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: {
          backgroundColor: c.bgApp,
          borderTopColor: c.borderDefault,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: fonts.sans["500"], fontSize: 12, lineHeight: 16 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="richieste" options={{ title: "Richieste", tabBarIcon: icon("file-tray", "file-tray-outline") }} />
      <Tabs.Screen
        name="eventi"
        options={{
          title: "Eventi",
          href: supplier ? null : undefined,
          tabBarIcon: icon("calendar", "calendar-outline"),
        }}
      />
      <Tabs.Screen
        name="messaggi"
        options={{
          title: "Messaggi",
          href: supplier ? null : undefined,
          tabBarIcon: icon("chatbubble", "chatbubble-outline"),
        }}
      />
    </Tabs>
  );
}
