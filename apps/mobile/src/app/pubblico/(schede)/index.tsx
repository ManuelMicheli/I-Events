import {
  addDays,
  EVENT_TYPE_INFO,
  EVENT_TYPES,
  todayInItaly,
  type EventType,
} from "@i-events/core";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { Chip, ChipRow } from "@/components/chip";
import { TypeSquare } from "@/components/event-type";
import { PublicEventCard, PublicExit } from "@/components/public";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { listPublicEvents, type PublicEvent } from "@/lib/public-events";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

/**
 * Esplora (M1), as on the website: the public events still to come, filtered by type with the chips,
 * in three groups: happening now, this week, later. Under them, the ones gone on stage in the last
 * two months, newest first.
 */
export default function Explore() {
  const today = todayInItaly();
  const q = useQuery("pubblico-esplora", async () => {
    const [next, recent] = await Promise.all([
      listPublicEvents(),
      listPublicEvents(addDays(today, -60), addDays(today, -1)),
    ]);
    return { next, past: recent.filter((e) => (e.end_date ?? e.start_date) < today).reverse() };
  });
  const [type, setType] = useState<EventType | null>(null);
  const all = q.data?.next ?? [];
  const recent = q.data?.past ?? [];
  const weekEnd = addDays(today, 7);
  const byType = (list: PublicEvent[]) => (type ? list.filter((e) => e.event_type === type) : list);
  const events = byType(all);
  const groups: { title: string; events: PublicEvent[] }[] = [
    { title: "In corso ora", events: events.filter((e) => e.status === "live") },
    {
      title: "Questa settimana",
      events: events.filter((e) => e.status !== "live" && e.start_date <= weekEnd),
    },
    {
      title: "Più avanti",
      events: events.filter((e) => e.status !== "live" && e.start_date > weekEnd),
    },
    { title: "Già andati in scena", events: byType(recent) },
  ].filter((g) => g.events.length > 0);

  return (
    <Screen
      title="Esplora"
      actions={<PublicExit />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      header={
        <T variant="body" tone="secondary">
          {all.length > 0
            ? `${all.length === 1 ? "1 evento in programma" : `${all.length} eventi in programma`}. `
            : ""}
          Per quelli gratuiti ti iscrivi qui e il biglietto arriva subito.
        </T>
      }
    >
      {q.loading ? (
        <CardSkeletons count={2} />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : all.length + recent.length === 0 ? (
        <EmptyState
          icon="compass-outline"
          title="Nessun evento, per ora"
          body="Quando un'agenzia apre un evento al pubblico lo trovi qui."
        />
      ) : (
        <>
          <ChipRow accessibilityLabel="Tipo di evento">
            <Chip label="Tutti" selected={type === null} onPress={() => setType(null)} />
            {EVENT_TYPES.map((t) => (
              <Chip
                key={t}
                label={EVENT_TYPE_INFO[t].label}
                leading={<TypeSquare type={t} />}
                selected={type === t}
                onPress={() => setType(t)}
              />
            ))}
          </ChipRow>
          {groups.length === 0 ? (
            <EmptyState
              icon="calendar-clear-outline"
              title={`Nessun evento di ${EVENT_TYPE_INFO[type!].label.toLowerCase()}`}
              body="Per ora non ce ne sono in programma. Guarda gli altri tipi."
              action={{ label: "Vedi tutti gli eventi", onPress: () => setType(null) }}
            />
          ) : (
            groups.map((g) => (
              <Section key={g.title} title={g.title}>
                <View style={styles.list}>
                  {g.events.map((e) => (
                    <PublicEventCard key={e.id} event={e} />
                  ))}
                </View>
              </Section>
            ))
          )}
          <View style={styles.more}>
            <T variant="callout" tone="secondary">
              Preferisci vederli per giorno?
            </T>
            <Button
              variant="tertiary"
              label="Apri il calendario"
              onPress={() => router.navigate("/pubblico/calendario")}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[4] },
  more: { alignItems: "flex-start", gap: space[1] },
});
