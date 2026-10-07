import Ionicons from "@expo/vector-icons/Ionicons";
import { getServiceCategory, SERVICE_CATALOG } from "@i-events/core";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ImportIcon } from "@/components/icons";
import { Card } from "@/components/card";
import { Chip, ChipRow } from "@/components/chip";
import { Divider } from "@/components/rows";
import { Screen } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { TextField } from "@/components/text-field";
import { fetchContacts, type ContactItem } from "@/lib/contacts";
import { plural } from "@/lib/format";
import { useActiveOrg } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { radius, space, useTheme } from "@/theme";

/** The agency's suppliers and contacts: search, filter by service, open one to call or write. */
export default function AddressBookScreen() {
  const org = useActiveOrg();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [service, setService] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const q = useQuery(`contacts:${org.id}:${term}:${service ?? ""}`, () => fetchContacts(org.id, term, service));
  const filtered = term !== "" || service !== null;
  const importFromPhone = () => router.push("/importa-contatti");

  return (
    <Screen
      header={
        <View style={styles.header}>
          <TextField
            label="Cerca"
            value={search}
            onChangeText={setSearch}
            placeholder="Nome, azienda, email o città"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <ChipRow accessibilityLabel="Servizio">
            <Chip label="Tutti" selected={service === null} onPress={() => setService(null)} />
            {SERVICE_CATALOG.map((s) => (
              <Chip key={s.key} label={s.name.it} selected={service === s.key} onPress={() => setService(service === s.key ? null : s.key)} />
            ))}
          </ChipRow>
        </View>
      }
      footer={<Button icon="add" label="Nuovo contatto" onPress={() => router.push("/rubrica/nuovo")} />}
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      {q.loading ? (
        <CardSkeletons count={2} />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : q.data && q.data.contacts.length > 0 ? (
        <View style={styles.results}>
          <T variant="callout" tone="secondary" accessibilityLiveRegion="polite">
            {plural(q.data.count, "contatto", "contatti")}
          </T>
          <Card style={styles.list}>
            {q.data.contacts.map((c, i) => (
              <View key={c.id}>
                {i > 0 && <Divider />}
                <ContactRow contact={c} />
              </View>
            ))}
          </Card>
          {!filtered && (
            <View style={styles.more}>
              <Button
                variant="secondary"
                leading={(color, pressed) => <ImportIcon color={color} play={pressed} />}
                label="Importa dal telefono"
                onPress={importFromPhone}
              />
              <Button variant="secondary" icon="storefront-outline" label="Trova fornitori su I-Events" onPress={() => router.push("/trova")} />
            </View>
          )}
        </View>
      ) : filtered ? (
        <EmptyState icon="search-outline" title="Nessun contatto trovato" body="Prova con un'altra parola o togli il filtro del servizio." />
      ) : (
        <EmptyState
          icon="people-outline"
          title="La rubrica è vuota"
          body="Aggiungi i fornitori che hai già nel telefono, oppure inseriscine uno a mano."
          action={{ label: "Importa dal telefono", onPress: importFromPhone }}
        />
      )}
    </Screen>
  );
}

function ContactRow({ contact: c }: { contact: ContactItem }) {
  const { c: color } = useTheme();
  const services = c.services.map((s) => getServiceCategory(s)?.name.it).filter(Boolean);
  const detail = [services.join(", "), c.city].filter(Boolean).join(" · ") || "Nessun servizio indicato";
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/rubrica/[id]", params: { id: c.id } })}
      accessibilityRole="button"
      accessibilityLabel={[c.name, c.company, detail, c.supplier_org_id ? "su I-Events" : null].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.bgSubtle }]}
    >
      <Avatar name={c.name} />
      <View style={styles.texts}>
        <T variant="bodyStrong">{c.name}</T>
        {c.company && c.company !== c.name && (
          <T variant="callout" tone="secondary">
            {c.company}
          </T>
        )}
        <T variant="caption" tone="secondary">
          {detail}
        </T>
        {c.supplier_org_id && <Badge label="Su I-Events" tone="outline" />}
      </View>
      <Ionicons name="chevron-forward" size={20} color={color.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[2] },
  results: { gap: space[3] },
  more: { gap: space[2] },
  list: { paddingVertical: space[1], gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: 64,
    paddingVertical: space[3],
    marginHorizontal: -space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  texts: { flex: 1, gap: space[1], alignItems: "flex-start" },
});
