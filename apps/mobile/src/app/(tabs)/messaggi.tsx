import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/card";
import { OrgSwitcher } from "@/components/org-switcher";
import { Divider } from "@/components/rows";
import { Screen } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { TopActions } from "@/components/top-actions";
import { ago } from "@/lib/format";
import { fetchConversations, type Conversation } from "@/lib/messages";
import { useActiveOrg } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { control, radius, space, useTheme } from "@/theme";

/** Every conversation of the organization, one per request and agency, the most recent first. */
export default function MessagesScreen() {
  const org = useActiveOrg();
  const side = org.type === "supplier" ? null : org.type;
  const q = useQuery(side && `conversations:${org.id}`, () => fetchConversations(org.id, side!));
  if (!side) return null;
  return (
    <Screen title="Messaggi" actions={<TopActions />} header={<OrgSwitcher />} refreshing={q.refreshing} onRefresh={q.refresh}>
      {q.loading ? (
        <CardSkeletons />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Nessuna conversazione"
          body={
            side === "agency"
              ? "Quando un'azienda ti manda una richiesta, qui puoi scriverle e farle domande."
              : "Quando mandi una richiesta alle agenzie, qui parli con ognuna di loro."
          }
        />
      ) : (
        <Card style={styles.list}>
          {q.data.map((c, i) => (
            <View key={c.proposalId}>
              {i > 0 && <Divider />}
              <ConversationRow c={c} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function ConversationRow({ c: conv }: { c: Conversation }) {
  const { c } = useTheme();
  const preview = conv.last ? `${conv.mine ? "Tu: " : ""}${conv.last.internal ? "Nota interna: " : ""}${conv.last.body}` : "Ancora nessun messaggio";
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/conversazione/[id]", params: { id: conv.proposalId } })}
      accessibilityRole="button"
      accessibilityLabel={`${conv.with}, ${conv.requestTitle}. ${preview}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <Avatar name={conv.with} />
      <View style={styles.texts}>
        <View style={styles.top}>
          <T variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {conv.with}
          </T>
          {conv.last && (
            <T variant="caption" tone="secondary">
              {ago(conv.at)}
            </T>
          )}
        </View>
        <T variant="caption" tone="secondary" numberOfLines={1}>
          {conv.requestTitle}
        </T>
        <T variant="callout" tone={conv.last ? "primary" : "secondary"} numberOfLines={2}>
          {preview}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0, paddingVertical: space[1] },
  row: {
    flexDirection: "row",
    gap: space[3],
    alignItems: "flex-start",
    minHeight: control.l,
    paddingVertical: space[3],
    marginHorizontal: -space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  texts: { flex: 1, gap: space[1] },
  top: { flexDirection: "row", alignItems: "center", gap: space[2] },
  flex: { flex: 1 },
});
