import Ionicons from "@expo/vector-icons/Ionicons";
import { formatTicketNumber, proposalTotal, REQUEST_STATUS_LABEL } from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Attachments } from "@/components/attachments";
import { Avatar } from "@/components/avatar";
import { Badge, LiveDot } from "@/components/badge";
import { Brief } from "@/components/brief";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Notice } from "@/components/notice";
import { ProposalLines, serviceName } from "@/components/proposal-lines";
import { Divider } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { Confirmation, PrintedTicket, StatusRow, TicketTag } from "@/components/ticket";
import { InlineError, TextField } from "@/components/text-field";
import { errorMessage } from "@/lib/errors";
import { ago, euro, plural, requestMeta, stampDay } from "@/lib/format";
import { fetchClientRequest, PROPOSAL_PRICED, type ClientProposal } from "@/lib/requests";
import { useActiveOrg } from "@/lib/session";
import { clientProposalLook } from "@/lib/status-look";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { control, radius, space, useTheme } from "@/theme";

type Tab = "overview" | "quotes" | "brief";

/** One of the company's requests: where each agency stands, the quotes side by side, and the brief. */
export default function ClientRequestScreen() {
  const { id, momento } = useLocalSearchParams<{ id: string; momento?: "inviata" | "confermato" }>();
  // A signature moment plays on the screen opened by the action that caused it, when it first shows.
  const [moment] = useState(momento);
  const org = useActiveOrg();
  const q = useQuery(`client-request:${org.id}:${id}`, () => fetchClientRequest(id, org.id));
  const [tab, setTab] = useState<Tab>("overview");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string>();

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
        <EmptyState
          icon="search-outline"
          title="Richiesta non trovata"
          body="Potrebbe essere stata eliminata, oppure appartiene a un'altra organizzazione."
        />
      </Screen>
    );

  const { request, proposals, events } = q.data;
  const r = request.row;
  const open = request.status === "sent";
  const priced = proposals.filter((p) => PROPOSAL_PRICED.includes(p.status) && p.version > 0);
  const fresh = priced.filter((p) => p.status === "submitted").length;
  const accepted = request.status === "awarded" ? proposals.find((p) => p.status === "accepted") : undefined;
  const badge =
    request.status === "awarded"
      ? ({ label: "Assegnata", tone: "success", icon: "checkmark" } as const)
      : request.status === "cancelled"
        ? ({ label: REQUEST_STATUS_LABEL.cancelled, tone: "outline" } as const)
        : fresh > 0
          ? ({ label: "Preventivi in arrivo", tone: "accent", live: true } as const)
          : ({ label: "In attesa dei preventivi", tone: "neutral", icon: "time-outline" } as const);

  const cancel = () =>
    Alert.alert("Annullare la richiesta?", "Le agenzie vengono avvisate e non potranno più mandarti preventivi.", [
      { text: "No", style: "cancel" },
      {
        text: "Annulla la richiesta",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          setError(undefined);
          const { error: e } = await supabase.rpc("cancel_request", { p_request: request.id });
          setCancelling(false);
          if (e) setError(errorMessage(e));
          else q.refresh();
        },
      },
    ]);

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Stack.Screen options={{ title: "Richiesta" }} />
      <View style={styles.head}>
        <StatusRow>
          <Badge {...badge} />
          {accepted && (
            <Confirmation label="Confermato" date={stampDay(accepted.decided_at)} type={request.draft.eventType} fresh={moment === "confermato"} />
          )}
        </StatusRow>
        <T variant="title2" accessibilityRole="header">
          {r.title}
        </T>
        <TicketTag number={formatTicketNumber(request.number)} type={request.draft.eventType} />
        <T variant="mono" tone="secondary">
          {requestMeta(r)}
        </T>
        <T variant="callout" tone="secondary">
          {[request.submittedAt && `Inviata ${ago(request.submittedAt)}`, plural(proposals.length, "agenzia", "agenzie")].filter(Boolean).join(" · ")}
        </T>
      </View>

      {moment === "inviata" && open && (
        <PrintedTicket
          number={formatTicketNumber(request.number)}
          title="Richiesta inviata"
          body={`${proposals.length === 1 ? "È arrivata all'agenzia" : `È arrivata alle ${proposals.length} agenzie`}. Ti avvisiamo quando arrivano le proposte.`}
        />
      )}
      {request.status === "cancelled" && <Notice>Hai annullato questa richiesta.</Notice>}
      {events.length > 0 && (
        <Notice
          tone="success"
          action={events.map((e) => (
            <Button
              key={e.id}
              variant="secondary"
              icon="calendar-outline"
              label={events.length === 1 ? "Apri l'evento" : e.title}
              onPress={() => router.push({ pathname: "/evento/[id]", params: { id: e.id } })}
            />
          ))}
        >
          {events.length === 1 ? "La richiesta è diventata un evento confermato." : `La richiesta è diventata ${events.length} eventi confermati.`}
        </Notice>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        accessibilityLabel="Sezione"
        options={[
          { value: "overview", label: "Panoramica" },
          {
            value: "quotes",
            label: priced.length > 0 ? `Preventivi ${priced.length}` : "Preventivi",
          },
          { value: "brief", label: "Brief" },
        ]}
      />

      {tab === "overview" && (
        <>
          <Section title="Stato per agenzia">
            <Card style={styles.list}>
              {proposals.map((p, i) => (
                <View key={p.id}>
                  {i > 0 && <Divider />}
                  <AgencyRow p={p} />
                </View>
              ))}
            </Card>
          </Section>
          {priced.length > 0 && <Button block label="Confronta i preventivi" onPress={() => setTab("quotes")} />}
          {open && <Button variant="tertiary" icon="close-circle-outline" label="Annulla la richiesta" loading={cancelling} onPress={cancel} />}
          {error && <InlineError message={error} />}
        </>
      )}

      {tab === "quotes" &&
        (priced.length === 0 ? (
          <EmptyState
            icon="hourglass-outline"
            title="Preventivi in arrivo"
            body="Le agenzie stanno preparando le proposte: le trovi qui appena arrivano, con una notifica."
          />
        ) : (
          <Quotes quotes={priced} open={open} onChange={q.refresh} />
        ))}

      {tab === "brief" && (
        <>
          <Brief request={request} showClient={false} />
          <Attachments title="I tuoi allegati" requestId={request.id} proposalId={null} />
        </>
      )}
    </Screen>
  );
}

/** One agency: who, the total once quoted, where it stands; a tap opens the conversation. */
function AgencyRow({ p }: { p: ClientProposal }) {
  const { c } = useTheme();
  const look = clientProposalLook(p.status);
  const total = PROPOSAL_PRICED.includes(p.status) && p.total !== null ? p.total : null;
  const name = p.agency.name;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/conversazione/[id]", params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={[name, total !== null && euro(total), look.label, "Apri i messaggi"].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.agency, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <View style={styles.dotSlot}>{p.status === "submitted" && <LiveDot />}</View>
      <Avatar name={name} />
      <View style={styles.flex}>
        <T variant="bodyStrong" numberOfLines={2}>
          {name}
        </T>
        {total !== null && <T variant="mono">{euro(total)}</T>}
        <T variant="caption" tone="secondary">
          {[look.label, p.submitted_at && PROPOSAL_PRICED.includes(p.status) && ago(p.submitted_at)].filter(Boolean).join(" · ")}
        </T>
      </View>
      <Ionicons name="chatbubble-outline" size={20} color={c.textSecondary} />
    </Pressable>
  );
}

/** The quotes one per card, side by side with a swipe, then the comparison line by line. */
function Quotes({ quotes, open, onChange }: { quotes: ClientProposal[]; open: boolean; onChange: () => void }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - space[4] * 2 - (quotes.length > 1 ? space[6] : 0), 480);
  const [page, setPage] = useState(0);
  const [lineByLine, setLineByLine] = useState(false);
  const [revising, setRevising] = useState<ClientProposal | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const live = quotes.filter((p) => p.status !== "rejected" && p.total !== null);
  const lowest = live.length > 1 ? Math.min(...live.map((p) => p.total as number)) : null;
  const complete = live.length > 1 ? Math.max(...live.map((p) => new Set(p.lines.map((l) => l.category)).size)) : null;

  const accept = (p: ClientProposal) =>
    Alert.alert(`Accetti il preventivo di ${p.agency.name}?`, "Le altre agenzie riceveranno l'esito. La richiesta diventa un evento confermato.", [
      { text: "Annulla", style: "cancel" },
      {
        text: `Accetta ${euro(p.total)}`,
        onPress: async () => {
          setBusy(p.id);
          setError(undefined);
          const { data, error: e } = await supabase.rpc("accept_proposal", { p_proposal: p.id });
          setBusy(null);
          if (e) return setError(errorMessage(e));
          // Back to the top of the request, where the Confermato seal appears and the event can be opened.
          if (data?.[0]) router.replace({ pathname: "/richiesta-azienda/[id]", params: { id: p.request_id, momento: "confermato" } });
          else onChange();
        },
      },
    ]);

  const sendRevision = async () => {
    if (!revising) return;
    if (note.trim().length === 0) return setError("Scrivi cosa vuoi cambiare.");
    setBusy(revising.id);
    setError(undefined);
    const { error: e } = await supabase.rpc("request_revision", {
      p_proposal: revising.id,
      p_note: note.trim(),
    });
    setBusy(null);
    if (e) return setError(errorMessage(e));
    setRevising(null);
    setNote("");
    onChange();
  };

  const categories = [...new Set(quotes.flatMap((p) => p.lines.map((l) => l.category)))];
  const sumFor = (p: ClientProposal, category: string) => {
    const matching = p.lines.filter((l) => l.category === category);
    return matching.length === 0 ? null : proposalTotal(matching);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + space[3]}
        decelerationRate="fast"
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + space[3])))}
        accessibilityLabel={`${quotes.length} preventivi, scorri per vederli`}
      >
        {quotes.map((p) => {
          const look = clientProposalLook(p.status);
          const services = new Set(p.lines.map((l) => l.category)).size;
          return (
            <Card key={p.id} style={[styles.quote, { width: cardWidth }]}>
              <View style={styles.quoteHead}>
                <Avatar name={p.agency.name} />
                <View style={styles.flex}>
                  <T variant="bodyStrong" numberOfLines={2}>
                    {p.agency.name}
                  </T>
                  <T variant="mono" tone="secondary">
                    {`V${p.version}${p.submitted_at ? ` · ${ago(p.submitted_at).toUpperCase()}` : ""}`}
                  </T>
                </View>
              </View>
              <View style={styles.badges}>
                <Badge {...look} />
                {lowest !== null && p.total === lowest && <Badge label="Prezzo più basso" tone="outline" />}
                {complete !== null && complete > 1 && services === complete && <Badge label="Più completo" tone="outline" />}
              </View>
              <ProposalLines lines={p.lines} total={p.total} />
              {p.summary && (
                <T variant="callout" tone="secondary" numberOfLines={6}>
                  {p.summary}
                </T>
              )}
              {open && p.status === "submitted" && (
                <View style={styles.quoteActions}>
                  <Button block label="Accetta" loading={busy === p.id && !revising} disabled={busy !== null} onPress={() => accept(p)} />
                  <Button block variant="secondary" label="Chiedi modifiche" disabled={busy !== null} onPress={() => setRevising(p)} />
                </View>
              )}
              <Button
                variant="tertiary"
                icon="chatbubble-outline"
                label="Scrivi"
                accessibilityLabel={`Scrivi a ${p.agency.name}`}
                onPress={() => router.push({ pathname: "/conversazione/[id]", params: { id: p.id } })}
              />
            </Card>
          );
        })}
      </ScrollView>
      {quotes.length > 1 && (
        <View style={styles.dots} accessibilityLabel={`Preventivo ${page + 1} di ${quotes.length}`}>
          {quotes.map((p, i) => (
            <View key={p.id} style={[styles.dot, { backgroundColor: i === page ? c.textPrimary : c.borderStrong }]} />
          ))}
        </View>
      )}
      {quotes[page] && (
        <Attachments title={`Allegati di ${quotes[page].agency.name}`} requestId={quotes[page].request_id} proposalId={quotes[page].id} />
      )}
      {error && !revising && <InlineError message={error} />}
      {quotes.length > 1 && (
        <Button block variant="secondary" icon="git-compare-outline" label="Confronta voce per voce" onPress={() => setLineByLine(true)} />
      )}

      <Sheet visible={lineByLine} title="Voce per voce" onClose={() => setLineByLine(false)}>
        <ScrollView style={styles.sheetList}>
          {[...categories, "__total"].map((cat, i) => {
            const values = quotes.map((p) => ({
              p,
              amount: cat === "__total" ? p.total : sumFor(p, cat),
            }));
            const present = values.filter((v) => v.amount !== null).map((v) => v.amount as number);
            const min = present.length > 1 ? Math.min(...present) : null;
            return (
              <View key={cat} style={styles.compareBlock}>
                {i > 0 && <Divider />}
                <T variant={cat === "__total" ? "bodyStrong" : "calloutStrong"}>{cat === "__total" ? "Totale" : serviceName(cat)}</T>
                {values.map(({ p, amount }) => (
                  <View key={p.id} style={styles.compareRow}>
                    <View style={styles.dotSlot}>
                      {amount !== null && amount === min && <View style={[styles.dot, { backgroundColor: c.textPrimary }]} />}
                    </View>
                    <T variant="callout" tone="secondary" style={styles.flex} numberOfLines={1}>
                      {p.agency.name}
                    </T>
                    {amount === null ? (
                      <T variant="callout" tone="secondary">
                        Non incluso
                      </T>
                    ) : (
                      <T variant="mono" accessibilityLabel={`${euro(amount)}${amount === min ? ", il più basso" : ""}`}>
                        {euro(amount)}
                      </T>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
          <T variant="caption" tone="secondary">
            Il punto indica il prezzo più basso di ogni voce.
          </T>
        </ScrollView>
      </Sheet>

      <Sheet visible={revising !== null} title={revising ? `Modifiche a ${revising.agency.name}` : ""} onClose={() => setRevising(null)}>
        <TextField
          label="Cosa vuoi cambiare?"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={5000}
          style={styles.area}
          textAlignVertical="top"
          autoFocus
        />
        {error && <InlineError message={error} />}
        <Button block label="Invia la richiesta di modifica" loading={busy !== null} onPress={sendRevision} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[2] },
  list: { gap: 0, paddingVertical: space[1] },
  agency: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: control.l,
    paddingVertical: space[3],
    marginHorizontal: -space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  dotSlot: { width: 8, alignItems: "center" },
  flex: { flex: 1 },
  pager: { marginHorizontal: -space[4] },
  pagerContent: { paddingHorizontal: space[4], gap: space[3] },
  quote: { gap: space[4] },
  quoteHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  quoteActions: { gap: space[2] },
  dots: { flexDirection: "row", justifyContent: "center", gap: space[2], marginTop: -space[4] },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  sheetList: { maxHeight: 480 },
  compareBlock: { gap: space[2], paddingBottom: space[3] },
  compareRow: { flexDirection: "row", alignItems: "center", gap: space[2], minHeight: space[8] },
  area: { minHeight: 120, paddingTop: space[3] },
});
