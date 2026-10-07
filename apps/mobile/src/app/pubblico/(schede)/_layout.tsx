import { Tabs } from "expo-router";
import { useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarIcon, CompassIcon, TicketIcon } from "@/components/icons";
import { fonts, useTheme } from "@/theme";

type Tab = "index" | "calendario" | "biglietti";

/**
 * The public tab bar (Carta item 23): Esplora, Calendario, Biglietti; filled icon when active.
 * Opening a section with a tap moves its icon once (A10): the needle settles, a sheet tears off the
 * calendar, the ticket stub tugs. Not when the area opens, not when the section is already open.
 */
export default function PublicTabs() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const current = useRef<string | null>(null);
  const [opened, setOpened] = useState<{ tab: string; n: number }>({ tab: "", n: 0 });
  const play = (tab: Tab) => (opened.tab === tab ? opened.n : 0);
  const color = (focused: boolean) => (focused ? c.textPrimary : c.textSecondary);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.textPrimary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: { backgroundColor: c.bgApp, borderTopColor: c.borderDefault, height: 56 + insets.bottom, paddingBottom: insets.bottom },
        tabBarLabelStyle: { fontFamily: fonts.sans["500"], fontSize: 12, lineHeight: 16 },
      }}
      screenListeners={({ route }) => ({
        focus: () => {
          current.current = route.name;
        },
        tabPress: () => {
          if (current.current !== route.name) setOpened((o) => ({ tab: route.name, n: o.n + 1 }));
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Esplora",
          tabBarIcon: ({ focused }) => <CompassIcon color={color(focused)} hole={c.bgApp} filled={focused} play={focused ? play("index") : 0} />,
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: "Calendario",
          tabBarIcon: ({ focused }) => <CalendarIcon color={color(focused)} hole={c.bgApp} filled={focused} play={focused ? play("calendario") : 0} />,
        }}
      />
      <Tabs.Screen
        name="biglietti"
        options={{
          title: "Biglietti",
          tabBarIcon: ({ focused }) => <TicketIcon color={color(focused)} hole={c.bgApp} filled={focused} tug={focused ? play("biglietti") : 0} />,
        }}
      />
    </Tabs>
  );
}
