"use server";

import { dbErrorMessage } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { flash } from "@/lib/flash";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type QuoteDecisionState = { error?: string };

export async function decideQuote(_: QuoteDecisionState, form: FormData): Promise<QuoteDecisionState> {
  await requireOrg("client");
  const quoteId = z.uuid().parse(form.get("quoteId"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const approve = form.get("decision") === "approve";
  const note = String(form.get("note") ?? "").trim();
  if (!approve && !note) return { error: "Scrivi cosa vuoi cambiare." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_event_quote", { p_quote: quoteId, p_approve: approve, p_note: note || undefined });
  if (error) {
    return { error: error.code === "22023" ? "Questo preventivo non è più in attesa di una decisione: ricarica la pagina." : dbErrorMessage(error) };
  }
  if (!approve) await flash("Richiesta di modifica inviata all'agenzia");
  revalidatePath(`/client/eventi/${eventId}`);
  revalidatePath("/client/eventi");
  revalidatePath("/client");
  return {};
}
