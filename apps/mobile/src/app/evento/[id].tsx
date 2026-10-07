import { agendaSection, EVENT_TYPE_INFO, formatEventDates, formatTicketNumber, getServiceCategory, keepDayOnPhone, todayInItaly } from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Badge, LiveDot } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, TicketDivider } from "@/components/card";
import { EventPass, NextSteps } from "@/components/event-pass";
import { EventCover, InkBand } from "@/components/event-type";
import { Divider, InfoRow } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { Confirmation, StatusRow, TicketTag } from "@/components/ticket";
import { WriteToOthers } from "@/components/write-to-others";
import { fetchEvent } from "@/lib/data";
import { prefetchEventDay } from "@/lib/event-day";
import { env, siteOnline } from "@/lib/env";
import { shortDate, stampDay } from "@/lib/format";
import { useActiveOrg } from "@/lib/session";
import { bookingStatusLook, eventStatusLook, quoteStatusLook } from "@/lib/status-look";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

/**
 * One event. For the company, once the agency is chosen, "Evento confermato" (Client 6) as on the
 * website: the Confermato seal, the event's ticket with its QR, who has it in hand and the next steps.
 */
export default function EventScreen() {
  const { id, momento, avvisa } = useLocalSearchParams<{ id: string; momento?: "confermato"; avvisa?: string }>();
  // A signature moment plays on the screen opened by the action that caused it, when it first shows.
  const [moment] = useState(momento);
  const [writeOthers, setWriteOthers] = useState(avvisa === "1");
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
  const number = formatTicketNumber(e.number, e.stage?.position);
  // The company's view once the agency is chosen and the event is still ahead.
  const chosen = e.side === "client" && ["planning", "preparing", "live"].includes(e.status);
  const quoteWaits = e.latestQuote?.status === "sent";
  const writeToAgency = () => {
    if (e.proposal_id) router.push({ pathname: "/conversazione/[id]", params: { id: e.proposal_id } });
  };

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Stack.Screen options={{ title: e.title }} />
      {chosen ? (
        <>
          {e.confirmedOn && (
            <StatusRow>
              <Confirmation label="Confermato" date={stampDay(e.confirmedOn)} type={e.event_type} fresh={moment === "confermato"} />
            </StatusRow>
          )}
          <EventPass
            title={e.title}
            number={number}
            agency={e.agency.name}
            type={e.event_type}
            link={`${env.siteUrl}/client/eventi/${e.id}`}
            facts={[
              { label: "Data", value: e.start_date ? `${shortDate(e.start_date)} ${e.start_date.slice(0, 4)}` : "Da definire" },
              { label: "Luogo", value: e.venue || e.city || "Da definire" },
              { label: "Tipo", value: e.event_type ? EVENT_TYPE_INFO[e.event_type].label : "Evento" },
              { label: "Agenzia", value: e.agency.name },
            ]}
          />
          <View style={styles.hands}>
            <T variant="title3" accessibilityRole="header">
              {`Il tuo evento è in mano a ${e.agency.name}`}
            </T>
            <T variant="callout" tone="secondary">
              Da qui in poi segui tutto in un posto solo: messaggi, preventivo dettagliato e giorno dell&apos;evento.
            </T>
          </View>
          <NextSteps
            steps={[
              { label: `Scrivi a ${e.agency.name} e condividi i materiali del brand`, done: e.written > 0 },
              { label: `${e.agency.name} prepara il preventivo dettagliato`, done: e.latestQuote !== null },
              { label: "Approva il preventivo", done: e.quoteApproved },
            ]}
          />
          {e.proposal_id && (
            <Button
              block={e.written === 0}
              variant={e.written > 0 ? "tertiary" : quoteWaits ? "secondary" : "primary"}
              icon="chatbubble-outline"
              label={`Scrivi a ${e.agency.name}`}
              onPress={writeToAgency}
            />
          )}
          {writeOthers && e.request_id && e.notChosen > 0 && (
            <WriteToOthers
              requestId={e.request_id}
              title={e.title}
              others={e.notChosen}
              onSent={() => {
                setWriteOthers(false);
                router.setParams({ avvisa: undefined });
              }}
            />
          )}
        </>
      ) : (
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
              <TicketTag number={number} type={e.event_type} />
            </View>
          </View>
          <TicketDivider />
          <View style={styles.facts}>
            <InfoRow label="Data" value={formatEventDates(e.start_date, e.end_date).toUpperCase()} mono />
            {place !== "" && <InfoRow label="Luogo" value={place} />}
            <InfoRow label={e.side === "agency" ? "Cliente" : "Agenzia"} value={e.side === "agency" ? e.client.name : e.agency.name} />
          </View>
        </Card>
      )}

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
  hands: { gap: space[1] },
});
