import { z } from "zod";

/**
 * Public area: the calendar of events open to the public and the registration without an account.
 * Registering gives a ticket that opens from its link; the database keeps one per email and event.
 */

export const MAX_GUESTS = 4;

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Scrivi nome e cognome").max(120, "Al massimo 120 caratteri"),
  email: z.email("Controlla l'email: manca qualcosa").max(254),
  guests: z.coerce.number().int().min(1, "Almeno una persona").max(MAX_GUESTS, `Al massimo ${MAX_GUESTS} persone`),
  consent: z.literal(true, "Serve il tuo consenso per iscriverti"),
});
export type Registration = z.infer<typeof registrationSchema>;

/** Places still free, or null when the event has no limit. Never below zero. */
export function placesLeft(capacity: number | null, registered: number): number | null {
  return capacity === null ? null : Math.max(capacity - registered, 0);
}

/** Below this many places left the page says "Ultimi N posti"; above it, nothing. */
export const FEW_PLACES = 20;

/** "Ultimi 12 posti", "Ultimo posto", "Esaurito", or null when there is room enough or no limit. */
export function placesLabel(capacity: number | null, registered: number): string | null {
  const left = placesLeft(capacity, registered);
  if (left === null || left > FEW_PLACES) return null;
  if (left === 0) return "Esaurito";
  return left === 1 ? "Ultimo posto" : `Ultimi ${left} posti`;
}

/** Messages for the errors register_for_event raises. */
export function registrationErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "P0002":
      return "Questo evento non è più aperto al pubblico.";
    case "22023":
      return "Le iscrizioni a questo evento sono chiuse.";
    case "23505":
      return "Questa email è già iscritta. Il biglietto è nel link che hai ricevuto all'iscrizione.";
    case "23514":
      return "Controlla nome, email e numero di persone.";
    case "P0001": {
      const left = Number(/not enough places: (\d+)/.exec(error.message)?.[1]);
      if (Number.isNaN(left)) break;
      if (left === 0) return "I posti sono finiti mentre ti iscrivevi.";
      return left === 1 ? "Resta un solo posto: iscrivi una persona." : `Restano ${left} posti: iscrivi al massimo ${left} persone.`;
    }
  }
  return "Non riusciamo a completare l'iscrizione. Riprova tra poco.";
}

export const ticketUrl = (siteUrl: string, token: string) => `${siteUrl.replace(/\/$/, "")}/biglietto/${token}`;

/** A ticket code is 32 hexadecimal characters; anything else is not worth asking the database about. */
export const isTicketToken = (value: string) => /^[0-9a-fA-F]{32}$/.test(value);

/** "1 persona", "3 persone". */
export const peopleLabel = (n: number) => (n === 1 ? "1 persona" : `${n} persone`);

/** The month before or after: shiftMonth("2026-12", 1) is "2027-01". */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const isMonth = (value: unknown): value is string => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const isDay = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Whether an event spanning start..end (ISO days) takes place on day. */
export const onDay = (event: { start_date: string; end_date: string | null }, day: string) =>
  event.start_date <= day && (event.end_date ?? event.start_date) >= day;
