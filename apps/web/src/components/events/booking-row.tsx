"use client";

import { deleteBooking, saveBooking, type BookingState } from "@/app/(app)/pro/eventi/actions";
import { ContactActions } from "@/components/contacts/contact-actions";
import { TrashIcon } from "@/components/icons";
import { Button, Input, Select } from "@/components/ui";
import { BOOKING_STATUS_LABEL } from "@/lib/labels";
import { BOOKING_STATUSES, dayRanges, formatEuro, getServiceCategory, rangeLabel, type BookingStatus } from "@i-events/core";
import Link from "next/link";
import { useActionState, useState } from "react";

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

/**
 * One service of the event: who supplies it, where the booking stands, and what it costs.
 * `busy` lists, per contact on I-Events, the days of this event it is already taken.
 */
export function BookingRow({
  eventId,
  booking,
  contacts,
  busy = {},
}: {
  eventId: string;
  booking: Booking;
  contacts: BookingContact[];
  busy?: Record<string, string[]>;
}) {
  const [state, action, pending] = useActionState<BookingState, FormData>(saveBooking, {});
  const [contactId, setContactId] = useState(booking.contact_id ?? "");
  const service = getServiceCategory(booking.service_key);
  const name = service?.name.it ?? booking.service_key;
  const matching = contacts.filter((c) => c.services.includes(booking.service_key));
  const others = contacts.filter((c) => !c.services.includes(booking.service_key));
  const chosen = contacts.find((c) => c.id === contactId);
  const f = state.fields ?? {};

  return (
    <li className="py-4" aria-label={name}>
      <form action={action} className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <input type="hidden" name="id" value={booking.id} />
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="service_key" value={booking.service_key} />
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{name}</span>
          <Input name="description" aria-label={`Dettaglio ${name}`} defaultValue={booking.description ?? ""} placeholder="Dettaglio, visibile al fornitore (facoltativo)" maxLength={300} />
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Fornitore</span>
          <Select name="contact_id" aria-label={`Fornitore ${name}`} value={contactId} onChange={(e) => setContactId(e.target.value)}>
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
          <Input name="planned_cost" aria-label={`Costo previsto ${name}`} type="number" min={0} step="0.01" inputMode="decimal" defaultValue={booking.planned_cost ?? ""} />
          {f.planned_cost && <span className="text-danger">{f.planned_cost}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Costo reale €</span>
          <Input name="actual_cost" aria-label={`Costo reale ${name}`} type="number" min={0} step="0.01" inputMode="decimal" defaultValue={booking.actual_cost ?? ""} />
          {f.actual_cost && <span className="text-danger">{f.actual_cost}</span>}
        </label>
        <label className="flex flex-col gap-1.5 text-sm md:col-span-3">
          <span className="sr-only">Note {name}</span>
          <Input name="notes" aria-label={`Note ${name}`} defaultValue={booking.notes ?? ""} placeholder="Note interne (orari, accordi, referente sul posto)" maxLength={2000} />
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2 md:justify-end">
          <Button type="submit" variant="secondary" disabled={pending} aria-label={`Salva ${name}`}>
            Salva
          </Button>
          <Button
            type="submit"
            variant="danger"
            className="ic-host"
            formAction={deleteBooking}
            disabled={pending}
            aria-label={`Rimuovi ${name}`}
            onClick={(e) => {
              if (!confirm(`Rimuovere ${name} da questo evento?`)) e.preventDefault();
            }}
          >
            <TrashIcon />
            Rimuovi
          </Button>
        </div>
      </form>
      <SupplierAnswer booking={booking} contact={contacts.find((c) => c.id === booking.contact_id)} />
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state.saved && !state.error && (
        <p role="status" className="mt-2 text-sm text-success">
          {name} salvato.
        </p>
      )}
    </li>
  );
}

/** What the supplier said, or that it is waiting for them; suppliers not on I-Events can be invited. */
function SupplierAnswer({ booking, contact }: { booking: Booking; contact?: BookingContact }) {
  if (!contact || (booking.status !== "requested" && booking.status !== "confirmed")) return null;
  if (!contact.supplier_org_id) {
    return booking.status === "requested" ? (
      <p className="mt-2 text-sm text-muted">
        {contact.name} non è ancora su I-Events.{" "}
        <Link href={`/pro/rubrica/${contact.id}`} className="underline">
          Invitalo
        </Link>{" "}
        per ricevere la risposta qui.
      </p>
    ) : null;
  }
  if (!booking.supplier_response) {
    return booking.status === "requested" ? (
      <p className="mt-2 text-sm text-muted">Richiesta inviata a {contact.name} su I-Events, in attesa di risposta.</p>
    ) : null;
  }
  const available = booking.supplier_response === "available";
  return (
    <p role="note" className={`mt-2 text-sm ${available ? "text-success" : "text-danger"}`}>
      {available ? `${contact.name} è disponibile` : `${contact.name} non è disponibile`}
      {available && booking.supplier_price !== null && ` a ${formatEuro(booking.supplier_price)}`}
      {booking.supplier_note && <span className="text-muted">: “{booking.supplier_note}”</span>}
    </p>
  );
}
