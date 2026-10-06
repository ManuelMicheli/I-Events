import { removeAttachment } from "@/lib/attachment-actions";
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENTS_BUCKET, formatBytes } from "@i-events/core";
import { Card, Empty } from "../ui";
import { AttachmentUploader } from "./uploader";

type Props = {
  requestId: string;
  /** Files of one proposal; omit for the request's own files. */
  proposalId?: string;
  canWrite: boolean;
  /** Page to refresh after a change. */
  path: string;
  title?: string;
  emptyText?: string;
};

/** Files with short-lived download links. What is listed is exactly what the database lets this person read. */
export async function Attachments({ requestId, proposalId, canWrite, path, title = "Allegati", emptyText = "Nessun allegato." }: Props) {
  const supabase = await createClient();
  let query = supabase.from("request_attachments").select("id, file_name, size_bytes, storage_path, created_at").eq("request_id", requestId);
  query = proposalId ? query.eq("proposal_id", proposalId) : query.is("proposal_id", null);
  const { data: files, error } = await query.order("created_at");
  if (error) throw error;
  if (files.length === 0 && !canWrite) return null;

  const { data: signed } = files.length
    ? await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrls(files.map((f) => f.storage_path), 60 * 60)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).filter((s) => !s.error && s.signedUrl).map((s) => [s.path, s.signedUrl]));

  return (
    <Card title={title}>
      {files.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        <ul className="mb-4 divide-y divide-border text-sm">
          {files.map((f) => {
            const url = urlByPath.get(f.storage_path);
            return (
              <li key={f.id} className="flex items-center justify-between gap-4 py-2">
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="underline">
                    {f.file_name}
                  </a>
                ) : (
                  <span className="text-muted">{f.file_name} (caricamento non completato)</span>
                )}
                <span className="flex items-center gap-4 text-muted">
                  {f.size_bytes ? formatBytes(f.size_bytes) : null}
                  {canWrite && (
                    <form action={removeAttachment}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="path" value={path} />
                      <button type="submit" className="underline" aria-label={`Rimuovi ${f.file_name}`}>
                        Rimuovi
                      </button>
                    </form>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {canWrite && <AttachmentUploader requestId={requestId} proposalId={proposalId ?? null} />}
    </Card>
  );
}
