import { EVENT_TYPE_INFO, type Countdown, type EventType } from "@i-events/core";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { easeOut, useReduceMotion } from "@/lib/motion";
import { motion, space, useTheme } from "@/theme";
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

/** The status pill, or once it is earned the confirmation in its place (the pill would repeat it). */
export function StatusRow({ children }: { children: ReactNode }) {
  return <View style={styles.status}>{children}</View>;
}

/**
 * The moments that matter, Confermato and Andato in scena, as on the website's public ticket: a round
 * seal in the event's deep ink (Grafite without a type) with a tick, the word and the date under it.
 * No stamp. `fresh` when it has just happened: the seal grows in (180 ms), then the tick appears (240).
 * With Reduce Motion it fades in (120).
 */
export function Confirmation({ label, date, type, fresh = false }: { label: string; date: string; type: EventType | null | undefined; fresh?: boolean }) {
  const { c, scheme } = useTheme();
  const reduce = useReduceMotion();
  const [seal] = useState(() => new Animated.Value(fresh ? 0 : 1));
  const [tick] = useState(() => new Animated.Value(fresh ? 0 : 1));
  const ink = type ? EVENT_TYPE_INFO[type].ink : null;
  const dark = scheme === "dark";
  const fill = ink ? (dark ? ink.darkFill : ink.deep) : c.textPrimary;
  const mark = dark ? "#121110" : "#FFFFFF";

  useEffect(() => {
    if (!fresh) return;
    const run = reduce
      ? Animated.parallel([
          Animated.timing(seal, { toValue: 1, duration: motion.fast, easing: easeOut, useNativeDriver: true }),
          Animated.timing(tick, { toValue: 1, duration: motion.fast, easing: easeOut, useNativeDriver: true }),
        ])
      : Animated.sequence([
          Animated.timing(seal, { toValue: 1, duration: motion.base, easing: easeOut, useNativeDriver: true }),
          Animated.timing(tick, { toValue: 1, duration: motion.moderate, easing: easeOut, useNativeDriver: true }),
        ]);
    run.start();
    return () => run.stop();
  }, [fresh, reduce, seal, tick]);

  const grow = (v: Animated.Value, from: number) => (reduce ? [] : [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }]);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={date ? `${label} il ${date.toLowerCase()}` : label}
      style={styles.confirmation}
    >
      <Animated.View style={[styles.seal, { backgroundColor: fill, opacity: seal, transform: grow(seal, 0.6) }]}>
        <Animated.View style={{ opacity: tick, transform: grow(tick, 0.7) }}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path d="M3.5 8.5l3 3 6-7" stroke={mark} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>
      <View style={styles.words}>
        <T variant="bodyStrong">{label}</T>
        {date !== "" && (
          <T variant="monoCaps" tone="secondary">
            {date}
          </T>
        )}
      </View>
    </View>
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
  // On narrow phones the confirmation goes under the pill instead of running off the card.
  status: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: space[3], minHeight: 24 },
  countdown: { flexDirection: "row", alignItems: "center", gap: space[2] },
  confirmation: { flexDirection: "row", alignItems: "center", gap: space[3] },
  seal: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  words: { gap: 2 },
  slot: { borderTopWidth: 2, borderRadius: 2, paddingTop: space[1], overflow: "hidden" },
  printed: { gap: space[1] },
});
