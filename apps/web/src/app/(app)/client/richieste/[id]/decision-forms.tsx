"use client";

import { Button, Notice } from "@/components/ui";
import { useActionState, useState } from "react";
import { acceptProposal, requestRevision, type DecisionState } from "../actions";

// Important so it wins over the secondary hover fill.
const LIT =
  "group-hover/proposta:border-transparent! group-hover/proposta:bg-accent! group-hover/proposta:[&:not([aria-busy])]:text-accent-text! group-focus-within/proposta:border-transparent! group-focus-within/proposta:bg-accent! group-focus-within/proposta:[&:not([aria-busy])]:text-accent-text!";

/**
 * Accept or ask for changes on one submitted proposal. One Fiamma per page: with a single proposal to
 * decide, Accetta is it; with several, none is ahead of the others and Accetta lights up in the card
 * under the pointer or focus (`lead` false, the card is `group/proposta`).
 */
export function DecisionForms({ proposalId, requestId, agencyName, lead }: { proposalId: string; requestId: string; agencyName: string; lead: boolean }) {
  const [acceptState, accept, accepting] = useActionState<DecisionState, FormData>(acceptProposal, {});
  const [revisionState, revise, revising] = useActionState<DecisionState, FormData>(requestRevision, {});
  const [askChanges, setAskChanges] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <form
          action={accept}
          onSubmit={(e) => {
            if (!confirm(`Accetti la proposta di ${agencyName}? Le altre agenzie riceveranno l'esito.`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="proposalId" value={proposalId} />
          <input type="hidden" name="requestId" value={requestId} />
          <Button
            type="submit"
            variant={lead ? "primary" : "secondary"}
            className={lead ? undefined : LIT}
            disabled={accepting}
            aria-label={`Accetta la proposta di ${agencyName}`}
          >
            Accetta
          </Button>
        </form>
        <Button type="button" variant="secondary" onClick={() => setAskChanges((v) => !v)}>
          Chiedi modifiche
        </Button>
      </div>
      {askChanges && (
        <form action={revise} className="flex flex-col gap-2">
          <input type="hidden" name="proposalId" value={proposalId} />
          <input type="hidden" name="requestId" value={requestId} />
          <label htmlFor={`rev-${proposalId}`} className="text-sm font-medium">
            Cosa vuoi cambiare?
          </label>
          <textarea id={`rev-${proposalId}`} name="note" rows={3} required maxLength={5000} className="rounded-ui border border-border bg-bg p-3 text-sm" />
          <Button type="submit" variant="secondary" className="self-start" disabled={revising}>
            Invia richiesta di modifica
          </Button>
        </form>
      )}
      {(acceptState.error || revisionState.error) && <Notice tone="error">{acceptState.error ?? revisionState.error}</Notice>}
    </div>
  );
}
