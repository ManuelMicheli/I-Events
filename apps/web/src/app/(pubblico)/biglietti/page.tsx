import { PublicEventRow } from "@/components/public/event-card";
import { ButtonLink, Empty } from "@/components/ui";
import { eventLine, savedTickets, type RegistrationTicket } from "@/lib/public-events";
import { createClient } from "@/lib/supabase/server";
import { formatTicketNumber, peopleLabel, todayInItaly } from "@i-events/core";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Biglietti", robots: { index: false, follow: false } };

/** The tickets taken from this device (design pubblico-05): next ones first, then the past ones. */
export default async function Tickets() {
  const tokens = await savedTickets();
  const supabase = await createClient();
  const found = await Promise.all(
    tokens.map((t) => supabase.rpc("registration_ticket", { p_token: t }).then((r) => (r.data?.[0] ? { token: t, ticket: r.data[0] } : null))),
  );
  const tickets = found.filter((t): t is { token: string; ticket: RegistrationTicket } => t !== null);
  const today = todayInItaly();
  const isPast = (t: RegistrationTicket) => t.status === "completed" || t.status === "cancelled" || (t.end_date ?? t.start_date) < today;
  const next = tickets.filter((t) => !isPast(t.ticket)).sort((a, b) => a.ticket.start_date.localeCompare(b.ticket.start_date));
  const past = tickets.filter((t) => isPast(t.ticket)).sort((a, b) => b.ticket.start_date.localeCompare(a.ticket.start_date));

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Biglietti</h1>
        <p className="text-lg text-muted">Le iscrizioni fatte da questo dispositivo. Ogni biglietto si apre anche dal suo link.</p>
      </header>
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card bg-surface px-4 py-8 text-center">
          <p className="text-sm text-muted">Nessun biglietto su questo dispositivo, per ora. Quando ti iscrivi a un evento lo trovi qui.</p>
          <ButtonLink href="/eventi" variant="secondary">
            Esplora gli eventi
          </ButtonLink>
        </div>
      ) : (
        <div className="flex max-w-2xl flex-col gap-8 3xl:grid 3xl:max-w-none 3xl:grid-cols-2 3xl:items-start 3xl:gap-12">
          <List title="Prossimi" items={next} empty="Nessun evento in arrivo." />
          {past.length > 0 && <List title="Passati" items={past} />}
        </div>
      )}
    </>
  );
}

function List({ title, items, empty }: { title: string; items: { token: string; ticket: RegistrationTicket }[]; empty?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-medium">{title}</h2>
      {items.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(({ token, ticket }) => (
            <li key={token}>
              <PublicEventRow
                href={`/biglietto/${token}`}
                type={ticket.event_type}
                title={ticket.title}
                line={eventLine(ticket)}
                live={ticket.status === "live"}
                extra={
                  <span className="font-mono text-label">
                    {ticket.status === "cancelled" ? "Annullato" : `${formatTicketNumber(ticket.number)} · ${peopleLabel(ticket.guests)}`}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
