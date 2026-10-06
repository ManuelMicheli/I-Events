"use server";

import { dbErrorMessage } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { bookingSchema, EVENT_STATUSES, SERVICE_KEYS } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type BookingState = { error?: string; fields?: Record<string, string>; saved?: number };
export type EventState = { error?: string; ok?: boolean };

const text = (form: FormData, k: string) => {
  const v = String(form.get(k) ?? "").trim();
  return v === "" ? undefined : v;
};

/** Accepts "1500", "1500.50" and the Italian "1.500,50". */
function amount(form: FormData, k: string): number | null | "invalid" {
  const raw = text(form, k);
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const n = Number(normalized.replace(/[€\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : "invalid";
}

export async function saveBooking(_: BookingState, form: FormData): Promise<BookingState> {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const planned = amount(form, "planned_cost");
  const actual = amount(form, "actual_cost");
  const fields: Record<string, string> = {};
  if (planned === "invalid") fields.planned_cost = "Importo non valido";
  if (actual === "invalid") fields.actual_cost = "Importo non valido";
  const parsed = bookingSchema.safeParse({
    service_key: form.get("service_key"),
    description: text(form, "description"),
    contact_id: text(form, "contact_id") ?? null,
    status: form.get("status"),
    planned_cost: planned === "invalid" ? null : planned,
    actual_cost: actual === "invalid" ? null : actual,
    notes: text(form, "notes"),
  });
  if (!parsed.success) for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
  if (!parsed.success || Object.keys(fields).length) return { error: "Controlla i campi evidenziati.", fields };

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_bookings")
    .update({ ...parsed.data, description: parsed.data.description ?? null, notes: parsed.data.notes ?? null })
    .eq("id", id);
  if (error) {
    return error.code === "23514" ? { error: "Scegli prima il fornitore.", fields: { contact_id: "Scegli prima il fornitore" } } : { error: dbErrorMessage(error) };
  }
  revalidatePath(`/pro/eventi/${eventId}`);
  return { saved: Date.now() };
}

export async function addBooking(form: FormData) {
  const org = await requireOrg("agency");
  const eventId = z.uuid().parse(form.get("eventId"));
  const service = z.enum(SERVICE_KEYS as unknown as [string, ...string[]]).parse(form.get("service_key"));
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("event_bookings").insert({ event_id: eventId, org_id: org.id, service_key: service, created_by: user.user?.id });
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath(`/pro/eventi/${eventId}`);
}

export async function deleteBooking(form: FormData) {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const supabase = await createClient();
  const { error } = await supabase.from("event_bookings").delete().eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath(`/pro/eventi/${eventId}`);
}

export async function moveEvent(_: EventState, form: FormData): Promise<EventState> {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("eventId"));
  const status = z.enum(EVENT_STATUSES).parse(form.get("status"));
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").update({ status }).eq("id", id).select("id");
  if (error) return { error: dbErrorMessage(error) };
  if (data.length === 0) return { error: "Non hai i permessi per questa azione." };
  revalidatePath(`/pro/eventi/${id}`);
  revalidatePath("/pro/eventi");
  return { ok: true };
}

const date = z.iso.date().nullable();

export async function saveEventDetails(_: EventState, form: FormData): Promise<EventState> {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("eventId"));
  const parsed = z
    .object({
      start_date: date,
      end_date: date,
      city: z.string().max(120).nullable(),
      venue: z.string().max(200).nullable(),
    })
    .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, { message: "La fine non può precedere l'inizio." })
    .safeParse({
      start_date: text(form, "start_date") ?? null,
      end_date: text(form, "end_date") ?? null,
      city: text(form, "city") ?? null,
      venue: text(form, "venue") ?? null,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controlla i dati." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").update(parsed.data).eq("id", id).select("id");
  if (error) return { error: dbErrorMessage(error) };
  if (data.length === 0) return { error: "Non hai i permessi per questa azione." };
  revalidatePath(`/pro/eventi/${id}`);
  revalidatePath("/pro/eventi");
  return { ok: true };
}
