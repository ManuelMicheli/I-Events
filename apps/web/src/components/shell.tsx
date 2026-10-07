import { readFlash } from "@/lib/flash";
import { myName } from "@/lib/home";
import { ORG_TYPE_LABEL } from "@/lib/labels";
import { navCounts } from "@/lib/nav-counts";
import { nextEvent, type NextEvent } from "@/lib/next-event";
import { AREA_BY_TYPE, getMyOrgs, getUser, type MyOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { Bell } from "./bell";
import { CommandPalette } from "./command-palette";
import { NavList, TabBar, type NavGroup, type NavItem } from "./shell-nav";
import { ToastProvider } from "./toast";
import { TypeSquare } from "./event-type";
import { LiveDot } from "./ticket";
import { Logo } from "./ui";

const A = {
  proHome: { href: "/pro", label: "Home", icon: "home" },
  proRequests: { href: "/pro/richieste", label: "Richieste", icon: "requests" },
  proEvents: { href: "/pro/eventi", label: "Eventi", icon: "events" },
  proTasks: { href: "/pro/attivita", label: "Attività", icon: "tasks" },
  proContacts: { href: "/pro/rubrica", label: "Rubrica", icon: "contacts" },
  proSuppliers: { href: "/pro/fornitori", label: "Trova fornitori", icon: "search" },
  proLinks: { href: "/impostazioni/collegamenti", label: "Aziende collegate", icon: "links" },
  proProfile: { href: "/pro/profilo", label: "Profilo marketplace", icon: "profile" },
  team: { href: "/impostazioni/team", label: "Team", icon: "team" },
  clientHome: { href: "/client", label: "Home", icon: "home" },
  clientRequests: { href: "/client/richieste", label: "Richieste", icon: "requests" },
  clientEvents: { href: "/client/eventi", label: "Eventi", icon: "events" },
  clientAgencies: { href: "/client/agenzie", label: "Trova agenzie", icon: "search" },
  clientLinks: { href: "/impostazioni/collegamenti", label: "Agenzie collegate", icon: "links" },
  supRequests: { href: "/supplier/richieste", label: "Richieste", icon: "requests" },
  supAvailability: { href: "/supplier/disponibilita", label: "Disponibilità", icon: "availability" },
  supProfile: { href: "/supplier", label: "Profilo", icon: "profile" },
} satisfies Record<string, NavItem>;

/** The sections in groups, as in the sidebar; the tab bar takes them in this order (first three, then Altro). */
const NAV: Record<MyOrg["type"], NavGroup[]> = {
  agency: [
    { label: "Lavoro", items: [A.proHome, A.proRequests, A.proEvents, A.proTasks] },
    { label: "Rete", items: [A.proContacts, A.proSuppliers, A.proLinks, A.proProfile] },
    { label: "Account", items: [A.team] },
  ],
  client: [
    { label: "Lavoro", items: [A.clientHome, A.clientRequests, A.clientEvents] },
    { label: "Rete", items: [A.clientAgencies, A.clientLinks] },
    { label: "Account", items: [A.team] },
  ],
  supplier: [
    { label: "Lavoro", items: [A.supRequests, A.supAvailability] },
    { label: "Account", items: [A.supProfile, A.team] },
  ],
};

/**
 * App frame (Carta items 21 and 22, Wharf reference): on desktop a sidebar of 16rem on the paper, with the
 * logo and the bell, search, the sections in groups, the next event and the user block; the page has no
 * top bar. Below 1024 px a top bar of 56 with logo, search, bell and avatar, and the tab bar at the bottom.
 */
export async function Shell({ org, children }: { org: MyOrg; children: ReactNode }) {
  const supabase = await createClient();
  const [orgs, user, name, counts, flash, { count: unread }, next] = await Promise.all([
    getMyOrgs(),
    getUser(),
    myName(),
    navCounts(org),
    readFlash(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    nextEvent(org),
  ]);
  const groups = NAV[org.type];
  const nav = groups.flatMap((g) => g.items);
  const email = user?.email ?? "";
  const account = {
    name: name ?? email.split("@")[0] ?? "Account",
    email,
    org: { id: org.id, name: org.name, type: ORG_TYPE_LABEL[org.type] },
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, type: ORG_TYPE_LABEL[o.type] })),
  };
  const bell = (
    <Link
      href="/notifiche"
      className="ic-host relative flex size-11 shrink-0 items-center justify-center rounded-ui hover:bg-surface lg:size-9"
      aria-label={unread ? `Notifiche, ${unread} non lette` : "Notifiche"}
    >
      <Bell unread={unread ?? 0} />
      {unread ? (
        <span aria-hidden className="absolute top-2 right-2.5 flex rounded-full border-2 border-app lg:top-1 lg:right-1.5">
          <span className="live-dot size-2 rounded-full bg-accent" />
        </span>
      ) : null}
    </Link>
  );

  return (
    <ToastProvider flash={flash} tabBar>
      <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-4 px-3 pb-3 lg:flex">
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 pl-3">
            <Link href={AREA_BY_TYPE[org.type]} className="flex min-h-11 items-center rounded-ui" aria-label="I-Events, home">
              <Logo />
            </Link>
            {bell}
          </div>
          <CommandPalette items={nav} variant="side" />
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pt-1">
            <NavList groups={groups} counts={counts} />
          </div>
          {next && <NextEventCard e={next} />}
          <AccountMenu {...account} variant="side" />
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-app/85 px-4 backdrop-blur-md sm:px-6 lg:hidden">
            <Link href={AREA_BY_TYPE[org.type]} className="mr-auto flex min-h-11 items-center" aria-label="I-Events, home">
              <Logo />
            </Link>
            <CommandPalette items={nav} variant="bar" />
            {bell}
            <AccountMenu {...account} variant="bar" />
          </header>
          <main className="page-in flex w-full flex-col gap-6 px-4 pt-6 pb-[calc(56px+env(safe-area-inset-bottom)+32px)] sm:px-6 lg:px-8 lg:pt-8 lg:pb-10 3xl:px-12 3xl:pt-10 4xl:px-16">{children}</main>
        </div>
      </div>
      <TabBar items={nav} counts={counts} />
    </ToastProvider>
  );
}

/** The sidebar's bottom card (Wharf's plan card, made useful): the next event, its countdown, how far the work is. */
function NextEventCard({ e }: { e: NextEvent }) {
  const share = e.tasks ? Math.round((e.tasks.done / e.tasks.total) * 100) : null;
  return (
    <Link href={e.href} className="next-card group flex shrink-0 flex-col gap-2 rounded-[14px] px-3 py-3">
      <span className="flex items-center justify-between gap-2 text-xs font-medium">
        <span className="text-accent-ink">Prossimo evento</span>
        <span className="inline-flex items-center gap-1.5 font-mono tracking-[0.06em] text-text">
          {e.countdown.live && <LiveDot />}
          {e.countdown.label}
        </span>
      </span>
      <span className="flex min-w-0 items-baseline gap-2 text-sm font-medium">
        <TypeSquare type={e.type} className="relative top-[-1px]" />
        <span className="truncate group-hover:underline">{e.title}</span>
      </span>
      {e.tasks && (
        <>
          <span aria-hidden className="h-1 overflow-hidden rounded-full bg-[var(--next-track)]">
            <span className="grow-bar block h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
          </span>
          <span className="text-xs text-muted">
            <span className="font-mono text-text">{e.tasks.done}</span> di <span className="font-mono">{e.tasks.total}</span> attività fatte
          </span>
        </>
      )}
    </Link>
  );
}
