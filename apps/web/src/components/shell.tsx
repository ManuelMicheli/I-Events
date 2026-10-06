import { ORG_TYPE_LABEL } from "@/lib/labels";
import { switchOrganization } from "@/lib/org-actions";
import { AREA_BY_TYPE, getMyOrgs, type MyOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { ReactNode } from "react";

const NAV: Record<MyOrg["type"], { href: string; label: string }[]> = {
  agency: [
    { href: "/pro", label: "Richieste" },
    { href: "/pro/eventi", label: "Eventi" },
    { href: "/pro/attivita", label: "Attività" },
    { href: "/pro/rubrica", label: "Rubrica" },
    { href: "/impostazioni/collegamenti", label: "Aziende collegate" },
    { href: "/pro/profilo", label: "Profilo marketplace" },
    { href: "/impostazioni/team", label: "Team" },
  ],
  client: [
    { href: "/client", label: "Richieste" },
    { href: "/impostazioni/collegamenti", label: "Agenzie collegate" },
    { href: "/impostazioni/team", label: "Team" },
  ],
  supplier: [
    { href: "/supplier", label: "Profilo" },
    { href: "/impostazioni/team", label: "Team" },
  ],
};

export async function Shell({ org, children }: { org: MyOrg; children: ReactNode }) {
  const supabase = await createClient();
  const [orgs, { count: unread }] = await Promise.all([
    getMyOrgs(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href={AREA_BY_TYPE[org.type]} className="font-semibold">
            I-Events
          </Link>
          <nav className="flex flex-1 gap-4 text-sm">
            {NAV[org.type].map((n) => (
              <Link key={n.href} href={n.href} className="text-muted hover:text-text">
                {n.label}
              </Link>
            ))}
          </nav>
          {orgs.length > 1 ? (
            <form action={switchOrganization} className="flex items-center gap-2 text-sm">
              <label htmlFor="orgId" className="sr-only">
                Organizzazione
              </label>
              <select id="orgId" name="orgId" defaultValue={org.id} className="h-9 rounded-ui border border-border bg-bg px-2">
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} · {ORG_TYPE_LABEL[o.type]}
                  </option>
                ))}
              </select>
              <button type="submit" className="text-muted underline">
                Cambia
              </button>
            </form>
          ) : (
            <span className="text-sm text-muted">
              {org.name} · {ORG_TYPE_LABEL[org.type]}
            </span>
          )}
          <Link href="/notifiche" className="text-sm" aria-label={unread ? `Notifiche, ${unread} non lette` : "Notifiche"}>
            Notifiche{unread ? <span className="ml-1 rounded-ui bg-accent px-1.5 text-xs text-accent-text">{unread}</span> : null}
          </Link>
          <Link href="/onboarding" className="text-sm text-muted">
            + Nuovo account
          </Link>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-muted underline">Esci</button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  );
}
