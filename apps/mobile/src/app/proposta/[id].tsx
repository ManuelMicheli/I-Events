import { formatTicketNumber, getServiceCategory, type ProposalLine, type ProposalStatus } from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Attachments } from "@/components/attachments";
import { Badge } from "@/components/badge";
import { Brief } from "@/components/brief";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Notice } from "@/components/notice";
import { ProposalEditor } from "@/components/proposal-editor";
import { ProposalLines } from "@/components/proposal-lines";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { Confirmation, StatusRow, TicketTag } from "@/components/ticket";
import { InlineError } from "@/components/text-field";
import { errorMessage } from "@/lib/errors";
import { ago, requestMeta, stampDay } from "@/lib/format";
import { fetchAgencyProposal, PROPOSAL_EDITABLE } from "@/lib/requests";
import { useActiveOrg } from "@/lib/session";
import { proposalStatusLook } from "@/lib/status-look";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { space } from "@/theme";

type Move = "reviewing" | "clarification" | "declined" | "withdrawn";

const MOVES: Partial<Record<ProposalStatus, Move[]>> = {
  invited: ["reviewing", "declined"],
  reviewing: ["clarification", "declined"],
  clarification: ["reviewing", "declined"],
  revision_requested: ["declined"],
  submitted: ["withdrawn"],
};

const MOVE_LABEL: Record<Move, string> = {
  reviewing: "Prendi in carico",
  clarification: "Aspetto chiarimenti",
  declined: "Rifiuta la richiesta",
  withdrawn: "Ritira la proposta",
};

/** The agency's report on one request: where it stands, the brief ordered by service, the proposal and the files. */
export default function ProposalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const org = useActiveOrg();
  const q = useQuery(`proposal:${org.id}:${id}`, () => fetchAgencyProposal(id, org.id));
  const [moving, setMoving] = useState<Move | null>(null);
  const [moveError, setMoveError] = useState<string>();
  const [tab, setTab] = useState<"request" | "proposal">("request");

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
          body="Potrebbe essere stata annullata, oppure appartiene a un'altra organizzazione."
        />
      </Screen>
    );

  const { proposal, request, events } = q.data;
  const r = request.row;
  const open = request.status === "sent";
  const editable = open && PROPOSAL_EDITABLE.includes(proposal.status);
  const requested = [...new Set(request.draft.items.map((i) => i.category))];
  const initialLines: ProposalLine[] =
    proposal.lines.length > 0
      ? proposal.lines
      : requested.length > 0
        ? requested.map((category) => ({
            category,
            description: getServiceCategory(category)?.name.it ?? category,
            amount: 0,
          }))
        : [{ category: "other", description: "", amount: 0 }];

  const move = (to: Move) => {
    const run = async () => {
      setMoving(to);
      setMoveError(undefined);
      const { error } = await supabase.rpc("set_proposal_status", {
        p_proposal: proposal.id,
        p_status: to,
      });
      setMoving(null);
      if (error) setMoveError(errorMessage(error));
      else q.refresh();
    };
    if (to === "declined" || to === "withdrawn")
      Alert.alert(
        to === "declined" ? "Rifiutare la richiesta?" : "Ritirare la proposta?",
        to === "declined"
          ? `${request.clientName} saprà che non partecipi.`
          : `${request.clientName} non potrà più sceglierla finché non ne invii una nuova.`,
        [
          { text: "Annulla", style: "cancel" },
          { text: to === "declined" ? "Rifiuta" : "Ritira", style: "destructive", onPress: run },
        ],
      );
    else void run();
  };
  const moves = open ? (MOVES[proposal.status] ?? []) : [];

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.refresh}>
      <Stack.Screen options={{ title: "Richiesta" }} />
      <View style={styles.head}>
        <StatusRow>
          {proposal.status === "accepted" ? (
            <Confirmation label="Confermato" date={stampDay(proposal.decided_at)} type={request.draft.eventType} />
          ) : (
            <Badge {...proposalStatusLook(proposal.status)} />
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
          {[request.clientName, request.submittedAt && `ricevuta ${ago(request.submittedAt)}`].filter(Boolean).join(" · ")}
        </T>
      </View>

      {request.status === "cancelled" && <Notice>L&apos;azienda ha annullato questa richiesta.</Notice>}
      {proposal.status === "accepted" && (
        <Notice
          tone="success"
          action={events.map((e) => (
            <Button
              key={e.id}
              variant="secondary"
              icon="calendar-outline"
              label={events.length === 1 ? "Apri lo spazio evento" : e.title}
              onPress={() => router.push({ pathname: "/evento/[id]", params: { id: e.id } })}
            />
          ))}
        >
          {`${request.clientName} ha scelto la tua proposta.`}
        </Notice>
      )}
      {proposal.status === "rejected" && <Notice>{`${request.clientName} ha scelto un'altra proposta.`}</Notice>}
      {proposal.status === "revision_requested" && (
        <Notice tone="warning">L&apos;azienda ha chiesto modifiche: leggi i messaggi e invia una proposta aggiornata.</Notice>
      )}

      <Button
        variant="secondary"
        icon="chatbubble-outline"
        label={`Messaggi con ${request.clientName}`}
        block
        onPress={() => router.push({ pathname: "/conversazione/[id]", params: { id: proposal.id } })}
      />

      <Segmented
        value={tab}
        onChange={setTab}
        accessibilityLabel="Sezione"
        options={[
          { value: "request", label: "Richiesta" },
          {
            value: "proposal",
            label: proposal.version > 0 ? `Proposta v${proposal.version}` : "La tua proposta",
          },
        ]}
      />

      {tab === "request" ? (
        <>
          {moves.length > 0 && (
            <View style={styles.actions}>
              {moves.map((m) => (
                <Button
                  key={m}
                  block
                  variant={m === "reviewing" ? "primary" : m === "clarification" ? "secondary" : "tertiary"}
                  label={MOVE_LABEL[m]}
                  loading={moving === m}
                  disabled={moving !== null && moving !== m}
                  onPress={() => move(m)}
                />
              ))}
              {moveError && <InlineError message={moveError} />}
            </View>
          )}
          <Brief request={request} />
          <Attachments title="Allegati dell'azienda" requestId={request.id} proposalId={null} />
          {editable && (
            <Button
              block
              icon="create-outline"
              label={proposal.version > 0 ? "Aggiorna la proposta" : "Prepara la proposta"}
              onPress={() => setTab("proposal")}
            />
          )}
        </>
      ) : (
        <>
          {editable ? (
            <ProposalEditor
              proposalId={proposal.id}
              clientName={request.clientName}
              initialLines={initialLines}
              initialSummary={proposal.summary ?? ""}
              resubmit={proposal.version > 0}
              budget={{ min: request.draft.basics.budgetMin, max: request.draft.basics.budgetMax }}
              onSent={q.refresh}
            />
          ) : proposal.version > 0 ? (
            <Card>
              {proposal.summary && <T variant="body">{proposal.summary}</T>}
              <ProposalLines lines={proposal.lines} total={proposal.total_amount === null ? null : Number(proposal.total_amount)} />
            </Card>
          ) : (
            <T variant="callout" tone="secondary">
              Nessuna proposta inviata per questa richiesta.
            </T>
          )}
          <Attachments title="Allegati della proposta" requestId={request.id} proposalId={proposal.id} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[2] },
  actions: { gap: space[2] },
});
