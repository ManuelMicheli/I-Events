import { Card, Empty } from "@/components/ui";
import { EVENT_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Eventi" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

export default async function EventsPage() {
  const org = await requireOrg("agency");
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, status, start_date, city, client:organizations!events_client_org_id_fkey(name), event_bookings(status)")
    .eq("agency_org_id", org.id)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw error;

  const done = (s: string) => s === "completed" || s === "cancelled";
  const upcoming = events.filter((e) => !done(e.status));
  const past = events.filter((e) => done(e.status)).reverse();

  const table = (rows: typeof events) => (
    <table className="list-table w-full text-left text-sm">
      <thead className="text-muted">
        <tr>
          <th className="py-2 font-medium">Evento</th>
          <th className="py-2 font-medium">Cliente</th>
          <th className="py-2 font-medium">Data</th>
          <th className="py-2 font-medium">Città</th>
          <th className="py-2 font-medium">Fornitori</th>
          <th className="py-2 font-medium">Stato</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => {
          const live = e.event_bookings.filter((b) => b.status !== "cancelled");
          const confirmed = live.filter((b) => b.status === "confirmed").length;
          return (
            <tr key={e.id} className="border-t border-border">
              <td className="py-2">
                <Link href={`/pro/eventi/${e.id}`} className="font-medium underline">
                  {e.title}
                </Link>
              </td>
              <td data-label="Cliente" className="py-2">{e.client.name}</td>
              <td data-label="Data" className="py-2">{e.start_date ? dateFmt.format(new Date(`${e.start_date}T12:00:00`)) : "Da definire"}</td>
              <td data-label="Città" className="py-2">{e.city ?? "–"}</td>
              <td data-label="Fornitori" className={`py-2 ${live.length > 0 && confirmed < live.length ? "" : "text-muted"}`}>
                {live.length === 0 ? "–" : `${confirmed}/${live.length} confermati`}
              </td>
              <td data-label="Stato" className="py-2">{EVENT_STATUS_LABEL[e.status]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <>
      <h1 className="text-2xl font-semibold">Eventi</h1>
      <Card title="In programma">
        {upcoming.length === 0 ? <Empty>Quando un cliente sceglie una tua proposta, l&apos;evento compare qui.</Empty> : table(upcoming)}
      </Card>
      {past.length > 0 && <Card title="Conclusi e annullati">{table(past)}</Card>}
    </>
  );
}
