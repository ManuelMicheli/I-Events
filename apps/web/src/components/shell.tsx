import { ORG_TYPE_LABEL } from "@/lib/labels";
import { switchOrganization } from "@/lib/org-actions";
import { AREA_BY_TYPE, getMyOrgs, type MyOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bell } from "./bell";
import { MobileMenu, NavList, type NavItem } from "./shell-nav";
import { buttonClass, Logo } from "./ui";

const NAV: Record<MyOrg["type"], NavItem[]> = {
  agency: [
    { href: "/pro", label: "Richieste" },
    { href: "/pro/eventi", label: "Eventi" },
    { href: "/pro/attivita", label: "Attività" },
    { href: "/pro/rubrica", label: "Rubrica" },
    { href: "/pro/fornitori", label: "Trova fornitori" },
    { href: "/impostazioni/collegamenti", label: "Aziende collegate" },
    { href: "/pro/profilo", label: "Profilo marketplace" },
    { href: "/impostazioni/team", label: "Team" },
  ],
  client: [
    { href: "/client", label: "Richieste" },
    { href: "/client/eventi", label: "Eventi" },
    { href: "/client/agenzie", label: "Trova agenzie" },
    { href: "/impostazioni/collegamenti", label: "Agenzie collegate" },
    { href: "/impostazioni/team", label: "Team" },
  ],
  supplier: [
    { href: "/supplier/richieste", label: "Richieste" },
    { href: "/supplier/disponibilita", label: "Disponibilità" },
    { href: "/supplier", label: "Profilo" },
    { href: "/impostazioni/team", label: "Team" },
  ],
};

/** App frame: sidebar 240 on desktop, top bar 56 with a menu on smaller screens. */
export async function Shell({ org, children }: { org: MyOrg; children: ReactNode }) {
  const supabase = await createClient();
  const [orgs, { count: unread }] = await Promise.all([
    getMyOrgs(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  const nav = NAV[org.type];
  const account = (where: "side" | "menu") => (
    <div className="flex flex-col gap-1">
      {orgs.length > 1 ? (
        <form action={switchOrganization} className="mb-2 flex flex-col gap-2 px-3">
          <label htmlFor={`orgId-${where}`} className="text-label font-medium text-muted">
            Organizzazione
          </label>
          <select id={`orgId-${where}`} name="orgId" defaultValue={org.id} className="min-h-12 w-full rounded-ui border border-control bg-bg px-3 sm:min-h-10">
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} · {ORG_TYPE_LABEL[o.type]}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass("secondary", "s", "self-start")}>
            Cambia organizzazione
          </button>
        </form>
      ) : (
        <p className="mb-2 px-3 text-sm">
          <span className="block font-medium">{org.name}</span>
          <span className="text-muted">{ORG_TYPE_LABEL[org.type]}</span>
        </p>
      )}
      <Link href="/onboarding" className="flex min-h-11 items-center rounded-[8px] px-3 text-sm text-muted hover:bg-surface hover:text-text lg:min-h-8">
        Nuovo account
      </Link>
      <form action="/auth/signout" method="post">
        <button className="flex min-h-11 w-full items-center rounded-[8px] px-3 text-left text-sm text-muted hover:bg-surface hover:text-text lg:min-h-8">Esci</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-border px-3 pb-4 lg:flex">
        <Link href={AREA_BY_TYPE[org.type]} className="flex h-14 shrink-0 items-center rounded-ui px-3" aria-label="I-Events, home">
          <Logo />
        </Link>
        <NavList items={nav} />
        <div className="mt-auto border-t border-border pt-4">{account("side")}</div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-app/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Link href={AREA_BY_TYPE[org.type]} className="flex min-h-11 items-center lg:hidden" aria-label="I-Events, home">
            <Logo />
          </Link>
          <span className="hidden min-w-0 truncate text-sm text-muted lg:block">
            {org.name} · {ORG_TYPE_LABEL[org.type]}
          </span>
          <Link
            href="/notifiche"
            className="ic-host ml-auto flex min-h-11 items-center gap-2 rounded-ui px-3 text-sm font-medium hover:bg-surface"
            aria-label={unread ? `Notifiche, ${unread} non lette` : "Notifiche"}
          >
            <Bell unread={unread ?? 0} />
            <span className="hidden sm:inline">Notifiche</span>
            {unread ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent px-2 font-mono text-xs leading-6 text-accent-text">
                {unread}
              </span>
            ) : null}
          </Link>
          <MobileMenu items={nav}>{account("menu")}</MobileMenu>
        </header>
        <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
