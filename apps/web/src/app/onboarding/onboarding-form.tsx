"use client";

import { Button, Field, Input, Notice } from "@/components/ui";
import { createOrganization, type FormState } from "@/lib/org-actions";
import { useActionState } from "react";

const TYPES = [
  { value: "agency", title: "Agenzia di eventi", text: "Ricevi richieste dalle aziende e gestisci gli eventi." },
  { value: "client", title: "Azienda", text: "Chiedi eventi e campagne alle agenzie e confronta le proposte." },
  { value: "supplier", title: "Fornitore", text: "DJ, sicurezza, service, catering: fatti trovare dalle agenzie." },
] as const;

export function OnboardingForm({ next, defaultType }: { next?: string; defaultType?: (typeof TYPES)[number]["value"] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createOrganization, {});
  return (
    <form action={action} className="flex flex-col gap-6">
      {next && <input type="hidden" name="next" value={next} />}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Che tipo di account vuoi creare?</legend>
        {TYPES.map((t) => (
          <label key={t.value} className="flex cursor-pointer gap-3 rounded-ui border border-border p-4 has-[:checked]:border-accent">
            <input type="radio" name="type" value={t.value} required defaultChecked={t.value === defaultType} className="mt-1" />
            <span>
              <span className="block font-medium">{t.title}</span>
              <span className="block text-sm text-muted">{t.text}</span>
            </span>
          </label>
        ))}
        {state.fieldErrors?.type && <span className="text-sm text-danger">{state.fieldErrors.type}</span>}
      </fieldset>
      <Field label="Nome" error={state.fieldErrors?.name}>
        <Input name="name" required minLength={2} maxLength={120} />
      </Field>
      <Field label="Città" error={state.fieldErrors?.city}>
        <Input name="city" maxLength={120} />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        Crea account
      </Button>
    </form>
  );
}
