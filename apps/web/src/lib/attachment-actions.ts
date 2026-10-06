"use server";

import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES, ATTACHMENTS_BUCKET, storageSafeName } from "@i-events/core";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbErrorMessage } from "./labels";
import { getUser } from "./session";
import { createClient } from "./supabase/server";

const pathSchema = z.string().regex(/^\/(pro|client)\/richieste\/[0-9a-f-]+(\/modifica)?$/);

const newAttachmentSchema = z.object({
  requestId: z.uuid(),
  proposalId: z.uuid().nullable(),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(ATTACHMENT_MIME_TYPES, { error: "Formato non supportato: usa PDF, immagini, documenti Office, CSV o ZIP." }),
  size: z.number().int().min(1).max(ATTACHMENT_MAX_BYTES, { error: "Il file supera i 25 MB." }),
});

export type NewAttachment = Omit<z.input<typeof newAttachmentSchema>, "mimeType"> & { mimeType: string };

/**
 * Registers a file before the browser uploads it. The row is checked by the database permissions,
 * and Storage only accepts an upload at the path of a row created by the same person.
 */
export async function createAttachment(input: NewAttachment): Promise<{ id?: string; path?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Accedi per continuare." };
  const parsed = newAttachmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { requestId, proposalId, fileName, mimeType, size } = parsed.data;
  const id = crypto.randomUUID();
  const path = `${requestId}/${id}/${storageSafeName(fileName)}`;
  const supabase = await createClient();
  const { error } = await supabase.from("request_attachments").insert({
    id,
    request_id: requestId,
    proposal_id: proposalId,
    storage_path: path,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: size,
    uploaded_by: user.id,
  });
  if (error) return { error: dbErrorMessage(error) };
  return { id, path };
}

/** Drops the row of an upload that did not complete. */
export async function discardAttachment(id: string) {
  const supabase = await createClient();
  await supabase.from("request_attachments").delete().eq("id", z.uuid().parse(id));
}

export async function removeAttachment(form: FormData) {
  const id = z.uuid().parse(form.get("id"));
  const path = pathSchema.parse(form.get("path"));
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("request_attachments").select("storage_path").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!row) return;
  // Object first: its delete permission is checked against the row, which must still exist.
  const { error: storageError } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([row.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error: deleteError } = await supabase.from("request_attachments").delete().eq("id", id);
  if (deleteError) throw new Error(dbErrorMessage(deleteError));
  revalidatePath(path);
}
