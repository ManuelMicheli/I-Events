"use client";

import { Toggle } from "@/components/controls";
import { savePublicPage, type EventState } from "@/app/(app)/pro/eventi/actions";
import { Button, Field, Input } from "@/components/ui";
import { hhmm } from "@i-events/core";
import { useActionState, useState } from "react";

type PublicPage = {
  is_public: boolean;
  public_description: string | null;
  public_starts_at: string | null;
  public_ends_at: string | null;
  public_capacity: number | null;
};

/**
 * The agency decides whether the event has a public page (in Esplora and in the calendar), what it
 * says, at what time and with how many places. Registrations need no account.
 */
export function PublicPageForm({ eventId, page, canManage }: { eventId: string; page: PublicPage; canManage: boolean }) {
  const [state, action, pending] = useActionState<EventState, FormData>(savePublicPage, {});
  const [open, setOpen] = useState(page.is_public);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <Toggle
        name="is_public"
        label="Aperto al pubblico"
        hint="L'evento compare in Esplora e nel calendario pubblico; chi vuole venire si iscrive gratis e riceve il biglietto."
        checked={open}
        onChange={setOpen}
        disabled={!canManage}
      />
      {/* Hidden, not removed: closing the page keeps what was written for when it opens again. */}
      <div hidden={!open} className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Field label="Cosa succede" hint="Quello che il pubblico legge sulla pagina. Al massimo 2000 caratteri.">
            <textarea
              name="public_description"
              defaultValue={page.public_description ?? ""}
              maxLength={2000}
              rows={4}
              disabled={!canManage}
              className="min-h-24 w-full rounded-ui border border-control bg-bg px-3 py-2"
            />
          </Field>
        </div>
        <Field label="Apertura">
          <Input type="time" name="public_starts_at" defaultValue={page.public_starts_at ? hhmm(page.public_starts_at) : ""} disabled={!canManage} />
        </Field>
        <Field label="Chiusura">
          <Input type="time" name="public_ends_at" defaultValue={page.public_ends_at ? hhmm(page.public_ends_at) : ""} disabled={!canManage} />
        </Field>
        <Field label="Posti" hint="Vuoto: senza limite.">
          <Input
            type="number"
            name="public_capacity"
            inputMode="numeric"
            min={1}
            max={100000}
            defaultValue={page.public_capacity ?? ""}
            disabled={!canManage}
          />
        </Field>
      </div>
      {canManage && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            Salva pagina pubblica
          </Button>
          {state.ok && (
            <span role="status" className="text-sm text-success">
              Pagina pubblica salvata.
            </span>
          )}
          {state.error && <span className="text-sm text-danger">{state.error}</span>}
        </div>
      )}
    </form>
  );
}
