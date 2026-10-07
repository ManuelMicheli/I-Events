import { EventCover, TypeChip } from "@/components/event-type";
import { LiveDot } from "@/components/ticket";
import { eventLine, priceLabel, type PublicEvent } from "@/lib/public-events";
import { EVENT_TYPE_INFO, placesLabel, todayInItaly, type EventType } from "@i-events/core";
import Link from "next/link";
import type { ReactNode } from "react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * The event's cover: its poster when there is one (linked from the organiser's website, on the type's
 * deep ink while it loads), else the ink cover of its type, or a quiet paper one while the agency has
 * not said what kind of event it is. On the event page the whole poster shows (fit="contain").
 */
export function PublicCover({
  type,
  image,
  fit = "cover",
  className,
}: {
  type: EventType | null;
  image?: string | null;
  fit?: "cover" | "contain";
  className?: string;
}) {
  if (image)
    return (
      <div
        aria-hidden
        className={cx("relative shrink-0 overflow-hidden bg-surface", className)}
        style={type ? { backgroundColor: EVENT_TYPE_INFO[type].ink.deep } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- remote poster, any host: no optimisation */}
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className={cx(
            "absolute inset-0 size-full",
            fit === "contain" ? "object-contain" : "object-cover",
          )}
        />
      </div>
    );
  if (type) return <EventCover type={type} className={className} />;
  return <div aria-hidden className={cx("shrink-0 bg-surface", className)} />;
}

/** A badge over the cover: "In corso" with the live dot, or "Esaurito". */
function CoverBadge({ children }: { children: ReactNode }) {
  return (
    <span className="absolute top-3 left-3 inline-flex min-h-7 items-center gap-2 rounded-full bg-bg px-3 text-label font-medium">
      {children}
    </span>
  );
}

/**
 * Public event card (Carta item 17): cover 16:10, title, when and where, then a dashed rule with a
 * notch on each side and the price row with the type chip. The whole card opens the event.
 */
export function PublicEventCard({
  event,
  headingLevel = 3,
}: {
  event: PublicEvent;
  headingLevel?: 2 | 3;
}) {
  const price = priceLabel(event, todayInItaly());
  const soldOut = price === "Posti esauriti";
  const few = price === "Gratis" && placesLabel(event.capacity, event.registered);
  const live = event.status === "live";
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="notched group relative flex flex-col rounded-card border border-border bg-bg p-1 transition-shadow duration-[180ms] hover:shadow-2">
      <div className="relative">
        <PublicCover
          type={event.event_type}
          image={event.image}
          className="aspect-[16/10] w-full rounded-ui"
        />
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
        <span
          className={cx(
            "font-mono text-label whitespace-nowrap",
            (soldOut || price === "Andato in scena") && "text-muted",
          )}
        >
          {price}
        </span>
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
  image,
  title,
  line,
  extra,
  live = false,
}: {
  href: string;
  type: EventType | null;
  image?: string | null;
  title: string;
  line: string;
  extra?: ReactNode;
  live?: boolean;
}) {
  return (
    <article className="group relative flex items-center gap-4 rounded-card border border-border bg-bg p-3 transition-shadow duration-[180ms] hover:shadow-2">
      <PublicCover type={type} image={image} className="size-14 rounded-[8px]" />
      <div className="flex min-w-0 flex-col">
        <h3 className="font-medium">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none"
          >
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
