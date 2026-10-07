import { agendaSection, formatEventDates, formatTicketNumber, getServiceCategory, keepDayOnPhone, todayInItaly } from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Badge, LiveDot } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, TicketDivider } from "@/components/card";
import { EventCover, InkBand } from "@/components/event-type";
import { Divider, InfoRow } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { Confirmation, StatusRow, TicketTag } from "@/components/ticket";
import { fetchEvent } from "@/lib/data";
import { prefetchEventDay } from "@/lib/event-day";
import { env, siteOnline } from "@/lib/env";
import { stampDay } from "@/lib/format";
import { useActiveOrg } from "@/lib/session";
import { bookingStatusLook, eventStatusLook, quoteStatusLook } from "@/lib/status-look";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = useActiveOrg();
  const q = useQuery(`event:${id}:${org.id}`, () => fetchEvent(id, org.id));
  const e = q.data;
  const keepDay = e?.side === "agency" && keepDayOnPhone(e, todayInItaly());

  // Around the event, the day is saved on the phone now, while there is signal.
  useEffect(() => {
    if (keepDay) void prefetchEventDay(id, org.id);
  }, [keepDay, id, org.id]);

  if (q.loading)
    return (
      <Screen>
        <CardSkeletons count={2} />
      </Screen>
    );
  if (q.error && !e)
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={q.refresh} />
      </Screen>
    );
  if (!e)
    return (
      <Screen>
        <EmptyState
          icon="search-outline"
          title="Evento non trovato"
          body={`Questo evento non è tra quelli di ${org.name}. Se appartiene a un'altra organizzazione, sceglila da Account.`}
        />
      </Screen>
    );

  const live = agendaSection(e, todayInItaly()) === "live";
  const place = [e.venue, e.city].filter(Boolean).join(", ");
  const active = e.bookings.filter((b) => b.status !== "cancelled");
  const confirmed = active.filter((b) => b.status === "confirmed").length;
  const webPath = e.side === "agency" ? `/pro/eventi/${e.id}` : `/client/eventi/${e.id}`;

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Stack.Screen options={{ title: e.title }} />
      <Card>
        {e.event_type && <InkBand type={e.event_type} />}
        <StatusRow>
          {e.status === "completed" ? (
            <Confirmation label="Andato in scena" date={stampDay(e.end_date ?? e.start_date)} type={e.event_type} />
          ) : (
            <Badge {...(live ? eventStatusLook("live") : eventStatusLook(e.status))} />
          )}
        </StatusRow>
        <View style={styles.head}>
          {e.event_type && <EventCover type={e.event_type} size={64} />}
          <View style={styles.titles}>
            <T variant="title2" accessibilityRole="header">
              {e.title}
            </T>
            <TicketTag number={formatTicketNumber(e.number, e.stage?.position)} type={e.event_type} />
          </View>
        </View>
        <TicketDivider />
        <View style={styles.facts}>
          <InfoRow label="Data" value={formatEventDates(e.start_date, e.end_date).toUpperCase()} mono />
          {place !== "" && <InfoRow label="Luogo" value={place} />}
          <InfoRow label={e.side === "agency" ? "Cliente" : "Agenzia"} value={e.side === "agency" ? e.client.name : e.agency.name} />
        </View>
      </Card>

      {e.side === "agency" && (
        <Card>
          <View style={styles.dayHead}>
            {live && <LiveDot />}
            <T variant="bodyStrong" style={styles.flex}>
              Giornata dell&apos;evento
            </T>
          </View>
          <T variant="callout" tone="secondary">
            Scaletta e check-in degli arrivi, anche senza rete: restano sul telefono e partono appena torna la connessione.
          </T>
          <Button
            variant={live ? "primary" : "secondary"}
            icon="today-outline"
            label="Apri la giornata"
            onPress={() => router.push({ pathname: "/giornata/[id]", params: { id: e.id } })}
          />
        </Card>
      )}

      {e.side === "agency" && (
        <Section
          title="Fornitori"
          aside={
            active.length > 0 ? (
              <T variant="mono" tone="secondary">
                {confirmed}/{active.length}
              </T>
            ) : undefined
          }
        >
          {e.bookings.length === 0 ? (
            <EmptyState icon="people-outline" title="Nessun servizio" body="Aggiungi i servizi e scegli i fornitori dallo spazio evento sul sito." />
          ) : (
            <Card style={styles.list}>
              {e.bookings.map((b, i) => (
                <View key={b.id}>
                  {i > 0 && <Divider />}
                  <View style={styles.booking}>
                    <View style={styles.bookingHead}>
                      <T variant="bodyStrong" style={styles.flex}>
                        {getServiceCategory(b.service_key)?.name.it ?? b.service_key}
                      </T>
                      <Badge {...bookingStatusLook(b.status)} />
                    </View>
                    <T variant="callout" tone="secondary">
                      {[b.contact?.company || b.contact?.name || "Fornitore da scegliere", b.description].filter(Boolean).join(" · ")}
                    </T>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </Section>
      )}

      {e.side === "client" && (
        <Section title="Preventivo">
          <Card>
            {e.latestQuote ? (
              <>
                <Badge {...quoteStatusLook(e.latestQuote.status)} />
                <T variant="callout" tone="secondary">
                  {e.latestQuote.status === "sent"
                    ? `La versione ${e.latestQuote.version} aspetta la vostra approvazione.`
                    : `Versione ${e.latestQuote.version}.`}
                </T>
              </>
            ) : (
              <T variant="callout" tone="secondary">
                L&apos;agenzia sta preparando il preventivo dettagliato: ricevi una notifica quando arriva.
              </T>
            )}
          </Card>
        </Section>
      )}

      {siteOnline && (
        <Button
          variant="secondary"
          icon="open-outline"
          label="Apri sul sito"
          onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}${webPath}`)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  facts: { gap: space[4] },
  head: { flexDirection: "row", alignItems: "center", gap: space[4] },
  titles: { flex: 1, gap: space[1] },
  list: { paddingVertical: space[1], gap: 0 },
  booking: { gap: space[1], paddingVertical: space[3] },
  bookingHead: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  flex: { flex: 1 },
  dayHead: { flexDirection: "row", alignItems: "center", gap: space[2] },
});
