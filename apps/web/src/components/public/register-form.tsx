"use client";

import { registerForEvent, type RegisterState } from "@/app/(pubblico)/eventi/actions";
import { Button, Field, Input, Notice } from "@/components/ui";
import { useActionState, useState } from "react";

/**
 * Registration without an account (design pubblico-03): name as on the ticket, email, how many
 * people (1 to the places left, at most 4) and the consent. The ticket opens as soon as it is done.
 */
export function RegisterForm({ eventId, maxGuests }: { eventId: string; maxGuests: number }) {
  const [state, action] = useActionState<RegisterState, FormData>(registerForEvent, {});
  const [guests, setGuests] = useState(1);
  const f = state.fields ?? {};
  const count = Math.min(guests, maxGuests);

  return (
    <form key={JSON.stringify(state)} action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Nome e cognome" hint="Come compare sul biglietto." error={f.name}>
        <Input
          name="name"
          defaultValue={state.values?.name}
          autoComplete="name"
          placeholder="Come ti chiami"
          maxLength={120}
          required
          aria-invalid={f.name ? true : undefined}
        />
      </Field>
      <Field label="Email" hint="La vede solo chi organizza l'evento." error={f.email}>
        <Input
          name="email"
          defaultValue={state.values?.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          maxLength={254}
          required
          aria-invalid={f.email ? true : undefined}
        />
      </Field>

      <fieldset className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <legend className="sr-only">Quante persone</legend>
        <div className="flex flex-col">
          <span aria-hidden className="text-label font-medium">
            Quante persone?
          </span>
          <span className="text-xs text-muted">{maxGuests === 1 ? "Resta un posto" : `Da 1 a ${maxGuests}`}</span>
        </div>
        <div className="flex items-center rounded-ui border border-border-strong">
          <button
            type="button"
            aria-label="Una persona in meno"
            disabled={count <= 1}
            onClick={() => setGuests(count - 1)}
            className="flex size-11 items-center justify-center rounded-l-ui hover:bg-surface disabled:text-disabled disabled:hover:bg-transparent"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <output
            aria-live="polite"
            aria-label={count === 1 ? "1 persona" : `${count} persone`}
            className="w-12 border-x border-border-strong text-center font-mono leading-11"
          >
            {count}
          </output>
          <button
            type="button"
            aria-label="Una persona in più"
            disabled={count >= maxGuests}
            onClick={() => setGuests(count + 1)}
            className="flex size-11 items-center justify-center rounded-r-ui hover:bg-surface disabled:text-disabled disabled:hover:bg-transparent"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M3.5 8h9M8 3.5v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <input type="hidden" name="guests" value={count} />
        {f.guests && <p className="w-full text-xs text-danger">{f.guests}</p>}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consent"
            defaultChecked={state.values?.consent}
            required
            className="mt-1 shrink-0"
            aria-invalid={f.consent ? true : undefined}
          />
          <span>Accetto che chi organizza l&apos;evento usi nome ed email per gestire l&apos;ingresso.</span>
        </label>
        {f.consent && <p className="text-xs text-danger">{f.consent}</p>}
      </div>

      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" size="l" className="w-full">
        Conferma iscrizione
      </Button>
    </form>
  );
}
