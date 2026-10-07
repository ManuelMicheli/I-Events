import Ionicons from "@expo/vector-icons/Ionicons";
import { formatTicketNumber, placesLabel, placesLeft, todayInItaly } from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Badge, LiveDot } from "@/components/badge";
import { Button } from "@/components/button";
import { PlaceIcon } from "@/components/icons";
import { Card } from "@/components/card";
import { TypeChip } from "@/components/event-type";
import { Notice } from "@/components/notice";
import { PublicCover } from "@/components/public";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import {
  dayLabel,
  getPublicEvent,
  isOver,
  longDay,
  mapsUrl,
  myTickets,
  timeRange,
} from "@/lib/public-events";
import { useQuery } from "@/lib/use-query";
import { radius, space, useTheme } from "@/theme";

/**
 * The page of a public event (design pubblico-02), as on the website: cover, title, when and where,
 * what happens and who organises it. At the bottom the price and the one main action: register, or
 * open the ticket already taken on this phone. An event of the city sells its tickets on its own
 * website: the action opens it instead.
 */
export default function PublicEventScreen() {
  const { c } = useTheme();
  const { id, momento } = useLocalSearchParams<{ id: string; momento?: "annullata" }>();
  const [moment] = useState(momento);
  const q = useQuery(`pubblico-evento-${id}`, async () => {
    const [event, mine] = await Promise.all([getPublicEvent(id), myTickets()]);
    return { event, mine: mine.find((t) => t.ticket.event_id === id)?.token ?? null };
  });

  if (q.loading)
    return (
      <Screen>
        <CardSkeletons count={1} />
      </Screen>
    );
  if (q.error && !q.data)
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={q.refresh} />
      </Screen>
    );
  const event = q.data?.event;
  if (!event)
    return (
      <Screen>
        <EmptyState
          icon="calendar-clear-outline"
          title="Evento non trovato"
          body="Non è più aperto al pubblico. Trovi gli altri in Esplora."
          action={{ label: "Esplora gli eventi", onPress: () => router.navigate("/pubblico") }}
        />
      </Screen>
    );

  const mine = q.data?.mine ?? null;
  const over = isOver(event, todayInItaly());
  const cancelled = event.status === "cancelled";
  const left = placesLeft(event.capacity, event.registered);
  const few = placesLabel(event.capacity, event.registered);
  const time = timeRange(event.starts_at, event.ends_at);
  const place = [event.venue, event.city].filter(Boolean);
  const maps = mapsUrl(event);
  const open = !cancelled && !over;
  const website = event.website;

  const footer = (
    <View style={styles.footer}>
      <View style={styles.flex}>
        <T variant="bodyStrong">
          {cancelled
            ? "Evento annullato"
            : over
              ? "Evento concluso"
              : website
                ? "Biglietti sul sito"
                : left === 0 && !mine
                  ? "Posti esauriti"
                  : "Gratis"}
        </T>
        <T variant="caption" tone="secondary">
          {cancelled
            ? "Le iscrizioni sono chiuse."
            : over
              ? "Trovi i prossimi in Esplora."
              : website
                ? "Prezzi e acquisto sul sito ufficiale."
                : mine
                  ? "Hai già il biglietto."
                  : left === 0
                    ? "Se qualcuno rinuncia il posto torna libero."
                    : "Iscrizione obbligatoria"}
        </T>
      </View>
      {website && !cancelled ? (
        <Button
          variant={over ? "secondary" : "primary"}
          icon="open-outline"
          label="Sito ufficiale"
          accessibilityLabel="Apri il sito ufficiale dell'evento"
          onPress={() => Linking.openURL(website)}
        />
      ) : open && mine ? (
        <Button
          label="Apri il biglietto"
          onPress={() =>
            router.push({ pathname: "/pubblico/biglietto/[token]", params: { token: mine } })
          }
        />
      ) : open && left !== 0 ? (
        <Button
          label="Iscriviti"
          onPress={() =>
            router.push({ pathname: "/pubblico/iscrizione/[id]", params: { id: event.id } })
          }
        />
      ) : null}
    </View>
  );

  return (
    <Screen footer={footer} footerBar refreshing={q.refreshing} onRefresh={q.refresh}>
      <Stack.Screen options={{ title: event.title }} />
      {moment === "annullata" && (
        <Notice tone="success">Iscrizione annullata. Il posto è di nuovo libero.</Notice>
      )}
      <View style={styles.head}>
        <View>
          <PublicCover
            type={event.event_type}
            image={event.image}
            fit="contain"
            style={styles.cover}
          />
          {event.status === "live" && (
            <View style={[styles.liveBadge, { backgroundColor: c.bgSurface }]}>
              <LiveDot />
              <T variant="label">In corso</T>
            </View>
          )}
        </View>
        {event.image && event.image_credit && (
          <T variant="caption" tone="secondary" style={styles.credit}>
            Immagine: {event.image_credit}
          </T>
        )}
        <View style={styles.titles}>
          <T variant="title1" accessibilityRole="header">
            {event.title}
          </T>
          <T variant="monoCaps" tone="secondary">
            {[formatTicketNumber(event.number), dayLabel(event.start_date, event.end_date), time]
              .filter(Boolean)
              .join(" · ")
              .toUpperCase()}
          </T>
        </View>
        <View style={styles.chips}>
          <TypeChip type={event.event_type} />
          {open && !website && (
            <Badge tone="success" icon="checkmark" label="Gratis con iscrizione" />
          )}
          {open && !website && few && (
            <T variant="label" tone="secondary">
              {few}
            </T>
          )}
        </View>
      </View>

      <View style={[styles.facts, { borderColor: c.borderDefault }]}>
        <Fact
          icon={<Ionicons name="calendar-outline" size={20} color={c.textPrimary} />}
          title={longDay(event.start_date, event.end_date)}
          detail={time}
          mono
        />
        {place.length > 0 && <Place place={place} maps={maps} />}
      </View>

      {event.description && (
        <Section title="Cosa succede">
          <T variant="body">{event.description}</T>
        </Section>
      )}

      <Section title="Organizzato da">
        <Card style={styles.organizer}>
          <View style={[styles.initial, { backgroundColor: c.bgSubtle }]}>
            <T variant="bodyStrong">{event.organizer.charAt(0).toUpperCase()}</T>
          </View>
          <View style={styles.flex}>
            <T variant="bodyStrong">{event.organizer}</T>
            <T variant="callout" tone="secondary">
              {website ? "Segnalato da" : "Prodotto da"} {event.produced_by}
            </T>
          </View>
        </Card>
      </Section>
    </Screen>
  );
}

/** Where: the place, with the way to open it in the maps; touching Mappe makes the pin hop (A10). */
function Place({ place, maps }: { place: string[]; maps: string | null }) {
  const { c } = useTheme();
  const [hop, setHop] = useState(0);
  return (
    <View style={styles.placeRow}>
      <Fact icon={<PlaceIcon color={c.textPrimary} hop={hop} />} title={place[0]!} detail={place[1] ?? null} />
      {maps && (
        <Button
          variant="tertiary"
          size="small"
          icon="map-outline"
          label="Mappe"
          accessibilityLabel="Apri nelle mappe"
          onPressIn={() => setHop((n) => n + 1)}
          onPress={() => Linking.openURL(maps)}
        />
      )}
    </View>
  );
}

function Fact({ icon, title, detail, mono = false }: { icon: ReactNode; title: string; detail: string | null; mono?: boolean }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}>{icon}</View>
      <View style={styles.flex}>
        <T variant="bodyStrong">{title}</T>
        {detail && (
          <T variant={mono ? "mono" : "callout"} tone="secondary">
            {detail}
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[4] },
  cover: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg },
  liveBadge: {
    position: "absolute",
    top: space[4],
    left: space[4],
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.full,
  },
  credit: { marginTop: -space[2] },
  titles: { gap: space[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[2] },
  facts: {
    gap: space[4],
    paddingVertical: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fact: { flex: 1, flexDirection: "row", gap: space[3], alignItems: "flex-start" },
  factIcon: { marginTop: 3 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  organizer: { flexDirection: "row", alignItems: "center" },
  initial: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { flexDirection: "row", alignItems: "center", gap: space[4] },
  flex: { flex: 1 },
});
