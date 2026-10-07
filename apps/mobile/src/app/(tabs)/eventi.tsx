import { agendaSections, formatEventDates, todayInItaly, type AgendaSection } from "@i-events/core";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { EventCard } from "@/components/event-card";
import { OrgSwitcher } from "@/components/org-switcher";
import { Screen, Section } from "@/components/screen";
import { TopActions } from "@/components/top-actions";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { eventTicket, fetchAgencyEvents, fetchClientEvents } from "@/lib/data";
import { useKeepEventDays } from "@/lib/event-day";
import { useActiveOrg, type MyOrgType } from "@/lib/session";
import { eventStatusLook, quoteStatusLook } from "@/lib/status-look";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

const SECTION_TITLE: Record<AgendaSection, string> = {
  live: "In corso",
  upcoming: "In programma",
  past: "Conclusi e annullati",
};
const place = (e: { venue: string | null; city: string | null }) => [e.venue, e.city].filter(Boolean).join(", ") || null;
const openEvent = (id: string) => router.push({ pathname: "/evento/[id]", params: { id } });

export default function EventsScreen() {
  const org = useActiveOrg();
  if (org.type === "supplier") return null;
  return <EventsList orgId={org.id} side={org.type} />;
}

type EventRow = Awaited<ReturnType<typeof fetchAgencyEvents>>[number] | Awaited<ReturnType<typeof fetchClientEvents>>[number];

function EventsList({ orgId, side }: { orgId: string; side: Exclude<MyOrgType, "supplier"> }) {
  const q = useQuery<EventRow[]>(`events:${side}:${orgId}`, () => (side === "agency" ? fetchAgencyEvents(orgId) : fetchClientEvents(orgId)));
  const today = todayInItaly();
  const sections = q.data ? agendaSections(q.data, today) : null;

  useKeepEventDays(orgId, side === "agency" ? q.data : undefined);

  const detail = (e: EventRow) => {
    if ("bookings" in e) return e.bookings.total > 0 ? `${e.bookings.confirmed} su ${e.bookings.total} fornitori confermati` : undefined;
    return e.latestQuote ? `Preventivo: ${quoteStatusLook(e.latestQuote.status).label.toLowerCase()}` : "Preventivo in preparazione";
  };

  return (
    <Screen title="Eventi" actions={<TopActions />} header={<OrgSwitcher />} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? (
        <CardSkeletons />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : sections && q.data!.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Nessun evento ancora"
          body={
            side === "agency"
              ? "Quando un cliente sceglie una tua proposta, l'evento compare qui."
              : "Quando accetti la proposta di un'agenzia, l'evento compare qui."
          }
        />
      ) : (
        sections &&
        (["live", "upcoming", "past"] as const).map(
          (key) =>
            sections[key].length > 0 && (
              <Section key={key} title={SECTION_TITLE[key]}>
                <View style={styles.list}>
                  {sections[key].map((e) => (
                    <EventCard
                      key={e.id}
                      title={e.title}
                      counterpart={e.counterpart}
                      dates={formatEventDates(e.start_date, e.end_date)}
                      place={place(e)}
                      badge={key === "live" ? eventStatusLook("live") : eventStatusLook(e.status)}
                      detail={key === "past" ? undefined : detail(e)}
                      type={e.event_type}
                      ticket={key === "past" ? undefined : eventTicket(e, today)}
                      onPress={() => openEvent(e.id)}
                    />
                  ))}
                </View>
              </Section>
            ),
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3] },
});
