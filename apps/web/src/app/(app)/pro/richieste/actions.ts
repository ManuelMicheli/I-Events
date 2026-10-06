"use server";

import { dbErrorMessage } from "@/lib/labels";
import { requireOrg } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { proposalSchema, proposalTotal } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ActionState = { error?: string; ok?: boolean };

const AGENCY_MOVES = ["reviewing", "clarification", "declined", "withdrawn"] as const;

export async function moveProposal(_: ActionState, form: FormData): Promise<ActionState> {
  await requireOrg("agency");
  const id = z.uuid().parse(form.get("proposalId"));
  const status = z.enum(AGENCY_MOVES).parse(form.get("status"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_proposal_status", { p_proposal: id, p_status: status });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/pro/richieste/${id}`);
  revalidatePath("/pro");
  return { ok: true };
}

export async function submitProposal(proposalId: string, input: unknown): Promise<ActionState> {
  await requireOrg("agency");
  const id = z.uuid().parse(proposalId);
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_proposal", {
    p_proposal: id,
    p_total: proposalTotal(parsed.data.lines),
    p_summary: parsed.data.summary,
    p_lines: parsed.data.lines,
  });
  if (error) return { error: error.code === "22023" ? "La richiesta non accetta più proposte." : dbErrorMessage(error) };
  revalidatePath(`/pro/richieste/${id}`);
  revalidatePath("/pro");
  return { ok: true };
}
