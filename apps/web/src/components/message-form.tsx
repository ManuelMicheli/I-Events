"use client";

import { sendMessage, type MessageState } from "@/lib/message-actions";
import { useActionState, useEffect, useRef } from "react";
import { SendIcon } from "./icons";
import { Button, Notice } from "./ui";

export function MessageForm({ proposalId, isAgency, path }: { proposalId: string; isAgency: boolean; path: string }) {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessage, {});
  const form = useRef<HTMLFormElement>(null);
  const plane = useRef<SVGSVGElement>(null);
  // Every message that leaves flies the plane off (A10); the state is a new object each time.
  useEffect(() => {
    if (!state.sent) return;
    form.current?.reset();
    const el = plane.current;
    if (!el) return;
    el.classList.remove("is-sent");
    void el.getBoundingClientRect();
    el.classList.add("is-sent");
    const t = setTimeout(() => el.classList.remove("is-sent"), 760);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="path" value={path} />
      <label htmlFor={`msg-${proposalId}`} className="sr-only">
        Messaggio
      </label>
      <textarea id={`msg-${proposalId}`} name="body" rows={3} required maxLength={10000} placeholder="Scrivi un messaggio" className="rounded-ui border border-border bg-bg p-3 text-sm" />
      <div className="flex items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending} className="ic-host">
          <SendIcon ref={plane} />
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
