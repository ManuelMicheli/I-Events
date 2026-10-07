"use client";

import { ChipInput } from "@/components/controls";
import { ConfirmButton } from "@/components/modal";
import { deleteContact, saveContact, type ContactState } from "@/app/(app)/pro/rubrica/actions";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import { SERVICE_CATALOG } from "@i-events/core";
import type { Tables } from "@i-events/db";
import { useActionState } from "react";

export function ContactForm({ contact, canDelete }: { contact?: Tables<"contacts">; canDelete: boolean }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(saveContact, {});
  const f = state.fields ?? {};
  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={contact?.id ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2 3xl:grid-cols-4">
          <Field label="Nome *" error={f.name}>
            <Input name="name" required maxLength={200} defaultValue={contact?.name} />
          </Field>
          <Field label="Azienda" error={f.company}>
            <Input name="company" maxLength={200} defaultValue={contact?.company ?? ""} />
          </Field>
          <Field label="Ruolo" error={f.role_title}>
            <Input name="role_title" maxLength={120} defaultValue={contact?.role_title ?? ""} />
          </Field>
          <Field label="Città o zona" error={f.city}>
            <Input name="city" maxLength={120} defaultValue={contact?.city ?? ""} />
          </Field>
          <Field label="Telefono" error={f.phone}>
            <Input name="phone" type="tel" defaultValue={contact?.phone ?? ""} />
          </Field>
          <Field label="Email" error={f.email}>
            <Input name="email" type="email" defaultValue={contact?.email ?? ""} />
          </Field>
          <Field label="Sito web" error={f.website}>
            <Input name="website" maxLength={300} defaultValue={contact?.website ?? ""} />
          </Field>
          <Field label="Valutazione interna">
            <Select name="rating" defaultValue={contact?.rating ? String(contact.rating) : ""}>
              <option value="">Nessuna</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-label font-medium">Servizi</legend>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATALOG.map((s) => (
              <ChipInput key={s.key} name="services" value={s.key} label={s.name.it} defaultChecked={contact?.services.includes(s.key)} />
            ))}
          </div>
        </fieldset>
        <Field label="Note" error={f.notes}>
          <textarea name="notes" rows={4} maxLength={5000} defaultValue={contact?.notes ?? ""} className="rounded-ui border border-border bg-bg p-3" />
        </Field>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <div className="flex gap-3">
          <Button type="submit" disabled={pending} className="ic-host">
            {!contact && <PlusIcon />}
            {contact ? "Salva" : "Aggiungi contatto"}
          </Button>
          {contact && canDelete && (
            <ConfirmButton
              type="submit"
              variant="danger"
              className="ic-host"
              formAction={deleteContact}
              formNoValidate
              confirm={{ title: `Eliminare ${contact.name} dalla rubrica?`, confirmLabel: "Elimina", danger: true }}
            >
              <TrashIcon />
              Elimina
            </ConfirmButton>
          )}
        </div>
      </form>
    </Card>
  );
}
