"use client";

import { Button, Field, Notice, Select } from "@/components/ui";
import { useActionState } from "react";
import { acceptInvitation, type AcceptState } from "./actions";

export function AcceptForm({ token, kind, orgs }: { token: string; kind: "member" | "connection"; orgs: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInvitation, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="kind" value={kind} />
      {kind === "connection" && orgs.length > 1 && (
        <Field label="Collega con">
          <Select name="orgId">
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {kind === "connection" && orgs.length === 1 && <input type="hidden" name="orgId" value={orgs[0]!.id} />}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        Accetta
      </Button>
    </form>
  );
}
