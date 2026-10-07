import { Stamp, stampDay } from "@/components/ticket";
import { EventHeader } from "@/components/event-type";
import { ReviewForm } from "@/components/profiles/review-forms";
import { QuoteDecision } from "@/components/quotes/quote-decision";
import { QuoteHistory, type SentQuote } from "@/components/quotes/quote-history";
import { Card, Empty, Notice } from "@/components/ui";
import { EVENT_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { can, EVENT_TYPE_INFO, formatTicketNumber } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Evento" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const day = (d: string | null) => (d ? dateFmt.format(new Date(`${d}T12:00:00`)) : null);

/** The client's view of an event: status, dates and the agency's quote to approve. */
export default async function ClientEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const org = await requireOrg("client");
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, number, title, event_type, status, start_date, end_date, city, venue, request_id, stage:campaign_stages(position), agency_org_id, agency:organizations!events_agency_org_id_fkey(name)")
    .eq("id", id)
    .eq("client_org_id", org.id)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  const [{ data, error: e2 }, { data: review, error: e3 }] = await Promise.all([
    supabase
      .from("event_quotes")
      .select("id, version, status, lines, total_amount, note, decision_note, sent_at, decided_at")
      .eq("event_id", id)
      .order("version", { ascending: false }),
    supabase
      .from("reviews")
      .select("rating, comment, reply")
      .eq("event_id", id)
      .eq("author_org_id", org.id)
      .eq("subject_org_id", event.agency_org_id)
      .maybeSingle(),
  ]);
  if (e2) throw e2;
  if (e3) throw e3;
  const canReview = ["owner", "admin", "manager", "approver"].includes(org.role);
  const quotes = data as SentQuote[];
  const latest = quotes[0];
  const canDecide = can(org.type, org.role, "proposals.decide");
  const dates = [day(event.start_date), event.end_date && event.end_date !== event.start_date ? day(event.end_date) : null].filter(Boolean).join(" – ");

  return (
    <>
      <EventHeader
        type={event.event_type}
        back={
          <Link href="/client/eventi" className="text-sm text-muted underline">
            Eventi
          </Link>
        }
        aside={
          <div className="flex items-center gap-4">
            {event.status === "completed" && (
              <Stamp label="Andato in scena" date={stampDay(event.end_date ?? event.start_date)} type={event.event_type} />
            )}
            <span className="rounded-ui border border-border px-3 py-1 text-sm">{EVENT_STATUS_LABEL[event.status]}</span>
          </div>
        }
      >
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="text-sm text-muted">
          <span className="font-mono">{formatTicketNumber(event.number, event.stage?.position)}</span>
          {" · "}
          {[event.event_type && EVENT_TYPE_INFO[event.event_type].label, event.agency.name, dates || "Data da definire", event.city, event.venue]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </EventHeader>

      {event.status === "completed" && (
        <section id="recensione">
          <Card title={review ? "La tua recensione" : `Com'è andata con ${event.agency.name}?`}>
            {canReview ? (
              <ReviewForm eventId={event.id} subjectId={event.agency_org_id} subjectName={event.agency.name} existing={review} />
            ) : review ? (
              <p className="text-sm">La tua azienda ha lasciato {review.rating} stelle su 5.</p>
            ) : (
              <p className="text-sm text-muted">La recensione la lascia un responsabile della tua azienda.</p>
            )}
            {review?.reply && (
              <blockquote className="mt-4 border-l-2 border-border pl-3 text-sm">
                <span className="text-muted">Risposta di {event.agency.name}: </span>
                {review.reply}
              </blockquote>
            )}
          </Card>
        </section>
      )}

      <Card title="Preventivo">
        {!latest ? (
          <Empty>{event.agency.name} sta preparando il preventivo dettagliato. Ti avvisiamo quando è pronto da approvare.</Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {latest.status === "sent" &&
              (canDecide ? (
                <QuoteDecision quoteId={latest.id} eventId={event.id} total={Number(latest.total_amount)} version={latest.version ?? 1} />
              ) : (
                <Notice>Il preventivo aspetta l&apos;approvazione di un responsabile della spesa della tua azienda.</Notice>
              ))}
            {latest.status === "approved" && <Notice tone="success">Preventivo approvato.</Notice>}
            {latest.status === "changes_requested" && <Notice>Hai chiesto modifiche: {event.agency.name} sta preparando una nuova versione.</Notice>}
            <QuoteHistory quotes={quotes} />
          </div>
        )}
      </Card>

      <p className="text-sm">
        <Link href={`/client/richieste/${event.request_id}`} className="underline">
          Richiesta, proposte e conversazione con l&apos;agenzia
        </Link>
      </p>
    </>
  );
}
