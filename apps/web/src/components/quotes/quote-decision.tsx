"use client";

import { decideQuote, type QuoteDecisionState } from "@/app/(app)/client/eventi/actions";
import { ConfirmForm } from "@/components/modal";
import { Button, Notice } from "@/components/ui";
import { formatEuro } from "@i-events/core";
import { useActionState, useState } from "react";

/** Approve the quote or send it back with what to change. */
export function QuoteDecision({ quoteId, eventId, total, version }: { quoteId: string; eventId: string; total: number; version: number }) {
  const [state, action, pending] = useActionState<QuoteDecisionState, FormData>(decideQuote, {});
  const [askChanges, setAskChanges] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <ConfirmForm
          action={action}
          confirm={{
            title: `Approvi la versione ${version} del preventivo?`,
            body: (
              <>
                <span className="mb-1 block font-mono text-2xl text-text tabular-nums">{formatEuro(total)}</span>
                L&apos;agenzia riceve l&apos;approvazione e diventa il prezzo dell&apos;evento.
              </>
            ),
            confirmLabel: `Approva ${formatEuro(total)}`,
          }}
        >
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="decision" value="approve" />
          <Button type="submit" disabled={pending}>
            Approva il preventivo
          </Button>
        </ConfirmForm>
        <Button type="button" variant="secondary" onClick={() => setAskChanges((v) => !v)}>
          Chiedi modifiche
        </Button>
      </div>
      {askChanges && (
        <form action={action} className="flex flex-col gap-2">
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="decision" value="changes" />
          <label htmlFor={`quote-note-${quoteId}`} className="text-sm font-medium">
            Cosa vuoi cambiare?
          </label>
          <textarea id={`quote-note-${quoteId}`} name="note" rows={3} required maxLength={2000} className="rounded-ui border border-border bg-bg p-3 text-sm" />
          <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
            Invia richiesta di modifica
          </Button>
        </form>
      )}
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </div>
  );
}
