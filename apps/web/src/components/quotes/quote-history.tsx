import { ProposalLines } from "@/components/proposal-lines";
import { QUOTE_STATUS_LABEL } from "@/lib/labels";
import type { ProposalLine, QuoteStatus } from "@i-events/core";

export type SentQuote = {
  id: string;
  version: number | null;
  status: QuoteStatus;
  lines: unknown;
  total_amount: number;
  note: string | null;
  decision_note: string | null;
  sent_at: string | null;
  decided_at: string | null;
};

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Sent versions, newest first; the latest is open, older ones fold away. */
export function QuoteHistory({ quotes }: { quotes: SentQuote[] }) {
  return (
    <div className="flex flex-col gap-3">
      {quotes.map((q, i) => {
        const body = (
          <div className="flex flex-col gap-2">
            <ProposalLines lines={q.lines as ProposalLine[]} total={Number(q.total_amount)} />
            {q.note && <p className="whitespace-pre-line text-sm text-muted">{q.note}</p>}
            {q.decision_note && (
              <p className="rounded-ui bg-surface px-3 py-2 text-sm">
                <span className="font-medium">Richiesta del cliente: </span>
                {q.decision_note}
              </p>
            )}
          </div>
        );
        const heading = (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">Versione {q.version}</span>
            <span className={`rounded-ui border px-2 py-0.5 ${q.status === "approved" ? "border-success text-success" : "border-border"}`}>
              {QUOTE_STATUS_LABEL[q.status]}
            </span>
            {q.sent_at && <span className="text-muted">inviata {dateFmt.format(new Date(q.sent_at))}</span>}
            {q.decided_at && <span className="text-muted">· decisa {dateFmt.format(new Date(q.decided_at))}</span>}
          </span>
        );
        return i === 0 ? (
          <section key={q.id} aria-label={`Versione ${q.version}`} className="flex flex-col gap-2">
            {heading}
            {body}
          </section>
        ) : (
          <details key={q.id} className="border-t border-border pt-3">
            <summary className="cursor-pointer">{heading}</summary>
            <div className="mt-2">{body}</div>
          </details>
        );
      })}
    </div>
  );
}
