"use client";

import { respondToBooking, type ResponseState } from "@/app/(app)/supplier/actions";
import { Segmented } from "@/components/controls";
import { SendIcon } from "@/components/icons";
import { Button, Field, Input } from "@/components/ui";
import { useActionState, useState } from "react";

/** The supplier's answer to a request: available with a price, or not available, plus a note. */
export function ResponseForm({
  bookingId,
  initial,
}: {
  bookingId: string;
  initial: { available: boolean | null; price: number | null; note: string | null };
}) {
  const [state, action, pending] = useActionState<ResponseState, FormData>(respondToBooking, {});
  const [available, setAvailable] = useState<"1" | "0" | null>(initial.available === null ? null : initial.available ? "1" : "0");
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={bookingId} />
      <Segmented
        legend="Sei disponibile?"
        name="available"
        options={[
          { value: "1", label: "Sì, disponibile" },
          { value: "0", label: "Non disponibile" },
        ]}
        value={available}
        onChange={setAvailable}
      />
      {available === "1" && (
        <Field label="Il tuo prezzo €" hint="Facoltativo. L'agenzia lo vede insieme alla tua risposta." error={state.fields?.price}>
          <Input name="price" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={initial.price ?? ""} className="max-w-48" />
        </Field>
      )}
      <Field label="Messaggio per l'agenzia">
        <Input name="note" maxLength={2000} defaultValue={initial.note ?? ""} placeholder="Cosa è incluso, orari, condizioni…" />
      </Field>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && !state.error && (
        <p role="status" className="text-sm text-success">
          Risposta inviata all&apos;agenzia.
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending || available === null} className="ic-host">
          <SendIcon />
          {initial.available === null ? "Invia risposta" : "Aggiorna risposta"}
        </Button>
      </div>
    </form>
  );
}
