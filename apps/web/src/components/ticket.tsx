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
    <article aria-label={label} className="ticket group grid rounded-card border border-border bg-bg sm:grid-cols-[minmax(0,1fr)_var(--stub-w)]">
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
 * The seal for the three moments that matter: "Confermato", "Iscrizione confermata", "Andato in
 * scena". A round seal in the event's deep ink (Grafite without a type) with a tick, the moment and,
 * under it, the day. `fresh` when it has just happened (A7): the seal grows in and the tick draws.
 */
export function Seal({ label, date, type, fresh = false }: { label: string; date: string; type: EventType | null; fresh?: boolean }) {
  const ink = type ? EVENT_TYPE_INFO[type].ink : null;
  const style = { "--seal": ink?.deep ?? "var(--color-text)", "--seal-dark": ink?.darkFill ?? "var(--color-text)" } as CSSProperties;
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        style={style}
        className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--seal)] text-white dark:bg-[var(--seal-dark)] dark:text-[#121110] ${fresh ? "seal-in" : ""}`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={fresh ? "check-draw" : undefined}>
          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="flex min-w-0 flex-col">
        <span className="font-medium">{label}</span>
        {date && <span className="font-mono text-xs tracking-[0.08em] text-muted uppercase">{date}</span>}
      </p>
    </div>
  );
}

const stampFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome" });

/** The date under a seal, "15 giu 2027" (shown in capitals), from a day or a timestamp. */
export function stampDay(value: string | null) {
  if (!value) return "";
  return stampFmt.format(new Date(value.length === 10 ? `${value}T12:00:00` : value)).replace(".", "");
}
