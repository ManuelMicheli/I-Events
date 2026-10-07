import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCheckinAutoSync } from "@/lib/checkin-queue";
import { usePushNotifications } from "@/lib/open-notification";
import { useActiveOrg } from "@/lib/session";
import { useUnreadCount } from "@/lib/unread";
import { fonts, useTheme } from "@/theme";

/**
 * Three sections: the organization's work, notifications, the account. Outline icons, filled when
 * active; the bar is 56 high plus the safe area, as in the Carta tab bar.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  const org = useActiveOrg();
  const unread = useUnreadCount();
  usePushNotifications();
  useCheckinAutoSync();
  const insets = useSafeAreaInsets();
  const home = org.type === "supplier" ? "Richieste" : "Eventi";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.textPrimary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.bgApp, borderTopColor: c.borderDefault, height: 56 + insets.bottom, paddingBottom: insets.bottom },
        tabBarLabelStyle: { fontFamily: fonts.sans["500"], fontSize: 12, lineHeight: 16 },
        tabBarBadgeStyle: { backgroundColor: c.accentFill, color: c.onAccent, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: home,
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifiche"
        options={{
          title: "Notifiche",
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarAccessibilityLabel: unread > 0 ? `Notifiche, ${unread} da leggere` : "Notifiche",
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
