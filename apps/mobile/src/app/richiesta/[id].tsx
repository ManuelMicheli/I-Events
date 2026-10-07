import { formatEventDates, getServiceCategory } from "@i-events/core";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, TicketDivider } from "@/components/card";
import { InfoRow } from "@/components/rows";
import { Notice } from "@/components/notice";
import { Screen, Section } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { InlineError, TextField } from "@/components/text-field";
import { fetchSupplierRequests } from "@/lib/data";
import { errorMessage } from "@/lib/errors";
import { useActiveOrg } from "@/lib/session";
import { supplierBucketLook } from "@/lib/status-look";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

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

      {r.status === "requested" && r.bucket !== "closed" ? (
        <AnswerForm bookingId={r.id} agency={r.agency_name} answered={answer} onSent={q.refresh} />
      ) : (
        <Section title="La tua risposta">
          {r.status === "confirmed" && <Notice tone="success">{`${r.agency_name} ti ha confermato per questo evento.`}</Notice>}
          {r.status === "cancelled" && <Notice>{`${r.agency_name} ha annullato questa richiesta.`}</Notice>}
          <Card>
            <T variant="body">{answer ?? "Non hai risposto."}</T>
            {r.supplier_note && (
              <T variant="callout" tone="secondary">
                {r.supplier_note}
              </T>
            )}
          </Card>
        </Section>
      )}
    </Screen>
  );
}

/** Available or not, with a price and a note: the agency gets it right away. Can be changed while the request is open. */
function AnswerForm({ bookingId, agency, answered, onSent }: { bookingId: string; agency: string; answered: string | null; onSent: () => void }) {
  const [available, setAvailable] = useState<"yes" | "no">("yes");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const parsed =
    price.trim() === ""
      ? null
      : Number(
          price
            .replace(/\s|€/g, "")
            .replace(/\.(?=\d{3}(\D|$))/g, "")
            .replace(",", "."),
        );
  const priceError = parsed !== null && !(Number.isFinite(parsed) && parsed >= 0) ? "Scrivi solo cifre, ad esempio 1.500,00" : undefined;

  const send = async () => {
    if (priceError) return;
    setSending(true);
    setError(undefined);
    const { error: e } = await supabase.rpc("respond_to_booking", {
      p_booking: bookingId,
      p_available: available === "yes",
      p_price: available === "yes" && parsed !== null ? parsed : undefined,
      p_note: note.trim() || undefined,
    });
    setSending(false);
    if (e) setError(e.code === "22023" ? "La richiesta non è più aperta." : errorMessage(e));
    else onSent();
  };

  return (
    <Section title={answered ? "Cambia la risposta" : "La tua risposta"}>
      {answered && <Notice>{`Hai risposto: ${answered}. Puoi cambiarla finché ${agency} non decide.`}</Notice>}
      <Segmented
        value={available}
        onChange={setAvailable}
        accessibilityLabel="Disponibilità"
        options={[
          { value: "yes", label: "Disponibile" },
          { value: "no", label: "Non disponibile" },
        ]}
      />
      {available === "yes" && (
        <TextField
          label="Prezzo (€, facoltativo)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0,00"
          error={priceError}
        />
      )}
      <TextField
        label="Nota per l'agenzia (facoltativa)"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={2000}
        style={styles.area}
        textAlignVertical="top"
      />
      {error && <InlineError message={error} />}
      <Button block icon="paper-plane-outline" label="Invia la risposta" loading={sending} onPress={send} />
    </Section>
  );
}

const styles = StyleSheet.create({
  facts: { gap: space[4] },
  area: { minHeight: 96, paddingTop: space[3] },
});
