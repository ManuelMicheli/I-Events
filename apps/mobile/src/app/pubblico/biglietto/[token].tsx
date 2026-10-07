import { ticketUrl, todayInItaly } from "@i-events/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Share, StyleSheet, View } from "react-native";
import { Button } from "@/components/button";
import { ShareIcon } from "@/components/icons";
import { PublicTicket } from "@/components/public";
import { Screen } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { env, siteOnline } from "@/lib/env";
import { errorMessage } from "@/lib/errors";
import { cancelTicket, getTicket, isOver } from "@/lib/public-events";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

/**
 * A public ticket, as on the website. Right after registering (?momento=iscritto) it slides out and
 * the confirmation seal draws its tick (A7). The QR holds the ticket's link.
 */
export default function TicketScreen() {
  const { token: raw, momento } = useLocalSearchParams<{ token: string; momento?: "iscritto" }>();
  const token = raw.toLowerCase();
  const [moment] = useState(momento);
  const q = useQuery(`pubblico-biglietto-${token}`, () => getTicket(token));
  const [leaving, setLeaving] = useState(false);

  if (q.loading)
    return (
      <Screen>
        <CardSkeletons count={1} />
      </Screen>
    );
  if (q.error && q.data === undefined)
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={q.refresh} />
      </Screen>
    );
  const ticket = q.data;
  if (!ticket)
    return (
      <Screen>
        <EmptyState
          icon="ticket-outline"
          title="Biglietto non trovato"
          body="L'iscrizione è stata annullata. Puoi iscriverti di nuovo dalla pagina dell'evento."
          action={{ label: "Esplora gli eventi", onPress: () => router.navigate("/pubblico") }}
        />
      </Screen>
    );

  const fresh = moment === "iscritto";
  const link = ticketUrl(env.siteUrl, token);
  const cancelled = ticket.status === "cancelled";
  const over = isOver(ticket, todayInItaly());

  const giveBack = () =>
    Alert.alert("Annullare l'iscrizione?", "Il biglietto smette di funzionare e il posto torna libero per altri.", [
      { text: "Tieni il biglietto", style: "cancel" },
      {
        text: "Annulla iscrizione",
        style: "destructive",
        onPress: async () => {
          setLeaving(true);
          try {
            await cancelTicket(token);
            router.replace({ pathname: "/pubblico/evento/[id]", params: { id: ticket.event_id, momento: "annullata" } });
          } catch (e) {
            setLeaving(false);
            Alert.alert("Non riusciamo ad annullare", errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <T variant="body" accessibilityLiveRegion={fresh ? "polite" : undefined}>
        {cancelled
          ? "L'organizzatore ha annullato l'evento. Il biglietto resta qui come promemoria."
          : over
            ? "L'evento è andato in scena. Il biglietto resta qui come ricordo."
            : fresh
              ? `Ci sei. Il biglietto per ${ticket.title} è pronto: mostralo all'ingresso.`
              : "Il tuo biglietto: mostralo all'ingresso."}
      </T>

      <PublicTicket ticket={ticket} token={token} link={link} fresh={fresh} over={over} />

      {!cancelled && !over && (
        <View style={styles.actions}>
          <T variant="callout" tone="secondary">
            Il biglietto resta in questo telefono, anche senza rete. Lo trovi in Biglietti.
          </T>
          {siteOnline && (
            <Button
              variant="secondary"
              leading={(color, pressed) => <ShareIcon color={color} play={pressed} size={20} />}
              label="Condividi il biglietto"
              onPress={() => Share.share({ message: `Il mio biglietto per ${ticket.title}: ${link}` }).catch(() => {})}
            />
          )}
          <Button variant="secondary" icon="calendar-outline" label="Pagina dell'evento" onPress={() => router.push({ pathname: "/pubblico/evento/[id]", params: { id: ticket.event_id } })} />
          <View style={styles.leave}>
            <T variant="bodyStrong">Non puoi più venire?</T>
            <T variant="callout" tone="secondary">
              Annulla l&apos;iscrizione: il posto torna libero per qualcun altro.
            </T>
            <Button variant="tertiary" icon="close-circle-outline" label="Annulla l'iscrizione" loading={leaving} onPress={giveBack} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space[3] },
  leave: { gap: space[1], paddingTop: space[4] },
});
