import { addDays } from "./profiles";
import type { QuoteStatus } from "./events";
import type { EventStatus, ProposalStatus, RequestStatus } from "./status";

/**
 * The numbers on the Home of the agency and of the company, the same on the web and in the app:
 * what counts as a new request, a proposal waiting, an event this week, the average margin.
 */

/** Proposals that are still being worked on by the agency. */
export const PROPOSALS_TO_REVIEW: readonly ProposalStatus[] = [
  "invited",
  "reviewing",
  "clarification",
  "revision_requested",
];
/** Proposals the company can compare: they carry figures. */
export const PROPOSALS_PRICED: readonly ProposalStatus[] = [
  "submitted",
  "revision_requested",
  "accepted",
  "rejected",
];

type Dated = { status: EventStatus; start_date: string | null; end_date: string | null };

/** True while today falls within the event's dates (and it was not cancelled). */
export const isEventToday = (e: Dated, today: string) =>
  !!e.start_date &&
  e.status !== "cancelled" &&
  e.start_date <= today &&
  (e.end_date ?? e.start_date) >= today;

const byStart = (a: Dated, b: Dated) =>
  (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999");

/**
 * The agency's Home. Margin: over the events of the last 90 days and the upcoming ones that have
 * both a price and planned costs; null when there are none.
 */
export function agencyHome<
  P extends { status: ProposalStatus },
  E extends Dated & { money: { sold: number; planned: number } },
>(proposals: readonly P[], events: readonly E[], today: string) {
  const week = addDays(today, 7);
  const fresh = proposals.filter((p) => p.status === "invited");
  const toReview = proposals.filter((p) => PROPOSALS_TO_REVIEW.includes(p.status));
  const waiting = proposals.filter((p) => p.status === "submitted");
  const evs = events.filter((e) => e.status !== "cancelled");
  const thisMonth = evs.filter((e) => e.start_date?.startsWith(today.slice(0, 7)));
  const todays = evs.filter((e) => isEventToday(e, today));
  const thisWeek = evs
    .filter((e) => e.start_date && e.start_date > today && e.start_date <= week)
    .sort(byStart);
  const priced = evs.filter(
    (e) =>
      e.money.sold > 0 &&
      e.money.planned > 0 &&
      (e.end_date ?? e.start_date ?? today) >= addDays(today, -90),
  );
  const sold = priced.reduce((s, e) => s + e.money.sold, 0);
  const margin =
    sold > 0
      ? Math.round(((sold - priced.reduce((s, e) => s + e.money.planned, 0)) / sold) * 100)
      : null;
  return {
    week,
    fresh,
    toReview,
    waiting,
    thisMonth,
    todays,
    thisWeek,
    priced,
    margin,
    eventsThisWeek: thisWeek.length + todays.length,
  };
}

type ClientRequestFacts = {
  status: RequestStatus;
  proposals: readonly { status: ProposalStatus }[];
};
type ClientEventFacts = Dated & { latestQuote: { status: QuoteStatus } | null };

/** The company's Home: open requests, proposals to decide on, quotes to approve, what comes next. */
export function clientHome<R extends ClientRequestFacts, E extends ClientEventFacts>(
  requests: readonly R[],
  events: readonly E[],
  today: string,
) {
  const open = requests.filter((r) => r.status === "sent");
  const proposals = open.flatMap((r) =>
    r.proposals.map((p) => Object.assign({}, p as R["proposals"][number], { request: r })),
  );
  const fresh = proposals.filter((p) => p.status === "submitted");
  const priced = proposals.filter((p) => PROPOSALS_PRICED.includes(p.status));
  const questions = proposals.filter((p) => p.status === "clarification");
  const quotes = events.filter((e) => e.latestQuote?.status === "sent");
  const upcoming = events
    .filter(
      (e) =>
        e.status !== "cancelled" &&
        e.status !== "completed" &&
        (e.end_date ?? e.start_date ?? today) >= today,
    )
    .sort(byStart);
  const next = upcoming.find((e) => e.start_date);
  const awaitingQuotes = open.filter(
    (r) => !r.proposals.some((p) => PROPOSALS_PRICED.includes(p.status)),
  );
  return {
    open,
    fresh,
    priced,
    questions,
    quotes,
    upcoming,
    next,
    awaitingQuotes,
    toDecide: fresh.length + quotes.length,
  };
}

const hourFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Europe/Rome",
});

/** "Buongiorno", "Buon pomeriggio" or "Buonasera", by the time in Italy. */
export function greeting(now = new Date()): string {
  const h = Number(hourFmt.format(now));
  if (h >= 5 && h < 13) return "Buongiorno";
  if (h >= 13 && h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

/** "Manuel" from "Manuel Micheli"; null when there is no name. */
export const firstName = (full: string | null | undefined) => full?.trim().split(/\s+/)[0] || null;

/** "1 evento", "3 eventi", "1.200 ospiti": Italian grouping also for four digits. */
export const plural = (n: number, one: string, many: string) =>
  `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ${n === 1 ? one : many}`;
