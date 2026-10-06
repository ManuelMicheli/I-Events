"use client";

import { Button, Notice } from "@/components/ui";
import { useActionState } from "react";
import { moveProposal, type ActionState } from "../actions";

const LABEL = {
  reviewing: "Prendi in carico",
  clarification: "Segna in attesa di chiarimenti",
  declined: "Rifiuta la richiesta",
  withdrawn: "Ritira la proposta",
} as const;

export function StatusActions({ proposalId, moves }: { proposalId: string; moves: (keyof typeof LABEL)[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(moveProposal, {});
  if (moves.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {moves.map((m) => (
          <form key={m} action={action}>
            <input type="hidden" name="proposalId" value={proposalId} />
            <input type="hidden" name="status" value={m} />
            <Button type="submit" variant={m === "declined" || m === "withdrawn" ? "danger" : m === "reviewing" ? "primary" : "secondary"} disabled={pending}>
              {LABEL[m]}
            </Button>
          </form>
        ))}
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </div>
  );
}
