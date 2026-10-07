"use client";

import { Button, Field, Input, Notice, Select } from "@/components/ui";
import type { InviteState } from "@/lib/settings-actions";
import { useActionState } from "react";
import { CopyButton } from "./copy-button";

type Props = {
  action: (state: InviteState, form: FormData) => Promise<InviteState>;
  roles?: { value: string; label: string }[];
  withMessage?: boolean;
  submitLabel: string;
};

export function InviteForm({ action, roles, withMessage, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(action, {});
  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <Field label="Email">
            <Input name="email" type="email" required />
          </Field>
        </div>
        {roles && (
          <Field label="Ruolo">
            <Select name="role" defaultValue={roles[0]?.value}>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {withMessage && (
          <div className="min-w-60 flex-1">
            <Field label="Messaggio (facoltativo)">
              <Input name="message" maxLength={500} />
            </Field>
          </div>
        )}
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </form>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.link && (
        <Notice tone="success">
          Invito creato. Condividi questo link:{" "}
          <code className="break-all">{state.link}</code>{" "}
          <CopyButton text={state.link} />
        </Notice>
      )}
    </div>
  );
}
