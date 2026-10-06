import "server-only";
import type { ScheduleItem } from "@/components/run-of-show/schedule";
import { createClient } from "@/lib/supabase/server";
import { crewMembers, eventDays, getServiceCategory, todayInItaly } from "@i-events/core";
import { notFound } from "next/navigation";

/** Everything the run of show pages need for one of the agency's events. */
export async function loadRunOfShow(eventId: string, orgId: string) {
  if (!/^[0-9a-f-]{36}$/.test(eventId)) notFound();
  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("id, title, status, start_date, end_date, city, venue, client:organizations!events_client_org_id_fkey(name)")
    .eq("id", eventId)
    .eq("agency_org_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!event) notFound();

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
    supabase
      .from("event_bookings")
      .select("id, service_key, description, status, contact:contacts(name, company, phone)")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase.from("memberships").select("user_id, profiles(full_name)").eq("org_id", orgId).order("created_at"),
  ]);
  for (const r of [itemsRes, crewRes, bookingsRes, membersRes]) if (r.error) throw r.error;

  const serviceName = (key: string) => getServiceCategory(key)?.name.it ?? key;
  const bookingRows = bookingsRes.data!;
  const bookings = bookingRows
    .filter((b) => b.status !== "cancelled")
    .map((b) => ({
      id: b.id,
      label: [b.contact?.company || b.contact?.name, b.description ? `${serviceName(b.service_key)}: ${b.description}` : serviceName(b.service_key)]
        .filter(Boolean)
        .join(" · "),
    }));
  const members = membersRes.data!.map((m) => ({
    id: m.user_id,
    label: m.profiles?.full_name || "Collega senza nome",
  }));

  const crew = crewMembers(crewRes.data!, bookingRows);
  const items: ScheduleItem[] = itemsRes.data!;
  const days = eventDays(event.start_date, event.end_date, [...items.map((i) => i.day), ...crew.map((c) => c.day)]);
  const listedBookings = new Set(crewRes.data!.map((c) => `${c.day}|${c.booking_id}`));
  const defaultDay = days[0] ?? todayInItaly();
  const suppliersToList = bookingRows.filter((b) => b.status !== "cancelled" && b.contact && !listedBookings.has(`${defaultDay}|${b.id}`)).length;

  const services = bookingRows.filter((b) => b.status !== "cancelled").map((b) => b.service_key);

  return { event, items, crew, bookings, members, days, defaultDay, suppliersToList, services };
}
