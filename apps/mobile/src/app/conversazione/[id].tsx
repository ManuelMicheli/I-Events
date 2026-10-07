import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toggle } from "@/components/controls";
import { MessageIcon, SendIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { InlineError } from "@/components/text-field";
import { errorMessage } from "@/lib/errors";
import { fetchThread, sendMessage, type Thread } from "@/lib/messages";
import { useActiveOrg, useSession } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { control, fonts, radius, space, type, useTheme } from "@/theme";

const timeFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

/** How often an open conversation looks for new messages. */
const POLL_MS = 15_000;

/** The conversation between the company and one agency about one request. */
export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = useActiveOrg();
  const q = useQuery(`thread:${org.id}:${id}`, () => fetchThread(id, org.id));
  const refresh = q.refresh;

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => void refresh(), POLL_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  if (q.loading)
    return (
      <Screen>
        <CardSkeletons count={2} />
      </Screen>
    );
  if (q.error && !q.data)
    return (
      <Screen>
        <ErrorState error={q.error} onRetry={q.refresh} />
      </Screen>
    );
  if (!q.data)
    return (
      <Screen>
        <EmptyState icon="search-outline" title="Conversazione non trovata" body="Potrebbe appartenere a un'altra organizzazione." />
      </Screen>
    );
  return <Chat thread={q.data} orgId={org.id} orgType={org.type} proposalId={id} onSent={q.refresh} />;
}

function Chat({
  thread,
  orgId,
  orgType,
  proposalId,
  onSent,
}: {
  thread: Thread;
  orgId: string;
  orgType: string;
  proposalId: string;
  onSent: () => Promise<void>;
}) {
  const { c } = useTheme();
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(0);
  const [writing, setWriting] = useState(false);
  const messages = [...thread.messages].reverse();

  const send = async () => {
    const text = body.trim();
    if (!text || !session) return;
    setSending(true);
    setError(undefined);
    try {
      await sendMessage({
        proposalId,
        orgId,
        userId: session.user.id,
        body: text,
        internal: thread.isAgency && internal,
      });
      setBody("");
      setSent((n) => n + 1);
      await onSent();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const openRequest = () =>
    thread.isAgency
      ? router.push({ pathname: "/proposta/[id]", params: { id: proposalId } })
      : router.push({ pathname: "/richiesta-azienda/[id]", params: { id: thread.requestId } });

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: c.bgApp }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <Stack.Screen options={{ title: thread.with }} />
      <Pressable
        onPress={openRequest}
        accessibilityRole="link"
        accessibilityLabel={`Richiesta: ${thread.requestTitle}. Apri`}
        style={({ pressed }) => [styles.context, { borderBottomColor: c.borderDefault }, pressed && { backgroundColor: c.bgSubtle }]}
      >
        <Ionicons name="file-tray-outline" size={20} color={c.textSecondary} />
        <T variant="callout" tone="secondary" numberOfLines={1} style={styles.flex}>
          {thread.requestTitle}
        </T>
        <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
      </Pressable>
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageIcon color={c.textSecondary} writing={writing} size={28} />
            <T variant="callout" tone="secondary" style={styles.center}>
              {thread.isAgency
                ? "Scrivi all'azienda per chiarire un dettaglio della richiesta."
                : "Scrivi all'agenzia per chiedere un chiarimento sul preventivo."}
            </T>
          </View>
        }
        renderItem={({ item: m }) => {
          const mine = m.author_org_id === orgId;
          return (
            <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { backgroundColor: c.textPrimary }
                    : {
                        backgroundColor: c.bgSurface,
                        borderColor: c.borderDefault,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                  m.internal && {
                    backgroundColor: c.warningBg,
                    borderColor: c.warning,
                    borderWidth: 1,
                    borderStyle: "dashed",
                  },
                ]}
              >
                <T variant="caption" tone="secondary" style={mine && !m.internal ? { color: c.bgSubtle } : undefined}>
                  {[!mine && m.author?.full_name, m.internal && "Nota interna", timeFmt.format(new Date(m.created_at))].filter(Boolean).join(" · ")}
                </T>
                <T variant="body" style={mine && !m.internal ? { color: c.bgApp } : undefined}>
                  {m.body}
                </T>
              </View>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { borderTopColor: c.borderDefault, paddingBottom: Math.max(insets.bottom, space[3]) }]}>
        {error && <InlineError message={error} />}
        {orgType === "agency" && (
          <Toggle tone="secondary" label="Nota interna, l'azienda non la vede" value={internal} onChange={setInternal} />
        )}
        <View style={styles.inputRow}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Scrivi un messaggio"
            placeholderTextColor={c.textSecondary}
            selectionColor={c.accentFill}
            multiline
            maxLength={10000}
            accessibilityLabel="Messaggio"
            onFocus={() => setWriting(true)}
            onBlur={() => setWriting(false)}
            maxFontSizeMultiplier={2}
            style={[
              styles.input,
              {
                color: c.textPrimary,
                backgroundColor: c.bgSurface,
                borderColor: c.borderControl,
                fontFamily: fonts.sans["400"],
              },
            ]}
          />
          <Pressable
            onPress={send}
            disabled={sending || body.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Invia"
            accessibilityState={{ disabled: sending || body.trim().length === 0, busy: sending }}
            style={({ pressed }) => [
              styles.send,
              {
                backgroundColor: body.trim().length === 0 ? c.bgSubtle : pressed ? c.accentPressed : c.accentFill,
              },
            ]}
          >
            {({ pressed }) => <SendIcon color={body.trim().length === 0 ? c.textDisabled : c.onAccent} sent={sent} lean={pressed} size={24} />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    minHeight: control.touch,
    paddingHorizontal: space[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  messages: { padding: space[4], gap: space[3], flexGrow: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: space[3], padding: space[6], transform: [{ scaleY: -1 }] },
  bubbleRow: { flexDirection: "row" },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "85%",
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    gap: space[1],
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    gap: space[2],
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: space[2] },
  input: {
    flex: 1,
    minHeight: control.l,
    maxHeight: 160,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[3],
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
  },
  send: {
    width: control.l,
    height: control.l,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
