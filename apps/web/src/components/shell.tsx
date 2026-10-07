import { readFlash } from "@/lib/flash";
import { myName } from "@/lib/home";
import { ORG_TYPE_LABEL } from "@/lib/labels";
import { navCounts } from "@/lib/nav-counts";
import { AREA_BY_TYPE, getMyOrgs, getUser, type MyOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { Bell } from "./bell";
import { CommandPalette } from "./command-palette";
import { NavList, PageTitle, TabBar, type NavItem } from "./shell-nav";
import { ToastProvider } from "./toast";
import { Logo } from "./ui";

const NAV: Record<MyOrg["type"], NavItem[]> = {
  agency: [
    { href: "/pro", label: "Home", icon: "home" },
    { href: "/pro/richieste", label: "Richieste", icon: "requests" },
    { href: "/pro/eventi", label: "Eventi", icon: "events" },
    { href: "/pro/attivita", label: "Attività", icon: "tasks" },
    { href: "/pro/rubrica", label: "Rubrica", icon: "contacts" },
    { href: "/pro/fornitori", label: "Trova fornitori", icon: "search" },
    { href: "/impostazioni/collegamenti", label: "Aziende collegate", icon: "links" },
    { href: "/pro/profilo", label: "Profilo marketplace", icon: "profile" },
    { href: "/impostazioni/team", label: "Team", icon: "team" },
  ],
  client: [
    { href: "/client", label: "Home", icon: "home" },
    { href: "/client/richieste", label: "Richieste", icon: "requests" },
    { href: "/client/eventi", label: "Eventi", icon: "events" },
    { href: "/client/agenzie", label: "Trova agenzie", icon: "search" },
    { href: "/impostazioni/collegamenti", label: "Agenzie collegate", icon: "links" },
    { href: "/impostazioni/team", label: "Team", icon: "team" },
  ],
  supplier: [
    { href: "/supplier/richieste", label: "Richieste", icon: "requests" },
    { href: "/supplier/disponibilita", label: "Disponibilità", icon: "availability" },
    { href: "/supplier", label: "Profilo", icon: "profile" },
    { href: "/impostazioni/team", label: "Team", icon: "team" },
  ],
};

/**
 * App frame (Carta items 21 and 22): sidebar 240 with the counts and the user block on desktop; top bar
 * 56 with the page title, search, the bell and the avatar; tab bar at the bottom below 1024 px.
 */
export async function Shell({ org, children }: { org: MyOrg; children: ReactNode }) {
  const supabase = await createClient();
  const [orgs, user, name, counts, flash, { count: unread }] = await Promise.all([
    getMyOrgs(),
    getUser(),
    myName(),
    navCounts(org),
    readFlash(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  const nav = NAV[org.type];
  const email = user?.email ?? "";
  const account = {
    name: name ?? email.split("@")[0] ?? "Account",
    email,
    org: { id: org.id, name: org.name, type: ORG_TYPE_LABEL[org.type] },
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, type: ORG_TYPE_LABEL[o.type] })),
  };

  return (
    <ToastProvider flash={flash} tabBar>
      <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border px-3 pb-3 lg:flex">
          <Link href={AREA_BY_TYPE[org.type]} className="flex h-14 shrink-0 items-center rounded-ui px-3" aria-label="I-Events, home">
            <Logo />
          </Link>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavList items={nav} counts={counts} />
          </div>
          <div className="border-t border-border pt-3">
            <AccountMenu {...account} variant="side" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-app/90 px-4 backdrop-blur sm:px-6 lg:gap-4 lg:px-8 3xl:px-12 4xl:px-16">
            <Link href={AREA_BY_TYPE[org.type]} className="mr-auto flex min-h-11 items-center lg:hidden" aria-label="I-Events, home">
              <Logo />
            </Link>
            <div className="hidden min-w-0 flex-1 lg:block">
              <PageTitle items={nav} />
            </div>
            <CommandPalette items={nav} />
            <Link
              href="/notifiche"
              className="ic-host relative flex size-11 shrink-0 items-center justify-center rounded-ui hover:bg-surface"
              aria-label={unread ? `Notifiche, ${unread} non lette` : "Notifiche"}
            >
              <Bell unread={unread ?? 0} />
              {unread ? (
                <span aria-hidden className="absolute top-2 right-2.5 flex rounded-full border-2 border-app">
                  <span className="live-dot size-2 rounded-full bg-accent" />
                </span>
              ) : null}
            </Link>
            <AccountMenu {...account} variant="bar" />
          </header>
          <main className="flex w-full flex-col gap-6 px-4 pt-8 pb-[calc(56px+env(safe-area-inset-bottom)+32px)] sm:px-6 lg:px-8 lg:pb-8 3xl:px-12 3xl:pt-10 3xl:pb-10 4xl:px-16">{children}</main>
        </div>
      </div>
      <TabBar items={nav} counts={counts} />
    </ToastProvider>
  );
}
