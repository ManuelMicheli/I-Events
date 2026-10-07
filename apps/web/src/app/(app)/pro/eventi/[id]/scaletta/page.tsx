import { PlusIcon } from "@/components/icons";
import { CrewRow, NewCrewForm } from "@/components/run-of-show/crew";
import { dayLabel } from "@/components/run-of-show/format";
import { NewScheduleItemForm, ScheduleItemRow, SuggestedScheduleForm } from "@/components/run-of-show/schedule";
import { Button, ButtonLink, Card, Empty } from "@/components/ui";
import { env } from "@/lib/env";
import { loadRunOfShow } from "@/lib/run-of-show";
import { requireOrg } from "@/lib/session";
import { passUrl, suggestedSchedule } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { addCrewFromBookings } from "../../run-of-show-actions";

export const metadata: Metadata = { title: "Scaletta" };

export default async function RunOfShowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg("agency");
  const { event, items, crew, bookings, members, days, defaultDay, suppliersToList, services } = await loadRunOfShow(id, org.id);
  const planDays = days.length > 0 ? days : [defaultDay];
  const arrived = crew.filter((c) => c.checked_in_at).length;
  const suggestions = suggestedSchedule(services, defaultDay, "19:00").length;
  // One Fiamma per page: the day-of view while the event is on, adding to the schedule before.
  const live = event.status === "live";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/pro/eventi/${event.id}`} className="text-sm text-muted underline">
            {event.title}
          </Link>
          <h1 className="text-2xl font-semibold">Scaletta e arrivi</h1>
          <p className="text-sm text-muted">{[event.client.name, event.city, event.venue].filter(Boolean).join(" · ")}</p>
        </div>
        <ButtonLink href={`/pro/eventi/${event.id}/live`} variant={live ? "primary" : "secondary"}>
          Apri il giorno dell&apos;evento
        </ButtonLink>
      </div>

      <Card title="Scaletta" action={<span className="text-sm text-muted">{items.length === 1 ? "1 momento" : `${items.length} momenti`}</span>}>
        <div className="flex flex-col gap-6">
          {items.length === 0 ? (
            <SuggestedScheduleForm eventId={event.id} days={planDays} count={suggestions} />
          ) : (
            planDays
              .filter((d) => items.some((i) => i.day === d))
              .map((d) => (
                <section key={d} aria-label={dayLabel(d)}>
                  {planDays.length > 1 && <h3 className="text-sm font-semibold first-letter:uppercase">{dayLabel(d)}</h3>}
                  <ul className="divide-y divide-border">
                    {items
                      .filter((i) => i.day === d)
                      .map((i) => (
                        <ScheduleItemRow key={i.id} eventId={event.id} item={i} days={days} members={members} bookings={bookings} />
                      ))}
                  </ul>
                </section>
              ))
          )}
          <div className="border-t border-border pt-4">
            <NewScheduleItemForm eventId={event.id} days={days} defaultDay={defaultDay} members={members} bookings={bookings} lead={!live} />
          </div>
        </div>
      </Card>

      <Card
        title="Arrivi e check-in"
        action={<span className="text-sm text-muted">{crew.length === 0 ? "Nessuno in elenco" : `${arrived} di ${crew.length} arrivati`}</span>}
      >
        <div className="flex flex-col gap-4">
          {suppliersToList > 0 && (
            <form action={addCrewFromBookings} className="flex flex-wrap items-center gap-3 rounded-ui bg-surface px-4 py-4 text-sm">
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="day" value={defaultDay} />
              <span className="flex-1">Metti in elenco i fornitori scelti per questo evento, con l&apos;orario di arrivo preso dalla scaletta.</span>
              <Button type="submit" variant="secondary" className="ic-host">
                <PlusIcon />
                Aggiungi {suppliersToList === 1 ? "1 fornitore" : `${suppliersToList} fornitori`}
              </Button>
            </form>
          )}
          {crew.length === 0 ? (
            <Empty>Nessuno in elenco. Aggiungi fornitori, colleghi e staff esterno per fare il check-in all&apos;arrivo.</Empty>
          ) : (
            planDays
              .filter((d) => crew.some((c) => c.day === d))
              .map((d) => (
                <section key={d} aria-label={`Arrivi ${dayLabel(d)}`}>
                  {planDays.length > 1 && <h3 className="text-sm font-semibold first-letter:uppercase">{dayLabel(d)}</h3>}
                  <ul className="divide-y divide-border">
                    {crew
                      .filter((c) => c.day === d)
                      .map((c) => (
                        <CrewRow key={c.id} eventId={event.id} member={c} days={days} passLink={c.pass ? passUrl(env.siteUrl, c.pass) : null} />
                      ))}
                  </ul>
                </section>
              ))
          )}
          <div className="border-t border-border pt-4">
            <NewCrewForm eventId={event.id} days={days} defaultDay={defaultDay} members={members} />
          </div>
        </div>
      </Card>
    </>
  );
}
