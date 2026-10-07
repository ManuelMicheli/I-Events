import type { EventType } from "@i-events/core";
import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { radius, space, useTheme } from "@/theme";
import { Card, TicketDivider } from "./card";
import { InkBand } from "./event-type";
import { Logo } from "./logo";
import { QrCode } from "./public";
import { T } from "./text";

/**
 * The event's ticket, standing (Client 6), as on the website: the I-Events mark, the title and four
 * facts, then the perforation and a QR that opens the event on a phone, with the number and the
 * agency under it.
 */
export function EventPass({
  title,
  number,
  agency,
  type,
  facts,
  link,
}: {
  title: string;
  number: string;
  agency: string;
  type: EventType | null;
  facts: { label: string; value: string }[];
  link: string;
}) {
  const { c } = useTheme();
  return (
    <Card style={styles.pass}>
      {type && <InkBand type={type} />}
      <View style={styles.top} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Logo />
        <T variant="monoCaps" tone="secondary">
          BIGLIETTO
        </T>
      </View>
      <T variant="title3" accessibilityRole="header" accessibilityLabel={`Biglietto dell'evento ${title}, ${number}`}>
        {title}
      </T>
      <View style={styles.facts}>
        {facts.map((f) => (
          <View key={f.label} style={styles.fact} accessible accessibilityLabel={`${f.label}: ${f.value}`}>
            <T variant="monoCaps" tone="secondary">
              {f.label.toUpperCase()}
            </T>
            <T variant="callout">{f.value}</T>
          </View>
        ))}
      </View>
      <TicketDivider />
      <View style={styles.figure}>
        <View accessible accessibilityRole="image" accessibilityLabel="Codice QR: apre l'evento sul telefono" style={[styles.qr, { borderColor: c.borderDefault }]}>
          <QrCode value={link} size={120} />
        </View>
        <T variant="mono" tone="secondary" style={styles.center}>
          {`${number} · ${agency}`}
        </T>
      </View>
    </Card>
  );
}

/** "Prossimi passi": the done ones ticked, the current one marked in Fiamma, the rest waiting. */
export function NextSteps({ steps }: { steps: { label: string; done: boolean }[] }) {
  const { c } = useTheme();
  const current = steps.findIndex((s) => !s.done);
  return (
    <Card>
      <T variant="bodyStrong" accessibilityRole="header">
        Prossimi passi
      </T>
      <View style={styles.steps}>
        {steps.map((s, i) => {
          const now = i === current;
          return (
            <View
              key={s.label}
              accessible
              accessibilityLabel={`${i + 1}. ${s.label}, ${s.done ? "fatto" : now ? "adesso" : "dopo"}`}
              style={[styles.step, now && { backgroundColor: c.bgSubtle }]}
            >
              <View
                style={[
                  styles.mark,
                  { borderColor: s.done ? c.textPrimary : now ? c.accentFill : c.borderStrong, backgroundColor: s.done ? c.textPrimary : "transparent" },
                ]}
              >
                {s.done ? (
                  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                    <Path d="M2.5 6.25l2.25 2.25 4.75-5" stroke={c.bgApp} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                ) : (
                  now && <View style={[styles.now, { backgroundColor: c.accentFill }]} />
                )}
              </View>
              <T variant={now ? "calloutStrong" : "callout"} tone={s.done || now ? "primary" : "secondary"} style={styles.flex}>
                {s.label}
              </T>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  pass: { gap: space[4] },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3] },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: space[3] },
  fact: { width: "50%", paddingRight: space[3], gap: space[1] },
  figure: { alignItems: "center", gap: space[3] },
  qr: { backgroundColor: "#FFFFFF", padding: space[3], borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  center: { textAlign: "center" },
  steps: { gap: space[1] },
  step: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[3], paddingVertical: space[2], marginHorizontal: -space[3], borderRadius: radius.sm },
  mark: { width: 20, height: 20, borderRadius: radius.full, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  now: { width: 10, height: 10, borderRadius: radius.full },
  flex: { flex: 1, minWidth: 0 },
});
