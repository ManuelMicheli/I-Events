"use client";

import { Button, Notice } from "@/components/ui";
import { useActionState, useState } from "react";
import { acceptProposal, requestRevision, type DecisionState } from "../actions";

/** Accept or ask for changes on one submitted proposal. */
export function DecisionForms({ proposalId, requestId, agencyName }: { proposalId: string; requestId: string; agencyName: string }) {
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
          <Button type="submit" disabled={accepting} aria-label={`Accetta la proposta di ${agencyName}`}>
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
