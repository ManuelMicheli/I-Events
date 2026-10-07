"use client";

import { addTask, type TaskState } from "@/app/(app)/pro/attivita/actions";
import { PlusIcon } from "@/components/icons";
import { Button, Input, Select } from "@/components/ui";
import { useActionState, useEffect, useRef } from "react";
import type { Option } from "./task-row";

export function NewTaskForm({ eventId, members, bookings }: { eventId: string; members: Option[]; bookings: Option[] }) {
  const [state, action, pending] = useActionState<TaskState, FormData>(addTask, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);

  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid gap-2 md:grid-cols-[minmax(0,2fr)_auto_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Input name="title" aria-label="Nuova attività" placeholder="Nuova attività, ad esempio: mandare la planimetria" maxLength={200} required />
        <Input type="date" name="due_date" aria-label="Scadenza" />
        <Select name="assignee_id" aria-label="Assegna a" defaultValue="">
          <option value="">Assegna a…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
        <Select name="booking_id" aria-label="Servizio collegato" defaultValue="">
          <option value="">Servizio…</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" disabled={pending} className="ic-host">
          <PlusIcon />
          Aggiungi
        </Button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
