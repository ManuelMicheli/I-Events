import { Avatar } from "@/components/avatar";
import { CompareCarousel } from "@/components/compare-carousel";
import { LiveDot } from "@/components/ticket";
import { Badge, ButtonLink } from "@/components/ui";
import { compareProposals, PRICED, proposalBadge, sentAgo } from "@/lib/proposal-compare";
import { loadRequest } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatEuro, getServiceCategory, type ProposalLine } from "@i-events/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { DecisionForms } from "../decision-forms";

export const metadata: Metadata = { title: "Confronta le proposte" };

const serviceName = (key: string) => getServiceCategory(key)?.name.it ?? "Altro";

/**
 * Confronta le proposte (Client 5): one column per agency, the services in rows, the amounts in mono
 * with a small dot on the lowest of each row, the totals big, then each agency's summary and the
 * decision. The column under the pointer rises off the page. On a phone, one card per agency to
 * swipe through, and the table under them.
 */
export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg("client");
  const request = await loadRequest(id);
  if (!request || request.clientOrgId !== org.id) notFound();

  const supabase = await createClient();
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("id, status, summary, lines, total_amount, version, submitted_at, agency:organizations!proposals_agency_org_id_fkey(name)")
    .eq("request_id", id)
    .order("created_at");
  if (error) throw error;

  const priced = proposals
    .filter((p) => PRICED.includes(p.status) && p.version > 0)
    .map((p) => ({ ...p, name: p.agency?.name ?? "Agenzia", lines: (p.lines ?? []) as ProposalLine[], total: p.total_amount === null ? null : Number(p.total_amount) }));
  if (priced.length < 2) redirect(`/client/richieste/${id}`);

  const { categories, amount, lowestFor, cheapestId, mostCompleteId } = compareProposals(priced);
  const open = request.status === "sent";
  const decidable = open ? priced.filter((p) => p.status === "submitted").length : 0;
  const back = `/client/richieste/${id}`;

  const label = (p: (typeof priced)[number]) => (p.id === cheapestId ? "Prezzo più basso" : p.id === mostCompleteId ? "Più completa" : null);
  const status = (p: (typeof priced)[number]) => {
    const b = proposalBadge(p.status, p.submitted_at);
    return (
      <Badge tone={b.tone}>
        {b.live && <LiveDot />}
        {b.label}
      </Badge>
    );
  };
  const money = (value: number | null, lowest: boolean) =>
    value === null ? (
      <span className="text-muted">Non incluso</span>
    ) : (
      <span className="inline-flex items-center gap-2 font-mono tabular-nums">
        {lowest && (
          <>
            <span aria-hidden className="size-1.5 rounded-full bg-text" />
            <span className="sr-only">il più basso, </span>
          </>
        )}
        {formatEuro(value)}
      </span>
    );
  const decision = (p: (typeof priced)[number]) =>
    open && p.status === "submitted" ? (
      <DecisionForms proposalId={p.id} requestId={id} agencyName={p.name} lead={decidable === 1} total={p.total ?? 0} others={proposals.length - 1} />
    ) : null;
  const write = (p: (typeof priced)[number]) => (
    <Link href={`${back}?scrivi=${p.id}#conversazioni`} className="self-start text-sm font-medium underline">
      Scrivi a {p.name}
    </Link>
  );

  // Rows of the table: the head, one per service, the total, then the summary with the decision.
  const rows = categories.length + 3;
  const cell = "flex items-center border-t border-border py-2.5 text-sm";

  return (
    <>
      <div>
        <Link href={back} className="text-sm text-muted underline">
          {request.draft.basics.title}
        </Link>
        <h1 className="text-2xl font-semibold">Confronta le proposte</h1>
        <p className="text-sm text-muted">
          {priced.length} agenzie · {request.draft.basics.title}
        </p>
      </div>

      {/* Phone: one card per agency. */}
      <div className="lg:hidden">
        <CompareCarousel label="Le proposte" names={priced.map((p) => p.name)}>
          {priced.map((p) => (
            <article key={p.id} className="group/proposta flex h-full flex-col gap-4 rounded-card border border-border bg-bg p-4">
              <header className="flex items-start gap-3">
                <Avatar name={p.name} size={40} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="font-medium">{p.name}</h2>
                  <p className="font-mono text-xs text-muted">
                    v{p.version} · {sentAgo(p.submitted_at)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {status(p)}
                    {label(p) && <Badge tone="outline">{label(p)}</Badge>}
                  </div>
                </div>
              </header>
              <dl className="flex flex-col">
                {categories.map((c) => (
                  <div key={c} className="flex items-center justify-between gap-4 border-t border-border py-2.5 text-sm">
                    <dt>{serviceName(c)}</dt>
                    <dd className="text-right">{money(amount(p, c), amount(p, c) !== null && amount(p, c) === lowestFor(c))}</dd>
                  </div>
                ))}
              </dl>
              <div className="perforation -mx-4" aria-hidden />
              <div>
                <p className="text-sm text-muted">Totale</p>
                <p className="font-mono text-3xl font-medium tabular-nums">{formatEuro(p.total)}</p>
              </div>
              {p.summary && <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted">{p.summary}</p>}
              <div className="mt-auto flex flex-col gap-3">
                {decision(p)}
                {write(p)}
              </div>
            </article>
          ))}
        </CompareCarousel>
        <ButtonLink href="#voce-per-voce" variant="secondary" className="mt-4 w-full">
          Confronta voce per voce
        </ButtonLink>
      </div>

      {/* The table: the main view from 1024 px, under the cards on a phone (without the decisions, which the cards carry). */}
      <section id="voce-per-voce" aria-label="Voce per voce" className="relative -mx-4 scroll-mt-20 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <h2 className="mb-2 text-lg font-medium lg:sr-only">Voce per voce</h2>
        <div
          className="grid min-w-max grid-cols-[7.5rem_repeat(var(--n),minmax(12rem,1fr))] gap-x-2 lg:min-w-0 lg:grid-cols-[minmax(8rem,12rem)_repeat(var(--n),minmax(13rem,1fr))]"
          style={{ "--n": priced.length, gridTemplateRows: `repeat(${rows}, auto)` } as CSSProperties}
        >
          <div className="sticky left-0 z-10 grid grid-rows-subgrid bg-app pr-2" style={{ gridRow: `1 / span ${rows}` }}>
            <div />
            {categories.map((c) => (
              <div key={c} className={cell}>
                {serviceName(c)}
              </div>
            ))}
            <div className={`${cell} font-medium`}>Totale</div>
            <div />
          </div>
          {priced.map((p) => (
            <Column key={p.id} rows={rows}>
              <div className="flex flex-col gap-2 pb-4">
                <div className="min-h-6">{label(p) && <Badge tone="outline">{label(p)}</Badge>}</div>
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} size={32} />
                  <div className="min-w-0">
                    <h3 className="font-medium">{p.name}</h3>
                    <p className="font-mono text-xs text-muted">
                      v{p.version} · {sentAgo(p.submitted_at)}
                    </p>
                  </div>
                </div>
                <div>{status(p)}</div>
              </div>
              {categories.map((c) => (
                <div key={c} className={`${cell} justify-end`}>
                  {money(amount(p, c), amount(p, c) !== null && amount(p, c) === lowestFor(c))}
                </div>
              ))}
              <div className={`${cell} justify-end py-4`}>
                <span className="inline-flex items-center gap-2 font-mono text-2xl font-medium tabular-nums 2xl:text-3xl">
                  {p.id === cheapestId && <span aria-hidden className="size-2 rounded-full bg-text" />}
                  {formatEuro(p.total)}
                </span>
              </div>
              <div className="flex flex-col gap-4 pt-2 max-lg:hidden">
                {p.summary && <p className="line-clamp-3 text-sm whitespace-pre-wrap text-muted">{p.summary}</p>}
                {decision(p)}
                {write(p)}
              </div>
            </Column>
          ))}
        </div>
      </section>
    </>
  );
}

/** One agency's column, aligned to the rows of the table; it rises when pointed at or focused. */
function Column({ rows, children }: { rows: number; children: ReactNode }) {
  return (
    <div
      className="group/proposta grid grid-rows-subgrid rounded-card border border-transparent px-4 pt-4 pb-4 transition-[background-color,box-shadow,border-color] duration-[180ms] hover:border-border hover:bg-bg hover:shadow-2 focus-within:border-border focus-within:bg-bg focus-within:shadow-2"
      style={{ gridRow: `1 / span ${rows}` }}
    >
      {children}
    </div>
  );
}
