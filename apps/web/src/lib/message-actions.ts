"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage } from "./labels";
import { getActiveOrg, getUser } from "./session";
import { createClient } from "./supabase/server";

export type MessageState = { error?: string; sent?: number };

const messageSchema = z.object({
  proposalId: z.uuid(),
  body: z.string().trim().min(1, "Scrivi un messaggio").max(10000),
  internal: z.boolean(),
  path: z.string().regex(/^\/(pro|client)\/richieste\/[0-9a-f-]+$/),
});

export async function sendMessage(state: MessageState, form: FormData): Promise<MessageState> {
  const [user, org] = await Promise.all([getUser(), getActiveOrg()]);
  if (!user || !org) return { error: "Accedi per continuare." };
  const parsed = messageSchema.safeParse({
    proposalId: form.get("proposalId"),
    body: form.get("body"),
    internal: form.get("internal") === "on",
    path: form.get("path"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { proposalId, body, internal, path } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .insert({ proposal_id: proposalId, author_id: user.id, author_org_id: org.id, body, internal: org.type === "agency" && internal });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(path);
  return { sent: (state.sent ?? 0) + 1 };
}
