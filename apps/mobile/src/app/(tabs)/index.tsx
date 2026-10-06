import { agendaSections, formatEventDates, getServiceCategory, keepDayOnPhone, todayInItaly, type AgendaSection, type SupplierRequestBucket } from "@i-events/core";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { EventCard } from "@/components/event-card";
import { OrgSwitcher } from "@/components/org-switcher";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { fetchAgencyEvents, fetchClientEvents, fetchSupplierRequests, type SupplierRequest } from "@/lib/data";
import { prefetchEventDay } from "@/lib/event-day";
import { useActiveOrg, type MyOrgType } from "@/lib/session";
import { eventStatusLook, quoteStatusLook, supplierBucketLook } from "@/lib/status-look";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

const SECTION_TITLE: Record<AgendaSection, string> = { live: "In corso", upcoming: "In programma", past: "Conclusi e annullati" };
const place = (e: { venue: string | null; city: string | null }) => [e.venue, e.city].filter(Boolean).join(", ") || null;
const openEvent = (id: string) => router.push({ pathname: "/evento/[id]", params: { id } });

export default function HomeScreen() {
  const org = useActiveOrg();
  return org.type === "supplier" ? <SupplierHome orgId={org.id} /> : <EventsHome orgId={org.id} side={org.type} />;
}

type EventRow = Awaited<ReturnType<typeof fetchAgencyEvents>>[number] | Awaited<ReturnType<typeof fetchClientEvents>>[number];

function EventsHome({ orgId, side }: { orgId: string; side: Exclude<MyOrgType, "supplier"> }) {
  const q = useQuery<EventRow[]>(`events:${side}:${orgId}`, () => (side === "agency" ? fetchAgencyEvents(orgId) : fetchClientEvents(orgId)));
  const sections = q.data ? agendaSections(q.data, todayInItaly()) : null;

  // The agency's events of these days are saved on the phone while there is signal, ready for the venue.
  const toKeep = side === "agency" && q.data ? q.data.filter((e) => keepDayOnPhone(e, todayInItaly())).map((e) => e.id) : [];
  const toKeepKey = toKeep.join(",");
  useEffect(() => {
    for (const id of toKeepKey ? toKeepKey.split(",") : []) void prefetchEventDay(id, orgId);
  }, [toKeepKey, orgId]);

  const detail = (e: EventRow) => {
    if ("bookings" in e) return e.bookings.total > 0 ? `${e.bookings.confirmed} su ${e.bookings.total} fornitori confermati` : undefined;
    return e.latestQuote ? `Preventivo: ${quoteStatusLook(e.latestQuote.status).label.toLowerCase()}` : "Preventivo in preparazione";
  };

  return (
    <Screen title="Eventi" header={<OrgSwitcher />} refreshing={q.refreshing} onRefresh={q.refresh}>
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

const BUCKET_TITLE: Record<SupplierRequestBucket, string> = {
  to_answer: "Da rispondere",
  answered: "In attesa dell'agenzia",
  confirmed: "Confermate",
  closed: "Annullate e concluse",
};

function SupplierHome({ orgId }: { orgId: string }) {
  const q = useQuery<SupplierRequest[]>(`supplier:${orgId}`, () => fetchSupplierRequests(orgId));
  const byBucket = (b: SupplierRequestBucket) =>
    (q.data ?? [])
      .filter((r) => r.bucket === b)
      .sort((x, y) => (x.start_date ?? "9999").localeCompare(y.start_date ?? "9999") * (b === "closed" ? -1 : 1));

  return (
    <Screen title="Richieste" header={<OrgSwitcher />} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? (
        <CardSkeletons />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : q.data && q.data.length === 0 ? (
        <EmptyState
          icon="mail-unread-outline"
          title="Nessuna richiesta ancora"
          body="Quando un'agenzia ti chiede un servizio per un evento, la richiesta arriva qui e ricevi una notifica."
        />
      ) : (
        (["to_answer", "answered", "confirmed", "closed"] as const).map((b) => {
          const rows = byBucket(b);
          if (rows.length === 0) return null;
          return (
            <Section key={b} title={BUCKET_TITLE[b]}>
              <View style={styles.list}>
                {rows.map((r) => (
                  <EventCard
                    key={r.id}
                    title={r.event_title}
                    counterpart={[r.agency_name, getServiceCategory(r.service_key)?.name.it ?? r.service_key].join(" · ")}
                    dates={formatEventDates(r.start_date, r.end_date)}
                    place={place(r)}
                    badge={supplierBucketLook(b)}
                    onPress={() => router.push({ pathname: "/richiesta/[id]", params: { id: r.id } })}
                  />
                ))}
              </View>
            </Section>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3] },
});
