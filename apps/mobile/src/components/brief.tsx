import Ionicons from "@expo/vector-icons/Ionicons";
import { answerRows, getServiceCategory, OBJECTIVE_LABEL, openQuestions } from "@i-events/core";
import { StyleSheet, View } from "react-native";
import { dateRange, euro, shortDate } from "@/lib/format";
import type { LoadedRequest } from "@/lib/requests";
import { serviceIcon } from "@/lib/service-icons";
import { radius, space, useTheme } from "@/theme";
import { Card } from "./card";
import { Divider } from "./rows";
import { Section } from "./screen";
import { T } from "./text";

/** Label left, answer right, as in the agency report; unanswered questions say so. */
function Pair({ label, value, missing = "Non indicato" }: { label: string; value: string | null; missing?: string }) {
  return (
    <View style={styles.pair}>
      <T variant="callout" tone="secondary" style={styles.pairLabel}>
        {label}
      </T>
      <T variant="callout" tone={value ? "primary" : "secondary"} style={styles.pairValue}>
        {value ?? missing}
      </T>
    </View>
  );
}

/**
 * The request as the agency reads it: the facts, the stages of a campaign, one card per service with the
 * company's answers, the free notes and the questions still open.
 */
export function Brief({ request, showClient = true }: { request: LoadedRequest; showClient?: boolean }) {
  const { c } = useTheme();
  const { draft } = request;
  const b = draft.basics;
  const stages = draft.campaign?.stages ?? [];
  const perStage = draft.campaign?.servicesMode === "per_stage";
  const open = openQuestions(draft);
  const groups = perStage
    ? stages.map((s, i) => ({
        key: `stage-${i}`,
        title: `Tappa ${i + 1}${s.city ? ` · ${s.city}` : ""}`,
        items: draft.items.filter((it) => it.stageIndex === i),
      }))
    : [
        {
          key: "all",
          title: draft.kind === "campaign" ? "Servizi per tutte le tappe" : "Servizi richiesti",
          items: draft.items,
        },
      ];
  const budget =
    b.budgetMin !== undefined || b.budgetMax !== undefined
      ? `${euro(b.budgetMin ?? 0)} – ${b.budgetMax !== undefined ? euro(b.budgetMax) : "?"}`
      : null;

  const facts: [string, string | null][] = [
    ...(showClient ? ([["Azienda", request.clientName]] as [string, string][]) : []),
    ["Tipo", draft.kind === "campaign" ? `Campagna · ${draft.campaign?.eventsCount} eventi` : "Evento singolo"],
    ["Obiettivo", OBJECTIVE_LABEL[b.objective] ?? null],
    ["Date", dateRange(b.startDate ?? null, b.endDate ?? null) ?? "Da definire"],
    ["Ospiti", b.guests ? String(b.guests) : null],
    ["Budget", budget],
    ["Città", b.city ?? null],
    ["Target", b.audience ?? null],
    ["Pubblico", b.isPublic ? "Aperto al pubblico" : "Riservato"],
  ];

  return (
    <>
      <Section title="Il brief" aside={<T variant="mono" tone="secondary">{`${request.completeness}% COMPLETO`}</T>}>
        <Card style={styles.tight}>
          {facts.map(([k, v], i) => (
            <View key={k}>
              {i > 0 && <Divider />}
              <Pair label={k} value={v} />
            </View>
          ))}
        </Card>
      </Section>

      {draft.kind === "campaign" && (
        <Section title={draft.campaign?.sameVenue ? "Tappe · stesso luogo" : "Tappe"}>
          <Card style={styles.tight}>
            {stages.map((s, i) => (
              <View key={i}>
                {i > 0 && <Divider />}
                <View style={styles.stage}>
                  <T variant="mono" tone="secondary" style={styles.stageNo}>
                    {String(i + 1).padStart(2, "0")}
                  </T>
                  <View style={styles.flex}>
                    <T variant="callout">{[s.city, s.venueHint].filter(Boolean).join(" · ") || "Luogo da definire"}</T>
                    <T variant="mono" tone="secondary">
                      {s.date ? shortDate(s.date).toUpperCase() : "DATA DA DEFINIRE"}
                    </T>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      )}

      {groups.map((g) => (
        <Section key={g.key} title={g.title}>
          {g.items.length === 0 ? (
            <T variant="callout" tone="secondary">
              Nessun servizio indicato.
            </T>
          ) : (
            <View style={styles.list}>
              {g.items.map((item) => {
                const category = getServiceCategory(item.category);
                if (!category) return null;
                const rows = answerRows(category, item.answers);
                return (
                  <Card key={`${g.key}-${item.category}`} style={styles.tight}>
                    <View style={styles.serviceHead}>
                      <View style={[styles.icon, { backgroundColor: c.bgSubtle }]}>
                        <Ionicons name={serviceIcon(category.key)} size={20} color={c.textPrimary} />
                      </View>
                      <T variant="bodyStrong" style={styles.flex}>
                        {category.name.it}
                      </T>
                    </View>
                    {rows.map((row) => (
                      <View key={row.key}>
                        <Divider />
                        <Pair label={row.label} value={row.value} missing="Da chiarire" />
                      </View>
                    ))}
                  </Card>
                );
              })}
            </View>
          )}
        </Section>
      ))}

      {draft.freeText && (
        <Section title="Note dell'azienda">
          <Card>
            <T variant="body">{draft.freeText}</T>
          </Card>
        </Section>
      )}

      {open.length > 0 && (
        <Section
          title="Domande aperte"
          aside={
            <T variant="mono" tone="secondary">
              {open.length}
            </T>
          }
        >
          <Card style={styles.tight}>
            {open.map((q, i) => (
              <View key={i}>
                {i > 0 && <Divider />}
                <View style={styles.question}>
                  <Ionicons name="help-circle-outline" size={20} color={c.textSecondary} />
                  <T variant="callout" style={styles.flex}>
                    {q.categoryName}
                    {q.stageIndex !== undefined ? ` (tappa ${q.stageIndex + 1})` : ""}: {q.question}
                  </T>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  tight: { gap: 0, paddingVertical: space[2] },
  list: { gap: space[3] },
  flex: { flex: 1 },
  pair: { flexDirection: "row", gap: space[4], paddingVertical: space[3] },
  pairLabel: { flex: 1 },
  pairValue: { flex: 1, textAlign: "right" },
  stage: {
    flexDirection: "row",
    gap: space[3],
    paddingVertical: space[3],
    alignItems: "flex-start",
  },
  stageNo: { paddingTop: space[1] },
  serviceHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[2],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  question: {
    flexDirection: "row",
    gap: space[3],
    paddingVertical: space[3],
    alignItems: "flex-start",
  },
});
