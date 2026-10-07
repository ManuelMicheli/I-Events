import { TypedTitle } from "@/components/event-type";
import { ButtonLink, Card, Empty } from "@/components/ui";
import { REQUEST_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Richieste" };

export default async function ClientHome() {
  const org = await requireOrg("client");
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("requests")
    .select("id, title, kind, event_type, status, start_date, updated_at, proposals(count)")
    .eq("client_org_id", org.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Le tue richieste</h1>
        <ButtonLink href="/client/richieste/nuova">Nuova richiesta</ButtonLink>
      </div>
      <Card>
        {requests.length === 0 ? (
          <Empty>Non hai ancora creato richieste. Parti da un evento singolo o da una campagna con Nuova richiesta.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                <TypedTitle type={r.event_type}>
                  <Link href={r.status === "draft" ? `/client/richieste/${r.id}/modifica` : `/client/richieste/${r.id}`} className="font-medium underline">
                    {r.title}
                  </Link>
                  <span className="ml-2 text-muted">{r.kind === "campaign" ? "Campagna" : "Evento"}</span>
                </TypedTitle>
                <span className="text-muted">
                  {REQUEST_STATUS_LABEL[r.status]} · {r.proposals[0]?.count ?? 0} agenzie
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
