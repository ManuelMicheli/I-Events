import { EventCover } from "@/components/event-type";
import { EVENT_TYPE_INFO, type Countdown, type EventType } from "@i-events/core";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * The ticket ("Carta e inchiostro"): a card with a stub on the right (below on phones), separated
 * by a perforation with two notches. The stub carries the number and the countdown.
 */
export function Ticket({ stub, label, children }: { stub: ReactNode; label: string; children: ReactNode }) {
  return (
    <article aria-label={label} className="ticket grid rounded-card border border-border bg-bg sm:grid-cols-[minmax(0,1fr)_var(--stub-w)]">
      <div className="min-w-0 p-4 sm:p-6">{children}</div>
      <div className="ticket-stub flex items-center justify-between gap-3 px-4 sm:flex-col sm:items-start sm:justify-center sm:gap-1 sm:px-5">{stub}</div>
    </article>
  );
}

/** Number and countdown on the stub: "#0142" and "TRA 3 G", or "IN SCENA" with the live dot. */
export function TicketStub({ number, countdown }: { number: string; countdown: Countdown | null }) {
  return (
    <>
      <span className="font-mono text-sm font-medium">{number}</span>
      {countdown && (
        <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.08em] text-muted">
          {countdown.live && <LiveDot />}
          {countdown.label}
        </span>
      )}
    </>
  );
}

/** The live dot: round and Fiamma, only for what is happening now ("il quadratino è il tipo"). */
export function LiveDot() {
  return <span aria-hidden className="inline-block size-2 shrink-0 rounded-full bg-accent" />;
}

/** An event in a list, printed as a ticket: small cover, title, facts, then the stub. */
export function EventTicket({
  href,
  title,
  type,
  facts,
  number,
  countdown,
  children,
}: {
  href: string;
  title: string;
  type: EventType | null;
  facts: string;
  number: string;
  countdown: Countdown | null;
  children?: ReactNode;
}) {
  return (
    <Ticket label={`${title}, biglietto ${number}`} stub={<TicketStub number={number} countdown={countdown} />}>
      <div className="flex items-start gap-4">
        {type && <EventCover type={type} className="size-12 rounded-ui" />}
        <div className="flex min-w-0 flex-col gap-1">
          <Link href={href} className="font-medium underline">
            {title}
          </Link>
          <p className="text-sm text-muted">{facts}</p>
          {children}
        </div>
      </div>
    </Ticket>
  );
}

/**
 * A stamp for the three moments that matter: CONFERMATO, ISCRITTO, ANDATO IN SCENA. Double rule,
 * mono capitals, the date below, in the event's ink (Grafite without a type), turned by -6 degrees.
 */
export function Stamp({ label, date, type }: { label: string; date: string; type: EventType | null }) {
  const ink = type ? EVENT_TYPE_INFO[type].ink : null;
  const style = (ink ? { "--stamp": ink.text, "--stamp-dark": ink.darkText } : { "--stamp": "var(--color-text)", "--stamp-dark": "var(--color-text)" }) as CSSProperties;
  return (
    <span
      role="img"
      aria-label={date ? `${label.toLowerCase()} il ${date.toLowerCase()}` : label.toLowerCase()}
      style={style}
      className="m-1 inline-flex shrink-0 -rotate-6 flex-col items-center rounded-[8px] border-2 border-current px-3 py-1 font-mono text-[var(--stamp)] outline-1 outline-offset-2 outline-current outline-solid dark:text-[var(--stamp-dark)]"
    >
      <span className="text-[13px] leading-[18px] font-medium tracking-[0.08em] uppercase">{label}</span>
      {date && <span className="text-[11px] leading-[14px] uppercase">{date}</span>}
    </span>
  );
}

const stampFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });

/** The date under a stamp, "15 giu 2027" (shown in capitals), from a day or a timestamp. */
export function stampDay(value: string | null) {
  if (!value) return "";
  return stampFmt.format(new Date(value.length === 10 ? `${value}T12:00:00` : value)).replace(".", "");
}
