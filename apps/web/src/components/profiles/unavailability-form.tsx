"use client";

import { Button, Field, Input, Notice } from "@/components/ui";
import { addUnavailability, type FormState } from "@/lib/profile-actions";
import { useActionState } from "react";

/** Marks one day or a period as not available. */
export function UnavailabilityForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addUnavailability, {});
  const f = state.fields ?? {};
  return (
    <form action={action} key={state.ok} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3 3xl:grid-cols-2">
        <Field label="Dal" error={f.starts_on}>
          <Input name="starts_on" type="date" min={today} required />
        </Field>
        <Field label="Al" error={f.ends_on} hint="Vuoto per un giorno solo">
          <Input name="ends_on" type="date" min={today} />
        </Field>
        <div className="3xl:col-span-2">
          <Field label="Nota per te" error={f.note} hint="Le agenzie non la vedono">
            <Input name="note" maxLength={200} placeholder="Ferie, altro lavoro…" />
          </Field>
        </div>
      </div>
      {state.error && !Object.keys(f).length && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">Date segnate come non disponibili.</Notice>}
      <Button type="submit" disabled={pending} className="self-start">
        Segna come non disponibile
      </Button>
    </form>
  );
}
