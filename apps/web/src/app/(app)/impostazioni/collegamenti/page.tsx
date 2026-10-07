import { InviteForm } from "@/components/invite-form";
import { Card, Empty, Notice } from "@/components/ui";
import { getActiveOrg } from "@/lib/session";
import { inviteConnection, revokeConnection } from "@/lib/settings-actions";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Collegamenti" };

export default async function ConnectionsPage() {
  const org = (await getActiveOrg())!;
  if (org.type === "supplier") {
    return <Notice>I collegamenti con le aziende sono per agenzie e aziende. I fornitori vengono trovati dalle agenzie.</Notice>;
  }
  const isAgency = org.type === "agency";
  const other = isAgency ? "aziende" : "agenzie";
  const canManage = org.role === "owner" || org.role === "admin";
  const supabase = await createClient();
  const { data: connections, error } = await supabase
    .from("connections")
    .select("id, status, invite_email, created_at, agency:organizations!connections_agency_org_id_fkey(name), client:organizations!connections_client_org_id_fkey(name)")
    .or(`agency_org_id.eq.${org.id},client_org_id.eq.${org.id}`)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const active = connections.filter((c) => c.status === "active");
  const pending = connections.filter((c) => c.status === "pending");

  return (
    <>
      <h1 className="text-2xl font-semibold">{isAgency ? "Aziende collegate" : "Agenzie collegate"}</h1>
      {/* From 1920 px the connections and the invitation sit side by side (A11 in globals.css). */}
      <div className={`flex flex-col gap-6 ${canManage ? "3xl:grid 3xl:grid-cols-2 3xl:items-start" : ""}`}>
        <Card title={`Le tue ${other}`}>
          {active.length === 0 ? (
            <Empty>Nessun collegamento attivo.</Empty>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {active.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <span>{(isAgency ? c.client?.name : c.agency?.name) ?? "–"}</span>
                  {canManage && (
                    <form action={revokeConnection}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-muted underline">Scollega</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        {canManage && (
          <Card title={`Invita ${isAgency ? "un'azienda" : "un'agenzia"} con cui lavori già`}>
            <InviteForm action={inviteConnection} withMessage submitLabel="Crea invito" />
            {pending.length > 0 && (
              <>
                <h3 className="mt-6 mb-2 text-sm font-medium">Inviti in attesa</h3>
                <ul className="divide-y divide-border text-sm">
                  {pending.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2">
                      <span>{c.invite_email}</span>
                      <form action={revokeConnection}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="text-muted underline">Annulla</button>
                      </form>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
