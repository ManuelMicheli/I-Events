import { TypedTitle } from "@/components/event-type";
import {
  CompactEvent,
  HomeHeader,
  Initials,
  Metrics,
  requestMeta,
  SeeAll,
  type MetricItem,
} from "@/components/home";
import { LiveDot } from "@/components/ticket";
import { Badge, ButtonLink, Card, Empty, type BadgeTone } from "@/components/ui";
import { clientEvents, clientRequests, myName } from "@/lib/home";
import { requireOrg } from "@/lib/session";
import {
  clientHome,
  daysBetween,
  firstName,
  formatEventDates,
  greeting,
  plural,
  PROPOSALS_PRICED,
  todayInItaly,
} from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Home" };

/** The company's Home: what to decide now, the open requests and the next events. */
export default async function ClientHome() {
  const org = await requireOrg("client");
  const today = todayInItaly();
  const [name, requests, events] = await Promise.all([
    myName(),
    clientRequests(org.id),
    clientEvents(org.id),
  ]);
  const h = clientHome(requests, events, today);
  const first = firstName(name);

  const days = h.next?.start_date ? Math.max(0, daysBetween(today, h.next.start_date)) : null;
  const metrics: MetricItem[] = [
    {
      label: "Richieste aperte",
      value: String(h.open.length),
      note: `${h.awaitingQuotes.length} in attesa di preventivi`,
      href: "/client/richieste",
    },
    {
      label: "Preventivi ricevuti",
      value: String(h.priced.length),
      note: `${h.fresh.length} da valutare`,
      href: "/client/richieste",
    },
    h.next && days !== null
      ? {
          label: "Prossimo evento",
          value: days === 0 ? "oggi" : days === 1 ? "domani" : `tra ${days} giorni`,
          note: `${h.next.title} · ${formatEventDates(h.next.start_date, h.next.end_date)}`,
          href: `/client/eventi/${h.next.id}`,
          wide: true,
        }
      : {
          label: "Prossimo evento",
          value: "–",
          note: "Nessun evento in programma",
          href: "/client/eventi",
          wide: true,
        },
  ];

  const todo = [
    ...h.fresh.map((p) => ({
      key: p.id,
      who: p.agency.name,
      text: `${p.agency.name} ha inviato il preventivo per ${p.request.title}`,
      action: "Valuta",
      href: `/client/richieste/${p.request.id}`,
    })),
    ...h.quotes.map((e) => ({
      key: e.id,
      who: e.counterpart,
      text: `${e.counterpart} ti chiede di approvare il preventivo di ${e.title}`,
      action: "Apri",
      href: `/client/eventi/${e.id}`,
    })),
    ...h.questions.map((p) => ({
      key: p.id,
      who: p.agency.name,
      text: `${p.agency.name} ha delle domande su ${p.request.title}`,
      action: "Rispondi",
      href: `/client/richieste/${p.request.id}`,
    })),
  ];

  return (
    <>
      <HomeHeader
        title={first ? `${greeting()}, ${first}` : greeting()}
        summary={
          h.toDecide === 0
            ? "Nessun preventivo da valutare."
            : `Hai ${plural(h.toDecide, "preventivo", "preventivi")} da valutare.`
        }
        action={
          <ButtonLink href="/client/richieste/nuova" size="l">
            Nuova richiesta
          </ButtonLink>
        }
      />

      <Metrics columns={3} items={metrics} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Da fare">
          {todo.length === 0 ? (
            <p className="text-sm text-muted">
              Niente da decidere per ora. Quando un&apos;agenzia ti manda un preventivo o una
              domanda, lo trovi qui.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {todo.map((t) => (
                <li
                  key={t.key}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 sm:items-center"
                >
                  <span className="flex h-6 items-center sm:h-auto">
                    <LiveDot />
                  </span>
                  <span className="hidden sm:block">
                    <Initials name={t.who} />
                  </span>
                  {/* On phones the action goes under the sentence, so the sentence keeps the width. */}
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="min-w-0 break-words">{t.text}</span>
                    <ButtonLink
                      href={t.href}
                      variant="secondary"
                      size="s"
                      aria-label={`${t.action}: ${t.text}`}
                    >
                      {t.action}
                    </ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Prossimi eventi"
          action={
            <SeeAll href="/client/eventi" label="Vedi tutti gli eventi">
              Vedi tutti
            </SeeAll>
          }
        >
          {h.upcoming.length === 0 ? (
            <p className="text-sm text-muted">
              Nessun evento in programma. Quando scegli un&apos;agenzia, l&apos;evento compare qui.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {h.upcoming.slice(0, 2).map((e) => (
                <CompactEvent
                  key={e.id}
                  e={e}
                  href={`/client/eventi/${e.id}`}
                  today={today}
                  detail={e.counterpart}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="le-tue-richieste" className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="le-tue-richieste" className="text-xl font-medium">
            Le tue richieste
          </h2>
          <SeeAll href="/client/richieste" label="Vedi tutte le richieste" />
        </header>
        {h.open.length === 0 ? (
          <Empty>
            Nessuna richiesta aperta. Le richieste che mandi alle agenzie compaiono qui con i
            preventivi.
          </Empty>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {h.open.slice(0, 3).map((r) => {
              const fresh = r.proposals.filter((p) => p.status === "submitted").length;
              const priced = r.proposals.filter((p) => PROPOSALS_PRICED.includes(p.status)).length;
              const badge: { tone: BadgeTone; label: string } =
                fresh > 0
                  ? {
                      tone: "accent",
                      label: fresh === 1 ? "1 preventivo nuovo" : `${fresh} preventivi nuovi`,
                    }
                  : { tone: "neutral", label: "In attesa dei preventivi" };
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 rounded-card border border-border bg-bg p-4 sm:p-5"
                >
                  <div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <TypedTitle type={r.event_type}>
                      <Link
                        href={`/client/richieste/${r.id}`}
                        className="font-medium break-words underline"
                      >
                        {r.title}
                      </Link>
                    </TypedTitle>
                    <span className="font-mono text-xs tracking-[0.04em] text-muted">
                      {requestMeta(r)}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="flex -space-x-1" aria-hidden>
                      {r.proposals.slice(0, 3).map((p) => (
                        <span key={p.id} className="rounded-full ring-2 ring-bg">
                          <Initials name={p.agency.name} />
                        </span>
                      ))}
                      {r.proposals.length > 3 && (
                        <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface text-xs font-medium ring-2 ring-bg">
                          +{r.proposals.length - 3}
                        </span>
                      )}
                    </span>
                    <span className="text-label text-muted">
                      {priced} {priced === 1 ? "preventivo" : "preventivi"} su {r.proposals.length}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
