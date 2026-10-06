"use server";

import { dbErrorMessage } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { crewSchema, hhmm, normalizePhone, scheduleItemSchema, suggestedSchedule, timeSchema } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type RosState = { error?: string; fields?: Record<string, string>; ok?: number };

const text = (form: FormData, k: string) => {
  const v = String(form.get(k) ?? "").trim();
  return v === "" ? null : v;
};

function refresh(eventId: string) {
  revalidatePath(`/pro/eventi/${eventId}`);
  revalidatePath(`/pro/eventi/${eventId}/scaletta`);
  revalidatePath(`/pro/eventi/${eventId}/live`);
}

function firstIssues(issues: readonly z.core.$ZodIssue[]) {
  const fields: Record<string, string> = {};
  for (const i of issues) fields[String(i.path[0])] ??= i.message;
  return fields;
}

function parseItem(form: FormData) {
  const parsed = scheduleItemSchema.safeParse({
    day: text(form, "day") ?? "",
    starts_at: text(form, "starts_at") ?? "",
    ends_at: text(form, "ends_at"),
    title: text(form, "title") ?? "",
    location: text(form, "location") ?? undefined,
    notes: text(form, "notes") ?? undefined,
    booking_id: text(form, "booking_id"),
    assignee_id: text(form, "assignee_id"),
  });
  if (parsed.success)
    return {
      data: {
        ...parsed.data,
        location: parsed.data.location ?? null,
        notes: parsed.data.notes ?? null,
      },
    };
  return { fields: firstIssues(parsed.error.issues) };
}

const firstError = (fields: Record<string, string>) => Object.values(fields)[0] ?? "Controlla i campi.";

export async function addScheduleItem(_: RosState, form: FormData): Promise<RosState> {
  const org = await requireOrg("agency");
  const eventId = z.uuid().parse(form.get("eventId"));
  const { data, fields } = parseItem(form);
  if (!data) return { error: firstError(fields), fields };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("event_schedule_items").insert({ ...data, event_id: eventId, org_id: org.id, created_by: user.user?.id });
  if (error) return { error: dbErrorMessage(error) };
  refresh(eventId);
  return { ok: Date.now() };
}

export async function updateScheduleItem(_: RosState, form: FormData): Promise<RosState> {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const { data, fields } = parseItem(form);
  if (!data) return { error: firstError(fields), fields };
  const supabase = await createClient();
  const { error } = await supabase.from("event_schedule_items").update(data).eq("id", id);
  if (error) return { error: dbErrorMessage(error) };
  refresh(eventId);
  return { ok: Date.now() };
}

export async function deleteScheduleItem(form: FormData) {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const supabase = await createClient();
  const { error } = await supabase.from("event_schedule_items").delete().eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
  refresh(eventId);
}

/** Fills an empty run of show with the usual evening for the event's services, tied to their bookings. */
export async function addSuggestedSchedule(_: RosState, form: FormData): Promise<RosState> {
  const org = await requireOrg("agency");
  const eventId = z.uuid().parse(form.get("eventId"));
  const day = z.iso.date().safeParse(text(form, "day"));
  const doors = timeSchema.safeParse(text(form, "doors_open"));
  if (!day.success) return { error: "Scegli il giorno dell'evento.", fields: { day: "Scegli il giorno" } };
  if (!doors.success)
    return {
      error: doors.error.issues[0]!.message,
      fields: { doors_open: doors.error.issues[0]!.message },
    };
  const supabase = await createClient();
  const [{ data: bookings, error: e1 }, { data: user }] = await Promise.all([
    supabase.from("event_bookings").select("id, service_key, status").eq("event_id", eventId).eq("org_id", org.id).order("created_at"),
    supabase.auth.getUser(),
  ]);
  if (e1) return { error: dbErrorMessage(e1) };
  const live = bookings.filter((b) => b.status !== "cancelled");
  const rows = suggestedSchedule(
    live.map((b) => b.service_key),
    day.data,
    doors.data,
  ).map((s) => ({
    event_id: eventId,
    org_id: org.id,
    day: s.day,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    title: s.title,
    booking_id: s.service ? (live.find((b) => b.service_key === s.service)?.id ?? null) : null,
    created_by: user.user?.id,
  }));
  const { error } = await supabase.from("event_schedule_items").insert(rows);
  if (error) return { error: dbErrorMessage(error) };
  refresh(eventId);
  return { ok: Date.now() };
}

function parseCrew(form: FormData) {
  const parsed = crewSchema.safeParse({
    day: text(form, "day") ?? "",
    call_time: text(form, "call_time"),
    name: text(form, "name") ?? undefined,
    role: text(form, "role") ?? undefined,
    phone: text(form, "phone") ?? undefined,
  });
  if (parsed.success) {
    const d = parsed.data;
    return {
      data: {
        day: d.day,
        call_time: d.call_time,
        name: d.name ?? null,
        role: d.role ?? null,
        phone: d.phone ? (normalizePhone(d.phone) ?? d.phone) : null,
      },
    };
  }
  return { fields: firstIssues(parsed.error.issues) };
}

/** Adds a colleague (`person` = their user id) or an external person by name to the arrivals. */
export async function addCrew(_: RosState, form: FormData): Promise<RosState> {
  const org = await requireOrg("agency");
  const eventId = z.uuid().parse(form.get("eventId"));
  const { data, fields } = parseCrew(form);
  if (!data) return { error: firstError(fields), fields };
  const person = text(form, "person");
  const userId = person && person !== "external" ? z.uuid().parse(person) : null;
  if (!userId && !data.name) return { error: "Scegli un collega o scrivi il nome.", fields: { name: "Scrivi il nome" } };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("event_crew").insert({
    ...data,
    name: userId ? null : data.name,
    user_id: userId,
    event_id: eventId,
    org_id: org.id,
    created_by: user.user?.id,
  });
  if (error)
    return {
      error: error.code === "23505" ? "È già nell'elenco per quel giorno." : dbErrorMessage(error),
    };
  refresh(eventId);
  return { ok: Date.now() };
}

export async function updateCrew(_: RosState, form: FormData): Promise<RosState> {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const { data, fields } = parseCrew(form);
  if (!data) return { error: firstError(fields), fields };
  const supabase = await createClient();
  // The name only applies to people without an account or a booking.
  const { name, ...rest } = data;
  const { error } = await supabase
    .from("event_crew")
    .update(form.get("hasName") === "1" ? { ...rest, name } : rest)
    .eq("id", id);
  if (error)
    return {
      error: error.code === "23505" ? "È già nell'elenco per quel giorno." : dbErrorMessage(error),
    };
  refresh(eventId);
  return { ok: Date.now() };
}

export async function deleteCrew(form: FormData) {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const supabase = await createClient();
  const { error } = await supabase.from("event_crew").delete().eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
  refresh(eventId);
}

/**
 * Lists on `day` every supplier booked for the event that is not there yet. The call time is the
 * start of the first moment of the run of show that supplier is part of that day.
 */
export async function addCrewFromBookings(form: FormData) {
  const org = await requireOrg("agency");
  const eventId = z.uuid().parse(form.get("eventId"));
  const day = z.iso.date().parse(form.get("day"));
  const supabase = await createClient();
  const [bookings, crew, items, { data: user }] = await Promise.all([
    supabase.from("event_bookings").select("id, status, contact_id").eq("event_id", eventId).eq("org_id", org.id).order("created_at"),
    supabase.from("event_crew").select("booking_id").eq("event_id", eventId).eq("day", day),
    supabase.from("event_schedule_items").select("booking_id, starts_at").eq("event_id", eventId).eq("day", day).order("starts_at"),
    supabase.auth.getUser(),
  ]);
  for (const r of [bookings, crew, items]) if (r.error) throw new Error(dbErrorMessage(r.error));
  const listed = new Set(crew.data!.map((c) => c.booking_id));
  const rows = bookings
    .data!.filter((b) => b.status !== "cancelled" && b.contact_id && !listed.has(b.id))
    .map((b) => ({
      event_id: eventId,
      org_id: org.id,
      booking_id: b.id,
      day,
      call_time: hhmm(items.data!.find((i) => i.booking_id === b.id)?.starts_at ?? null),
      created_by: user.user?.id,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("event_crew").insert(rows);
  if (error) throw new Error(dbErrorMessage(error));
  refresh(eventId);
}

const checkinsSchema = z
  .array(z.object({ id: z.uuid(), at: z.iso.datetime({ offset: true }).nullable() }))
  .min(1)
  .max(500);

/**
 * Records check-ins made on site, possibly while offline: `at` is when the person arrived (null to
 * undo). Returns the ids that could not be saved, so the device keeps only those for later.
 */
export async function syncCheckins(eventId: string, entries: unknown): Promise<{ failed: string[]; error?: string }> {
  await requireOrg("agency");
  const event = z.uuid().parse(eventId);
  const parsed = checkinsSchema.safeParse(entries);
  if (!parsed.success) return { failed: [], error: "Dati del check-in non validi." };
  const supabase = await createClient();
  const failed: string[] = [];
  let error: string | undefined;
  for (const e of parsed.data) {
    const res = await supabase.from("event_crew").update({ checked_in_at: e.at }).eq("id", e.id).eq("event_id", event);
    if (res.error) {
      failed.push(e.id);
      error = dbErrorMessage(res.error);
    }
  }
  refresh(event);
  return { failed, error };
}
