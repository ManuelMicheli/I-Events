import { formatEventDates, getServiceCategory } from "@i-events/core";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, View } from "react-native";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, TicketDivider } from "@/components/card";
import { InfoRow } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { fetchSupplierRequests } from "@/lib/data";
import { env } from "@/lib/env";
import { useActiveOrg } from "@/lib/session";
import { supplierBucketLook } from "@/lib/status-look";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

/** A booking request an agency sent to this supplier: what, when, where and the answer given. */
export default function SupplierRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = useActiveOrg();
  const q = useQuery(`supplier:${org.id}:${id}`, async () => (await fetchSupplierRequests(org.id)).find((r) => r.id === id) ?? null);
  const r = q.data;

  if (q.loading)
    return (
      <Screen>
        <CardSkeletons count={1} />
      </Screen>
    );
  if (q.error && !r)
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={q.refresh} />
      </Screen>
    );
  if (!r)
    return (
      <Screen>
        <EmptyState
          icon="search-outline"
          title="Richiesta non trovata"
          body="Potrebbe essere stata annullata dall'agenzia, oppure appartiene a un'altra organizzazione."
        />
      </Screen>
    );

  const service = getServiceCategory(r.service_key)?.name.it ?? r.service_key;
  const place = [r.venue, r.city].filter(Boolean).join(", ");
  const answer =
    r.supplier_response === "available"
      ? r.supplier_price !== null
        ? `Disponibile a ${euro.format(r.supplier_price)}`
        : "Disponibile"
      : r.supplier_response === "unavailable"
        ? "Non disponibile"
        : null;

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Stack.Screen options={{ title: service }} />
      <Card>
        <Badge {...supplierBucketLook(r.bucket)} />
        <T variant="title2" accessibilityRole="header">
          {r.event_title}
        </T>
        <T variant="callout" tone="secondary">
          {r.agency_name}
        </T>
        <TicketDivider />
        <View style={styles.facts}>
          <InfoRow label="Servizio" value={r.description ? `${service}: ${r.description}` : service} />
          <InfoRow label="Data" value={formatEventDates(r.start_date, r.end_date).toUpperCase()} mono />
          {place !== "" && <InfoRow label="Luogo" value={place} />}
        </View>
      </Card>

      <Section title="La tua risposta">
        <Card>
          <T variant="body">{answer ?? "Non hai ancora risposto."}</T>
          {r.supplier_note && (
            <T variant="callout" tone="secondary">
              {r.supplier_note}
            </T>
          )}
        </Card>
        <Button
          variant={r.bucket === "to_answer" ? "primary" : "secondary"}
          icon="open-outline"
          label={r.bucket === "to_answer" ? "Rispondi sul sito" : "Apri sul sito"}
          onPress={() => WebBrowser.openBrowserAsync(`${env.siteUrl}/supplier/richieste/${r.id}`)}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  facts: { gap: space[4] },
});
