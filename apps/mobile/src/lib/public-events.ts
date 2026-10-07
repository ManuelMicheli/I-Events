import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "@i-events/db";
import { hhmm, isTicketToken, placesLeft, todayInItaly } from "@i-events/core";
import { supabase } from "./supabase";

/**
 * The public area, as on the website: events open to everyone and the registration without an
 * account. Everything goes through the public RPCs, so it works signed out too.
 */
export type PublicEvent = Database["public"]["Functions"]["public_events"]["Returns"][number];
export type RegistrationTicket =
  Database["public"]["Functions"]["registration_ticket"]["Returns"][number];

export async function listPublicEvents(from?: string, to?: string): Promise<PublicEvent[]> {
  const { data, error } = await supabase.rpc("public_events", { p_from: from, p_to: to });
  if (error) throw error;
  return data;
}

export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data, error } = await supabase.rpc("public_event", { p_event: id });
  if (error) throw error;
  return data[0] ?? null;
}

export async function getTicket(token: string): Promise<RegistrationTicket | null> {
  if (!isTicketToken(token)) return null;
  const { data, error } = await supabase.rpc("registration_ticket", {
    p_token: token.toLowerCase(),
  });
  if (error) throw error;
  return data[0] ?? null;
}

/** Registers and keeps the ticket on this phone; returns its code. Errors keep the database code. */
export async function register(
  eventId: string,
  v: { name: string; email: string; guests: number },
): Promise<string> {
  const { data, error } = await supabase.rpc("register_for_event", {
    p_event: eventId,
    p_name: v.name,
    p_email: v.email,
    p_guests: v.guests,
  });
  if (error) throw error;
  await rememberTicket(data);
  return data;
}

/** Gives the place back: the ticket stops working and leaves this phone's list. */
export async function cancelTicket(token: string) {
  const { error } = await supabase.rpc("cancel_registration", { p_token: token });
  if (error) throw error;
  await forgetTicket(token);
}

/** Over: the agency closed it, or its last day has passed. */
export const isOver = (
  e: { status: string; start_date: string; end_date: string | null },
  today = todayInItaly(),
) => e.status === "completed" || (e.end_date ?? e.start_date) < today;

/**
 * The price row of a card or a day list, as on the website: over, tickets on the organiser's website
 * (the events of the city), sold out, or free with registration here.
 */
export function priceLabel(
  e: Pick<
    PublicEvent,
    "status" | "start_date" | "end_date" | "website" | "capacity" | "registered"
  >,
  today: string,
) {
  if (isOver(e, today)) return "Andato in scena";
  if (e.website) return "Biglietti sul sito";
  return placesLeft(e.capacity, e.registered) === 0 ? "Posti esauriti" : "Gratis";
}

/**
 * The tickets taken on this phone. There is no public account: each ticket is its code, and the
 * phone keeps the codes so "Biglietti" can list them. Newest first, at most 30.
 */
const TICKETS_KEY = "ie-biglietti";
const MAX_TICKETS = 30;

export async function savedTickets(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(TICKETS_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((t): t is string => typeof t === "string" && isTicketToken(t))
      : [];
  } catch {
    return [];
  }
}

async function rememberTicket(token: string) {
  const list = [token, ...(await savedTickets()).filter((t) => t !== token)].slice(0, MAX_TICKETS);
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(list));
}

async function forgetTicket(token: string) {
  await AsyncStorage.setItem(
    TICKETS_KEY,
    JSON.stringify((await savedTickets()).filter((t) => t !== token)),
  );
}

/** The tickets on this phone with what the database says about them; codes no longer valid are left out. */
export async function myTickets(): Promise<{ token: string; ticket: RegistrationTicket }[]> {
  const tokens = await savedTickets();
  const found = await Promise.all(
    tokens.map((t) => getTicket(t).then((ticket) => (ticket ? { token: t, ticket } : null))),
  );
  return found.filter((t): t is { token: string; ticket: RegistrationTicket } => t !== null);
}

const short = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const long = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sab 17 ott", or "Sab 17 – dom 18 ott" for an event over more days. */
export function dayLabel(start: string, end: string | null) {
  if (!end || end === start) return cap(short.format(at(start)).replace(".", ""));
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const first = sameMonth
    ? short.format(at(start)).replace(/ [^ ]+$/, "")
    : short.format(at(start));
  return cap(`${first} – ${short.format(at(end))}`.replace(/\./g, ""));
}

/** "Sabato 17 ottobre", or "Da sabato 17 a domenica 18 ottobre". */
export function longDay(start: string, end: string | null) {
  if (!end || end === start) return cap(long.format(at(start)));
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const first = sameMonth ? long.format(at(start)).replace(/ [^ ]+$/, "") : long.format(at(start));
  return `Da ${first} a ${long.format(at(end))}`;
}

/** "Ottobre 2026". */
export const monthLabel = (month: string) => cap(monthFmt.format(at(`${month}-15`)));

/** "21:00", "21:00–02:00", or null without a time. */
export function timeRange(starts: string | null, ends: string | null) {
  if (!starts) return null;
  return ends ? `${hhmm(starts)}–${hhmm(ends)}` : hhmm(starts);
}

/** One line under a title: "Sab 17 ott · 21:00 · Base Milano". */
export function eventLine(
  e: Pick<PublicEvent, "start_date" | "end_date" | "starts_at" | "city" | "venue">,
) {
  return [dayLabel(e.start_date, e.end_date), e.starts_at && hhmm(e.starts_at), e.venue || e.city]
    .filter(Boolean)
    .join(" · ");
}

export function mapsUrl(e: Pick<PublicEvent, "venue" | "city">) {
  const q = [e.venue, e.city].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
