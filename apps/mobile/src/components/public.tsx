import {
  EVENT_TYPE_INFO,
  formatTicketNumber,
  hhmm,
  passCode,
  peopleLabel,
  placesLabel,
  todayInItaly,
  type EventType,
} from "@i-events/core";
import { router } from "expo-router";
import QRCode from "qrcode";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Animated,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { easeOut, useReduceMotion } from "@/lib/motion";
import {
  dayLabel,
  eventLine,
  priceLabel,
  type PublicEvent,
  type RegistrationTicket,
} from "@/lib/public-events";
import { stampDay } from "@/lib/format";
import { useSession } from "@/lib/session";
import { motion, radius, space, useTheme } from "@/theme";
import { LiveDot } from "./badge";
import { Button } from "./button";
import { Card, TicketDivider } from "./card";
import { EventCover, TypeChip } from "./event-type";
import { LogoSymbol } from "./logo";
import { T } from "./text";
import { Confirmation } from "./ticket";

/**
 * The public area in the app, as on the website (Carta items 17, 18, 23): event cards and rows with
 * the covers of the six types, and the ticket with the confirmation seal and the QR.
 */

/** The event's cover, or a quiet paper one while the agency has not said what kind of event it is. */
export function PublicCover({
  type,
  style,
}: {
  type: EventType | null;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  if (type) return <EventCover type={type} style={style} />;
  return (
    <View
      style={[{ backgroundColor: c.bgSubtle }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** A pill over the cover: "In corso" with the live dot, "Esaurito", "Ultimi 12 posti". */
function CoverBadge({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={[styles.coverBadge, { backgroundColor: c.bgSurface }]}>{children}</View>;
}

/** What the cover says about places and time: on now, sold out, few left. */
function coverNote(e: PublicEvent, price: string): { live: boolean; label: string } | null {
  if (e.status === "live") return { live: true, label: "In corso" };
  if (price === "Posti esauriti") return { live: false, label: "Esaurito" };
  const few = price === "Gratis" && placesLabel(e.capacity, e.registered);
  return few ? { live: false, label: few } : null;
}

/**
 * Public event card (Carta item 17): cover 16:10, title, when and where, then the perforation with
 * the notches and the price row with the type chip. The whole card opens the event.
 */
export function PublicEventCard({ event }: { event: PublicEvent }) {
  const price = priceLabel(event, todayInItaly());
  const note = coverNote(event, price);
  const muted = price === "Posti esauriti" || price === "Andato in scena";
  const line = eventLine(event);
  return (
    <Card
      onPress={() => router.push({ pathname: "/pubblico/evento/[id]", params: { id: event.id } })}
      accessibilityLabel={[event.title, note?.label, line, price.toLowerCase()]
        .filter(Boolean)
        .join(", ")}
      style={styles.eventCard}
    >
      <View style={styles.coverWrap}>
        <PublicCover type={event.event_type} style={styles.cardCover} />
        {note && (
          <CoverBadge>
            {note.live && <LiveDot />}
            <T variant="label">{note.label}</T>
          </CoverBadge>
        )}
      </View>
      <View style={styles.cardBody}>
        <T variant="title3">{event.title}</T>
        <T variant="callout" tone="secondary">
          {line}
        </T>
      </View>
      <View style={styles.cardCut}>
        <TicketDivider />
      </View>
      <View style={styles.priceRow}>
        <T variant="mono" tone={muted ? "secondary" : "primary"}>
          {price}
        </T>
        <TypeChip type={event.event_type} />
      </View>
    </Card>
  );
}

/** The compact row (Carta item 17): a 56 cover, the title, the line under it and one more detail. */
export function PublicEventRow({
  type,
  title,
  line,
  extra,
  live = false,
  onPress,
}: {
  type: EventType | null;
  title: string;
  line: string;
  extra?: string;
  live?: boolean;
  onPress: () => void;
}) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={[title, live && "in corso", line, extra].filter(Boolean).join(", ")}
      style={styles.row}
    >
      <PublicCover type={type} style={styles.rowCover} />
      <View style={styles.rowTexts}>
        <T variant="bodyStrong">{title}</T>
        {live && (
          <View style={styles.live}>
            <LiveDot />
            <T variant="callout">In corso</T>
          </View>
        )}
        <T variant="callout" tone="secondary">
          {line}
        </T>
        {extra && <T variant="mono">{extra}</T>}
      </View>
    </Card>
  );
}

/** The way out of the public area, top right: back to sign in, or back to the app when signed in. */
export function PublicExit() {
  const { status } = useSession();
  const signedIn = status === "signed-in";
  return (
    <Button
      variant="secondary"
      size="small"
      icon={signedIn ? "close" : undefined}
      label={signedIn ? "Chiudi" : "Accedi"}
      accessibilityHint={signedIn ? "Torna alla tua organizzazione" : undefined}
      onPress={() => router.dismissTo(signedIn ? "/" : "/accedi")}
    />
  );
}

/**
 * The ticket's QR (it holds the ticket's link, as on the website): black on white whatever the theme.
 * Each module is a whole number of points, so the edges stay sharp; `size` is the size aimed for.
 */
export function QrCode({ value, size }: { value: string; size: number }) {
  const { d, count } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    let path = "";
    for (let y = 0; y < modules.size; y++) {
      let x = 0;
      while (x < modules.size) {
        if (!modules.get(x, y)) {
          x++;
          continue;
        }
        const start = x;
        while (x < modules.size && modules.get(x, y)) x++;
        path += `M${start} ${y}h${x - start}v1h${start - x}z`;
      }
    }
    return { d: path, count: modules.size };
  }, [value]);
  const side = Math.max(3, Math.round(size / count)) * count;
  return (
    <Svg width={side} height={side} viewBox={`0 0 ${count} ${count}`}>
      <Path d={d} fill="#111113" />
    </Svg>
  );
}

/**
 * The public ticket (Carta item 18, M3), as on the website: on top the event's cover as a band with
 * the brand, then the title with the confirmation seal, the facts and the name; below the
 * perforation the QR with the number and the short code. Cancelled: no QR. Over: the QR is covered.
 * Fresh, right after registering, it slides out (320 ms) and the seal draws its tick.
 */
export function PublicTicket({
  ticket,
  token,
  link,
  fresh,
  over,
}: {
  ticket: RegistrationTicket;
  token: string;
  link: string;
  fresh: boolean;
  over: boolean;
}) {
  const { c } = useTheme();
  const reduce = useReduceMotion();
  const [enter] = useState(() => new Animated.Value(fresh ? 0 : 1));
  const cancelled = ticket.status === "cancelled";
  const code = passCode(token);
  // On the smallest phones the place gets the whole row, so a long venue does not run to three lines.
  const narrow = useWindowDimensions().width < 360;

  useEffect(() => {
    if (!fresh) return;
    const run = Animated.timing(enter, {
      toValue: 1,
      duration: reduce ? motion.fast : motion.slow,
      easing: easeOut,
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [fresh, reduce, enter]);

  const motionStyle = reduce
    ? { opacity: enter }
    : {
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
        ],
      };
  return (
    <Animated.View
      accessible={false}
      accessibilityLabel={`Biglietto per ${ticket.title}, a nome di ${ticket.name}`}
      style={[
        styles.ticket,
        { backgroundColor: c.bgSurface, borderColor: c.borderDefault },
        motionStyle,
      ]}
    >
      <View
        style={[
          styles.band,
          {
            backgroundColor: ticket.event_type
              ? EVENT_TYPE_INFO[ticket.event_type].ink.deep
              : c.bgSubtle,
          },
        ]}
      >
        <PublicCover type={ticket.event_type} style={StyleSheet.absoluteFill} />
        <View style={styles.brand}>
          <View style={styles.brandName}>
            <LogoSymbol width={28} color={ticket.event_type ? "#FFFFFF" : undefined} />
            <T variant="monoCaps" style={ticket.event_type ? styles.onCover : undefined}>
              I-EVENTS
            </T>
          </View>
          <T variant="monoCaps" style={ticket.event_type ? styles.onCover : undefined}>
            BIGLIETTO
          </T>
        </View>
      </View>
      <View style={styles.ticketBody}>
        <View style={styles.ticketTitle}>
          <T variant="title2" accessibilityRole="header">
            {ticket.title}
          </T>
          {!cancelled && (
            <Confirmation
              label="Iscrizione confermata"
              date={stampDay(ticket.registered_at)}
              type={ticket.event_type}
              fresh={fresh}
            />
          )}
        </View>
        <View style={styles.facts}>
          <Fact label="Data" value={dayLabel(ticket.start_date, ticket.end_date)} />
          <Fact
            label="Ora"
            value={ticket.starts_at ? hhmm(ticket.starts_at) : "Da definire"}
            mono={!!ticket.starts_at}
          />
          <Fact label="Luogo" value={ticket.venue || ticket.city || "Da definire"} wide={narrow} />
          <Fact label="Ingresso" value={peopleLabel(ticket.guests)} />
          <Fact label="Nome" value={ticket.name} wide />
        </View>
      </View>
      <View style={styles.cut}>
        <TicketDivider />
      </View>
      <View style={styles.stub}>
        {cancelled ? (
          <View style={[styles.cancelled, { borderColor: c.borderStrong }]}>
            <T variant="bodyStrong">Evento annullato</T>
          </View>
        ) : (
          <View>
            <View
              style={[styles.qr, { borderColor: c.borderDefault }]}
              accessible
              accessibilityRole="image"
              accessibilityLabel="Codice QR del biglietto"
            >
              <QrCode value={link} size={136} />
            </View>
            {over && (
              <View style={[styles.qrCover, { backgroundColor: `${c.bgSurface}EB` }]}>
                <T variant="calloutStrong" style={styles.center}>
                  Evento concluso
                </T>
              </View>
            )}
          </View>
        )}
        <T
          variant="mono"
          tone="secondary"
          accessibilityLabel={`biglietto ${formatTicketNumber(ticket.number)}, codice ${code.split("").join(" ")}`}
        >
          {formatTicketNumber(ticket.number)} · {code}
        </T>
      </View>
    </Animated.View>
  );
}

function Fact({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <View
      style={[styles.fact, wide && styles.factWide]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <T variant="monoCaps" tone="secondary">
        {label.toUpperCase()}
      </T>
      <T variant={mono ? "ticket" : "body"}>{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  eventCard: { padding: 0, gap: 0 },
  coverWrap: { padding: space[1] },
  cardCover: { width: "100%", height: undefined, aspectRatio: 16 / 10, borderRadius: radius.md },
  coverBadge: {
    position: "absolute",
    top: space[4],
    left: space[4],
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.full,
  },
  cardBody: {
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[4],
    gap: space[1],
  },
  cardCut: { paddingHorizontal: space[4] },
  priceRow: {
    minHeight: 52,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  row: { flexDirection: "row", alignItems: "center", gap: space[4], padding: space[3] },
  rowCover: { width: 56, height: 56, borderRadius: radius.sm },
  rowTexts: { flex: 1, gap: 2 },
  live: { flexDirection: "row", alignItems: "center", gap: space[2] },
  ticket: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  band: { height: 96, overflow: "hidden" },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
    paddingHorizontal: space[6],
    paddingTop: space[5],
  },
  brandName: { flexDirection: "row", alignItems: "center", gap: space[2] },
  onCover: { color: "#FFFFFF" },
  ticketBody: { padding: space[6], gap: space[5] },
  ticketTitle: { gap: space[3] },
  facts: { flexDirection: "row", flexWrap: "wrap", rowGap: space[4] },
  fact: { width: "50%", paddingRight: space[3], gap: 2 },
  factWide: { width: "100%" },
  cut: { paddingHorizontal: space[4] },
  stub: {
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[6],
    paddingTop: space[6],
    paddingBottom: space[6],
  },
  qr: { padding: space[3], borderRadius: radius.md, borderWidth: 1, backgroundColor: "#FFFFFF" },
  qrCover: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    padding: space[3],
  },
  cancelled: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  center: { textAlign: "center" },
});
