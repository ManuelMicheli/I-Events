import { EventCover, TypeChip } from "@/components/event-type";
import { LiveDot } from "@/components/ticket";
import { eventLine, type PublicEvent } from "@/lib/public-events";
import { placesLabel, placesLeft, type EventType } from "@i-events/core";
import Link from "next/link";
import type { ReactNode } from "react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** The event's cover, or a quiet paper one while the agency has not said what kind of event it is. */
export function PublicCover({ type, className }: { type: EventType | null; className?: string }) {
  if (type) return <EventCover type={type} className={className} />;
  return <div aria-hidden className={cx("shrink-0 bg-surface", className)} />;
}

/** A badge over the cover: "In corso" with the live dot, or "Esaurito". */
function CoverBadge({ children }: { children: ReactNode }) {
  return (
    <span className="absolute top-3 left-3 inline-flex min-h-7 items-center gap-2 rounded-full bg-bg px-3 text-label font-medium">{children}</span>
  );
}

/**
 * Public event card (Carta item 17): cover 16:10, title, when and where, then a dashed rule with a
 * notch on each side and the price row with the type chip. The whole card opens the event.
 */
export function PublicEventCard({ event, headingLevel = 3 }: { event: PublicEvent; headingLevel?: 2 | 3 }) {
  const soldOut = placesLeft(event.capacity, event.registered) === 0;
  const few = placesLabel(event.capacity, event.registered);
  const live = event.status === "live";
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="notched group relative flex flex-col rounded-card border border-border bg-bg p-1 transition-shadow duration-[180ms] hover:shadow-2">
      <div className="relative">
        <PublicCover type={event.event_type} className="aspect-[16/10] w-full rounded-ui" />
        {live ? (
          <CoverBadge>
            <LiveDot />
            In corso
          </CoverBadge>
        ) : soldOut ? (
          <CoverBadge>Esaurito</CoverBadge>
        ) : few ? (
          <CoverBadge>{few}</CoverBadge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pt-4 pb-5">
        <Heading className="text-xl font-medium">
          <Link
            href={`/eventi/${event.id}`}
            className="after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none"
          >
            {event.title}
          </Link>
        </Heading>
        <p className="text-sm text-muted">{eventLine(event)}</p>
      </div>
      <div aria-hidden className="perf-rule mx-4" />
      <div className="flex h-[51px] items-center justify-between gap-3 px-3">
        <span className={cx("font-mono text-label whitespace-nowrap", soldOut && "text-muted")}>{soldOut ? "Posti esauriti" : "Gratis"}</span>
        <span className="min-w-0 whitespace-nowrap">
          <TypeChip type={event.event_type} />
        </span>
      </div>
      {/* The stretched link's focus ring, drawn on the card (inside it: the notches' mask clips the outside). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden rounded-card border-2 border-focus group-has-[a:focus-visible]:block"
      />
    </article>
  );
}

/** The compact row (Carta item 17): a 56 px cover, the title and the line under it, for day lists. */
export function PublicEventRow({
  href,
  type,
  title,
  line,
  extra,
  live = false,
}: {
  href: string;
  type: EventType | null;
  title: string;
  line: string;
  extra?: ReactNode;
  live?: boolean;
}) {
  return (
    <article className="group relative flex items-center gap-4 rounded-card border border-border bg-bg p-3 transition-shadow duration-[180ms] hover:shadow-2">
      <PublicCover type={type} className="size-14 rounded-[8px]" />
      <div className="flex min-w-0 flex-col">
        <h3 className="font-medium">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none">
            {title}
          </Link>
        </h3>
        <p className="text-sm text-muted">
          {live && (
            <>
              <span className="inline-flex items-center gap-2 text-text">
                <LiveDot />
                In corso
              </span>
              {" · "}
            </>
          )}
          {line}
        </p>
        {extra}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 hidden rounded-[20px] border-2 border-focus group-has-[a:focus-visible]:block"
      />
    </article>
  );
}
