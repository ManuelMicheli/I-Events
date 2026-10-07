"use client";

import { moveEvent, saveEventDetails, type EventState } from "@/app/(app)/pro/eventi/actions";
import { ConfirmForm } from "@/components/modal";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { EVENT_TYPE_INFO, EVENT_TYPES, type EventStatus, type EventType } from "@i-events/core";
import { useActionState, type ComponentProps } from "react";

const MOVE_LABEL: Record<EventStatus, string> = {
  planning: "Torna in pianificazione",
  preparing: "Passa in preparazione",
  live: "Evento in corso",
  completed: "Segna come concluso",
  cancelled: "Annulla evento",
};

/** The next step of the event; `quiet` when another action on the page is the main one (one Fiamma per page). */
export function EventStatusActions({ eventId, moves, quiet = false }: { eventId: string; moves: EventStatus[]; quiet?: boolean }) {
  const [state, action, pending] = useActionState<EventState, FormData>(moveEvent, {});
  if (moves.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {moves.map((m) => (
          <MoveForm
            key={m}
            action={action}
            confirm={m === "cancelled" ? { title: "Annullare l'evento?", body: "Non si potrà riaprire.", confirmLabel: "Annulla l'evento", danger: true } : undefined}
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="status" value={m} />
            <Button type="submit" variant={m === "cancelled" ? "tertiary" : quiet ? "secondary" : "primary"} className={m === "cancelled" ? "text-danger!" : undefined} disabled={pending}>
              {MOVE_LABEL[m]}
            </Button>
          </MoveForm>
        ))}
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </div>
  );
}

type Details = { event_type: EventType | null; start_date: string | null; end_date: string | null; city: string | null; venue: string | null };

export function EventDetailsForm({ eventId, details }: { eventId: string; details: Details }) {
  const [state, action, pending] = useActionState<EventState, FormData>(saveEventDetails, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="sm:col-span-2">
        <Field label="Che evento è">
          <Select name="event_type" defaultValue={details.event_type ?? ""}>
            {!details.event_type && <option value="">Da indicare</option>}
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_INFO[t].label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
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
      <div className="flex items-center gap-3 sm:col-span-2">
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

/** A status move; cancelling asks first. */
function MoveForm({ confirm, ...props }: ComponentProps<"form"> & { confirm?: ComponentProps<typeof ConfirmForm>["confirm"] }) {
  return confirm ? <ConfirmForm confirm={confirm} {...props} /> : <form {...props} />;
}
