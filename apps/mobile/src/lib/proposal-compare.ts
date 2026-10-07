import { proposalTotal, type ProposalLine, type ProposalStatus } from "@i-events/core";
import type { BadgeTone } from "@/components/badge";
import { shortDate } from "./format";

/**
 * Comparing the agencies' proposals, as on the website (apps/web/src/lib/proposal-compare.ts): the
 * same rows, the same lowest amounts and the same two labels, so a company reads the same thing on
 * both sides.
 */
export type Priced = { id: string; status: ProposalStatus; lines: ProposalLine[]; total: number | null };

/**
 * The services quoted by anyone (in order of first appearance), each agency's amount per service
 * (null when it does not include it), the lowest amount per service, and the two automatic labels,
 * "Prezzo più basso" and "Più completa", each only when one agency has it.
 */
export function compareProposals<P extends Priced>(priced: P[]) {
  const categories = [...new Set(priced.flatMap((p) => p.lines.map((l) => l.category)))];
  const amount = (p: P, category: string) => {
    const matching = p.lines.filter((l) => l.category === category);
    return matching.length === 0 ? null : proposalTotal(matching);
  };
  const lowestFor = (category: string) => {
    const amounts = priced.map((p) => amount(p, category)).filter((a): a is number => a !== null);
    return amounts.length > 1 ? Math.min(...amounts) : null;
  };
  const inPlay = priced.filter((p) => p.status !== "rejected" && p.total !== null);
  const lowestTotal = inPlay.length > 1 ? Math.min(...inPlay.map((p) => p.total as number)) : null;
  const cheapest = inPlay.filter((p) => p.total === lowestTotal);
  const covered = (p: P) => categories.filter((c) => amount(p, c) !== null).length;
  const most = Math.max(0, ...inPlay.map(covered));
  const complete = inPlay.filter((p) => covered(p) === most);
  return {
    categories,
    amount,
    lowestFor,
    lowestTotal,
    cheapestId: cheapest.length === 1 ? cheapest[0]!.id : null,
    // "Più completa" only means something when the others leave services out.
    mostCompleteId: complete.length === 1 && inPlay.some((p) => covered(p) < most) ? complete[0]!.id : null,
  };
}

/** The proposal's state for the company, as a badge: "Nuova" with the live dot for two days after it arrives. */
export function proposalBadge(status: ProposalStatus, submittedAt: string | null, now = Date.now()): { label: string; tone: BadgeTone; live?: boolean } {
  switch (status) {
    case "submitted":
      return submittedAt && now - new Date(submittedAt).getTime() < 2 * 86_400_000 ? { label: "Nuova", tone: "accent", live: true } : { label: "Da valutare", tone: "neutral" };
    case "revision_requested":
      return { label: "Modifiche chieste", tone: "warning" };
    case "accepted":
      return { label: "Accettata", tone: "success" };
    case "rejected":
      return { label: "Non scelta", tone: "outline" };
    case "declined":
      return { label: "Non partecipa", tone: "outline" };
    case "withdrawn":
      return { label: "Ritirata", tone: "outline" };
    default:
      return { label: "Sta preparando la proposta", tone: "neutral" };
  }
}

const romeDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" });

/** "oggi", "ieri", "3 giorni fa", then "12 ott": when a proposal was last sent. */
export function sentAgo(iso: string | null, now = new Date()) {
  if (!iso) return "";
  const days = Math.round((Date.parse(romeDay.format(now)) - Date.parse(romeDay.format(new Date(iso)))) / 86_400_000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 7) return `${days} giorni fa`;
  return shortDate(romeDay.format(new Date(iso)));
}
