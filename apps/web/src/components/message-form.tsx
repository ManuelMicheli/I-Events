"use client";

import { sendMessage, type MessageState } from "@/lib/message-actions";
import { useActionState, useEffect, useRef } from "react";
import { Button, Notice } from "./ui";

export function MessageForm({ proposalId, isAgency, path }: { proposalId: string; isAgency: boolean; path: string }) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessage, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.sent) form.current?.reset();
  }, [state.sent]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="path" value={path} />
      <label htmlFor={`msg-${proposalId}`} className="sr-only">
        Messaggio
      </label>
      <textarea id={`msg-${proposalId}`} name="body" rows={3} required maxLength={10000} placeholder="Scrivi un messaggio" className="rounded-ui border border-border bg-bg p-3 text-sm" />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          Invia
        </Button>
        {isAgency && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="internal" /> Nota interna (non visibile all&apos;azienda)
          </label>
        )}
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}
