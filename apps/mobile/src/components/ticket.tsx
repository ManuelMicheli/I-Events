import { EVENT_TYPE_INFO, type Countdown, type EventType } from "@i-events/core";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { radius, space, useTheme } from "@/theme";
import { LiveDot } from "./badge";
import { TypeChip } from "./event-type";
import { T } from "./text";

/**
 * The ticket ("Carta e inchiostro"), as on the website: on phones the stub sits under the card,
 * behind the perforation with its two notches (TicketDivider), with the number and the countdown.
 */
export function TicketStub({ number, countdown }: { number: string; countdown: Countdown | null }) {
  return (
    <View style={styles.stub}>
      <T variant="ticket">{number}</T>
      {countdown && (
        <View style={styles.countdown}>
          {countdown.live && <LiveDot />}
          <T variant="monoCaps" tone="secondary">
            {countdown.label}
          </T>
        </View>
      )}
    </View>
  );
}

/** Under a request's title: its number, the same in every screen, and the type chip. */
export function TicketTag({ number, type }: { number: string; type: EventType | null | undefined }) {
  return (
    <View style={styles.tag}>
      <T variant="mono" tone="secondary" accessibilityLabel={`biglietto ${number}`}>
        {number}
      </T>
      <TypeChip type={type} />
    </View>
  );
}

/** The status pill on the left and, once it is earned, the stamp on the right. */
export function StatusRow({ children }: { children: ReactNode }) {
  return <View style={styles.status}>{children}</View>;
}

/**
 * A stamp for the moments that matter: CONFERMATO, ANDATO IN SCENA. Double rule, mono capitals, the
 * date below, in the event's ink (Grafite without a type), turned by -6 degrees.
 */
export function Stamp({ label, date, type }: { label: string; date: string; type: EventType | null | undefined }) {
  const { c, scheme } = useTheme();
  const ink = type ? EVENT_TYPE_INFO[type].ink : null;
  const color = ink ? (scheme === "dark" ? ink.darkText : ink.text) : c.textPrimary;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={date ? `${label.toLowerCase()} il ${date.toLowerCase()}` : label.toLowerCase()}
      style={[styles.outline, { borderColor: color }]}
    >
      <View style={[styles.stamp, { borderColor: color }]}>
        <T variant="stamp" style={{ color }}>
          {label.toUpperCase()}
        </T>
        {date !== "" && (
          <T variant="monoCaps" style={[styles.date, { color }]}>
            {date}
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3], minHeight: 20 },
  tag: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[3] },
  // On narrow phones the stamp goes under the pill instead of running off the card.
  status: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space[3], minHeight: 24 },
  countdown: { flexDirection: "row", alignItems: "center", gap: space[2] },
  outline: { alignSelf: "flex-start", borderWidth: 1, borderRadius: radius.sm + 3, padding: 2, margin: space[1], transform: [{ rotate: "-6deg" }] },
  stamp: { borderWidth: 2, borderRadius: radius.sm, paddingHorizontal: space[3], paddingVertical: space[1], alignItems: "center" },
  date: { fontSize: 11, lineHeight: 14, letterSpacing: 0 },
});
