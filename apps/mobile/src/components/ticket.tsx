import { EVENT_TYPE_INFO, type Countdown, type EventType } from "@i-events/core";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { easeOut, useReduceMotion } from "@/lib/motion";
import { motion, radius, space, useTheme } from "@/theme";
import { LiveDot } from "./badge";
import { Card, TicketDivider } from "./card";
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
 * date below, in the event's ink (Grafite without a type), turned by -6 degrees. `fresh` when it has
 * just happened (A7): it lands from 1.2 to 1 in 180 ms, then an ink halo spreads and fades (240).
 */
export function Stamp({ label, date, type, fresh = false }: { label: string; date: string; type: EventType | null | undefined; fresh?: boolean }) {
  const { c, scheme } = useTheme();
  const reduce = useReduceMotion();
  const [land] = useState(() => new Animated.Value(fresh ? 0 : 1));
  const [halo] = useState(() => new Animated.Value(fresh ? 0 : 1));
  const ink = type ? EVENT_TYPE_INFO[type].ink : null;
  const color = ink ? (scheme === "dark" ? ink.darkText : ink.text) : c.textPrimary;

  useEffect(() => {
    if (!fresh) return;
    const run = reduce
      ? Animated.timing(land, { toValue: 1, duration: motion.fast, easing: easeOut, useNativeDriver: true })
      : Animated.sequence([
          Animated.timing(land, { toValue: 1, duration: motion.base, easing: easeOut, useNativeDriver: true }),
          Animated.timing(halo, { toValue: 1, duration: motion.moderate, easing: easeOut, useNativeDriver: true }),
        ]);
    run.start();
    return () => run.stop();
  }, [fresh, reduce, land, halo]);

  const scale = reduce ? 1 : land.interpolate({ inputRange: [0, 1], outputRange: [1.2, 1] });
  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={date ? `${label.toLowerCase()} il ${date.toLowerCase()}` : label.toLowerCase()}
      style={[styles.outline, { borderColor: color, opacity: land, transform: [{ rotate: "-6deg" }, { scale }] }]}
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
      {fresh && !reduce && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              backgroundColor: color,
              opacity: halo.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.2, 0] }),
              transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.2] }) }],
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

/**
 * "Il biglietto si stampa" (A7), right after a request is sent: the ticket comes out of a slot from
 * the top (320 ms), then the stub shows its number (180). With Reduce Motion it fades in (120).
 */
export function PrintedTicket({ number, title, body }: { number: string; title: string; body: string }) {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const [height, setHeight] = useState(0);
  const [print] = useState(() => new Animated.Value(0));
  const [stub] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (height === 0) return;
    const run = reduce
      ? Animated.parallel([
          Animated.timing(print, { toValue: 1, duration: motion.fast, easing: easeOut, useNativeDriver: true }),
          Animated.timing(stub, { toValue: 1, duration: motion.fast, easing: easeOut, useNativeDriver: true }),
        ])
      : Animated.sequence([
          Animated.timing(print, { toValue: 1, duration: motion.slow, easing: easeOut, useNativeDriver: true }),
          Animated.timing(stub, { toValue: 1, duration: motion.base, easing: easeOut, useNativeDriver: true }),
        ]);
    run.start();
    return () => run.stop();
  }, [height, reduce, print, stub]);

  const motionStyle = reduce
    ? { opacity: print }
    : { opacity: height === 0 ? 0 : 1, transform: [{ translateY: print.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] }) }] };
  return (
    <View style={[styles.slot, { borderTopColor: c.borderStrong }]} accessibilityLiveRegion="polite">
      <Animated.View style={motionStyle} onLayout={(e) => height === 0 && setHeight(e.nativeEvent.layout.height)}>
        <Card accessibilityLabel={`${title}, biglietto ${number}`}>
          <View style={styles.printed}>
            <T variant="bodyStrong">{title}</T>
            <T variant="callout" tone="secondary">
              {body}
            </T>
          </View>
          <TicketDivider />
          <Animated.View style={{ opacity: stub }}>
            <TicketStub number={number} countdown={{ label: "INVIATA", live: false }} />
          </Animated.View>
        </Card>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stub: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[3], minHeight: 20 },
  tag: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[3] },
  // On narrow phones the stamp goes under the pill instead of running off the card.
  status: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space[3], minHeight: 24 },
  countdown: { flexDirection: "row", alignItems: "center", gap: space[2] },
  outline: { alignSelf: "flex-start", borderWidth: 1, borderRadius: radius.sm + 3, padding: 2, margin: space[1] },
  stamp: { borderWidth: 2, borderRadius: radius.sm, paddingHorizontal: space[3], paddingVertical: space[1], alignItems: "center" },
  date: { fontSize: 11, lineHeight: 14, letterSpacing: 0 },
  halo: { position: "absolute", top: -6, right: -6, bottom: -6, left: -6, borderRadius: 12 },
  slot: { borderTopWidth: 2, borderRadius: 2, paddingTop: space[1], overflow: "hidden" },
  printed: { gap: space[1] },
});
