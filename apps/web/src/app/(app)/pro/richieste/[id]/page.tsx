import { BriefView } from "@/components/brief/brief-view";
import { MessageThread } from "@/components/messages";
import { Card, Notice } from "@/components/ui";
import { PROPOSAL_STATUS_LABEL } from "@/lib/labels";
import { loadRequest } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ProposalLines } from "@/components/proposal-lines";
import { getServiceCategory, type ProposalLine, type ProposalStatus } from "@i-events/core";
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
    .select("id, request_id, status, summary, lines, total_amount, version")
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
  const path = `/pro/richieste/${proposal.id}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/pro" className="text-sm text-muted underline">
            Richieste ricevute
          </Link>
          <h1 className="text-2xl font-semibold">{request.draft.basics.title}</h1>
        </div>
        <span className="rounded-ui border border-border px-3 py-1 text-sm">{PROPOSAL_STATUS_LABEL[proposal.status]}</span>
      </div>

      {request.status === "cancelled" && <Notice>L&apos;azienda ha annullato questa richiesta.</Notice>}
      {proposal.status === "accepted" && <Notice tone="success">L&apos;azienda ha scelto la tua proposta. Trovi gli eventi nella tua area operativa.</Notice>}
      {proposal.status === "rejected" && <Notice>L&apos;azienda ha scelto un&apos;altra proposta.</Notice>}
      {proposal.status === "revision_requested" && <Notice>L&apos;azienda ha chiesto modifiche: leggi i messaggi e invia una proposta aggiornata.</Notice>}

      {open && <StatusActions proposalId={proposal.id} moves={MOVES[proposal.status] ?? []} />}

      <BriefView request={request} />

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

      <MessageThread proposalId={proposal.id} viewerOrgId={org.id} isAgency path={path} title="Messaggi con l'azienda" />
    </>
  );
}
