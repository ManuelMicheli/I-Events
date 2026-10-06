"use client";

import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { saveMarketplaceProfile, type ProfileState } from "@/lib/settings-actions";
import type { Tables } from "@i-events/db";
import { SERVICE_CATALOG } from "@i-events/core";
import { useActionState } from "react";

export function ProfileForm({ profile, canEdit }: { profile: Tables<"marketplace_profiles">; canEdit: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveMarketplaceProfile, {});
  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <fieldset disabled={!canEdit} className="flex flex-col gap-4">
          <Field label="Titolo">
            <Input name="headline" defaultValue={profile.headline} maxLength={160} />
          </Field>
          <Field label="Descrizione">
            <textarea name="description" defaultValue={profile.description} rows={5} maxLength={4000} className="rounded-ui border border-border bg-bg p-3" />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Servizi offerti</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SERVICE_CATALOG.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="services" value={s.key} defaultChecked={profile.services.includes(s.key)} />
                  {s.name.it}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Zone coperte" hint="Separate da virgola, ad esempio Milano, Lombardia">
            <Input name="regions" defaultValue={profile.regions.join(", ")} />
          </Field>
          <Field label="Sito web">
            <Input name="website" type="url" defaultValue={profile.website ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isListed" defaultChecked={profile.is_listed} />
            Mostra il profilo nel marketplace
          </label>
        </fieldset>
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.saved && <Notice tone="success">Profilo salvato.</Notice>}
        {canEdit && (
          <Button type="submit" disabled={pending} className="self-start">
            Salva
          </Button>
        )}
      </form>
    </Card>
  );
}
