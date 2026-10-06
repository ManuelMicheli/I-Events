"use server";

import { dbErrorMessage } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getServiceCategory, quoteSchema, type ProposalLine } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type QuoteState = { error?: string; saved?: number };

/**
 * Starts a draft from the last version sent, or else from the accepted proposal (single events) or
 * the event's services (campaign stages, priced at zero for the agency to fill in).
 */
export async function createQuoteDraft(form: FormData) {
  const org = await requireOrg("agency");
  const eventId = z.uuid().parse(form.get("eventId"));
  const supabase = await createClient();
  const { data: event, error } = await supabase.from("events").select("id, proposal_id").eq("id", eventId).eq("agency_org_id", org.id).single();
  if (error) throw new Error(dbErrorMessage(error));

  const [{ data: last }, { data: proposal }, { count }, { data: bookings }, { data: user }] = await Promise.all([
    supabase.from("event_quotes").select("lines, note").eq("event_id", eventId).not("version", "is", null).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("proposals").select("lines").eq("id", event.proposal_id).single(),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("proposal_id", event.proposal_id),
    supabase.from("event_bookings").select("service_key, description, status").eq("event_id", eventId).order("created_at"),
    supabase.auth.getUser(),
  ]);
  const lines: ProposalLine[] = last
    ? (last.lines as ProposalLine[])
    : count === 1 && proposal
      ? (proposal.lines as ProposalLine[])
      : (bookings ?? [])
          .filter((b) => b.status !== "cancelled")
          .map((b) => ({ category: b.service_key, description: b.description ?? getServiceCategory(b.service_key)?.name.it ?? b.service_key, amount: 0 }));

  const { error: insertError } = await supabase.from("event_quotes").insert({
    event_id: eventId,
    // Both parties are always taken from the event by the database.
    org_id: org.id,
    client_org_id: org.id,
    lines: lines.length > 0 ? lines : [{ category: "other", description: "", amount: 0 }],
    note: last?.note ?? null,
    created_by: user.user?.id,
  });
  if (insertError && insertError.code !== "23505") throw new Error(dbErrorMessage(insertError));
  revalidatePath(`/pro/eventi/${eventId}`);
}

export async function saveQuoteDraft(quoteId: string, eventId: string, input: unknown, send: boolean): Promise<QuoteState> {
  await requireOrg("agency");
  const id = z.uuid().parse(quoteId);
  const event = z.uuid().parse(eventId);
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controlla le voci." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_quotes")
    .update({ lines: parsed.data.lines, note: parsed.data.note || null })
    .eq("id", id)
    .select("id");
  if (error) return { error: dbErrorMessage(error) };
  if (data.length === 0) return { error: "Questo preventivo è già stato inviato: ricarica la pagina." };
  if (send) {
    const { error: sendError } = await supabase.rpc("send_event_quote", { p_quote: id });
    if (sendError) return { error: sendError.code === "22023" ? "L'evento è chiuso o il preventivo è già stato inviato." : dbErrorMessage(sendError) };
  }
  revalidatePath(`/pro/eventi/${event}`);
  return { saved: Date.now() };
}

export async function deleteQuoteDraft(form: FormData) {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("quoteId"));
  const eventId = z.uuid().parse(form.get("eventId"));
  const supabase = await createClient();
  const { error } = await supabase.from("event_quotes").delete().eq("id", id).eq("status", "draft");
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath(`/pro/eventi/${eventId}`);
}
