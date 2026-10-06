import { Card, Empty } from "@/components/ui";
import { PROPOSAL_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Richieste" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

export default async function ProHome() {
  const org = await requireOrg("agency");
  const supabase = await createClient();
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("id, status, updated_at, requests!inner(title, kind, start_date, guests, city, organizations!inner(name))")
    .eq("agency_org_id", org.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (
    <>
      <h1 className="text-2xl font-semibold">Richieste ricevute</h1>
      <Card>
        {proposals.length === 0 ? (
          <Empty>Nessuna richiesta per ora. Collega le aziende con cui lavori dalla sezione Aziende collegate.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-medium">Richiesta</th>
                <th className="py-2 font-medium">Azienda</th>
                <th className="py-2 font-medium">Tipo</th>
                <th className="py-2 font-medium">Data</th>
                <th className="py-2 font-medium">Ospiti</th>
                <th className="py-2 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2">{p.requests.title}</td>
                  <td className="py-2">{p.requests.organizations.name}</td>
                  <td className="py-2">{p.requests.kind === "campaign" ? "Campagna" : "Evento"}</td>
                  <td className="py-2">{p.requests.start_date ? dateFmt.format(new Date(p.requests.start_date)) : "Da definire"}</td>
                  <td className="py-2">{p.requests.guests ?? "–"}</td>
                  <td className="py-2">{PROPOSAL_STATUS_LABEL[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
