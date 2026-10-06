"use client";

import { moveEvent, saveEventDetails, type EventState } from "@/app/(app)/pro/eventi/actions";
import { Button, Field, Input, Notice } from "@/components/ui";
import type { EventStatus } from "@i-events/core";
import { useActionState } from "react";

const MOVE_LABEL: Record<EventStatus, string> = {
  planning: "Torna in pianificazione",
  preparing: "Passa in preparazione",
  live: "Evento in corso",
  completed: "Segna come concluso",
  cancelled: "Annulla evento",
};

export function EventStatusActions({ eventId, moves }: { eventId: string; moves: EventStatus[] }) {
  const [state, action, pending] = useActionState<EventState, FormData>(moveEvent, {});
  if (moves.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {moves.map((m) => (
          <form
            key={m}
            action={action}
            onSubmit={(e) => {
              if (m === "cancelled" && !confirm("Annullare l'evento? Non si potrà riaprire.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="status" value={m} />
            <Button type="submit" variant={m === "cancelled" ? "danger" : "primary"} disabled={pending}>
              {MOVE_LABEL[m]}
            </Button>
          </form>
        ))}
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </div>
  );
}

type Details = { start_date: string | null; end_date: string | null; city: string | null; venue: string | null };

export function EventDetailsForm({ eventId, details }: { eventId: string; details: Details }) {
  const [state, action, pending] = useActionState<EventState, FormData>(saveEventDetails, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Inizio">
        <Input type="date" name="start_date" defaultValue={details.start_date ?? ""} />
      </Field>
      <Field label="Fine">
        <Input type="date" name="end_date" defaultValue={details.end_date ?? ""} />
      </Field>
      <Field label="Città">
        <Input name="city" defaultValue={details.city ?? ""} maxLength={120} />
      </Field>
      <Field label="Location">
        <Input name="venue" defaultValue={details.venue ?? ""} maxLength={200} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          Salva dettagli
        </Button>
        {state.ok && (
          <span role="status" className="text-sm text-success">
            Dettagli salvati.
          </span>
        )}
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
