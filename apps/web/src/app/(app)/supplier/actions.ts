"use server";

import { dbErrorMessage } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { supplierResponseSchema } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ResponseState = { error?: string; fields?: Record<string, string>; ok?: number };

/** The supplier answers an agency's request: available (with a price) or not. */
export async function respondToBooking(_: ResponseState, form: FormData): Promise<ResponseState> {
  await requireOrg("supplier");
  const id = z.uuid().parse(form.get("id"));
  const available = form.get("available");
  if (available !== "1" && available !== "0") return { error: "Dì se sei disponibile.", fields: { available: "Scegli una risposta" } };
  const rawPrice = String(form.get("price") ?? "")
    .trim()
    .replace(",", ".");
  const parsed = supplierResponseSchema.safeParse({
    available: available === "1",
    price: available === "1" && rawPrice !== "" ? Number(rawPrice) : null,
    note: String(form.get("note") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { error: Object.values(fields)[0], fields };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_booking", {
    p_booking: id,
    p_available: parsed.data.available,
    p_price: parsed.data.price ?? undefined,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return { error: error.code === "22023" ? "Questa richiesta non è più aperta: l'agenzia l'ha già chiusa." : dbErrorMessage(error) };
  revalidatePath("/supplier/richieste");
  revalidatePath(`/supplier/richieste/${id}`);
  return { ok: Date.now() };
}
