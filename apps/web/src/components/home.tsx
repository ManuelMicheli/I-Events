import { EventCover } from "@/components/event-type";
import { LiveDot } from "@/components/ticket";
import { Badge, type BadgeTone } from "@/components/ui";
import { PROPOSAL_STATUS_LABEL } from "@/lib/labels";
import {
  eventCountdown,
  formatEventDates,
  type EventStatus,
  type EventType,
  type ProposalStatus,
} from "@i-events/core";
import Link from "next/link";
import type { ReactNode } from "react";

/** Pieces of the agency's and the company's Home (specs: pro-/client-schermate-spec.md, "1. HOME"). */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** The greeting, one line of summary and, on the right, the page's main action. */
export function HomeHeader({
  title,
  summary,
  action,
}: {
  title: string;
  summary: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted">{summary}</p>
      </div>
      {action}
    </div>
  );
}

export type MetricItem = {
  label: string;
  value: string;
  note: string;
  href?: string;
  wide?: boolean;
};

/** The numbers that matter, in white cards: the figure in mono, a note under it. */
export function Metrics({ items, columns }: { items: MetricItem[]; columns: 3 | 4 }) {
  return (
    <ul
      className={cx(
        "grid grid-cols-2 gap-3 sm:gap-4",
        columns === 4 ? "lg:grid-cols-4" : "sm:grid-cols-3",
      )}
    >
      {items.map((m) => {
        const body = (
          <>
            <span className="text-label font-medium text-muted">{m.label}</span>
            <span className="font-mono text-title2 font-medium break-words">{m.value}</span>
            <span className="text-xs text-muted">{m.note}</span>
          </>
        );
        const box = "flex h-full flex-col gap-1 rounded-card border border-border bg-bg p-4 sm:p-5";
        return (
          <li key={m.label} className={cx("min-w-0", m.wide && "col-span-2 sm:col-span-1")}>
            {m.href ? (
              <Link
                href={m.href}
                className={cx(box, "transition-colors duration-[120ms] hover:bg-surface")}
              >
                {body}
              </Link>
            ) : (
              <div className={box}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** "Vedi tutte" next to a block's title; the label says what, for screen readers. */
export function SeeAll({
  href,
  label,
  children = "Vedi tutte",
}: {
  href: string;
  label: string;
  children?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex min-h-11 items-center rounded-ui px-3 text-sm font-medium hover:bg-surface sm:min-h-8"
    >
      {children}
    </Link>
  );
}

/** Two letters for someone's avatar: "NS" for "NSS Eventi". */
export function Initials({ name }: { name: string }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? "?").slice(0, 2);
  return (
    <span
      aria-hidden
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium uppercase"
    >
      {letters}
    </span>
  );
}

export const PROPOSAL_TONE: Record<ProposalStatus, BadgeTone> = {
  invited: "accent",
  reviewing: "neutral",
  clarification: "warning",
  submitted: "neutral",
  revision_requested: "warning",
  accepted: "success",
  rejected: "outline",
  declined: "outline",
  withdrawn: "outline",
};

export function ProposalBadge({ status }: { status: ProposalStatus }) {
  return <Badge tone={PROPOSAL_TONE[status]}>{PROPOSAL_STATUS_LABEL[status]}</Badge>;
}

const shortFmt = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const yearFmt = new Intl.DateTimeFormat("it-IT", { year: "numeric", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00Z`);

/** "14 nov" */
export const shortDate = (d: string) => shortFmt.format(asDate(d)).replace(".", "");

type RequestFacts = {
  kind: "single" | "campaign";
  start_date: string | null;
  city: string | null;
  guests: number | null;
  campaign: unknown;
};

const stagesOf = (r: RequestFacts) =>
  r.kind === "campaign"
    ? Number((r.campaign as { eventsCount?: number } | null)?.eventsCount) || null
    : null;

/** The facts line under a request, in mono capitals as in the app: "14 NOV 2026 · MILANO · 350 OSPITI". */
export function requestMeta(r: RequestFacts): string {
  const stages = stagesOf(r);
  const parts = [
    r.start_date
      ? `${stages ? "dal " : ""}${shortDate(r.start_date)} ${yearFmt.format(asDate(r.start_date))}`
      : "data da definire",
    stages ? `${stages} tappe` : r.city,
    r.guests ? `${r.guests.toLocaleString("it-IT", { useGrouping: true })} ospiti` : null,
  ];
  return parts.filter(Boolean).join(" · ").toUpperCase();
}

/** "Evento" or "Campagna" (the stages are in the facts line). */
export const requestKind = (r: Pick<RequestFacts, "kind">) =>
  r.kind === "campaign" ? "Campagna" : "Evento";

type CompactEventFacts = {
  title: string;
  event_type: EventType | null;
  status: EventStatus;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  venue: string | null;
};

/** An event in a side block: small cover, title, dates and place, the countdown of its stub. */
export function CompactEvent({
  e,
  href,
  today,
  detail,
}: {
  e: CompactEventFacts;
  href: string;
  today: string;
  detail?: string;
}) {
  const countdown = eventCountdown(e, today);
  const place = [e.venue, e.city].filter(Boolean).join(", ");
  return (
    <li className="flex items-start gap-3 rounded-ui border border-border p-3">
      {e.event_type ? (
        <EventCover type={e.event_type} className="size-10 rounded-[8px]" />
      ) : (
        <span aria-hidden className="size-10 shrink-0 rounded-[8px] bg-surface" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={href} className="font-medium break-words underline">
          {e.title}
        </Link>
        <span className="text-label text-muted">
          {[formatEventDates(e.start_date, e.end_date), place].filter(Boolean).join(" · ")}
        </span>
        {detail && <span className="text-label text-muted">{detail}</span>}
      </div>
      {countdown && (
        <span className="inline-flex shrink-0 items-center gap-2 pt-1 font-mono text-xs tracking-[0.08em] whitespace-nowrap text-muted">
          {countdown.live && <LiveDot />}
          {countdown.label}
        </span>
      )}
    </li>
  );
}
