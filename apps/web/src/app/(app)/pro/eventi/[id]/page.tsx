import { CopyButton } from "@/components/copy-button";
import { PublicPageForm } from "@/components/events/public-page";
import { ClearMoment } from "@/components/moment";
import { Stamp, stampDay } from "@/components/ticket";
import { EventHeader } from "@/components/event-type";
import { BookingRow, type Booking } from "@/components/events/booking-row";
import { ReviewForm } from "@/components/profiles/review-forms";
import { EventDetailsForm, EventStatusActions } from "@/components/events/event-controls";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { QuoteHistory, type SentQuote } from "@/components/quotes/quote-history";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { TaskBoard } from "@/components/tasks/task-board";
import { Button, ButtonLink, Card, Empty, Select } from "@/components/ui";
import { env } from "@/lib/env";
import { EVENT_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  canMoveEvent,
  EVENT_STATUSES,
  EVENT_TYPE_INFO,
  formatTicketNumber,
  eventBudget,
  formatEuro,
  getServiceCategory,
  hhmm,
  SERVICE_CATALOG,
  soldLines as pickSoldLines,
  suggestedTasks,
  todayInItaly,
  type ProposalLine,
} from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addSuggestedTasks } from "../../attivita/actions";
import { addBooking } from "../actions";
import { createQuoteDraft } from "../quote-actions";

export const metadata: Metadata = { title: "Evento" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const day = (d: string | null) => (d ? dateFmt.format(new Date(`${d}T12:00:00`)) : null);
const registeredFmt = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const num = (v: number | string | null) => (v === null ? null : Number(v));

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ momento?: string }> }) {
  const { id } = await params;
  const { momento } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const org = await requireOrg("agency");
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("id, number, title, event_type, status, start_date, end_date, city, venue, proposal_id, is_public, public_description, public_starts_at, public_ends_at, public_capacity, stage:campaign_stages(position), client:organizations!events_client_org_id_fkey(name)")
    .eq("id", id)
    .eq("agency_org_id", org.id)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  const completed = event.status === "completed";
  const [bookingsRes, contactsRes, proposalRes, siblingsRes, tasksRes, membersRes, quotesRes, scheduleRes, crewRes, busyRes, reviewsRes, reviewableRes, registrationsRes] = await Promise.all([
    supabase
      .from("event_bookings")
      .select("id, service_key, description, contact_id, status, planned_cost, actual_cost, notes, supplier_response, supplier_price, supplier_note")
      .eq("event_id", id)
      .order("created_at")
      .order("id"),
    supabase.from("contacts").select("id, name, company, phone, email, services, supplier_org_id").eq("org_id", org.id).order("name").limit(2000),
    supabase.from("proposals").select("lines").eq("id", event.proposal_id).single(),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("proposal_id", event.proposal_id),
    supabase
      .from("event_tasks")
      .select("id, event_id, title, notes, due_date, done_at, assignee_id, booking_id")
      .eq("event_id", id)
      .order("due_date", { nullsFirst: false })
      .order("created_at"),
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("org_id", org.id).order("created_at"),
    supabase
      .from("event_quotes")
      .select("id, version, status, lines, total_amount, note, decision_note, sent_at, decided_at")
      .eq("event_id", id)
      .order("version", { ascending: false, nullsFirst: true }),
    supabase.from("event_schedule_items").select("day, starts_at, title").eq("event_id", id).order("day").order("starts_at"),
    supabase.from("event_crew").select("checked_in_at").eq("event_id", id),
    supabase.rpc("event_busy_contacts", { p_event: id }),
    supabase.from("reviews").select("author_org_id, subject_org_id, rating, comment, reply").eq("event_id", id),
    completed ? supabase.rpc("reviewable_for", { p_event: id, p_author: org.id }) : Promise.resolve({ data: [], error: null }),
    supabase.from("event_registrations").select("id, name, email, guests, created_at").eq("event_id", id).order("created_at", { ascending: false }).limit(500),
  ]);
  for (const r of [bookingsRes, contactsRes, proposalRes, siblingsRes, tasksRes, membersRes, quotesRes, scheduleRes, crewRes, busyRes, reviewsRes, reviewableRes, registrationsRes])
    if (r.error) throw r.error;

  const bookings: Booking[] = bookingsRes.data!.map((b) => ({
    ...b,
    planned_cost: num(b.planned_cost),
    actual_cost: num(b.actual_cost),
    supplier_price: num(b.supplier_price),
  }));
  const quotes = quotesRes.data!;
  const draft = quotes.find((q) => q.status === "draft");
  const sent = quotes.filter((q) => q.status !== "draft") as SentQuote[];
  const sold = pickSoldLines(quotes, (proposalRes.data!.lines ?? []) as ProposalLine[], siblingsRes.count === 1);
  const soldLines = sold?.lines ?? null;
  const budget = eventBudget(bookings, soldLines);
  const canManage = ["owner", "admin", "manager"].includes(org.role);
  const moves = EVENT_STATUSES.filter((s) => canMoveEvent(event.status, s));
  const dates = [day(event.start_date), event.end_date && event.end_date !== event.start_date ? day(event.end_date) : null].filter(Boolean).join(" – ");
  const tasks = tasksRes.data!;
  const members = membersRes.data!.map((m) => ({ id: m.user_id, label: m.profiles?.full_name || "Collega senza nome" }));
  const bookingOptions = bookings
    .filter((b) => b.status !== "cancelled")
    .map((b) => {
      const service = getServiceCategory(b.service_key)?.name.it ?? b.service_key;
      return { id: b.id, label: b.description ? `${service}: ${b.description}` : service };
    });
  const suggestionCount = suggestedTasks(
    bookings.filter((b) => b.status !== "cancelled").map((b) => b.service_key),
    event.start_date,
  ).length;
  const openTasks = tasks.filter((t) => !t.done_at).length;
  const schedule = scheduleRes.data!;
  const crew = crewRes.data!;
  const busy = Object.fromEntries(busyRes.data!.map((b) => [b.contact_id, b.days]));
  const reviews = reviewsRes.data!;
  const clientReview = reviews.find((r) => r.author_org_id !== org.id);
  const supplierName = (orgId: string) => contactsRes.data!.find((c) => c.supplier_org_id === orgId)?.company || contactsRes.data!.find((c) => c.supplier_org_id === orgId)?.name || "Fornitore";
  const toReview = reviewableRes.data!.map((r) => ({
    id: r.subject_org_id,
    name: supplierName(r.subject_org_id),
    existing: reviews.find((x) => x.author_org_id === org.id && x.subject_org_id === r.subject_org_id) ?? null,
  }));
  const registrations = registrationsRes.data!;
  const people = registrations.reduce((n, r) => n + r.guests, 0);
  const marginPct = budget.margin !== null && budget.sold ? Math.round((budget.margin / budget.sold) * 100) : null;

  return (
    <>
      {momento && <ClearMoment />}
      <EventHeader
        type={event.event_type}
        back={
          <Link href="/pro/eventi" className="text-sm text-muted underline">
            Eventi
          </Link>
        }
        aside={
          <div className="flex items-center gap-4">
            {event.status === "completed" && (
              <Stamp label="Andato in scena" date={stampDay(event.end_date ?? event.start_date)} type={event.event_type} fresh={momento === "concluso"} />
            )}
            <span className="rounded-ui border border-border px-3 py-1 text-sm">{EVENT_STATUS_LABEL[event.status]}</span>
          </div>
        }
      >
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="text-sm text-muted">
          <span className="font-mono">{formatTicketNumber(event.number, event.stage?.position)}</span>
          {" · "}
          {[event.event_type && EVENT_TYPE_INFO[event.event_type].label, event.client.name, dates || "Data da definire", event.city, event.venue]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </EventHeader>

      {canManage && <EventStatusActions eventId={event.id} moves={moves} />}

      {completed && (toReview.length > 0 || clientReview) && (
        <section id="recensioni">
          <Card title="Recensioni">
            <div className="flex flex-col gap-6">
              {clientReview && (
                <div className="flex flex-col gap-1 text-sm">
                  <p className="font-medium">
                    {event.client.name} vi ha dato {clientReview.rating} {clientReview.rating === 1 ? "stella" : "stelle"} su 5
                  </p>
                  {clientReview.comment && <p className="whitespace-pre-line">{clientReview.comment}</p>}
                  <Link href="/pro/profilo#recensioni" className="underline">
                    {clientReview.reply ? "Vedi la risposta sul profilo" : "Rispondi dal profilo"}
                  </Link>
                </div>
              )}
              {toReview.length > 0 && (
                <p className="text-sm text-muted">Com&apos;è andata con i fornitori? Le recensioni aiutano altre agenzie a sceglierli.</p>
              )}
              {toReview.map((s) => (
                <ReviewForm key={s.id} eventId={event.id} subjectId={s.id} subjectName={s.name} existing={s.existing} />
              ))}
            </div>
          </Card>
        </section>
      )}

      <Card title="Budget">
        <dl className="grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-muted">Venduto al cliente</dt>
            <dd className="text-xl font-semibold">{formatEuro(budget.sold)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Costo previsto</dt>
            <dd className="text-xl font-semibold">{formatEuro(budget.planned)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Costo reale</dt>
            <dd className="text-xl font-semibold">{formatEuro(budget.actual)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Margine stimato</dt>
            <dd className={`text-xl font-semibold ${budget.margin !== null && budget.margin < 0 ? "text-danger" : ""}`}>
              {formatEuro(budget.margin)}
              {marginPct !== null && <span className="ml-2 text-sm font-normal text-muted">{marginPct}%</span>}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted">
          {sold?.source === "quote"
            ? `Venduto secondo il preventivo approvato (versione ${sold.version}). Il margine usa il costo reale dove c'è, altrimenti quello previsto.`
            : sold
              ? "Venduto secondo la proposta accettata, finché il cliente non approva un preventivo. Il margine usa il costo reale dove c'è, altrimenti quello previsto."
              : "Questo evento fa parte di una campagna venduta in un'unica proposta: il venduto compare quando il cliente approva il preventivo di questo evento."}
        </p>
        {budget.rows.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-1 font-medium">Servizio</th>
                {soldLines && <th className="py-1 text-right font-medium">Venduto</th>}
                <th className="py-1 text-right font-medium">Previsto</th>
                <th className="py-1 text-right font-medium">Reale</th>
              </tr>
            </thead>
            <tbody>
              {budget.rows.map((r) => (
                <tr key={r.service} className="border-t border-border">
                  <td className="py-1">{r.service === "other" ? "Altro" : (getServiceCategory(r.service)?.name.it ?? r.service)}</td>
                  {soldLines && <td className="py-1 text-right">{formatEuro(r.sold)}</td>}
                  <td className="py-1 text-right">{formatEuro(r.planned)}</td>
                  <td className="py-1 text-right">{r.hasActual ? formatEuro(r.actual) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Preventivo per il cliente">
        <div className="flex flex-col gap-6">
          {draft ? (
            <QuoteEditor
              key={draft.id}
              quoteId={draft.id}
              eventId={event.id}
              initialLines={draft.lines as ProposalLine[]}
              initialNote={draft.note ?? ""}
              nextVersion={(sent[0]?.version ?? 0) + 1}
            />
          ) : (
            <form action={createQuoteDraft} className="flex flex-wrap items-center gap-3 text-sm">
              <input type="hidden" name="eventId" value={event.id} />
              <span className="flex-1 text-muted">
                {sent.length === 0
                  ? "Prepara il preventivo dettagliato di questo evento e mandalo al cliente: lo approva il suo responsabile della spesa."
                  : sent[0]!.status === "sent"
                    ? "Il cliente sta valutando l'ultima versione. Puoi comunque prepararne una nuova."
                    : "Per cambiare il preventivo prepara una nuova versione: parte dall'ultima inviata."}
              </span>
              <Button type="submit" variant={sent.length === 0 ? "primary" : "secondary"}>
                {sent.length === 0 ? "Prepara il preventivo" : "Nuova versione"}
              </Button>
            </form>
          )}
          {sent.length > 0 && <QuoteHistory quotes={sent} />}
        </div>
      </Card>

      <Card
        title="Attività"
        action={
          <span className="text-sm text-muted">{tasks.length === 0 ? "Nessuna attività" : openTasks === 0 ? "Tutte fatte" : `${openTasks} da fare`}</span>
        }
      >
        <div className="flex flex-col gap-4">
          <NewTaskForm eventId={event.id} members={members} bookings={bookingOptions} />
          {tasks.length === 0 ? (
            <form action={addSuggestedTasks} className="flex flex-wrap items-center gap-3 rounded-ui bg-surface px-4 py-4 text-sm">
              <input type="hidden" name="eventId" value={event.id} />
              <span className="flex-1">
                Parti dalla checklist tipica per i servizi di questo evento
                {event.start_date ? ", con le scadenze già calcolate sulla data." : ". Aggiungi la data dell'evento per avere anche le scadenze."}
              </span>
              <Button type="submit" variant="secondary">
                Aggiungi {suggestionCount} attività suggerite
              </Button>
            </form>
          ) : (
            <TaskBoard tasks={tasks} today={todayInItaly()} members={members} bookings={bookingOptions} eventStart={event.start_date} />
          )}
        </div>
      </Card>

      <Card
        title="Scaletta e giorno dell'evento"
        action={
          <span className="text-sm text-muted">
            {schedule.length === 1 ? "1 momento" : `${schedule.length} momenti`} · {crew.length === 1 ? "1 arrivo" : `${crew.length} arrivi`}
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="flex-1 text-muted">
            {schedule.length === 0
              ? "Prepara la scaletta minuto per minuto e l'elenco di chi deve arrivare: il giorno dell'evento fai i check-in dal telefono, anche senza rete."
              : `Si parte alle ${hhmm(schedule[0]!.starts_at)} con: ${schedule[0]!.title}.${crew.length > 0 ? ` Arrivati ${crew.filter((c) => c.checked_in_at).length} di ${crew.length}.` : ""}`}
          </p>
          <Link
            href={`/pro/eventi/${event.id}/scaletta`}
            className="inline-flex h-10 items-center justify-center rounded-ui border border-border px-4 font-medium"
          >
            {schedule.length === 0 ? "Prepara la scaletta" : "Apri la scaletta"}
          </Link>
          {schedule.length > 0 && <ButtonLink href={`/pro/eventi/${event.id}/live`}>Giorno dell&apos;evento</ButtonLink>}
        </div>
      </Card>

      <Card
        title="Fornitori"
        action={
          <span className="text-sm text-muted">
            {budget.confirmed} di {budget.confirmed + budget.open} confermati
          </span>
        }
      >
        {contactsRes.data!.length === 0 && (
          <p className="mb-2 text-sm text-muted">
            La rubrica è vuota.{" "}
            <Link href="/pro/rubrica/importa" className="underline">
              Importa i tuoi fornitori
            </Link>{" "}
            per sceglierli qui.
          </p>
        )}
        {bookings.length === 0 ? (
          <Empty>Nessun servizio da organizzare. Aggiungi il primo qui sotto.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {bookings.map((b) => (
              <BookingRow key={b.id} eventId={event.id} booking={b} contacts={contactsRes.data!} busy={busy} />
            ))}
          </ul>
        )}
        <form action={addBooking} className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <input type="hidden" name="eventId" value={event.id} />
          <label htmlFor="new-service" className="text-sm">
            Aggiungi un servizio
          </label>
          <Select id="new-service" name="service_key" defaultValue="catering">
            {SERVICE_CATALOG.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name.it}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Aggiungi
          </Button>
        </form>
      </Card>

      <Card
        title="Pagina pubblica"
        action={
          event.is_public ? (
            <span className="text-sm text-muted">
              {people === 1 ? "1 persona iscritta" : `${people} persone iscritte`}
              {event.public_capacity ? ` su ${event.public_capacity} posti` : ""}
            </span>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-6">
          {event.is_public && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <Link href={`/eventi/${event.id}`} className="underline">
                Apri la pagina pubblica
              </Link>
              <CopyButton text={`${env.siteUrl.replace(/\/$/, "")}/eventi/${event.id}`} />
            </p>
          )}
          <PublicPageForm eventId={event.id} page={event} canManage={canManage} />
          {registrations.length > 0 && (
            <table className="list-table w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 font-medium">Nome</th>
                  <th className="py-1 font-medium">Email</th>
                  <th className="py-1 text-right font-medium">Persone</th>
                  <th className="py-1 text-right font-medium">Iscritto il</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td data-label="Email" className="py-2">
                      <span className="min-w-0 break-all">{r.email}</span>
                    </td>
                    <td data-label="Persone" className="py-2 text-right">
                      <span className="font-mono">{r.guests}</span>
                    </td>
                    <td data-label="Iscritto il" className="py-2 text-right">
                      <span className="font-mono">{registeredFmt.format(new Date(r.created_at))}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Card title="Dettagli">
        {canManage ? (
          <EventDetailsForm eventId={event.id} details={event} />
        ) : (
          <p className="text-sm">{[dates, event.city, event.venue].filter(Boolean).join(" · ") || "Da definire"}</p>
        )}
        <p className="mt-4 text-sm">
          <Link href={`/pro/richieste/${event.proposal_id}`} className="underline">
            Brief, proposta e conversazione con il cliente
          </Link>
        </p>
      </Card>
    </>
  );
}
