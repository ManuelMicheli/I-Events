import { ClearMoment } from "@/components/moment";
import { Seal, stampDay } from "@/components/ticket";
import { EventHeader } from "@/components/event-type";
import { WriteToOthers } from "@/components/write-to-others";
import { env } from "@/lib/env";
import { ReviewForm } from "@/components/profiles/review-forms";
import { QuoteDecision } from "@/components/quotes/quote-decision";
import { QuoteHistory, type SentQuote } from "@/components/quotes/quote-history";
import { ButtonLink, Card, Empty, Logo, Notice } from "@/components/ui";
import { EVENT_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { can, EVENT_TYPE_INFO, formatTicketNumber } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

export const metadata: Metadata = { title: "Evento" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const day = (d: string | null) => (d ? dateFmt.format(new Date(`${d}T12:00:00`)) : null);
const shortDay = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

/** The client's view of an event: status, dates and the agency's quote to approve. */
export default async function ClientEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ momento?: string; avvisa?: string }> }) {
  const { id } = await params;
  const { momento, avvisa } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const org = await requireOrg("client");
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, number, title, event_type, status, start_date, end_date, city, venue, request_id, proposal_id, stage:campaign_stages(position), agency_org_id, agency:organizations!events_agency_org_id_fkey(name)")
    .eq("id", id)
    .eq("client_org_id", org.id)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  const [{ data, error: e2 }, { data: review, error: e3 }, { data: proposal, error: e4 }, { data: others, error: e5 }] = await Promise.all([
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
    supabase.from("proposals").select("decided_at").eq("id", event.proposal_id).maybeSingle(),
    supabase.from("proposals").select("id").eq("request_id", event.request_id).eq("status", "rejected"),
  ]);
  if (e2) throw e2;
  if (e3) throw e3;
  if (e4) throw e4;
  if (e5) throw e5;
  const confirmedOn = proposal?.decided_at ?? null;
  // Has the client written to the agency since choosing it? (first of the next steps)
  const { count: written, error: e6 } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", event.proposal_id)
    .eq("author_org_id", org.id)
    .gte("created_at", confirmedOn ?? "1970-01-01");
  if (e6) throw e6;
  const canReview = ["owner", "admin", "manager", "approver"].includes(org.role);
  const quotes = data as SentQuote[];
  const latest = quotes[0];
  const canDecide = can(org.type, org.role, "proposals.decide");
  const dates = [day(event.start_date), event.end_date && event.end_date !== event.start_date ? day(event.end_date) : null].filter(Boolean).join(" – ");
  const ahead = ["planning", "preparing", "live"].includes(event.status);
  const conversation = `/client/richieste/${event.request_id}?scrivi=${event.proposal_id}#conversazioni`;
  const quoteWaits = latest?.status === "sent" && canDecide;

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
          event.status === "completed" ? (
            <Seal label="Andato in scena" date={stampDay(event.end_date ?? event.start_date)} type={event.event_type} />
          ) : ahead && confirmedOn ? (
            <Seal label="Confermato" date={stampDay(confirmedOn)} type={event.event_type} fresh={momento === "confermato"} />
          ) : (
            <span className="rounded-ui border border-border px-3 py-1 text-sm">{EVENT_STATUS_LABEL[event.status]}</span>
          )
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

      {momento && <ClearMoment />}

      {ahead && (
        <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] 3xl:grid-cols-[22rem_minmax(0,1fr)]">
          <EventPass
            title={event.title}
            number={formatTicketNumber(event.number, event.stage?.position)}
            agency={event.agency.name}
            facts={[
              { label: "Data", value: event.start_date ? shortDay.format(new Date(`${event.start_date}T12:00:00`)) : "Da definire" },
              { label: "Luogo", value: event.venue || event.city || "Da definire" },
              { label: "Tipo", value: event.event_type ? EVENT_TYPE_INFO[event.event_type].label : "Evento" },
              { label: "Agenzia", value: event.agency.name },
            ]}
            qr={await QRCode.toString(`${env.siteUrl}/client/eventi/${event.id}`, { type: "svg", errorCorrectionLevel: "M", margin: 0, color: { dark: "#111113", light: "#ffffff" } })}
          />
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-medium">Il tuo evento è in mano a {event.agency.name}</h2>
              <p className="text-sm text-muted">Da qui in poi segui tutto in un posto solo: messaggi, preventivo dettagliato e giorno dell&apos;evento.</p>
            </div>
            <NextSteps
              steps={[
                { label: `Scrivi a ${event.agency.name} e condividi i materiali del brand`, done: (written ?? 0) > 0 },
                { label: `${event.agency.name} prepara il preventivo dettagliato`, done: Boolean(latest) },
                { label: "Approva il preventivo", done: quotes.some((q) => q.status === "approved") },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              {(written ?? 0) === 0 ? (
                <ButtonLink href={conversation} variant={quoteWaits ? "secondary" : "primary"}>
                  Scrivi a {event.agency.name}
                </ButtonLink>
              ) : (
                <>
                  {latest?.status === "sent" && (
                    <ButtonLink href="#preventivo" variant="secondary">
                      Vai al preventivo
                    </ButtonLink>
                  )}
                  <Link href={conversation} className="px-2 text-sm font-medium underline">
                    Scrivi a {event.agency.name}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {avvisa && event.request_id && (others?.length ?? 0) > 0 && (
        <WriteToOthers requestId={event.request_id} back={`/client/eventi/${event.id}`} title={event.title} others={others!.length} />
      )}

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

      <section id="preventivo" className="scroll-mt-20">
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
      </section>

      <p className="text-sm">
        <Link href={`/client/richieste/${event.request_id}`} className="underline">
          Richiesta, proposte e conversazione con l&apos;agenzia
        </Link>
      </p>
    </>
  );
}

/**
 * The event's ticket, standing (Client 6): the I-Events mark, the title and four facts, then the
 * perforation and a QR that opens the event on a phone, with the number and the agency under it.
 */
function EventPass({ title, number, agency, facts, qr }: { title: string; number: string; agency: string; facts: { label: string; value: string }[]; qr: string }) {
  return (
    <article aria-label={`Biglietto dell'evento ${title}, ${number}`} className="flex flex-col gap-5 rounded-card border border-border bg-bg p-6 shadow-1">
      <div className="flex items-center justify-between gap-3">
        <Logo className="[&>span]:text-base" />
        <span className="font-mono text-xs tracking-[0.08em] text-muted uppercase">Biglietto</span>
      </div>
      <h2 className="text-xl font-medium">{title}</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="font-mono text-xs tracking-[0.08em] text-muted uppercase">{f.label}</dt>
            <dd className="text-sm break-words">{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="perforation -mx-6 my-1" aria-hidden />
      <figure className="flex flex-col items-center gap-3">
        <div
          role="img"
          aria-label="Codice QR: apre l'evento sul telefono"
          className="size-36 rounded-ui border border-border bg-white p-3 [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <figcaption className="font-mono text-xs text-muted">
          {number} · {agency}
        </figcaption>
      </figure>
    </article>
  );
}

/** "Prossimi passi": done ones ticked, the current one marked in Fiamma, the rest waiting. */
function NextSteps({ steps }: { steps: { label: string; done: boolean }[] }) {
  const current = steps.findIndex((s) => !s.done);
  return (
    <Card title="Prossimi passi">
      <ol className="flex flex-col gap-1">
        {steps.map((s, i) => (
          <li
            key={s.label}
            aria-current={i === current ? "step" : undefined}
            className={`flex items-center gap-3 rounded-ui px-3 py-2.5 text-sm ${i === current ? "bg-surface font-medium" : s.done ? "" : "text-muted"}`}
          >
            <span
              aria-hidden
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                s.done ? "border-text bg-text text-bg" : i === current ? "border-accent" : "border-border-strong"
              }`}
            >
              {s.done ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6.25l2.25 2.25 4.75-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i === current && <span className="size-2.5 rounded-full bg-accent" />
              )}
            </span>
            <span>
              {s.label}
              <span className="sr-only">{s.done ? ", fatto" : i === current ? ", adesso" : ", dopo"}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
