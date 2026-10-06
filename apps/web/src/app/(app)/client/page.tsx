import { Card, Empty } from "@/components/ui";
import { REQUEST_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Richieste" };

export default async function ClientHome() {
  const org = await requireOrg("client");
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("requests")
    .select("id, title, kind, status, start_date, updated_at, proposals(count)")
    .eq("client_org_id", org.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <h1 className="text-2xl font-semibold">Le tue richieste</h1>
      <Card>
        {requests.length === 0 ? (
          <Empty>Non hai ancora creato richieste. La creazione guidata di eventi e campagne arriva nel prossimo passo.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <span>
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-2 text-muted">{r.kind === "campaign" ? "Campagna" : "Evento"}</span>
                </span>
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
