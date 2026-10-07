import Ionicons from "@expo/vector-icons/Ionicons";
import { ratingSummary, SERVICE_CATALOG } from "@i-events/core";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { Chip, ChipRow } from "@/components/chip";
import { DateField } from "@/components/date-field";
import { OrgLogo } from "@/components/org-logo";
import { Divider } from "@/components/rows";
import { Screen } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { TextField } from "@/components/text-field";
import { plural } from "@/lib/format";
import { NO_FILTERS, searchMarketplace, serviceNames, type MarketplaceFilters, type MarketplaceKind, type MarketplaceResult } from "@/lib/marketplace";
import { useActiveOrg } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { fonts, radius, space, useTheme } from "@/theme";

const COPY: Record<MarketplaceKind, { title: string; lead: string; placeholder: string; empty: string; emptyDate: string }> = {
  agency: {
    title: "Trova agenzie",
    lead: "Agenzie con un profilo pubblico su I-Events. Puoi mandare loro una richiesta anche se non vi conoscete ancora.",
    placeholder: "Nome, evento o parola chiave",
    empty: "Nessuna agenzia trovata con questi filtri.",
    emptyDate: "Nessuna agenzia trovata con questi filtri.",
  },
  supplier: {
    title: "Trova fornitori",
    lead: "Fornitori con un profilo pubblico su I-Events. Aggiungili alla rubrica e le tue richieste arrivano direttamente nel loro account.",
    placeholder: "Nome, specialità o parola",
    empty: "Nessun fornitore trovato con questi filtri.",
    emptyDate: "Nessun fornitore libero in quella data con questi filtri.",
  },
};

/**
 * The marketplace search, as on the website: a company finds agencies, an agency finds suppliers
 * (also free on a given date). Words, service and area narrow the list; with no results, each
 * filter can be dropped with one tap.
 */
export default function FindScreen() {
  const org = useActiveOrg();
  const kind: MarketplaceKind | null = org.type === "client" ? "agency" : org.type === "agency" ? "supplier" : null;
  const [typed, setTyped] = useState({ q: "", area: "" });
  const [filters, setFilters] = useState<MarketplaceFilters>(NO_FILTERS);
  // The date field keeps its own text: a new key empties it when the date filter is dropped.
  const [dateKey, setDateKey] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: typed.q.trim(), area: typed.area.trim() })), 300);
    return () => clearTimeout(t);
  }, [typed]);
  const key = kind ? `marketplace:${org.id}:${kind}:${JSON.stringify(filters)}` : null;
  const q = useQuery(key, () => searchMarketplace(kind!, org.id, filters));

  if (!kind) {
    return (
      <Screen>
        <EmptyState icon="storefront-outline" title="Solo per aziende e agenzie" body="Le aziende trovano qui le agenzie, le agenzie i fornitori." />
      </Screen>
    );
  }
  const copy = COPY[kind];
  const drop = (field: keyof MarketplaceFilters) => {
    if (field === "q" || field === "area") setTyped((t) => ({ ...t, [field]: "" }));
    if (field === "date") setDateKey((k) => k + 1);
    setFilters((f) => ({ ...f, [field]: NO_FILTERS[field] }));
  };
  const chips = (
    [
      filters.date && { field: "date", label: "Qualsiasi data" },
      filters.q && { field: "q", label: `Senza “${filters.q}”` },
      filters.service && { field: "service", label: "Tutti i servizi" },
      filters.area && { field: "area", label: "Ovunque" },
    ] as const
  ).filter((x): x is { field: keyof MarketplaceFilters; label: string } => !!x);

  return (
    <Screen
      header={
        <View style={styles.header}>
          <Stack.Screen options={{ title: copy.title }} />
          <T variant="body" tone="secondary">
            {copy.lead}
          </T>
          <TextField
            label="Cerca"
            value={typed.q}
            onChangeText={(v) => setTyped((t) => ({ ...t, q: v }))}
            placeholder={copy.placeholder}
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            maxLength={80}
          />
          <ChipRow accessibilityLabel="Servizio">
            <Chip label="Tutti i servizi" selected={filters.service === null} onPress={() => setFilters((f) => ({ ...f, service: null }))} />
            {SERVICE_CATALOG.map((s) => (
              <Chip
                key={s.key}
                label={s.name.it}
                selected={filters.service === s.key}
                onPress={() => setFilters((f) => ({ ...f, service: f.service === s.key ? null : s.key }))}
              />
            ))}
          </ChipRow>
          <TextField
            label="Zona"
            value={typed.area}
            onChangeText={(v) => setTyped((t) => ({ ...t, area: v }))}
            placeholder="Città o regione"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            maxLength={60}
          />
          {kind === "supplier" && (
            <DateField key={dateKey} label="Libero il" hint="Solo chi non ha altri impegni in quella data." value={filters.date} onChange={(date) => setFilters((f) => ({ ...f, date }))} />
          )}
        </View>
      }
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      {q.loading && !q.data ? (
        <CardSkeletons count={2} />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : q.data && q.data.length > 0 ? (
        <View style={styles.results}>
          <T variant="callout" tone="secondary" accessibilityLiveRegion="polite">
            {plural(q.data.length, "risultato", "risultati")}
          </T>
          <Card style={styles.list}>
            {q.data.map((r, i) => (
              <View key={r.org_id}>
                {i > 0 && <Divider />}
                <ResultRow result={r} kind={kind} query={filters.q} />
              </View>
            ))}
          </Card>
        </View>
      ) : (
        <View style={styles.empty}>
          <EmptyState icon="search-outline" title="Nessun risultato" body={filters.date ? copy.emptyDate : copy.empty} />
          {chips.length > 0 && (
            <View style={styles.dropChips}>
              {chips.slice(0, 3).map((c) => (
                <Chip key={c.field} label={c.label} selected={false} onPress={() => drop(c.field)} />
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

function ResultRow({ result: r, kind, query }: { result: MarketplaceResult; kind: MarketplaceKind; query: string }) {
  const { c } = useTheme();
  const rating = ratingSummary(r.rating_avg, r.rating_count);
  const detail = [serviceNames(r.services), r.regions.join(", ")].filter(Boolean).join(" · ") || "Servizi non indicati";
  const relation = kind === "agency" ? (r.connected ? "Già collegata" : null) : r.contact_id ? "In rubrica" : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/trova/[slug]", params: { slug: r.slug } })}
      accessibilityRole="button"
      accessibilityLabel={[r.name, r.city, rating && `valutazione ${rating}`, r.headline, detail, relation].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <OrgLogo name={r.name} src={r.logo_url} />
      <View style={styles.texts}>
        <T variant="bodyStrong">
          <Found text={r.name} query={query} />
        </T>
        {(r.city || rating) && (
          <T variant="callout" tone="secondary">
            {[r.city, rating && `★ ${rating}`].filter(Boolean).join(" · ")}
          </T>
        )}
        {r.headline ? <T variant="callout">{r.headline}</T> : null}
        <T variant="caption" tone="secondary">
          {detail}
        </T>
        {relation && <Badge label={relation} tone="outline" icon="checkmark-circle-outline" />}
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.textSecondary} style={styles.chevron} />
    </Pressable>
  );
}

/** The words found, a weight up (A3): the match reads by weight, never by colour. */
function Found({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <T key={i} variant="bodyStrong" style={styles.found}>
        {part}
      </T>
    ) : (
      part
    ),
  );
}

const styles = StyleSheet.create({
  header: { gap: space[3] },
  results: { gap: space[3] },
  list: { paddingVertical: space[1], gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[3],
    minHeight: 64,
    paddingVertical: space[3],
    marginHorizontal: -space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  texts: { flex: 1, gap: space[1], alignItems: "flex-start" },
  chevron: { alignSelf: "center" },
  found: { fontFamily: fonts.sans["600"] },
  empty: { gap: space[2] },
  dropChips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space[1] },
});
