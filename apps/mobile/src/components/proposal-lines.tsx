import { getServiceCategory, type ProposalLine } from "@i-events/core";
import { StyleSheet, View } from "react-native";
import { euro } from "@/lib/format";
import { space } from "@/theme";
import { TicketDivider } from "./card";
import { T } from "./text";

/** The priced lines of a proposal, then the total under the ticket cut. Sits directly inside a Card. */
export function ProposalLines({ lines, total }: { lines: ProposalLine[]; total: number | null }) {
  return (
    <>
      {lines.length > 0 && (
        <View style={styles.lines}>
          {lines.map((l, i) => (
            <View key={i} style={styles.line} accessible accessibilityLabel={`${l.description || serviceName(l.category)}, ${euro(l.amount)}`}>
              <View style={styles.flex}>
                <T variant="callout">{serviceName(l.category)}</T>
                {l.description && l.description !== serviceName(l.category) && (
                  <T variant="caption" tone="secondary">
                    {l.description}
                  </T>
                )}
              </View>
              <T variant="mono">{euro(l.amount)}</T>
            </View>
          ))}
        </View>
      )}
      <TicketDivider />
      <View style={styles.total} accessible accessibilityLabel={`Totale ${euro(total)}`}>
        <T variant="label" tone="secondary">
          Totale
        </T>
        <T variant="monoMetric" adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.6}>
          {euro(total)}
        </T>
      </View>
    </>
  );
}

export const serviceName = (key: string) => getServiceCategory(key)?.name.it ?? "Altro";

const styles = StyleSheet.create({
  lines: { gap: space[3] },
  line: { flexDirection: "row", alignItems: "flex-start", gap: space[4] },
  flex: { flex: 1, gap: space[1] },
  total: { gap: space[1] },
});
