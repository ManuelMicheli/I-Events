import "server-only";
import { hhmm, isTicketToken } from "@i-events/core";
import type { Database } from "@i-events/db";
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";

/** What the public sees of an event (public_events / public_event): never budgets, suppliers or people. */
export type PublicEvent = Database["public"]["Functions"]["public_events"]["Returns"][number];
export type RegistrationTicket = Database["public"]["Functions"]["registration_ticket"]["Returns"][number];

export async function listPublicEvents(from?: string, to?: string): Promise<PublicEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_events", { p_from: from, p_to: to });
  if (error) throw error;
  return data;
}

export async function getPublicEvent(id: string): Promise<PublicEvent | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_event", { p_event: id });
  if (error) throw error;
  return data[0] ?? null;
}

const short = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const long = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const dayOnly = new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: "UTC" });
const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sab 17 ott", or "Sab 17 – dom 18 ott" for an event over more days. */
export function shortDate(start: string, end: string | null) {
  if (!end || end === start) return cap(short.format(at(start)).replace(".", ""));
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const first = sameMonth ? short.format(at(start)).replace(/ [^ ]+$/, "") : short.format(at(start));
  return cap(`${first} – ${short.format(at(end))}`.replace(/\./g, ""));
}

/** "Sabato 17 ottobre", or "Da sabato 17 a domenica 18 ottobre". */
export function longDate(start: string, end: string | null) {
  if (!end || end === start) return cap(long.format(at(start)));
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const first = sameMonth ? long.format(at(start)).replace(/ [^ ]+$/, "") : long.format(at(start));
  return `Da ${first} a ${long.format(at(end))}`;
}

/** "21:00", "21:00–02:00", or null without a time. */
export function timeRange(starts: string | null, ends: string | null) {
  if (!starts) return null;
  return ends ? `${hhmm(starts)}–${hhmm(ends)}` : hhmm(starts);
}

export const dayNumber = (iso: string) => dayOnly.format(at(iso));

/** One line under a title: "Sab 17 ott · 21:00 · Base Milano". */
export function eventLine(e: Pick<PublicEvent, "start_date" | "end_date" | "starts_at" | "city" | "venue">) {
  return [shortDate(e.start_date, e.end_date), e.starts_at && hhmm(e.starts_at), e.venue || e.city].filter(Boolean).join(" · ");
}

export function mapsUrl(e: Pick<PublicEvent, "venue" | "city">) {
  const q = [e.venue, e.city].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/**
 * The tickets taken on this device. There is no public account yet: each ticket is its link, and
 * this cookie keeps the codes so "Biglietti" can list them. Newest first, at most 30.
 */
export const TICKETS_COOKIE = "ie_biglietti";
const MAX_TICKETS = 30;

export async function savedTickets(): Promise<string[]> {
  const raw = (await cookies()).get(TICKETS_COOKIE)?.value ?? "";
  return raw.split(".").filter(isTicketToken);
}

export async function rememberTicket(token: string) {
  const list = [token, ...(await savedTickets()).filter((t) => t !== token)].slice(0, MAX_TICKETS);
  await writeTickets(list);
}

export async function forgetTicket(token: string) {
  await writeTickets((await savedTickets()).filter((t) => t !== token));
}

async function writeTickets(list: string[]) {
  (await cookies()).set(TICKETS_COOKIE, list.join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}
