import { Avatar } from "@/components/avatar";
import { ClearMoment } from "@/components/moment";
import { LiveDot, Seal, stampDay, Ticket, TicketStub } from "@/components/ticket";
import { TypeChip } from "@/components/event-type";
import { Attachments } from "@/components/attachments/attachments";
import { BriefView } from "@/components/brief/brief-view";
import { MessageThread } from "@/components/messages";
import { ProposalLines } from "@/components/proposal-lines";
import { WriteToOthers } from "@/components/write-to-others";
import { Badge, Button, ButtonLink, Card, Empty, Notice } from "@/components/ui";
import { PROPOSAL_STATUS_LABEL, REQUEST_STATUS_LABEL } from "@/lib/labels";
import { compareProposals, PRICED, proposalBadge } from "@/lib/proposal-compare";
import { loadRequest } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatEuro, formatTicketNumber, type ProposalLine } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelRequest } from "../actions";
import { DecisionForms } from "./decision-forms";

export const metadata: Metadata = { title: "Richiesta" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

export default async function ClientRequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ momento?: string; scrivi?: string; avvisa?: string }> }) {
  const { id } = await params;
  const { momento, scrivi, avvisa } = await searchParams;
  const org = await requireOrg("client");
  const request = await loadRequest(id);
  if (!request || request.clientOrgId !== org.id) notFound();
  if (request.status === "draft") redirect(`/client/richieste/${id}/modifica`);

  const supabase = await createClient();
  const [{ data: proposals, error: e1 }, { data: events, error: e2 }] = await Promise.all([
    supabase
      .from("proposals")
      .select("id, status, summary, lines, total_amount, version, submitted_at, decided_at, agency:organizations!proposals_agency_org_id_fkey(name, city)")
      .eq("request_id", id)
      .order("created_at"),
    supabase.from("events").select("id, title, status, start_date, city").eq("request_id", id).order("start_date"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const priced = proposals
    .filter((p) => PRICED.includes(p.status) && p.version > 0)
    .map((p) => ({ ...p, lines: (p.lines ?? []) as ProposalLine[], total: p.total_amount === null ? null : Number(p.total_amount) }));
  const { cheapestId } = compareProposals(priced);
  const path = `/client/richieste/${id}`;
  const open = request.status === "sent";
  const decidable = open ? priced.filter((p) => p.status === "submitted").length : 0;
  const accepted = request.status === "awarded" ? proposals.find((p) => p.status === "accepted") : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/client/richieste" className="text-sm text-muted underline">
            Le tue richieste
          </Link>
          <h1 className="text-2xl font-semibold">{request.draft.basics.title}</h1>
          <div className="my-2 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted">{formatTicketNumber(request.number)}</span>
            <TypeChip type={request.draft.eventType ?? null} />
          </div>
          <p className="text-sm text-muted">
            {REQUEST_STATUS_LABEL[request.status]}
            {request.submittedAt && ` il ${dateFmt.format(new Date(request.submittedAt))}`} · {proposals.length} agenzie
          </p>
        </div>
        {accepted && <Seal label="Confermato" date={stampDay(accepted.decided_at)} type={request.draft.eventType ?? null} fresh={momento === "confermato"} />}
        {open && (
          <form action={cancelRequest}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="danger">
              Annulla richiesta
            </Button>
          </form>
        )}
      </div>

      {momento && <ClearMoment />}
      {momento === "inviata" && open && (
        <div className="ticket-slot">
          <div className="ticket-print">
            <Ticket
              label={`Richiesta inviata, biglietto ${formatTicketNumber(request.number)}`}
              stub={<TicketStub number={formatTicketNumber(request.number)} countdown={{ label: "INVIATA", live: false }} />}
            >
              <p className="font-medium">Richiesta inviata</p>
              <p className="text-sm text-muted">
                {proposals.length === 1 ? "È arrivata all'agenzia" : `È arrivata alle ${proposals.length} agenzie`}. Ti avvisiamo quando arrivano le proposte.
              </p>
            </Ticket>
          </div>
        </div>
      )}

      {/* From 1920 px the conversations sit beside the proposals; the brief stays under them. */}
      <div className="contents 3xl:grid 3xl:grid-cols-[minmax(0,1fr)_30rem] 3xl:grid-rows-[auto_1fr] 3xl:items-start 3xl:gap-6">
        <div className="contents 3xl:col-start-1 3xl:row-start-1 3xl:flex 3xl:flex-col 3xl:gap-6">
          {request.status === "cancelled" && <Notice>Hai annullato questa richiesta.</Notice>}

          {avvisa && request.status === "awarded" && proposals.some((p) => p.status === "rejected") && (
            <WriteToOthers requestId={id} back={path} title={request.draft.basics.title} others={proposals.filter((p) => p.status === "rejected").length} />
          )}

          {events.length > 0 && (
            <Card title={events.length > 1 ? "Eventi creati" : "Evento creato"}>
              <ul className="divide-y divide-border text-sm">
                {events.map((e) => (
                  <li key={e.id} className="flex justify-between py-2">
                    <Link href={`/client/eventi/${e.id}`} className="underline">
                      {e.title}
                    </Link>
                    <span className="text-muted">
                      {[e.start_date && dateFmt.format(new Date(`${e.start_date}T12:00:00`)), e.city].filter(Boolean).join(" · ") || "Da definire"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            title="Agenzie"
            action={
              priced.length > 1 && (
                <ButtonLink href={`${path}/confronta`} variant="secondary">
                  Confronta le proposte
                </ButtonLink>
              )
            }
          >
            <ul className="divide-y divide-border">
              {proposals.map((p) => {
                const total = PRICED.includes(p.status) && p.total_amount !== null ? Number(p.total_amount) : null;
                const badge = proposalBadge(p.status, p.submitted_at);
                return (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <Avatar name={p.agency?.name ?? "?"} size={32} />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{p.agency?.name}</span>
                      <Badge tone={badge.tone}>
                        {badge.live && <LiveDot />}
                        {badge.label}
                      </Badge>
                    </div>
                    {total !== null && (
                      <span className="flex shrink-0 flex-col items-end">
                        <span className="font-mono text-sm tabular-nums">{formatEuro(total)}</span>
                        {p.id === cheapestId && <span className="text-xs text-muted">la più bassa</span>}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          {priced.length === 0 && open && <Empty>Le agenzie stanno preparando le proposte. Le trovi qui appena arrivano.</Empty>}

          {priced.map((p) => (
            <Card key={p.id} className="group/proposta" title={`Proposta di ${p.agency?.name} · versione ${p.version}`} action={<span className="text-sm text-muted">{PROPOSAL_STATUS_LABEL[p.status]}</span>}>
              {p.summary && <p className="mb-4 whitespace-pre-wrap text-sm">{p.summary}</p>}
              <ProposalLines lines={p.lines} total={p.total} />
              <div className="mt-4">
                <Attachments requestId={id} proposalId={p.id} canWrite={false} path={path} title="Allegati della proposta" />
              </div>
              {open && p.status === "submitted" && (
                <div className="mt-4">
                  <DecisionForms proposalId={p.id} requestId={id} agencyName={p.agency?.name ?? "questa agenzia"} lead={decidable === 1} total={p.total ?? 0} others={proposals.length - 1} />
                </div>
              )}
            </Card>
          ))}
        </div>

        <section id="conversazioni" className="flex scroll-mt-20 flex-col gap-3 3xl:col-start-2 3xl:row-span-2 3xl:row-start-1">
          <h2 className="text-lg font-semibold">Conversazioni</h2>
          {proposals.map((p) => (
            <details key={p.id} className="rounded-ui border border-border p-4" open={proposals.length === 1 || p.id === scrivi}>
              <summary className="cursor-pointer text-sm font-medium">{p.agency?.name}</summary>
              <div className="mt-4">
                <MessageThread proposalId={p.id} viewerOrgId={org.id} isAgency={false} path={path} title={`Messaggi con ${p.agency?.name}`} />
              </div>
            </details>
          ))}
        </section>

        <section className="flex flex-col gap-3 3xl:col-start-1 3xl:row-start-2">
          <h2 className="text-lg font-semibold">Il tuo brief</h2>
          <BriefView request={request} />
          <Attachments requestId={id} canWrite={open} path={path} title="I tuoi allegati" emptyText="Nessun allegato. Puoi aggiungerne finché la richiesta è aperta." />
        </section>
      </div>
    </>
  );
}
