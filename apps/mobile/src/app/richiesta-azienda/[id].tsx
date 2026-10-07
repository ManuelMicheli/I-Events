import Ionicons from "@expo/vector-icons/Ionicons";
import { formatTicketNumber, REQUEST_STATUS_LABEL } from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Attachments } from "@/components/attachments";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { Brief } from "@/components/brief";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { useConfirm } from "@/components/confirm";
import { Notice } from "@/components/notice";
import { ProposalDecision } from "@/components/proposal-decision";
import { ProposalLines } from "@/components/proposal-lines";
import { Divider } from "@/components/rows";
import { Screen, Section } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { useToast } from "@/components/toast";
import { Confirmation, PrintedTicket, StatusRow, TicketTag } from "@/components/ticket";
import { InlineError } from "@/components/text-field";
import { WriteToOthers } from "@/components/write-to-others";
import { errorMessage } from "@/lib/errors";
import { ago, euro, plural, requestMeta, stampDay } from "@/lib/format";
import { compareProposals, proposalBadge, sentAgo } from "@/lib/proposal-compare";
import { fetchClientRequest, PROPOSAL_PRICED, type ClientProposal } from "@/lib/requests";
import { useActiveOrg } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { control, radius, space, useTheme } from "@/theme";

type Tab = "overview" | "quotes" | "brief";

/** One of the company's requests: where each agency stands, their proposals (compared on their own screen), and the brief. */
export default function ClientRequestScreen() {
  const { id, momento, avvisa } = useLocalSearchParams<{ id: string; momento?: "inviata" | "confermato"; avvisa?: string }>();
  // A signature moment plays on the screen opened by the action that caused it, when it first shows.
  const [moment] = useState(momento);
  const org = useActiveOrg();
  const q = useQuery(`client-request:${org.id}:${id}`, () => fetchClientRequest(id, org.id));
  const [tab, setTab] = useState<Tab>("overview");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string>();
  const [writeOthers, setWriteOthers] = useState(avvisa === "1");
  const toast = useToast();
  const confirm = useConfirm();

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
  const decidable = open ? fresh : 0;
  const { cheapestId } = compareProposals(priced);
  const rejected = proposals.filter((p) => p.status === "rejected").length;
  const accepted = request.status === "awarded" ? proposals.find((p) => p.status === "accepted") : undefined;
  const badge =
    request.status === "awarded"
      ? ({ label: "Assegnata", tone: "success", icon: "checkmark" } as const)
      : request.status === "cancelled"
        ? ({ label: REQUEST_STATUS_LABEL.cancelled, tone: "outline" } as const)
        : fresh > 0
          ? ({ label: "Proposte in arrivo", tone: "accent", live: true } as const)
          : ({ label: "In attesa delle proposte", tone: "neutral", icon: "time-outline" } as const);

  const cancel = async () => {
    const ok = await confirm({
      title: "Annullare la richiesta?",
      body: "Le agenzie vengono avvisate e non potranno più mandarti proposte.",
      confirmLabel: "Annulla la richiesta",
      cancelLabel: "No, tienila",
      danger: true,
    });
    if (!ok) return;
    setCancelling(true);
    setError(undefined);
    const { error: e } = await supabase.rpc("cancel_request", { p_request: request.id });
    setCancelling(false);
    if (e) setError(errorMessage(e));
    else {
      toast({ text: "Richiesta annullata. Le agenzie sono state avvisate.", tone: "neutral" });
      q.refresh();
    }
  };

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Stack.Screen options={{ title: "Richiesta" }} />
      <View style={styles.head}>
        <StatusRow>
          {accepted ? (
            <Confirmation label="Confermato" date={stampDay(accepted.decided_at)} type={request.draft.eventType} fresh={moment === "confermato"} />
          ) : (
            <Badge {...badge} />
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
      {writeOthers && request.status === "awarded" && rejected > 0 && (
        <WriteToOthers
          requestId={request.id}
          title={r.title}
          others={rejected}
          onSent={() => {
            setWriteOthers(false);
            router.setParams({ avvisa: undefined });
          }}
        />
      )}
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
            label: priced.length > 0 ? `Proposte ${priced.length}` : "Proposte",
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
                  <AgencyRow p={p} lowest={p.id === cheapestId} />
                </View>
              ))}
            </Card>
          </Section>
          {priced.length > 1 && (
            <Button
              block
              variant="secondary"
              leading={(color) => <Ionicons name="git-compare-outline" size={20} color={color} />}
              label="Confronta le proposte"
              onPress={() => router.push({ pathname: "/confronta/[id]", params: { id: request.id } })}
            />
          )}
          {open && <Button variant="tertiary" icon="close-circle-outline" label="Annulla la richiesta" loading={cancelling} onPress={cancel} />}
          {error && <InlineError message={error} />}
        </>
      )}

      {tab === "quotes" &&
        (priced.length === 0 ? (
          <EmptyState
            icon="hourglass-outline"
            title="Proposte in arrivo"
            body="Le agenzie stanno preparando le proposte: le trovi qui appena arrivano, con una notifica."
          />
        ) : (
          <>
            {priced.length > 1 && (
              <Button
                block
                variant="secondary"
                leading={(color) => <Ionicons name="git-compare-outline" size={20} color={color} />}
                label="Confronta le proposte"
                onPress={() => router.push({ pathname: "/confronta/[id]", params: { id: request.id } })}
              />
            )}
            {priced.map((p) => (
              <ProposalCard key={p.id} p={p} open={open} others={proposals.length - 1} lead={decidable === 1} onChange={q.refresh} />
            ))}
          </>
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

/** One agency: who, where it stands, the total once quoted; a tap opens the conversation. */
function AgencyRow({ p, lowest }: { p: ClientProposal; lowest: boolean }) {
  const { c } = useTheme();
  const badge = proposalBadge(p.status, p.submitted_at);
  const total = PROPOSAL_PRICED.includes(p.status) && p.total !== null ? p.total : null;
  const name = p.agency.name;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/conversazione/[id]", params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={[name, badge.label, total !== null && euro(total), lowest && "la più bassa", "Apri i messaggi"].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.agency, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <Avatar name={name} size={32} />
      <View style={styles.agencyText}>
        <T variant="bodyStrong" numberOfLines={2}>
          {name}
        </T>
        <View style={styles.badges}>
          <Badge label={badge.label} tone={badge.tone} live={badge.live} />
        </View>
      </View>
      {total !== null && (
        <View style={styles.amount}>
          <T variant="mono">{euro(total)}</T>
          {lowest && (
            <T variant="caption" tone="secondary">
              la più bassa
            </T>
          )}
        </View>
      )}
      <Ionicons name="chatbubble-outline" size={20} color={c.textSecondary} />
    </Pressable>
  );
}

/** One agency's proposal in full: what it says, the lines and total, its files, then the decision. */
function ProposalCard({ p, open, others, lead, onChange }: { p: ClientProposal; open: boolean; others: number; lead: boolean; onChange: () => void }) {
  const badge = proposalBadge(p.status, p.submitted_at);
  return (
    <Card>
      <View style={styles.quoteHead}>
        <Avatar name={p.agency.name} />
        <View style={styles.flex}>
          <T variant="bodyStrong" accessibilityRole="header">
            {`Proposta di ${p.agency.name}`}
          </T>
          <T variant="mono" tone="secondary">
            {`v${p.version} · ${sentAgo(p.submitted_at)}`}
          </T>
        </View>
      </View>
      <View style={styles.badges}>
        <Badge label={badge.label} tone={badge.tone} live={badge.live} />
      </View>
      {p.summary && <T variant="callout">{p.summary}</T>}
      <ProposalLines lines={p.lines} total={p.total} />
      <Attachments title="Allegati della proposta" requestId={p.request_id} proposalId={p.id} />
      {open && p.status === "submitted" && <ProposalDecision proposal={p} others={others} lead={lead} onChange={onChange} />}
      <Button
        variant="tertiary"
        icon="chatbubble-outline"
        label={`Scrivi a ${p.agency.name}`}
        onPress={() => router.push({ pathname: "/conversazione/[id]", params: { id: p.id } })}
      />
    </Card>
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
  agencyText: { flex: 1, minWidth: 0, gap: space[1] },
  amount: { alignItems: "flex-end" },
  flex: { flex: 1, minWidth: 0 },
  quoteHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
