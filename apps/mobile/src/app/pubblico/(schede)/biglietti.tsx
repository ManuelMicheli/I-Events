import { formatTicketNumber, peopleLabel, todayInItaly } from "@i-events/core";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { PublicEventRow, PublicExit } from "@/components/public";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { eventLine, isOver, myTickets, type RegistrationTicket } from "@/lib/public-events";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

type Tab = "next" | "past";

/** Biglietti (design pubblico-05): the tickets taken on this phone, the next ones first, then the past ones. */
export default function Tickets() {
  const q = useQuery("pubblico-biglietti", myTickets);
  const [tab, setTab] = useState<Tab>("next");
  const today = todayInItaly();
  const tickets = q.data ?? [];
  const isPast = (t: RegistrationTicket) => t.status === "cancelled" || isOver(t, today);
  const next = tickets.filter((t) => !isPast(t.ticket)).sort((a, b) => a.ticket.start_date.localeCompare(b.ticket.start_date));
  const past = tickets.filter((t) => isPast(t.ticket)).sort((a, b) => b.ticket.start_date.localeCompare(a.ticket.start_date));
  const shown = tab === "next" ? next : past;

  return (
    <Screen
      title="Biglietti"
      actions={<PublicExit />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
      header={
        <T variant="body" tone="secondary">
          Le iscrizioni fatte da questo telefono.
        </T>
      }
    >
      {q.loading ? (
        <CardSkeletons count={2} />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon="ticket-outline"
          title="Nessun biglietto, per ora"
          body="Quando ti iscrivi a un evento il biglietto resta qui, anche senza account."
          action={{ label: "Esplora gli eventi", onPress: () => router.navigate("/pubblico") }}
        />
      ) : (
        <View style={styles.body}>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            accessibilityLabel="Quali biglietti"
            options={[
              { value: "next", label: `Prossimi ${next.length}`, accessibilityLabel: `Prossimi, ${next.length}` },
              { value: "past", label: `Passati ${past.length}`, accessibilityLabel: `Passati, ${past.length}` },
            ]}
          />
          {shown.length === 0 ? (
            <EmptyState
              icon={tab === "next" ? "calendar-clear-outline" : "time-outline"}
              title={tab === "next" ? "Nessun evento in arrivo" : "Nessun evento passato"}
              body={tab === "next" ? "I biglietti dei prossimi eventi a cui ti iscrivi compaiono qui." : "Qui restano i biglietti degli eventi già andati in scena."}
              action={tab === "next" ? { label: "Esplora gli eventi", onPress: () => router.navigate("/pubblico") } : undefined}
            />
          ) : (
            <View style={styles.list}>
              {shown.map(({ token, ticket }) => (
                <PublicEventRow
                  key={token}
                  type={ticket.event_type}
                  title={ticket.title}
                  line={eventLine(ticket)}
                  live={ticket.status === "live"}
                  extra={ticket.status === "cancelled" ? "Annullato" : `${formatTicketNumber(ticket.number)} · ${peopleLabel(ticket.guests)}`}
                  onPress={() => router.push({ pathname: "/pubblico/biglietto/[token]", params: { token } })}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[4] },
  list: { gap: space[3] },
});
