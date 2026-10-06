"use client";

import { createAttachment, discardAttachment } from "@/lib/attachment-actions";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_ACCEPT, ATTACHMENTS_BUCKET, isAllowedAttachment } from "@i-events/core";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Notice } from "../ui";

/** Uploads straight from the browser to Storage, after the server has registered each file. */
export function AttachmentUploader({ requestId, proposalId }: { requestId: string; proposalId: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function upload(files: FileList) {
    start(async () => {
      const supabase = createClient();
      const problems: string[] = [];
      for (const file of Array.from(files)) {
        if (!isAllowedAttachment(file.type, file.size)) {
          problems.push(`${file.name}: formato non supportato o file oltre i 25 MB.`);
          continue;
        }
        const created = await createAttachment({ requestId, proposalId, fileName: file.name, mimeType: file.type, size: file.size });
        if (!created.id || !created.path) {
          problems.push(`${file.name}: ${created.error ?? "caricamento non riuscito."}`);
          continue;
        }
        const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(created.path, file, { contentType: file.type });
        if (error) {
          await discardAttachment(created.id);
          problems.push(`${file.name}: caricamento non riuscito.`);
        }
      }
      setErrors(problems);
      if (input.current) input.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Aggiungi file
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        disabled={pending}
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
        className="text-sm"
      />
      <span className="text-sm text-muted">{pending ? "Caricamento…" : "PDF, immagini, documenti Office, CSV o ZIP, fino a 25 MB."}</span>
      {errors.map((e) => (
        <Notice key={e} tone="error">
          {e}
        </Notice>
      ))}
    </div>
  );
}
