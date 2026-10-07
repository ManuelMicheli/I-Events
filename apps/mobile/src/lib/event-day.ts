import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { crewMembers, eventDays, getServiceCategory, keepDayOnPhone, todayInItaly, withSentCheckins, type CrewMember } from "@i-events/core";
import { supabase } from "./supabase";

export type DayItem = {
  id: string;
  day: string;
  starts_at: string;
  ends_at: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  /** Who takes care of it: the supplier and the colleague in charge. */
  supplier: string | null;
  referent: string | null;
};

/** Everything the event day screen shows, small enough to keep on the phone. */
export type EventDay = {
  event: { id: string; title: string; city: string | null; venue: string | null; client: string };
  days: string[];
  items: DayItem[];
  crew: CrewMember[];
};

const serviceName = (key: string) => getServiceCategory(key)?.name.it ?? key;

/** Loads the day of one of the agency's events from the server; null when the event is not theirs. */
export async function fetchEventDay(eventId: string, orgId: string): Promise<EventDay | null> {
  if (!/^[0-9a-f-]{36}$/.test(eventId)) return null;
  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, start_date, end_date, city, venue, client:organizations!events_client_org_id_fkey(name)")
    .eq("id", eventId)
    .eq("agency_org_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!event) return null;

  const [itemsRes, crewRes, bookingsRes, membersRes] = await Promise.all([
    supabase
      .from("event_schedule_items")
      .select("id, day, starts_at, ends_at, title, location, notes, booking_id, assignee_id")
      .eq("event_id", eventId)
      .order("day")
      .order("starts_at"),
    supabase
      .from("event_crew")
      .select("id, booking_id, user_id, name, role, phone, day, call_time, checked_in_at, pass_token, profile:profiles(full_name)")
      .eq("event_id", eventId)
      .order("day")
      .order("call_time", { nullsFirst: false })
      .order("created_at"),
    supabase.from("event_bookings").select("id, service_key, description, status, contact:contacts(name, company, phone)").eq("event_id", eventId),
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("org_id", orgId),
  ]);
  for (const r of [itemsRes, crewRes, bookingsRes, membersRes]) if (r.error) throw r.error;

  const bookings = bookingsRes.data!;
  const supplierOf = (id: string | null) => {
    const b = id ? bookings.find((x) => x.id === id && x.status !== "cancelled") : undefined;
    if (!b) return null;
    return [b.contact?.company || b.contact?.name, b.description ? `${serviceName(b.service_key)}: ${b.description}` : serviceName(b.service_key)]
      .filter(Boolean)
      .join(" · ");
  };
  const referentOf = (id: string | null) => (id ? (membersRes.data!.find((m) => m.user_id === id)?.profiles?.full_name ?? null) : null);

  const items = itemsRes.data!.map(({ booking_id, assignee_id, ...i }) => ({
    ...i,
    supplier: supplierOf(booking_id),
    referent: referentOf(assignee_id),
  }));
  const crew = crewMembers(crewRes.data!, bookings);
  const days = eventDays(event.start_date, event.end_date, [...items.map((i) => i.day), ...crew.map((c) => c.day)]);
  return {
    event: { id: event.id, title: event.title, city: event.city, venue: event.venue, client: event.client.name },
    days,
    items,
    crew,
  };
}

const PREFIX = "ie-day-";
type Saved = { v: 2; orgId: string; savedAt: string; day: EventDay };

/** The copy kept on the phone from the last time the day loaded, for this organization only. */
export async function readSavedDay(eventId: string, orgId: string): Promise<{ day: EventDay; savedAt: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + eventId);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    return s.v === 2 && s.orgId === orgId && s.day?.event?.id === eventId ? { day: s.day, savedAt: s.savedAt } : null;
  } catch {
    return null;
  }
}

export async function saveDay(orgId: string, day: EventDay): Promise<string> {
  const savedAt = new Date().toISOString();
  const s: Saved = { v: 2, orgId, savedAt, day };
  await AsyncStorage.setItem(PREFIX + day.event.id, JSON.stringify(s)).catch(() => {});
  return savedAt;
}

/** Writes check-ins the server took into the saved copy, so the day reopens right even without signal. */
export async function saveCheckinsInDay(eventId: string, sent: readonly { id: string; at: string | null }[]): Promise<void> {
  if (sent.length === 0) return;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + eventId);
    if (!raw) return;
    const s = JSON.parse(raw) as Saved;
    if (s.v !== 2) return;
    s.day.crew = withSentCheckins(s.day.crew, sent);
    await AsyncStorage.setItem(PREFIX + eventId, JSON.stringify(s));
  } catch {
    // The next load from the server brings them anyway.
  }
}

/** Keeps a copy of the day on the phone ahead of time, so it opens even where the venue has no signal. */
export async function prefetchEventDay(eventId: string, orgId: string): Promise<void> {
  try {
    const day = await fetchEventDay(eventId, orgId);
    if (day) await saveDay(orgId, day);
  } catch {
    // No connection now: the screen loads it when opened.
  }
}

/** On sign out: phone numbers and names of the crew do not stay on the phone. */
export async function forgetSavedDays(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Saves on the phone, while there is signal, the agency's events happening these days, ready for the venue.
 * Used by the screens that load the agency's events: Home, which opens first, and Eventi.
 */
export function useKeepEventDays(orgId: string, events: readonly { id: string; status: string; start_date: string | null; end_date: string | null }[] | undefined) {
  const key = events ? events.filter((e) => keepDayOnPhone(e, todayInItaly())).map((e) => e.id).join(",") : "";
  useEffect(() => {
    for (const id of key ? key.split(",") : []) void prefetchEventDay(id, orgId);
  }, [key, orgId]);
}
