import { BookingRow, type Booking } from "@/components/events/booking-row";
import { EventDetailsForm, EventStatusActions } from "@/components/events/event-controls";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { QuoteHistory, type SentQuote } from "@/components/quotes/quote-history";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { TaskBoard } from "@/components/tasks/task-board";
import { Button, Card, Empty, Select } from "@/components/ui";
import { EVENT_STATUS_LABEL } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  canMoveEvent,
  EVENT_STATUSES,
  eventBudget,
  formatEuro,
  getServiceCategory,
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
const num = (v: number | string | null) => (v === null ? null : Number(v));

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const org = await requireOrg("agency");
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, status, start_date, end_date, city, venue, proposal_id, client:organizations!events_client_org_id_fkey(name)")
    .eq("id", id)
    .eq("agency_org_id", org.id)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

  const [bookingsRes, contactsRes, proposalRes, siblingsRes, tasksRes, membersRes, quotesRes] = await Promise.all([
    supabase
      .from("event_bookings")
      .select("id, service_key, description, contact_id, status, planned_cost, actual_cost, notes")
      .eq("event_id", id)
      .order("created_at")
      .order("id"),
    supabase.from("contacts").select("id, name, company, phone, email, services").eq("org_id", org.id).order("name").limit(2000),
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
  ]);
  for (const r of [bookingsRes, contactsRes, proposalRes, siblingsRes, tasksRes, membersRes, quotesRes]) if (r.error) throw r.error;

  const bookings: Booking[] = bookingsRes.data!.map((b) => ({ ...b, planned_cost: num(b.planned_cost), actual_cost: num(b.actual_cost) }));
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
  const marginPct = budget.margin !== null && budget.sold ? Math.round((budget.margin / budget.sold) * 100) : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/pro/eventi" className="text-sm text-muted underline">
            Eventi
          </Link>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <p className="text-sm text-muted">
            {[event.client.name, dates || "Data da definire", event.city, event.venue].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="rounded-ui border border-border px-3 py-1 text-sm">{EVENT_STATUS_LABEL[event.status]}</span>
      </div>

      {canManage && <EventStatusActions eventId={event.id} moves={moves} />}

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
              <BookingRow key={b.id} eventId={event.id} booking={b} contacts={contactsRes.data!} />
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
