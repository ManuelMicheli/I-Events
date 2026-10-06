"use server";

import {
  PORTFOLIO_BUCKET,
  PORTFOLIO_IMAGE_TYPES,
  PORTFOLIO_MAX_BYTES,
  portfolioExt,
  portfolioItemSchema,
  reviewReplySchema,
  reviewSchema,
  unavailabilitySchema,
} from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage } from "./labels";
import { getActiveOrg, getUser } from "./session";
import { createClient } from "./supabase/server";

export type FormState = { error?: string; fields?: Record<string, string>; ok?: number };

const fieldErrors = (issues: z.core.$ZodIssue[]) => {
  const fields: Record<string, string> = {};
  for (const i of issues) fields[String(i.path[0])] ??= i.message;
  return { error: Object.values(fields)[0], fields };
};

/** Limits raised by the database carry their own message in the hint. */
const errorOf = (error: { code?: string; message: string; hint?: string }) =>
  error.code === "23514" && error.hint ? error.hint : dbErrorMessage(error);

/** Pages that show the active organization's own profile. */
async function revalidateProfile() {
  const org = await getActiveOrg();
  revalidatePath(org?.type === "supplier" ? "/supplier" : "/pro/profilo");
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

/** Creates a job (no id) or updates one. */
export async function savePortfolioItem(_: FormState, form: FormData): Promise<FormState> {
  const org = await getActiveOrg();
  if (!org || org.type === "client") return { error: "Nessun profilo da modificare." };
  const parsed = portfolioItemSchema.safeParse({
    title: form.get("title") ?? "",
    description: form.get("description") ?? "",
    client_name: form.get("client_name") ?? "",
    city: form.get("city") ?? "",
    happened_on: form.get("happened_on") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error.issues);
  const id = form.get("id");
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("portfolio_items").update(parsed.data).eq("id", z.uuid().parse(id))
    : await supabase.from("portfolio_items").insert({ ...parsed.data, org_id: org.id });
  if (error) return { error: errorOf(error) };
  await revalidateProfile();
  return { ok: Date.now() };
}

/** Removes a job: its photos first, while the rows that allow deleting them still exist. */
export async function deletePortfolioItem(form: FormData) {
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { data: photos, error } = await supabase.from("portfolio_photos").select("storage_path").eq("item_id", id);
  if (error) throw error;
  if (photos.length) {
    const { error: storageError } = await supabase.storage.from(PORTFOLIO_BUCKET).remove(photos.map((p) => p.storage_path));
    if (storageError) throw new Error(storageError.message);
  }
  const { error: deleteError } = await supabase.from("portfolio_items").delete().eq("id", id);
  if (deleteError) throw new Error(dbErrorMessage(deleteError));
  await revalidateProfile();
}

const newPhotoSchema = z.object({
  itemId: z.uuid(),
  mimeType: z.enum(PORTFOLIO_IMAGE_TYPES, { error: "Usa foto JPG, PNG o WebP." }),
  size: z.number().int().min(1).max(PORTFOLIO_MAX_BYTES, { error: "La foto supera i 10 MB." }),
});

/** Registers a photo before the browser uploads it; Storage only accepts the upload at this row's path. */
export async function createPortfolioPhoto(input: {
  itemId: string;
  mimeType: string;
  size: number;
}): Promise<{ id?: string; path?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Accedi per continuare." };
  const parsed = newPhotoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase.from("portfolio_items").select("org_id").eq("id", parsed.data.itemId).maybeSingle();
  if (itemError) return { error: dbErrorMessage(itemError) };
  if (!item) return { error: "Questo lavoro non esiste più." };
  const id = crypto.randomUUID();
  const path = `${item.org_id}/${parsed.data.itemId}/${id}.${portfolioExt(parsed.data.mimeType)}`;
  // New photos go after the others (position 0, then upload order); a cover goes below the lowest position.
  const { error } = await supabase.from("portfolio_photos").insert({ id, item_id: parsed.data.itemId, org_id: item.org_id, storage_path: path });
  if (error) return { error: errorOf(error) };
  return { id, path };
}

/** Drops the row of an upload that did not complete. */
export async function discardPortfolioPhoto(id: string) {
  const supabase = await createClient();
  await supabase.from("portfolio_photos").delete().eq("id", z.uuid().parse(id));
}

export async function finishPortfolioUpload() {
  await revalidateProfile();
}

export async function deletePortfolioPhoto(form: FormData) {
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("portfolio_photos").select("storage_path").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) return;
  const { error: storageError } = await supabase.storage.from(PORTFOLIO_BUCKET).remove([row.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error: deleteError } = await supabase.from("portfolio_photos").delete().eq("id", id);
  if (deleteError) throw new Error(dbErrorMessage(deleteError));
  await revalidateProfile();
}

/** Makes a photo the cover of its job. */
export async function makeCoverPhoto(form: FormData) {
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("portfolio_photos").select("item_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) return;
  const { data: first, error: e2 } = await supabase
    .from("portfolio_photos")
    .select("position")
    .eq("item_id", row.item_id)
    .order("position")
    .limit(1)
    .single();
  if (e2) throw e2;
  const { error: e3 } = await supabase
    .from("portfolio_photos")
    .update({ position: first.position - 1 })
    .eq("id", id);
  if (e3) throw new Error(dbErrorMessage(e3));
  await revalidateProfile();
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function leaveReview(_: FormState, form: FormData): Promise<FormState> {
  const org = await getActiveOrg();
  if (!org) return { error: "Nessuna organizzazione attiva." };
  const eventId = z.uuid().parse(form.get("eventId"));
  const subjectId = z.uuid().parse(form.get("subjectId"));
  const parsed = reviewSchema.safeParse({ rating: String(form.get("rating") ?? ""), comment: String(form.get("comment") ?? "") });
  if (!parsed.success) return fieldErrors(parsed.error.issues);
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_review", {
    p_event: eventId,
    p_author: org.id,
    p_subject: subjectId,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment,
  });
  if (error) return { error: error.code === "42501" ? "Puoi lasciare la recensione quando l'evento è concluso." : dbErrorMessage(error) };
  revalidatePath(org.type === "client" ? `/client/eventi/${eventId}` : `/pro/eventi/${eventId}`);
  return { ok: Date.now() };
}

export async function replyToReview(_: FormState, form: FormData): Promise<FormState> {
  const id = z.uuid().parse(form.get("id"));
  const parsed = reviewReplySchema.safeParse(form.get("reply") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_review", { p_review: id, p_reply: parsed.data });
  if (error) return { error: dbErrorMessage(error) };
  await revalidateProfile();
  return { ok: Date.now() };
}

// ---------------------------------------------------------------------------
// Supplier availability
// ---------------------------------------------------------------------------

export async function addUnavailability(_: FormState, form: FormData): Promise<FormState> {
  const org = await getActiveOrg();
  if (!org || org.type !== "supplier") return { error: "Solo per i fornitori." };
  const starts = String(form.get("starts_on") ?? "");
  const parsed = unavailabilitySchema.safeParse({
    starts_on: starts,
    ends_on: String(form.get("ends_on") || starts),
    note: String(form.get("note") ?? ""),
  });
  if (!parsed.success) return fieldErrors(parsed.error.issues);
  const supabase = await createClient();
  const { error } = await supabase.from("supplier_unavailability").insert({ ...parsed.data, org_id: org.id });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/supplier/disponibilita");
  return { ok: Date.now() };
}

export async function removeUnavailability(form: FormData) {
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("supplier_unavailability").delete().eq("id", id);
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath("/supplier/disponibilita");
}
