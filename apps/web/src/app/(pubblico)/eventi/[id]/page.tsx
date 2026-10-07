import { TypeChip } from "@/components/event-type";
import { PlaceIcon } from "@/components/icons";
import { ClearMoment } from "@/components/moment";
import { PublicCover } from "@/components/public/event-card";
import { RegisterForm } from "@/components/public/register-form";
import { LiveDot } from "@/components/ticket";
import { ButtonLink, Notice } from "@/components/ui";
import { getPublicEvent, longDate, mapsUrl, savedTickets, shortDate, timeRange } from "@/lib/public-events";
import { createClient } from "@/lib/supabase/server";
import { formatTicketNumber, MAX_GUESTS, placesLabel, placesLeft, todayInItaly } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const event = await getPublicEvent((await params).id);
  if (!event) return { title: "Evento" };
  return {
    title: event.title,
    description: event.description?.slice(0, 160) ?? `${shortDate(event.start_date, event.end_date)}, ${event.venue || event.city || ""}`,
  };
}

/**
 * The page of a public event (design pubblico-09): cover, title, when and where, what happens and
 * who organises it, with the registration on the right (below the facts on phones).
 */
export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ momento?: string }>;
}) {
  const [{ id }, { momento }] = await Promise.all([params, searchParams]);
  const event = await getPublicEvent(id);
  if (!event) notFound();

  const today = todayInItaly();
  const over = event.status === "completed" || (event.end_date ?? event.start_date) < today;
  const cancelled = event.status === "cancelled";
  const left = placesLeft(event.capacity, event.registered);
  const few = placesLabel(event.capacity, event.registered);
  const time = timeRange(event.starts_at, event.ends_at);
  const place = [event.venue, event.city].filter(Boolean);
  const maps = mapsUrl(event);
  const mine = await myTicketFor(event.id);

  return (
    <>
      {momento && <ClearMoment />}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <header className="flex flex-col gap-4 lg:col-start-1">
          <Link href="/eventi" className="ic-host flex w-fit min-h-11 items-center gap-1 text-sm text-muted underline sm:min-h-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="nudge-l">
              <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Esplora
          </Link>
          <div className="group relative">
            <PublicCover type={event.event_type} className="aspect-[16/9] w-full rounded-card sm:aspect-[2/1]" />
            {event.status === "live" && (
              <span className="absolute top-4 left-4 inline-flex min-h-8 items-center gap-2 rounded-full bg-bg px-3 text-label font-medium">
                <LiveDot />
                In corso
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <p className="font-mono text-label tracking-[0.04em] text-muted uppercase">
              {[formatTicketNumber(event.number), shortDate(event.start_date, event.end_date), time].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TypeChip type={event.event_type} />
            {!cancelled && !over && (
              <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-success-bg px-3 text-label font-medium text-success">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Gratis con iscrizione
              </span>
            )}
            {few && !cancelled && !over && <span className="text-label text-muted">{few}</span>}
          </div>
          {place.length > 0 && (
            <div className="ic-host flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-y border-border py-3">
              <div className="flex min-w-0 items-start gap-3">
                <PlaceIcon className="mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium">{place[0]}</p>
                  {place[1] && <p className="text-sm text-muted">{place[1]}</p>}
                </div>
              </div>
              {maps && (
                <a href={maps} target="_blank" rel="noreferrer" className="flex min-h-11 items-center text-sm font-medium underline">
                  Apri nelle mappe
                </a>
              )}
            </div>
          )}
        </header>

        <aside
          aria-label="Iscrizione"
          className="flex flex-col gap-4 rounded-card border border-border bg-bg p-4 sm:p-6 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          {momento === "annullata" && <Notice tone="success">Iscrizione annullata. Il posto è di nuovo libero.</Notice>}
          <h2 className="text-xl font-medium">{cancelled ? "Evento annullato" : over ? "Evento concluso" : "Gratis con iscrizione"}</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <Fact icon={<CalendarIcon />} label="Quando">
              <dd>{longDate(event.start_date, event.end_date)}</dd>
              {time && <dd className="font-mono text-xs text-muted">{time}</dd>}
            </Fact>
            {place.length > 0 && (
              <Fact icon={<PlaceIcon className="mt-0.5" />} label="Dove">
                <dd>{place[0]}</dd>
                {place[1] && <dd className="text-xs text-muted">{place[1]}</dd>}
              </Fact>
            )}
          </dl>
          <div className="border-t border-border pt-4">
            {cancelled ? (
              <p className="text-sm text-muted">L&apos;organizzatore ha annullato l&apos;evento. Le iscrizioni sono chiuse.</p>
            ) : over ? (
              <p className="text-sm text-muted">L&apos;evento è andato in scena. Trovi i prossimi in Esplora.</p>
            ) : mine ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">Hai già un biglietto per questo evento, preso da questo dispositivo.</p>
                <ButtonLink href={`/biglietto/${mine}`} size="l" className="w-full">
                  Apri il biglietto
                </ButtonLink>
              </div>
            ) : left === 0 ? (
              <p className="text-sm text-muted">I posti sono esauriti. Se qualcuno rinuncia il posto torna libero: riprova più tardi.</p>
            ) : (
              <RegisterForm eventId={event.id} maxGuests={Math.min(MAX_GUESTS, left ?? MAX_GUESTS)} />
            )}
          </div>
        </aside>

        <div className="flex flex-col gap-8 lg:col-start-1">
          {event.description && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-medium">Cosa succede</h2>
              <p className="max-w-[65ch] whitespace-pre-line">{event.description}</p>
            </section>
          )}
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-medium">Organizzato da</h2>
            <div className="flex items-center gap-3 rounded-card border border-border bg-bg p-4">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface font-medium">
                {event.organizer.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{event.organizer}</p>
                <p className="text-sm text-muted">Prodotto da {event.produced_by}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/** A ticket for this event already taken on this device, if any (its code). */
async function myTicketFor(eventId: string) {
  const tokens = await savedTickets();
  if (tokens.length === 0) return null;
  const supabase = await createClient();
  const found = await Promise.all(
    tokens.map((t) => supabase.rpc("registration_ticket", { p_token: t }).then((r) => (r.data?.[0]?.event_id === eventId ? t : null))),
  );
  return found.find(Boolean) ?? null;
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="flex flex-col">
        <dt className="sr-only">{label}</dt>
        {children}
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="mt-0.5 shrink-0">
      <rect x="3" y="4.25" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.75 2.75v3M13.25 2.75v3M3 8.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
