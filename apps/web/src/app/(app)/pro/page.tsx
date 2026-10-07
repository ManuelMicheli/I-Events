import { TypedTitle } from "@/components/event-type";
import {
  CompactEvent,
  HomeHeader,
  Initials,
  Metrics,
  ProposalBadge,
  requestKind,
  requestMeta,
  SeeAll,
  shortDate,
} from "@/components/home";
import { EventTicket, LiveDot } from "@/components/ticket";
import { ButtonLink, Card, Empty } from "@/components/ui";
import { agencyEvents, agencyProposals, dueTasks, myName } from "@/lib/home";
import { requireOrg } from "@/lib/session";
import {
  addDays,
  agencyHome,
  firstName,
  formatEventDates,
  formatTicketNumber,
  greeting,
  plural,
  todayInItaly,
} from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Home" };

/** The agency's Home: the numbers that matter, today's event, the requests to answer, the week ahead. */
export default async function ProHome() {
  const org = await requireOrg("agency");
  const today = todayInItaly();
  const [name, proposals, events, tasks] = await Promise.all([
    myName(),
    agencyProposals(org.id),
    agencyEvents(org.id),
    dueTasks(org.id, addDays(today, 7)),
  ]);
  const h = agencyHome(proposals, events, today);
  const open = [...h.toReview, ...h.waiting];
  const first = firstName(name);

  return (
    <>
      <HomeHeader
        title={first ? `${greeting()}, ${first}` : greeting()}
        summary={`${plural(h.fresh.length, "richiesta nuova", "richieste nuove")}, ${plural(h.eventsThisWeek, "evento", "eventi")} questa settimana.`}
      />

      <Metrics
        columns={4}
        items={[
          {
            label: "Richieste nuove",
            icon: "requests",
            value: String(h.fresh.length),
            note: `${h.toReview.length} da guardare in tutto`,
            href: "/pro/richieste",
          },
          {
            label: "Proposte in attesa",
            icon: "requests",
            value: String(h.waiting.length),
            note: "Aspettano l'azienda",
            href: "/pro/richieste",
          },
          {
            label: "Eventi questo mese",
            icon: "events",
            value: String(h.thisMonth.length),
            note: `${h.eventsThisWeek} questa settimana`,
            href: "/pro/eventi",
          },
          {
            label: "Margine medio",
            icon: "tasks",
            value: h.margin === null ? "–" : `${h.margin}%`,
            note:
              h.margin === null
                ? "Servono prezzi e costi"
                : `Su ${plural(h.priced.length, "evento", "eventi")}`,
          },
        ]}
      />

      {h.todays.length > 0 && (
        <section aria-labelledby="oggi" className="flex flex-col gap-3">
          <h2 id="oggi" className="flex items-center gap-2 text-xl font-medium">
            <LiveDot />
            Oggi
          </h2>
          {/* A ticket stays ticket-sized: two side by side from 1920 px. */}
          <ul className="grid gap-3 3xl:grid-cols-2">
            {h.todays.map((e, i) => (
              <li key={e.id}>
                <EventTicket
                  href={`/pro/eventi/${e.id}`}
                  title={e.title}
                  type={e.event_type}
                  number={formatTicketNumber(e.number, e.stage?.position)}
                  countdown={{ label: "IN SCENA", live: true }}
                  facts={[
                    e.counterpart,
                    formatEventDates(e.start_date, e.end_date),
                    [e.venue, e.city].filter(Boolean).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                >
                  <div className="mt-2">
                    {/* The day is the main action of the page: Fiamma for the first event, the others secondary. */}
                    <ButtonLink
                      href={`/pro/eventi/${e.id}/live`}
                      variant={i === 0 ? "primary" : "secondary"}
                      aria-label={`Apri la giornata di ${e.title}`}
                    >
                      Apri la giornata
                    </ButtonLink>
                  </div>
                </EventTicket>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] 3xl:grid-cols-[minmax(0,1fr)_26rem] 4xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <Card
          title="Richieste ricevute"
          action={<SeeAll href="/pro/richieste" label="Vedi tutte le richieste" />}
        >
          {open.length === 0 ? (
            <Empty>
              Nessuna richiesta aperta. Quando un&apos;azienda te ne manda una, arriva qui con una
              notifica.
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {open.slice(0, 5).map((p) => {
                const r = p.request;
                return (
                  <li key={p.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <Initials name={r.client.name} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <TypedTitle type={r.event_type}>
                        <Link
                          href={`/pro/richieste/${p.id}`}
                          className="font-medium break-words underline"
                        >
                          {r.title}
                        </Link>
                      </TypedTitle>
                      <span className="text-label text-muted">
                        {r.client.name} · {requestKind(r)}
                      </span>
                      <span className="font-mono text-xs tracking-[0.04em] text-muted">
                        {requestMeta(r)}
                      </span>
                      <span className="sm:hidden">
                        <ProposalBadge status={p.status} />
                      </span>
                    </div>
                    {/* On phones the state goes under the facts, so the title keeps the width. */}
                    <span className="hidden sm:block">
                      <ProposalBadge status={p.status} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* On 2K monitors the side column holds the week and the tasks side by side. */}
        <div className="flex flex-col gap-6 4xl:grid 4xl:grid-cols-2 4xl:items-start">
          <Card
            title="Questa settimana"
            action={
              <SeeAll href="/pro/eventi" label="Vedi tutti gli eventi">
                Vedi tutti
              </SeeAll>
            }
          >
            {h.thisWeek.length === 0 ? (
              <p className="text-sm text-muted">Nessun evento nei prossimi 7 giorni.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {h.thisWeek.slice(0, 3).map((e) => (
                  <CompactEvent
                    key={e.id}
                    e={e}
                    href={`/pro/eventi/${e.id}`}
                    today={today}
                    detail={
                      e.bookings.total > 0
                        ? `${e.bookings.confirmed} su ${e.bookings.total} fornitori confermati`
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Attività in scadenza"
            action={<SeeAll href="/pro/attivita" label="Vedi tutte le attività" />}
          >
            {tasks.length === 0 ? (
              <p className="text-sm text-muted">Nessuna attività in scadenza questa settimana.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.slice(0, 5).map((t) => {
                  const late = t.due_date! < today;
                  return (
                    <li
                      key={t.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="break-words">{t.title}</span>
                        {t.event && (
                          <Link
                            href={`/pro/eventi/${t.event.id}`}
                            className="text-label text-muted underline"
                          >
                            {t.event.title}
                          </Link>
                        )}
                      </span>
                      <span
                        className={`shrink-0 pt-1 font-mono text-xs tracking-[0.08em] uppercase ${late ? "text-danger" : "text-muted"}`}
                      >
                        {late ? "Scaduta" : t.due_date === today ? "Oggi" : shortDate(t.due_date!)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
