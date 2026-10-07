import type { Countdown, EventType } from "@i-events/core";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme";
import { Badge } from "./badge";
import { Card, TicketDivider } from "./card";
import { EventCover } from "./event-type";
import { T } from "./text";
import { TicketStub } from "./ticket";

type Props = {
  title: string;
  /** Who is on the other side: the client for agencies, the agency for companies and suppliers. */
  counterpart: string;
  dates: string;
  place: string | null;
  badge: ComponentProps<typeof Badge>;
  /** One line of progress, e.g. "3 su 5 fornitori confermati". */
  detail?: string;
  /** The event's type: its cover goes next to the title. */
  type?: EventType | null;
  /** Number and countdown: the card is printed as a ticket, with the stub under the perforation. */
  ticket?: { number: string; countdown: Countdown | null };
  onPress: () => void;
};

/**
 * Event card with the ticket notch: status, cover, title and who. As a ticket, date and place stay
 * above the perforation and the stub below carries number and countdown; otherwise they go under the cut.
 */
export function EventCard({ title, counterpart, dates, place, badge, detail, type, ticket, onPress }: Props) {
  // "IN SCENA" with the live dot on the stub already says it is on now.
  const showBadge = !ticket?.countdown?.live;
  const facts = (
    <View style={styles.facts}>
      <T variant="mono" tone="secondary">
        {dates.toUpperCase()}
      </T>
      {place && (
        <T variant="callout" tone="secondary" numberOfLines={1}>
          {place}
        </T>
      )}
      {detail && <T variant="calloutStrong">{detail}</T>}
    </View>
  );
  const label = [
    title,
    counterpart,
    showBadge && badge.label,
    ticket?.countdown?.label.toLowerCase(),
    dates,
    place,
    detail,
    ticket && `biglietto ${ticket.number}`,
  ];
  return (
    <Card onPress={onPress} accessibilityLabel={label.filter(Boolean).join(", ")}>
      {showBadge && <Badge {...badge} />}
      <View style={styles.head}>
        {type && <EventCover type={type} />}
        <View style={styles.titles}>
          <T variant="title3" numberOfLines={2}>
            {title}
          </T>
          <T variant="callout" tone="secondary" numberOfLines={1}>
            {counterpart}
          </T>
        </View>
      </View>
      {ticket && facts}
      <TicketDivider />
      {ticket ? <TicketStub number={ticket.number} countdown={ticket.countdown} /> : facts}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space[3] },
  titles: { flex: 1, gap: space[1] },
  facts: { gap: space[1] },
});
