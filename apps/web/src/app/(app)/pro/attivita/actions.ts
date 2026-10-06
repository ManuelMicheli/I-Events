"use server";

import { dbErrorMessage } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { suggestedTasks, taskSchema } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type TaskState = { error?: string; fields?: Record<string, string>; ok?: number };

const text = (form: FormData, k: string) => {
  const v = String(form.get(k) ?? "").trim();
  return v === "" ? null : v;
};

function refresh(eventId: string) {
  revalidatePath(`/pro/eventi/${eventId}`);
  revalidatePath("/pro/attivita");
}

function parseTask(form: FormData) {
  const parsed = taskSchema.safeParse({
    title: text(form, "title") ?? "",
    notes: text(form, "notes") ?? undefined,
    due_date: text(form, "due_date"),
    assignee_id: text(form, "assignee_id"),
    booking_id: text(form, "booking_id"),
  });
  if (parsed.success) return { data: parsed.data };
  const fields: Record<string, string> = {};
  for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
  return { fields };
}

export async function addTask(_: TaskState, form: FormData): Promise<TaskState> {
  const org = await requireOrg("agency");
  const eventId = z.uuid().parse(form.get("eventId"));
  const { data, fields } = parseTask(form);
  if (!data) return { error: fields.title ?? "Controlla i campi.", fields };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("event_tasks")
    .insert({ ...data, notes: data.notes ?? null, event_id: eventId, org_id: org.id, created_by: user.user?.id });
  if (error) return { error: dbErrorMessage(error) };
  refresh(eventId);
  return { ok: Date.now() };
}

export async function updateTask(_: TaskState, form: FormData): Promise<TaskState> {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const { data, fields } = parseTask(form);
  if (!data) return { error: fields.title ?? "Controlla i campi.", fields };
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_tasks")
    .update({ ...data, notes: data.notes ?? null })
    .eq("id", id);
  if (error) return { error: dbErrorMessage(error) };
  refresh(eventId);
  return { ok: Date.now() };
}

export async function toggleTask(form: FormData) {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const done = form.get("done") === "1";
  const supabase = await createClient();
  // The database records the real completion time and who completed it.
  const { error } = await supabase
    .from("event_tasks")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
  refresh(eventId);
}

export async function deleteTask(form: FormData) {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const supabase = await createClient();
  const { error } = await supabase.from("event_tasks").delete().eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
  refresh(eventId);
}

/** Adds the usual checklist for the event's services, each tied to its booking when there is one. */
export async function addSuggestedTasks(form: FormData) {
  const org = await requireOrg("agency");
  const eventId = z.uuid().parse(form.get("eventId"));
  const supabase = await createClient();
  const [{ data: event, error: e1 }, { data: bookings, error: e2 }, { data: user }] = await Promise.all([
    supabase.from("events").select("start_date").eq("id", eventId).eq("agency_org_id", org.id).single(),
    supabase.from("event_bookings").select("id, service_key, status").eq("event_id", eventId).order("created_at"),
    supabase.auth.getUser(),
  ]);
  if (e1) throw new Error(dbErrorMessage(e1));
  if (e2) throw new Error(dbErrorMessage(e2));
  const live = bookings.filter((b) => b.status !== "cancelled");
  const rows = suggestedTasks(
    live.map((b) => b.service_key),
    event.start_date,
  ).map((t) => ({
    event_id: eventId,
    org_id: org.id,
    title: t.title,
    due_date: t.due_date,
    booking_id: t.service ? (live.find((b) => b.service_key === t.service)?.id ?? null) : null,
    created_by: user.user?.id,
  }));
  const { error } = await supabase.from("event_tasks").insert(rows);
  if (error) throw new Error(dbErrorMessage(error));
  refresh(eventId);
}
