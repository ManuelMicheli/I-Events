import { appRouteForLink } from "@i-events/core";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LiveDot } from "@/components/badge";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Divider } from "@/components/rows";
import { Screen } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { fetchNotifications, type AppNotification } from "@/lib/data";
import { env } from "@/lib/env";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { refreshUnread } from "@/lib/unread";
import { useQuery } from "@/lib/use-query";
import { control, space, useTheme } from "@/theme";

const timeFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

export default function NotificationsScreen() {
  const { session, orgs, activeOrg, setActiveOrg } = useSession();
  const q = useQuery(`notifications:${session?.user.id}`, fetchNotifications);
  const [marking, setMarking] = useState(false);
  const unread = (q.data ?? []).filter((n) => !n.read_at).length;

  /** Marks it read, switches to the organization it belongs to and opens what it is about. */
  const open = async (n: AppNotification) => {
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      refreshUnread();
      q.refresh();
    }
    if (n.org_id !== activeOrg?.id && orgs.some((o) => o.id === n.org_id)) setActiveOrg(n.org_id);
    const route = appRouteForLink(n.link);
    if (route) router.push(route as never);
    else if (n.link?.startsWith("/")) WebBrowser.openBrowserAsync(`${env.siteUrl}${n.link}`);
  };

  const markAll = async () => {
    setMarking(true);
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    await Promise.all([q.refresh(), refreshUnread()]);
    setMarking(false);
  };

  return (
    <Screen
      title="Notifiche"
      header={
        unread > 0 ? (
          <Button variant="secondary" label="Segna tutte come lette" icon="checkmark-done" loading={marking} onPress={markAll} />
        ) : undefined
      }
      refreshing={q.refreshing}
      onRefresh={q.refresh}
    >
      {q.loading ? (
        <CardSkeletons count={2} />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refresh} />
      ) : q.data && q.data.length === 0 ? (
        <EmptyState icon="notifications-outline" title="Nessuna notifica" body="Qui trovi nuove richieste, proposte, messaggi e decisioni." />
      ) : (
        <Card style={styles.card}>
          {q.data?.map((n, i) => (
            <View key={n.id}>
              {i > 0 && <Divider />}
              <NotificationRow n={n} onPress={() => open(n)} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function NotificationRow({ n, onPress }: { n: AppNotification; onPress: () => void }) {
  const { c } = useTheme();
  const isNew = !n.read_at;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[isNew ? "Da leggere" : null, n.title, n.body, timeFmt.format(new Date(n.created_at))].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <View style={styles.dot}>{isNew && <LiveDot />}</View>
      <View style={styles.texts}>
        <T variant={isNew ? "calloutStrong" : "callout"}>{n.title}</T>
        {n.body && (
          <T variant="callout" tone="secondary" numberOfLines={2}>
            {n.body}
          </T>
        )}
        <T variant="caption" tone="secondary">
          {[timeFmt.format(new Date(n.created_at)), n.org?.name].filter(Boolean).join(" · ")}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space[1], paddingHorizontal: 0, gap: 0 },
  row: { flexDirection: "row", gap: space[3], paddingVertical: space[3], paddingHorizontal: space[4], minHeight: control.l },
  dot: { width: 8, paddingTop: space[2] },
  texts: { flex: 1, gap: space[1] },
});
