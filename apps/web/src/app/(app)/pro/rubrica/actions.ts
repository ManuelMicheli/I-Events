"use server";

import { dbErrorMessage } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_SOURCES, contactSchema, normalizeEmail, normalizePhone, type ContactDraft } from "@i-events/core";
import { getServiceClassifier } from "@/lib/service-classifier";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type ContactState = { error?: string; fields?: Record<string, string> };

/** Proposed service categories for contacts being imported, in the same order. */
export async function suggestServices(contacts: ContactDraft[], hints: (string | undefined)[]): Promise<string[][]> {
  await requireOrg("agency");
  const parsed = z.array(contactSchema).max(5000).safeParse(contacts);
  if (!parsed.success) return contacts.map(() => []);
  const safeHints = z.array(z.string().max(500).optional()).catch([]).parse(hints);
  return getServiceClassifier().classify(parsed.data, safeHints);
}

/** Batches from the import screen (the screen splits large files). */
export async function importContacts(rows: ContactDraft[], source: string): Promise<{ created?: number; merged?: number; skipped?: number; error?: string }> {
  const org = await requireOrg("agency");
  const parsed = z.array(contactSchema).max(1000).safeParse(rows);
  if (!parsed.success) return { error: "Alcuni contatti non sono validi: ricarica il file e riprova." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_contacts", {
    p_org: org.id,
    p_rows: parsed.data,
    p_source: z.enum(CONTACT_SOURCES).catch("csv").parse(source),
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/pro/rubrica");
  return data as { created: number; merged: number; skipped: number };
}

function fromForm(form: FormData) {
  const text = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? undefined : v;
  };
  const phoneRaw = text("phone");
  const emailRaw = text("email");
  const phone = normalizePhone(phoneRaw);
  const email = normalizeEmail(emailRaw);
  const fields: Record<string, string> = {};
  if (phoneRaw && !phone) fields.phone = "Numero non riconosciuto: usa il formato 333 1234567 o +39 ...";
  if (emailRaw && !email) fields.email = "Email non valida";
  const parsed = contactSchema.safeParse({
    name: text("name") ?? "",
    company: text("company"),
    role_title: text("role_title"),
    email,
    phone,
    website: text("website"),
    city: text("city"),
    notes: text("notes"),
    services: form.getAll("services").map(String),
  });
  if (!parsed.success) for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
  return { data: parsed.success ? parsed.data : null, fields };
}

export async function saveContact(_: ContactState, form: FormData): Promise<ContactState> {
  const org = await requireOrg("agency");
  const id = z.uuid().nullable().parse(form.get("id") || null);
  const { data, fields } = fromForm(form);
  if (!data || Object.keys(fields).length) return { error: "Controlla i campi evidenziati.", fields };
  const rating = z.coerce.number().int().min(1).max(5).nullable().catch(null).parse(form.get("rating") || null);
  const row = {
    name: data.name,
    company: data.company ?? null,
    role_title: data.role_title ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    website: data.website ?? null,
    city: data.city ?? null,
    notes: data.notes ?? null,
    services: data.services,
    rating,
  };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const { data: saved, error } = id
    ? await supabase.from("contacts").update(row).eq("id", id).eq("org_id", org.id).select("id").single()
    : await supabase.from("contacts").insert({ ...row, org_id: org.id, source: "manual", created_by: user.user?.id }).select("id").single();
  if (error) {
    return error.code === "23505"
      ? { error: "Esiste già un contatto con questa email o questo telefono.", fields }
      : { error: dbErrorMessage(error) };
  }
  revalidatePath("/pro/rubrica");
  redirect(`/pro/rubrica/${saved.id}?salvato=1`);
}

export async function deleteContact(form: FormData) {
  const org = await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id).eq("org_id", org.id);
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath("/pro/rubrica");
  redirect("/pro/rubrica");
}

/** Creates (or renews) the link the supplier behind a contact uses to claim its I-Events account. */
export async function inviteSupplier(form: FormData) {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_supplier", { p_contact: id });
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath(`/pro/rubrica/${id}`);
}
