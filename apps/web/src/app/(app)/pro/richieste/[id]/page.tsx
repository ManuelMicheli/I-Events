import { Stamp, stampDay } from "@/components/ticket";
import { TypeChip } from "@/components/event-type";
import { Attachments } from "@/components/attachments/attachments";
import { BriefView } from "@/components/brief/brief-view";
import { MessageThread } from "@/components/messages";
import { Card, Notice } from "@/components/ui";
import { PROPOSAL_STATUS_LABEL } from "@/lib/labels";
import { loadRequest } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProposalLines } from "@/components/proposal-lines";
import { formatTicketNumber, getServiceCategory, type ProposalLine, type ProposalStatus } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalEditor } from "./proposal-editor";
import { StatusActions } from "./status-actions";

export const metadata: Metadata = { title: "Richiesta" };

type Move = "reviewing" | "clarification" | "declined" | "withdrawn";

const MOVES: Partial<Record<ProposalStatus, Move[]>> = {
  invited: ["reviewing", "declined"],
  reviewing: ["clarification", "declined"],
  clarification: ["reviewing", "declined"],
  revision_requested: ["declined"],
  submitted: ["withdrawn"],
};

const EDITABLE: ProposalStatus[] = ["invited", "reviewing", "clarification", "revision_requested", "withdrawn"];

/** The agency's report for one request: the structured brief, its proposal and the conversation with the client. */
export default async function AgencyRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg("agency");
  const supabase = await createClient();
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("id, request_id, status, summary, lines, total_amount, version, decided_at")
    .eq("id", id)
    .eq("agency_org_id", org.id)
    .maybeSingle();
  if (error) throw error;
  if (!proposal) notFound();

  const request = await loadRequest(proposal.request_id);
  if (!request) notFound();

  const savedLines = (proposal.lines ?? []) as ProposalLine[];
  const requested = [...new Set(request.draft.items.map((i) => i.category))];
  const initialLines: ProposalLine[] =
    savedLines.length > 0
      ? savedLines
      : requested.length > 0
        ? requested.map((category) => ({ category, description: getServiceCategory(category)?.name.it ?? category, amount: 0 }))
        : [{ category: "other", description: "", amount: 0 }];
  const open = request.status === "sent";
  const { data: events, error: eventsError } =
    proposal.status === "accepted"
      ? await supabase.from("events").select("id, title").eq("proposal_id", proposal.id).order("start_date")
      : { data: [], error: null };
  if (eventsError) throw eventsError;
  const path = `/pro/richieste/${proposal.id}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/pro" className="text-sm text-muted underline">
            Richieste ricevute
          </Link>
          <h1 className="text-2xl font-semibold">{request.draft.basics.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted">{formatTicketNumber(request.number)}</span>
            <TypeChip type={request.draft.eventType ?? null} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {proposal.status === "accepted" && <Stamp label="Confermato" date={stampDay(proposal.decided_at)} type={request.draft.eventType ?? null} />}
          <span className="rounded-ui border border-border px-3 py-1 text-sm">{PROPOSAL_STATUS_LABEL[proposal.status]}</span>
        </div>
      </div>

      {request.status === "cancelled" && <Notice>L&apos;azienda ha annullato questa richiesta.</Notice>}
      {proposal.status === "accepted" && (
        <Notice tone="success">
          L&apos;azienda ha scelto la tua proposta.{" "}
          {events.map((e, i) => (
            <span key={e.id}>
              {i > 0 && " · "}
              <Link href={`/pro/eventi/${e.id}`} className="font-medium underline">
                {events.length === 1 ? "Apri lo spazio evento" : e.title}
              </Link>
            </span>
          ))}
        </Notice>
      )}
      {proposal.status === "rejected" && <Notice>L&apos;azienda ha scelto un&apos;altra proposta.</Notice>}
      {proposal.status === "revision_requested" && <Notice>L&apos;azienda ha chiesto modifiche: leggi i messaggi e invia una proposta aggiornata.</Notice>}

      {open && <StatusActions proposalId={proposal.id} moves={MOVES[proposal.status] ?? []} />}

      <BriefView request={request} />
      <Attachments requestId={request.id} canWrite={false} path={path} title="Allegati dell'azienda" />

      {open && EDITABLE.includes(proposal.status) ? (
        <ProposalEditor proposalId={proposal.id} initialLines={initialLines} initialSummary={proposal.summary ?? ""} resubmit={proposal.version > 0} />
      ) : (
        proposal.version > 0 && (
          <Card title={`La tua proposta · versione ${proposal.version}`}>
            {proposal.summary && <p className="mb-4 whitespace-pre-wrap text-sm">{proposal.summary}</p>}
            <ProposalLines lines={savedLines} total={proposal.total_amount} />
          </Card>
        )
      )}

      <Attachments
        requestId={request.id}
        proposalId={proposal.id}
        canWrite={open && EDITABLE.includes(proposal.status)}
        path={path}
        title="Allegati della proposta"
        emptyText="Allega preventivi dettagliati, render o presentazioni: l'azienda li vede quando invii la proposta."
      />

      <MessageThread proposalId={proposal.id} viewerOrgId={org.id} isAgency path={path} title="Messaggi con l'azienda" />
    </>
  );
}
