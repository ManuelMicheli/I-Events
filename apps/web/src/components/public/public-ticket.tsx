import { Stamp, stampDay } from "@/components/ticket";
import { Logo } from "@/components/ui";
import { shortDate, type RegistrationTicket } from "@/lib/public-events";
import { formatTicketNumber, hhmm, passCode, peopleLabel } from "@i-events/core";
import type { CSSProperties, ReactNode } from "react";

/** Height of the part below the perforation: the QR (160), the code under it and the padding. */
const STUB = 238;

/**
 * The public ticket (Carta item 18, M3): vertical like a Wallet pass, the event and the person on
 * top, the ISCRITTO stamp in the event's ink, then the perforation with its notches and the QR with
 * the number and the short code. Cancelled: no QR. Over: the QR is covered.
 */
export function PublicTicket({
  ticket,
  token,
  qr,
  fresh,
  over,
}: {
  ticket: RegistrationTicket;
  token: string;
  qr: string;
  fresh: boolean;
  over: boolean;
}) {
  const cancelled = ticket.status === "cancelled";
  return (
    <article
      aria-label={`Biglietto per ${ticket.title}, a nome di ${ticket.name}`}
      style={{ "--notch-y": `${STUB}px` } as CSSProperties}
      className="notched flex flex-col rounded-card border border-border bg-bg shadow-1"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3 font-mono text-xs tracking-[0.08em] text-muted uppercase">
          <span className="inline-flex items-center gap-2 text-text">
            <Logo className="[&>span:last-child]:hidden" />
            I-Events
          </span>
          <span>Biglietto</span>
        </div>
        <h1 className="text-title2 font-semibold">{ticket.title}</h1>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          <Item label="Data">{shortDate(ticket.start_date, ticket.end_date)}</Item>
          <Item label="Ora" mono>
            {ticket.starts_at ? hhmm(ticket.starts_at) : "Da definire"}
          </Item>
          <Item label="Luogo">{ticket.venue || ticket.city || "Da definire"}</Item>
          <Item label="Ingresso">{peopleLabel(ticket.guests)}</Item>
        </dl>
        <div className="flex items-center justify-between gap-3">
          <dl className="min-w-0">
            <Item label="Nome">{ticket.name}</Item>
          </dl>
          <Stamp label="Iscritto" date={stampDay(ticket.registered_at)} type={ticket.event_type} fresh={fresh} />
        </div>
      </div>
      <div aria-hidden className="perf-rule mx-4" />
      <div style={{ height: STUB - 1 }} className="flex flex-col items-center justify-center gap-3 px-6">
        {cancelled ? (
          <p className="rounded-ui border border-border px-4 py-2 text-center font-medium">Evento annullato</p>
        ) : (
          <div className="relative">
            <div
              role="img"
              aria-label="Codice QR del biglietto"
              className="size-40 rounded-ui border border-border bg-white p-3 [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            {over && (
              <span className="absolute inset-0 flex items-center justify-center rounded-ui bg-bg/90 px-3 text-center text-sm font-medium">
                Evento concluso
              </span>
            )}
          </div>
        )}
        <p className="font-mono text-label text-muted">
          {formatTicketNumber(ticket.number)} · <span aria-label={`codice ${passCode(token).split("").join(" ")}`}>{passCode(token)}</span>
        </p>
      </div>
    </article>
  );
}

function Item({ label, mono = false, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="font-mono text-xs tracking-[0.08em] text-muted uppercase">{label}</dt>
      <dd className={`break-words ${mono ? "font-mono" : ""}`}>{children}</dd>
    </div>
  );
}
