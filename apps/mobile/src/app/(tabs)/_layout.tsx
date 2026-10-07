import { Tabs } from "expo-router";
import { useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MenuIcon } from "@/components/icons";
import { MoreSheet, type MoreItem } from "@/components/more-sheet";
import { NavIcon, type NavIconName } from "@/components/nav-icons";
import { useCheckinAutoSync } from "@/lib/checkin-queue";
import { useNavCounts } from "@/lib/nav-counts";
import { usePushNotifications } from "@/lib/open-notification";
import { useActiveOrg } from "@/lib/session";
import { fonts, useTheme } from "@/theme";

type Tab = "index" | "richieste" | "eventi" | "altro";

/**
 * The tab bar, as on the website's phone layout: Home, Richieste, Eventi and Altro, which opens the
 * other sections in a sheet. Section icons are outlined, filled on the section you are in, and move
 * once when a tab is touched (A10), not when the app opens. A count in Fiamma says what waits there,
 * as on the website. Suppliers work on booking requests only: Home and Richieste.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  const org = useActiveOrg();
  usePushNotifications();
  useCheckinAutoSync();
  const insets = useSafeAreaInsets();
  const counts = useNavCounts(org);
  const current = useRef<string | null>(null);
  const [opened, setOpened] = useState<{ tab: string; n: number }>({ tab: "", n: 0 });
  const [more, setMore] = useState(false);
  const supplier = org.type === "supplier";

  const rest: MoreItem[] =
    org.type === "agency"
      ? [
          { href: "/attivita", label: "Attività", icon: "tasks", count: counts.attivita },
          { href: "/rubrica", label: "Rubrica", icon: "contacts" },
          { href: "/trova", label: "Trova fornitori", icon: "search" },
          { href: "/messaggi", label: "Messaggi", icon: "messages" },
        ]
      : [
          { href: "/trova", label: "Trova agenzie", icon: "search" },
          { href: "/messaggi", label: "Messaggi", icon: "messages" },
        ];
  const restCount = rest.reduce((n, i) => n + (i.count ?? 0), 0);

  const play = (tab: Tab) => (opened.tab === tab ? opened.n : 0);
  const badge = (n: number) => (n > 0 ? (n > 9 ? "9+" : n) : undefined);
  const a11y = (label: string, n: number) => (n > 0 ? `${label}, ${n === 1 ? "1 novità" : `${n} novità`}` : label);
  const section = (tab: Tab, name: NavIconName) =>
    function SectionIcon({ focused }: { focused: boolean }) {
      return <NavIcon name={name} color={focused ? c.textPrimary : c.textSecondary} hole={c.bgApp} filled={focused} play={focused ? play(tab) : 0} />;
    };

  return (
    <>
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
          tabBarBadgeStyle: {
            backgroundColor: c.accentFill,
            color: c.onAccent,
            fontFamily: fonts.mono["500"],
            fontSize: 10,
            // 20 high with a 2 border: the line fills the 16 inside, so the figure sits in the middle.
            lineHeight: 16,
            paddingHorizontal: 4,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: c.bgApp,
          },
        }}
        screenListeners={({ route }) => ({
          focus: () => {
            current.current = route.name;
          },
          tabPress: (e) => {
            if (route.name === "altro") {
              e.preventDefault();
              setMore(true);
              return;
            }
            if (current.current !== route.name) setOpened((o) => ({ tab: route.name, n: o.n + 1 }));
          },
        })}
      >
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: section("index", "home") }} />
        <Tabs.Screen
          name="richieste"
          options={{
            title: "Richieste",
            tabBarIcon: section("richieste", "requests"),
            tabBarBadge: badge(counts.richieste),
            tabBarAccessibilityLabel: a11y("Richieste", counts.richieste),
          }}
        />
        <Tabs.Screen
          name="eventi"
          options={{
            title: "Eventi",
            href: supplier ? null : undefined,
            tabBarIcon: section("eventi", "events"),
            tabBarBadge: badge(counts.eventi),
            tabBarAccessibilityLabel: a11y("Eventi", counts.eventi),
          }}
        />
        <Tabs.Screen
          name="altro"
          options={{
            title: "Altro",
            href: supplier ? null : undefined,
            tabBarIcon: () => <MenuIcon color={more ? c.textPrimary : c.textSecondary} open={more} size={24} />,
            tabBarBadge: badge(restCount),
            tabBarAccessibilityLabel: a11y("Altro, altre sezioni", restCount),
          }}
        />
      </Tabs>
      <MoreSheet visible={more} items={rest} onClose={() => setMore(false)} />
    </>
  );
}
