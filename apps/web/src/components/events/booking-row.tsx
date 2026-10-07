"use client";

import { ConfirmButton } from "@/components/modal";
import { deleteBooking, saveBooking, type BookingState } from "@/app/(app)/pro/eventi/actions";
import { Avatar } from "@/components/avatar";
import { ContactActions } from "@/components/contacts/contact-actions";
import { TrashIcon } from "@/components/icons";
import { ServiceSign } from "@/components/service-sign";
import { LiveDot } from "@/components/ticket";
import { Badge, Button, buttonClass, Input, Select } from "@/components/ui";
import { BOOKING_STATUS_LABEL } from "@/lib/labels";
import { BOOKING_STATUSES, dayRanges, formatEuro, getServiceCategory, rangeLabel, type BookingStatus, type EventType } from "@i-events/core";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

export type BookingContact = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  services: string[];
  /** Set when the supplier has its own I-Events account. */
  supplier_org_id: string | null;
};
export type Booking = {
  id: string;
  service_key: string;
  description: string | null;
  contact_id: string | null;
  status: BookingStatus;
  planned_cost: number | null;
  actual_cost: number | null;
  notes: string | null;
  /** The supplier's answer, when it is on I-Events. */
  supplier_response: string | null;
  supplier_price: number | null;
  supplier_note: string | null;
};

const contactLabel = (c: BookingContact, busy: boolean) =>
  (c.company && c.company !== c.name ? `${c.name} (${c.company})` : c.name) + (busy ? " · già impegnato" : "");
const money = (v: number | null) => (v === null ? "–" : formatEuro(v));

/** Where the booking stands, as a badge: the supplier's answer counts while the request is open. */
function BookingBadge({ booking, assigned }: { booking: Booking; assigned: boolean }) {
  if (booking.status === "cancelled") return <Badge tone="outline">Annullato</Badge>;
  if (booking.status === "confirmed")
    return (
      <Badge tone="success" icon="check">
        Confermato
      </Badge>
    );
  if (!assigned) return <Badge tone="outline">Da assegnare</Badge>;
  if (booking.status === "requested") {
    if (booking.supplier_response === "available")
      return (
        <Badge tone="accent">
          <LiveDot />
          Disponibile
        </Badge>
      );
    if (booking.supplier_response === "unavailable") return <Badge tone="danger">Non disponibile</Badge>;
    return (
      <Badge tone="warning" icon="clock">
        In attesa
      </Badge>
    );
  }
  return <Badge>{BOOKING_STATUS_LABEL[booking.status]}</Badge>;
}

/**
 * The services of the event as a table (Pro 3): sign, supplier, state, planned and actual cost in
 * mono. A row opens its editor underneath; without a supplier the row offers "Assegna" and the
 * editor opens on the choice of supplier. `busy` lists, per contact on I-Events, the days it is already taken.
 */
export function BookingList({
  eventId,
  type,
  bookings,
  contacts,
  busy = {},
}: {
  eventId: string;
  type: EventType | null;
  bookings: Booking[];
  contacts: BookingContact[];
  busy?: Record<string, string[]>;
}) {
  return (
    <div className="flex flex-col">
      <div aria-hidden className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_7.5rem_7rem_7rem_1.25rem] gap-4 px-3 pb-2 text-xs font-medium text-muted md:grid">
        <span>Servizio</span>
        <span>Fornitore</span>
        <span>Stato</span>
        <span className="text-right">Previsto</span>
        <span className="text-right">Reale</span>
        <span />
      </div>
      <ul className="flex flex-col border-t border-border">
        {bookings.map((b) => (
          <BookingRow key={b.id} eventId={eventId} type={type} booking={b} contacts={contacts} busy={busy} />
        ))}
      </ul>
    </div>
  );
}

function BookingRow({
  eventId,
  type,
  booking,
  contacts,
  busy,
}: {
  eventId: string;
  type: EventType | null;
  booking: Booking;
  contacts: BookingContact[];
  busy: Record<string, string[]>;
}) {
  const [open, setOpen] = useState(false);
  const name = getServiceCategory(booking.service_key)?.name.it ?? booking.service_key;
  const contact = contacts.find((c) => c.id === booking.contact_id);
  const panel = `booking-${booking.id}`;
  const cancelled = booking.status === "cancelled";

  return (
    <li aria-label={name} className={`border-b border-border ${open ? "rounded-ui bg-app" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        className={`relative grid w-full grid-cols-[minmax(0,1fr)_auto_1.25rem] items-center gap-x-3 gap-y-2 rounded-ui px-3 py-3 text-left text-sm transition-colors duration-[180ms] hover:bg-app md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_7.5rem_7rem_7rem_1.25rem] md:gap-x-4`}
      >
        <span className={`flex min-w-0 items-center gap-3 ${cancelled ? "opacity-60" : ""}`}>
          <ServiceSign service={booking.service_key} type={type} />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">{name}</span>
            {booking.description && <span className="truncate text-xs text-muted">{booking.description}</span>}
          </span>
        </span>
        <span className="col-span-3 flex min-w-0 items-center gap-2 max-md:row-start-2 max-md:pl-11 md:col-span-1">
          {contact ? (
            <>
              <Avatar name={contact.company || contact.name} size={24} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{contact.company || contact.name}</span>
                {busy[contact.id] && !cancelled && <span className="text-xs text-danger">Già impegnato in quei giorni</span>}
                {booking.status === "requested" && booking.supplier_response === "available" && booking.supplier_price !== null && (
                  <span className="text-xs text-muted">Chiede {formatEuro(booking.supplier_price)}</span>
                )}
              </span>
            </>
          ) : (
            <span className={buttonClass("secondary", "s")}>Assegna</span>
          )}
        </span>
        <span className="max-md:col-start-2 max-md:row-start-1">
          <BookingBadge booking={booking} assigned={Boolean(contact)} />
        </span>
        <span className="col-span-3 grid grid-cols-2 gap-4 font-mono tabular-nums max-md:row-start-3 max-md:pl-11 md:contents">
          <span className="flex flex-col md:block md:text-right">
            <span className="font-sans text-xs text-muted md:sr-only">Previsto </span>
            {money(booking.planned_cost)}
          </span>
          <span className="flex flex-col md:block md:text-right">
            <span className="font-sans text-xs text-muted md:sr-only">Reale </span>
            {money(booking.actual_cost)}
          </span>
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className={`text-muted transition-transform duration-[180ms] max-md:col-start-3 max-md:row-start-1 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">{open ? "Chiudi" : "Modifica"}</span>
      </button>
      {open && (
        <div id={panel} className="px-3 pt-2 pb-5">
          <BookingEditor eventId={eventId} booking={booking} name={name} contacts={contacts} busy={busy} focusSupplier={!contact} />
        </div>
      )}
    </li>
  );
}

/** The editor of one service: detail, supplier, state, costs, notes; what the supplier answered. */
function BookingEditor({
  eventId,
  booking,
  name,
  contacts,
  busy,
  focusSupplier,
}: {
  eventId: string;
  booking: Booking;
  name: string;
  contacts: BookingContact[];
  busy: Record<string, string[]>;
  focusSupplier: boolean;
}) {
  const [state, action, pending] = useActionState<BookingState, FormData>(saveBooking, {});
  const [contactId, setContactId] = useState(booking.contact_id ?? "");
  const supplier = useRef<HTMLSelectElement>(null);
  const matching = contacts.filter((c) => c.services.includes(booking.service_key));
  const others = contacts.filter((c) => !c.services.includes(booking.service_key));
  const chosen = contacts.find((c) => c.id === contactId);
  const f = state.fields ?? {};

  useEffect(() => {
    if (focusSupplier) supplier.current?.focus();
  }, [focusSupplier]);

  return (
    <>
      <form action={action} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <input type="hidden" name="id" value={booking.id} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="service_key" value={booking.service_key} />
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="text-muted">Fornitore</span>
          <Select ref={supplier} name="contact_id" aria-label={`Fornitore ${name}`} value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">Da scegliere</option>
            {matching.length > 0 && (
              <optgroup label={`Fanno ${name.toLowerCase()}`}>
                {matching.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contactLabel(c, Boolean(busy[c.id]))}
                  </option>
                ))}
              </optgroup>
            )}
            {others.length > 0 && (
              <optgroup label="Altri contatti">
                {others.map((c) => (
                  <option key={c.id} value={c.id}>
                    {contactLabel(c, Boolean(busy[c.id]))}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
          {f.contact_id && <span className="text-danger">{f.contact_id}</span>}
          {chosen && busy[chosen.id] && (
            <span role="note" className="text-danger">
              Risulta già impegnato: {dayRanges(busy[chosen.id]!).map(rangeLabel).join(", ")}. Verifica con il fornitore.
            </span>
          )}
          {chosen && <ContactActions name={chosen.name} phone={chosen.phone} email={chosen.email} />}
          {contacts.length === 0 && (
            <span className="text-muted">
              La rubrica è vuota.{" "}
              <Link href="/pro/rubrica/importa" className="text-text underline">
                Importa i tuoi fornitori
              </Link>
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="text-muted">Dettaglio, visibile al fornitore</span>
          <Input name="description" aria-label={`Dettaglio ${name}`} defaultValue={booking.description ?? ""} placeholder="Facoltativo" maxLength={300} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Stato</span>
          <Select name="status" aria-label={`Stato ${name}`} defaultValue={booking.status}>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Costo previsto €</span>
          <Input name="planned_cost" aria-label={`Costo previsto ${name}`} type="number" min={0} step="0.01" inputMode="decimal" defaultValue={booking.planned_cost ?? ""} className="font-mono tabular-nums" />
          {f.planned_cost && <span className="text-danger">{f.planned_cost}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Costo reale €</span>
          <Input name="actual_cost" aria-label={`Costo reale ${name}`} type="number" min={0} step="0.01" inputMode="decimal" defaultValue={booking.actual_cost ?? ""} className="font-mono tabular-nums" />
          {f.actual_cost && <span className="text-danger">{f.actual_cost}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Note interne</span>
          <Input name="notes" aria-label={`Note ${name}`} defaultValue={booking.notes ?? ""} placeholder="Orari, accordi, referente" maxLength={2000} />
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-4">
          <Button type="submit" variant="secondary" disabled={pending} aria-label={`Salva ${name}`}>
            Salva
          </Button>
          <ConfirmButton
            type="submit"
            variant="tertiary"
            className="ic-host text-danger!"
            formAction={deleteBooking}
            disabled={pending}
            aria-label={`Rimuovi ${name}`}
            confirm={{ title: `Rimuovere ${name} da questo evento?`, confirmLabel: "Rimuovi", danger: true }}
          >
            <TrashIcon />
            Rimuovi
          </ConfirmButton>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.saved && !state.error && (
            <p role="status" className="text-sm text-success">
              {name} salvato.
            </p>
          )}
        </div>
      </form>
      <SupplierAnswer booking={booking} contact={contacts.find((c) => c.id === booking.contact_id)} />
    </>
  );
}

/** What the supplier said, or that it is waiting for them; suppliers not on I-Events can be invited. */
function SupplierAnswer({ booking, contact }: { booking: Booking; contact?: BookingContact }) {
  if (!contact || (booking.status !== "requested" && booking.status !== "confirmed")) return null;
  if (!contact.supplier_org_id) {
    return booking.status === "requested" ? (
      <p className="mt-4 text-sm text-muted">
        {contact.name} non è ancora su I-Events.{" "}
        <Link href={`/pro/rubrica/${contact.id}`} className="text-text underline">
          Invitalo
        </Link>{" "}
        per ricevere la risposta qui.
      </p>
    ) : null;
  }
  if (!booking.supplier_response) {
    return booking.status === "requested" ? <p className="mt-4 text-sm text-muted">Richiesta inviata a {contact.name} su I-Events, in attesa di risposta.</p> : null;
  }
  const available = booking.supplier_response === "available";
  return (
    <p role="note" className={`mt-4 text-sm ${available ? "text-success" : "text-danger"}`}>
      {available ? `${contact.name} è disponibile` : `${contact.name} non è disponibile`}
      {available && booking.supplier_price !== null && ` a ${formatEuro(booking.supplier_price)}`}
      {booking.supplier_note && <span className="text-muted">: “{booking.supplier_note}”</span>}
    </p>
  );
}
