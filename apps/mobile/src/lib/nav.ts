import type { OrgType } from "@i-events/core";
import type { Href } from "expo-router";
import type { NavIconName } from "@/components/nav-icons";
import type { NavCounts } from "./nav-counts";

export type NavSection = { href: Href; label: string; icon: NavIconName; count?: keyof NavCounts; tab?: boolean };

/**
 * The sections of each kind of organisation, in the website's order: the first ones are tabs, the
 * rest sit under Altro. Search offers them too ("Vai a").
 */
export const NAV: Record<OrgType, NavSection[]> = {
  agency: [
    { href: "/", label: "Home", icon: "home", tab: true },
    { href: "/richieste", label: "Richieste", icon: "requests", count: "richieste", tab: true },
    { href: "/eventi", label: "Eventi", icon: "events", count: "eventi", tab: true },
    { href: "/attivita", label: "Attività", icon: "tasks", count: "attivita" },
    { href: "/rubrica", label: "Rubrica", icon: "contacts" },
    { href: "/trova", label: "Trova fornitori", icon: "search" },
    { href: "/messaggi", label: "Messaggi", icon: "messages" },
  ],
  client: [
    { href: "/", label: "Home", icon: "home", tab: true },
    { href: "/richieste", label: "Richieste", icon: "requests", count: "richieste", tab: true },
    { href: "/eventi", label: "Eventi", icon: "events", count: "eventi", tab: true },
    { href: "/trova", label: "Trova agenzie", icon: "search" },
    { href: "/messaggi", label: "Messaggi", icon: "messages" },
  ],
  supplier: [
    { href: "/", label: "Home", icon: "home", tab: true },
    { href: "/richieste", label: "Richieste", icon: "requests", count: "richieste", tab: true },
  ],
};
