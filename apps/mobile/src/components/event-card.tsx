import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme";
import { Badge } from "./badge";
import { Card, TicketDivider } from "./card";
import { T } from "./text";

type Props = {
  title: string;
  /** Who is on the other side: the client for agencies, the agency for companies and suppliers. */
  counterpart: string;
  dates: string;
  place: string | null;
  badge: ComponentProps<typeof Badge>;
  /** One line of progress, e.g. "3 su 5 fornitori confermati". */
  detail?: string;
  onPress: () => void;
};

/** Event card with the ticket notch: status, title and who, then date and place under the cut. */
export function EventCard({ title, counterpart, dates, place, badge, detail, onPress }: Props) {
  return (
    <Card onPress={onPress} accessibilityLabel={[title, counterpart, badge.label, dates, place, detail].filter(Boolean).join(", ")}>
      <Badge {...badge} />
      <View style={styles.head}>
        <T variant="title3" numberOfLines={2}>
          {title}
        </T>
        <T variant="callout" tone="secondary" numberOfLines={1}>
          {counterpart}
        </T>
      </View>
      <TicketDivider />
      <View style={styles.foot}>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[1] },
  foot: { gap: space[1] },
});
