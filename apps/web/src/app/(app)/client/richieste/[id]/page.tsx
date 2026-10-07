import { Stamp, stampDay } from "@/components/ticket";
import { TypeChip } from "@/components/event-type";
import { Attachments } from "@/components/attachments/attachments";
import { BriefView } from "@/components/brief/brief-view";
import { MessageThread } from "@/components/messages";
import { ProposalLines } from "@/components/proposal-lines";
import { Button, Card, Empty, Notice } from "@/components/ui";
import { PROPOSAL_STATUS_LABEL, REQUEST_STATUS_LABEL } from "@/lib/labels";
import { loadRequest } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatEuro, formatTicketNumber, getServiceCategory, proposalTotal, type ProposalLine, type ProposalStatus } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelRequest } from "../actions";
import { DecisionForms } from "./decision-forms";

export const metadata: Metadata = { title: "Richiesta" };

/** Proposals whose figures the client can compare. */
const PRICED: ProposalStatus[] = ["submitted", "revision_requested", "accepted", "rejected"];

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

export default async function ClientRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const lowest = Math.min(...priced.filter((p) => p.status !== "rejected" && p.total !== null).map((p) => p.total as number));
  const categories = [...new Set(priced.flatMap((p) => p.lines.map((l) => l.category)))];
  const sumFor = (lines: ProposalLine[], category: string) => {
    const matching = lines.filter((l) => l.category === category);
    return matching.length === 0 ? null : proposalTotal(matching);
  };
  const path = `/client/richieste/${id}`;
  const open = request.status === "sent";
  const accepted = request.status === "awarded" ? proposals.find((p) => p.status === "accepted") : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/client" className="text-sm text-muted underline">
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
        {accepted && <Stamp label="Confermato" date={stampDay(accepted.decided_at)} type={request.draft.eventType ?? null} />}
        {open && (
          <form action={cancelRequest}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="danger">
              Annulla richiesta
            </Button>
          </form>
        )}
      </div>

      {request.status === "cancelled" && <Notice>Hai annullato questa richiesta.</Notice>}

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

      <Card title="Agenzie">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-medium">Agenzia</th>
              <th className="py-2 font-medium">Stato</th>
              <th className="py-2 text-right font-medium">Totale</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => {
              const total = PRICED.includes(p.status) && p.total_amount !== null ? Number(p.total_amount) : null;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2">{p.agency?.name}</td>
                  <td className="py-2">{PROPOSAL_STATUS_LABEL[p.status]}</td>
                  <td className="py-2 text-right">
                    {formatEuro(total)}
                    {total !== null && total === lowest && priced.length > 1 && <span className="ml-2 text-xs text-success">più bassa</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {priced.length > 1 && (
        <Card title="Confronto voce per voce">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-2 font-medium">Servizio</th>
                  {priced.map((p) => (
                    <th key={p.id} className="py-2 text-right font-medium">
                      {p.agency?.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c} className="border-t border-border">
                    <td className="py-2">{getServiceCategory(c)?.name.it ?? "Altro"}</td>
                    {priced.map((p) => {
                      const amount = sumFor(p.lines, c);
                      return (
                        <td key={p.id} className="py-2 text-right">
                          {amount === null ? <span className="text-muted">non inclusa</span> : formatEuro(amount)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t border-border font-semibold">
                  <td className="py-2">Totale</td>
                  {priced.map((p) => (
                    <td key={p.id} className="py-2 text-right">
                      {formatEuro(p.total)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {priced.length === 0 && open && <Empty>Le agenzie stanno preparando le proposte. Le trovi qui appena arrivano.</Empty>}

      {priced.map((p) => (
        <Card key={p.id} title={`Proposta di ${p.agency?.name} · versione ${p.version}`} action={<span className="text-sm text-muted">{PROPOSAL_STATUS_LABEL[p.status]}</span>}>
          {p.summary && <p className="mb-4 whitespace-pre-wrap text-sm">{p.summary}</p>}
          <ProposalLines lines={p.lines} total={p.total} />
          <div className="mt-4">
            <Attachments requestId={id} proposalId={p.id} canWrite={false} path={path} title="Allegati della proposta" />
          </div>
          {open && p.status === "submitted" && (
            <div className="mt-4">
              <DecisionForms proposalId={p.id} requestId={id} agencyName={p.agency?.name ?? "questa agenzia"} />
            </div>
          )}
        </Card>
      ))}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Conversazioni</h2>
        {proposals.map((p) => (
          <details key={p.id} className="rounded-ui border border-border p-4" open={proposals.length === 1}>
            <summary className="cursor-pointer text-sm font-medium">{p.agency?.name}</summary>
            <div className="mt-4">
              <MessageThread proposalId={p.id} viewerOrgId={org.id} isAgency={false} path={path} title={`Messaggi con ${p.agency?.name}`} />
            </div>
          </details>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Il tuo brief</h2>
        <BriefView request={request} />
        <Attachments requestId={id} canWrite={open} path={path} title="I tuoi allegati" emptyText="Nessun allegato. Puoi aggiungerne finché la richiesta è aperta." />
      </section>
    </>
  );
}
