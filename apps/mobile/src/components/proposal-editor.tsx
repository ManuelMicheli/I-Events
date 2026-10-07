import Ionicons from "@expo/vector-icons/Ionicons";
import { proposalSchema, proposalTotal, SERVICE_CATALOG, type ProposalLine } from "@i-events/core";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { errorMessage } from "@/lib/errors";
import { euro } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { control, radius, space, useTheme } from "@/theme";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card, TicketDivider } from "./card";
import { serviceName } from "./proposal-lines";
import { Divider, ListRow } from "./rows";
import { Section } from "./screen";
import { Sheet } from "./sheet";
import { T } from "./text";
import { InlineError, TextField } from "./text-field";

type Line = { category: string; description: string; amount: string };

const toLine = (l: ProposalLine): Line => ({
  category: l.category,
  description: l.description,
  amount: l.amount ? String(l.amount).replace(".", ",") : "",
});
/** "1.500,50" or "1500.5" → 1500.5; null when it is not a number. */
const parseAmount = (s: string): number | null => {
  const clean = s
    .replace(/\s|€/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (clean === "") return 0;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

type Props = {
  proposalId: string;
  clientName: string;
  initialLines: ProposalLine[];
  initialSummary: string;
  resubmit: boolean;
  budget: { min?: number; max?: number };
  onSent: () => void;
};

/**
 * The agency composes its proposal: one line per service, already filled from the request, the total
 * in mono with how it sits against the budget, a summary, and send.
 */
export function ProposalEditor({ proposalId, clientName, initialLines, initialSummary, resubmit, budget, onSent }: Props) {
  const { c } = useTheme();
  const [lines, setLines] = useState<Line[]>(initialLines.map(toLine));
  const [summary, setSummary] = useState(initialSummary);
  const [picking, setPicking] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  const amounts = lines.map((l) => parseAmount(l.amount));
  const total = proposalTotal(amounts.map((a) => ({ amount: a ?? 0 })));
  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const fit =
    budget.max === undefined || total === 0
      ? null
      : total > budget.max
        ? ({ label: "Sopra il budget", tone: "warning", icon: "alert-circle-outline" } as const)
        : total < (budget.min ?? 0)
          ? ({ label: "Sotto il budget", tone: "neutral" } as const)
          : ({ label: "Dentro il budget", tone: "success", icon: "checkmark" } as const);

  const send = () => {
    setError(undefined);
    if (amounts.some((a) => a === null)) return setError("Controlla gli importi: scrivi solo cifre, ad esempio 1.500,00.");
    const parsed = proposalSchema.safeParse({
      summary,
      lines: lines.map((l, i) => ({
        category: l.category,
        description: l.description,
        amount: amounts[i] ?? 0,
      })),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    Alert.alert(
      resubmit ? "Inviare la proposta aggiornata?" : "Inviare la proposta?",
      `${clientName} la riceve subito, con il totale di ${euro(total)}.`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Invia",
          onPress: async () => {
            setSending(true);
            const { error: e } = await supabase.rpc("submit_proposal", {
              p_proposal: proposalId,
              p_total: proposalTotal(parsed.data.lines),
              p_summary: parsed.data.summary,
              p_lines: parsed.data.lines,
            });
            setSending(false);
            if (e) setError(e.code === "22023" ? "La richiesta non accetta più proposte." : errorMessage(e));
            else onSent();
          },
        },
      ],
    );
  };

  return (
    <Section title={resubmit ? "Aggiorna la proposta" : "La tua proposta"}>
      <Card>
        {lines.map((l, i) => (
          <View key={i} style={styles.line}>
            {i > 0 && <Divider />}
            <View style={styles.lineHead}>
              <Pressable
                onPress={() => setPicking(i)}
                accessibilityRole="button"
                accessibilityLabel={`Servizio: ${serviceName(l.category)}. Cambia`}
                style={({ pressed }) => [styles.service, { borderColor: c.borderControl }, pressed && { backgroundColor: c.bgSubtle }]}
              >
                <T variant="calloutStrong" numberOfLines={1} style={styles.flexShrink}>
                  {serviceName(l.category)}
                </T>
                <Ionicons name="chevron-down" size={16} color={c.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel={`Rimuovi la voce ${serviceName(l.category)}`}
                style={({ pressed }) => [styles.remove, pressed && { backgroundColor: c.bgSubtle }]}
              >
                <Ionicons name="trash-outline" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
            <TextField label="Descrizione" value={l.description} onChangeText={(t) => update(i, { description: t })} maxLength={300} />
            <TextField
              label="Importo (€)"
              value={l.amount}
              onChangeText={(t) => update(i, { amount: t })}
              keyboardType="decimal-pad"
              placeholder="0,00"
              error={amounts[i] === null ? "Scrivi solo cifre, ad esempio 1.500,00" : undefined}
            />
          </View>
        ))}
        <Button
          variant="tertiary"
          icon="add"
          label="Aggiungi voce"
          onPress={() => setLines((ls) => [...ls, { category: "other", description: "", amount: "" }])}
        />
        <TicketDivider />
        <View style={styles.total}>
          <T variant="label" tone="secondary">
            Totale
          </T>
          <T variant="monoMetric" adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.6}>
            {euro(total)}
          </T>
          {fit && <Badge {...fit} />}
        </View>
      </Card>

      <TextField
        label="Sintesi della proposta"
        value={summary}
        onChangeText={setSummary}
        multiline
        maxLength={5000}
        placeholder="Cosa proponi, in poche righe: l'idea, cosa è incluso, cosa serve dall'azienda."
        style={styles.area}
        textAlignVertical="top"
      />
      {error && <InlineError message={error} />}
      <Button
        block
        icon="paper-plane-outline"
        label={resubmit ? "Invia la proposta aggiornata" : "Invia la proposta"}
        loading={sending}
        onPress={send}
      />

      <Sheet visible={picking !== null} title="Servizio" onClose={() => setPicking(null)}>
        <ScrollView style={styles.pickList}>
          {[...SERVICE_CATALOG.map((s) => s.key), "other"].map((key, i) => (
            <View key={key}>
              {i > 0 && <Divider />}
              <ListRow
                title={serviceName(key)}
                selected={picking !== null && lines[picking]?.category === key}
                onPress={() => {
                  if (picking === null) return;
                  const prev = lines[picking];
                  // A description still equal to the old service name follows the new one.
                  update(picking, {
                    category: key,
                    description: !prev?.description || prev.description === serviceName(prev.category) ? serviceName(key) : prev.description,
                  });
                  setPicking(null);
                }}
              />
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </Section>
  );
}

const styles = StyleSheet.create({
  line: { gap: space[3] },
  lineHead: { flexDirection: "row", alignItems: "center", gap: space[2] },
  service: {
    flex: 1,
    minHeight: control.touch,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
  },
  flexShrink: { flexShrink: 1 },
  remove: {
    width: control.touch,
    height: control.touch,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  total: { gap: space[2] },
  area: { minHeight: 120, paddingTop: space[3] },
  pickList: { maxHeight: 420 },
});
