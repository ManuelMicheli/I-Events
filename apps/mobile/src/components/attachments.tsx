import Ionicons from "@expo/vector-icons/Ionicons";
import { formatBytes } from "@i-events/core";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { attachmentUrl, fetchAttachments } from "@/lib/requests";
import { useQuery } from "@/lib/use-query";
import { control, radius, space, useTheme } from "@/theme";
import { Card } from "./card";
import { Divider } from "./rows";
import { Section } from "./screen";
import { InlineError } from "./text-field";
import { Perforation } from "./perforation";
import { T } from "./text";

/** The files of a request or of a proposal; a tap opens one. Hidden when there are none. */
export function Attachments({ title, requestId, proposalId }: { title: string; requestId: string; proposalId: string | null }) {
  const { c } = useTheme();
  const q = useQuery(`attachments:${requestId}:${proposalId ?? "request"}`, () => fetchAttachments(requestId, proposalId));
  const [opening, setOpening] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const files = q.data ?? [];
  if (files.length === 0) return null;

  const open = async (path: string) => {
    setFailed(false);
    setOpening(path);
    try {
      await WebBrowser.openBrowserAsync(await attachmentUrl(path));
    } catch {
      setFailed(true);
    } finally {
      setOpening(null);
    }
  };

  return (
    <Section
      title={title}
      aside={
        <T variant="mono" tone="secondary">
          {files.length}
        </T>
      }
    >
      <Card style={styles.card}>
        {files.map((f, i) => (
          <View key={f.id}>
            {i > 0 && <Divider />}
            <Pressable
              onPress={() => open(f.storage_path)}
              accessibilityRole="link"
              accessibilityLabel={`Apri ${f.file_name}`}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSubtle }]}
            >
              <View style={[styles.icon, { backgroundColor: c.bgSubtle }]}>
                <Ionicons name="document-outline" size={20} color={c.textPrimary} />
              </View>
              <T variant="callout" numberOfLines={2} style={styles.flex}>
                {f.file_name}
              </T>
              {opening === f.storage_path ? (
                <Perforation size="s" color={c.textSecondary} label="Apertura del file" />
              ) : (
                <T variant="mono" tone="secondary">
                  {f.size_bytes ? formatBytes(f.size_bytes) : ""}
                </T>
              )}
            </Pressable>
          </View>
        ))}
      </Card>
      {failed && <InlineError message="Non riusciamo ad aprire il file. Controlla la connessione e riprova." />}
    </Section>
  );
}

const styles = StyleSheet.create({
  card: { gap: 0, paddingVertical: space[1] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: control.l,
    paddingVertical: space[2],
    marginHorizontal: -space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
});
