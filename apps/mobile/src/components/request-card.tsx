import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/theme";
import { Badge } from "./badge";
import { Card } from "./card";
import { Divider } from "./rows";
import { T } from "./text";

type Props = {
  badge?: ComponentProps<typeof Badge>;
  title: string;
  /** The facts line in mono: "14 NOV · MILANO · 350 OSPITI". */
  meta: string;
  note?: string;
  /** Under a hairline: who is involved and how far along it is. */
  footer?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
};

/** A request as a card: status, title, facts, and where it stands. */
export function RequestCard({ badge, title, meta, note, footer, onPress, accessibilityLabel }: Props) {
  return (
    <Card onPress={onPress} accessibilityLabel={accessibilityLabel ?? [badge?.label, title, meta, note].filter(Boolean).join(", ")}>
      {badge && <Badge {...badge} />}
      <View style={styles.texts}>
        <T variant="bodyStrong" numberOfLines={2}>
          {title}
        </T>
        <T variant="mono" tone="secondary">
          {meta}
        </T>
        {note && (
          <T variant="caption" tone="secondary">
            {note}
          </T>
        )}
      </View>
      {footer && (
        <>
          <Divider />
          {footer}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  texts: { gap: space[1] },
});
