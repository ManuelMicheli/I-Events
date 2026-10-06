"use server";

import { dbErrorMessage } from "@/lib/labels";
import { draftToPayload } from "@/lib/requests";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { normalizeDraft, requestDraftSchema, submissionIssues } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type SaveResult = { id?: string; error?: string; issues?: { path: string; message: string }[] };

function issuesOf(error: z.ZodError) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

async function save(requestId: string | null, input: unknown): Promise<SaveResult & { draft?: z.infer<typeof requestDraftSchema> }> {
  const org = await requireOrg("client");
  const parsed = requestDraftSchema.safeParse(input);
  if (!parsed.success) return { error: "Controlla i campi evidenziati.", issues: issuesOf(parsed.error) };
  const draft = normalizeDraft(parsed.data);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_request_draft", {
    p_request: requestId ?? undefined,
    p_client_org: org.id,
    p_payload: draftToPayload(draft),
  });
  if (error) return { error: dbErrorMessage(error) };
  return { id: data, draft };
}

export async function saveDraft(requestId: string | null, input: unknown): Promise<SaveResult> {
  // No revalidatePath here: it would refresh the route under the wizard and reset its step.
  const { id, error, issues } = await save(requestId, input);
  return { id, error, issues };
}

export async function submitDraft(requestId: string | null, input: unknown, agencyIds: string[]): Promise<SaveResult> {
  const saved = await save(requestId, input);
  if (!saved.id || !saved.draft) return { error: saved.error, issues: saved.issues };
  const blocking = submissionIssues(saved.draft);
  if (blocking.length > 0) return { id: saved.id, error: blocking.join(". ") };
  const agencies = z.array(z.uuid()).min(1, "Scegli almeno un'agenzia").safeParse(agencyIds);
  if (!agencies.success) return { id: saved.id, error: agencies.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_request", { p_request: saved.id, p_agencies: agencies.data });
  if (error) {
    const message = error.message.startsWith("plan allows")
      ? `Il tuo piano permette di inviare la richiesta a massimo ${error.message.match(/\d+/)?.[0]} agenzie.`
      : dbErrorMessage(error);
    return { id: saved.id, error: message };
  }
  revalidatePath("/client");
  redirect(`/client/richieste/${saved.id}`);
}

export async function deleteDraft(form: FormData) {
  await requireOrg("client");
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("requests").delete().eq("id", id).eq("status", "draft");
  if (error) throw error;
  revalidatePath("/client");
  redirect("/client");
}

export async function cancelRequest(form: FormData) {
  await requireOrg("client");
  const id = z.uuid().parse(form.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_request", { p_request: id });
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath(`/client/richieste/${id}`);
}

export type DecisionState = { error?: string };

export async function acceptProposal(_: DecisionState, form: FormData): Promise<DecisionState> {
  await requireOrg("client");
  const id = z.uuid().parse(form.get("proposalId"));
  const requestId = z.uuid().parse(form.get("requestId"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_proposal", { p_proposal: id });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/client/richieste/${requestId}`);
  return {};
}

export async function requestRevision(_: DecisionState, form: FormData): Promise<DecisionState> {
  await requireOrg("client");
  const id = z.uuid().parse(form.get("proposalId"));
  const requestId = z.uuid().parse(form.get("requestId"));
  const note = z.string().trim().min(1, "Scrivi cosa cambiare").max(5000).safeParse(form.get("note"));
  if (!note.success) return { error: note.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_revision", { p_proposal: id, p_note: note.data });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/client/richieste/${requestId}`);
  return {};
}
