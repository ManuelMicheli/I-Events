"use client";

import { writeToOthers, type ThanksState } from "@/app/(app)/client/richieste/actions";
import { SendIcon } from "@/components/icons";
import { Button, Card, Notice } from "@/components/ui";
import { useActionState } from "react";

/** After "Accetta" with "un messaggio mio": one message to the agencies not chosen, ready to edit. */
export function WriteToOthers({ requestId, back, title, others }: { requestId: string; back: string; title: string; others: number }) {
  const [state, action, pending] = useActionState<ThanksState, FormData>(writeToOthers, {});
  return (
    <Card title={others === 1 ? "Il tuo messaggio all'altra agenzia" : `Il tuo messaggio alle altre ${others} agenzie`}>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="back" value={back} />
        <label htmlFor="others-body" className="text-sm text-muted">
          Arriva nella conversazione con ognuna, a tuo nome.
        </label>
        <textarea
          id="others-body"
          name="body"
          rows={4}
          required
          maxLength={10000}
          defaultValue={`Grazie per la proposta per «${title}». Questa volta abbiamo scelto un'altra agenzia, ma ci farà piacere lavorare con voi in futuro.`}
          className="rounded-ui border border-border bg-bg p-3 text-sm"
        />
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Button type="submit" variant="secondary" pending={pending} disabled={pending} className="ic-host self-start">
          <SendIcon />
          {others === 1 ? "Invia" : `Invia a ${others} agenzie`}
        </Button>
      </form>
    </Card>
  );
}
