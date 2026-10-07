import { TypedTitle } from "@/components/event-type";
import { EventTicket } from "@/components/ticket";
import { Card, Empty } from "@/components/ui";
import { EVENT_STATUS_LABEL, QUOTE_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { eventCountdown, formatTicketNumber, todayInItaly, type QuoteStatus } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Eventi" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

export default async function ClientEventsPage() {
  const org = await requireOrg("client");
  const supabase = await createClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("id, number, title, event_type, status, start_date, end_date, city, stage:campaign_stages(position), agency:organizations!events_agency_org_id_fkey(name), event_quotes(version, status)")
    .eq("client_org_id", org.id)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw error;

  const today = todayInItaly();
  const done = (s: string) => s === "completed" || s === "cancelled";
  const upcoming = events.filter((e) => !done(e.status));
  const past = events.filter((e) => done(e.status)).reverse();
  const latestQuote = (e: (typeof events)[number]) => [...e.event_quotes].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
  const quoteLabel = (e: (typeof events)[number]) => {
    const latest = latestQuote(e);
    return latest ? QUOTE_STATUS_LABEL[latest.status as QuoteStatus] : "In preparazione";
  };

  return (
    <>
      <h1 className="text-2xl font-semibold">Eventi</h1>
      <Card title="In programma">
        {upcoming.length === 0 ? (
          <Empty>Quando accetti la proposta di un&apos;agenzia, l&apos;evento compare qui.</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((e) => (
              <li key={e.id}>
                <EventTicket
                  href={`/client/eventi/${e.id}`}
                  title={e.title}
                  type={e.event_type}
                  number={formatTicketNumber(e.number, e.stage?.position)}
                  countdown={eventCountdown(e, today)}
                  facts={[e.agency.name, e.start_date ? dateFmt.format(new Date(`${e.start_date}T12:00:00`)) : "Data da definire", e.city].filter(Boolean).join(" · ")}
                >
                  <p className="text-sm">
                    {EVENT_STATUS_LABEL[e.status]}
                    <span className={latestQuote(e)?.status === "sent" ? "font-medium" : "text-muted"}> · preventivo: {quoteLabel(e).toLowerCase()}</span>
                  </p>
                </EventTicket>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {past.length > 0 && (
        <Card title="Conclusi e annullati">
          <table className="list-table w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-medium">Evento</th>
                <th className="py-2 font-medium">Agenzia</th>
                <th className="py-2 font-medium">Data</th>
                <th className="py-2 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {past.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-2">
                    <TypedTitle type={e.event_type}>
                      <Link href={`/client/eventi/${e.id}`} className="font-medium underline">
                        {e.title}
                      </Link>
                    </TypedTitle>
                  </td>
                  <td data-label="Agenzia" className="py-2">{e.agency.name}</td>
                  <td data-label="Data" className="py-2">{e.start_date ? dateFmt.format(new Date(`${e.start_date}T12:00:00`)) : "Da definire"}</td>
                  <td data-label="Stato" className="py-2">{EVENT_STATUS_LABEL[e.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
