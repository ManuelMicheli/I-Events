"use client";

import {
  addScheduleItem,
  addSuggestedSchedule,
  deleteScheduleItem,
  updateScheduleItem,
  type RosState,
} from "@/app/(app)/pro/eventi/run-of-show-actions";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { Button, Field, Input, Select } from "@/components/ui";
import { hhmm } from "@i-events/core";
import { useActionState, useEffect, useRef } from "react";
import { dayLabel } from "./format";

export type Option = { id: string; label: string };
export type ScheduleItem = {
  id: string;
  day: string;
  starts_at: string;
  ends_at: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  booking_id: string | null;
  assignee_id: string | null;
};

function ItemFields({
  item,
  days,
  defaultDay,
  members,
  bookings,
  state,
}: {
  item?: ScheduleItem;
  days: string[];
  defaultDay: string;
  members: Option[];
  bookings: Option[];
  state: RosState;
}) {
  return (
    <>
      <Field label="Giorno" error={state.fields?.day}>
        {days.length > 1 ? (
          <Select name="day" defaultValue={item?.day ?? defaultDay}>
            {days.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </Select>
        ) : (
          <Input type="date" name="day" defaultValue={item?.day ?? defaultDay} required />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Inizio" error={state.fields?.starts_at}>
          <Input type="time" name="starts_at" defaultValue={item ? hhmm(item.starts_at) : ""} required />
        </Field>
        <Field label="Fine" error={state.fields?.ends_at}>
          <Input type="time" name="ends_at" defaultValue={item ? (hhmm(item.ends_at) ?? "") : ""} />
        </Field>
      </div>
      <Field label="Cosa succede" error={state.fields?.title}>
        <Input name="title" defaultValue={item?.title} maxLength={200} required placeholder="Ad esempio: apertura porte" />
      </Field>
      <Field label="Dove">
        <Input name="location" defaultValue={item?.location ?? ""} maxLength={200} placeholder="Sala, ingresso, palco…" />
      </Field>
      <Field label="Fornitore">
        <Select name="booking_id" defaultValue={item?.booking_id ?? ""}>
          <option value="">Nessuno</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Referente">
        <Select name="assignee_id" defaultValue={item?.assignee_id ?? ""}>
          <option value="">Nessuno</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Note">
        <Input name="notes" defaultValue={item?.notes ?? ""} maxLength={2000} />
      </Field>
    </>
  );
}

export function NewScheduleItemForm({ lead = true, ...props }: { eventId: string; days: string[]; defaultDay: string; members: Option[]; bookings: Option[]; lead?: boolean }) {
  const [state, action, pending] = useActionState<RosState, FormData>(addScheduleItem, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);
  return (
    <form ref={form} action={action} aria-label="Nuovo momento" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="eventId" value={props.eventId} />
      <ItemFields {...props} state={state} />
      <div className="flex items-end">
        <Button type="submit" variant={lead ? "primary" : "secondary"} disabled={pending} className="ic-host">
          <PlusIcon />
          Aggiungi alla scaletta
        </Button>
      </div>
      {state.error && <p className="text-sm text-danger sm:col-span-2 lg:col-span-4">{state.error}</p>}
    </form>
  );
}

/** One moment of the run of show, editable in place. */
export function ScheduleItemRow({
  eventId,
  item,
  days,
  members,
  bookings,
}: {
  eventId: string;
  item: ScheduleItem;
  days: string[];
  members: Option[];
  bookings: Option[];
}) {
  const [state, action, pending] = useActionState<RosState, FormData>(updateScheduleItem, {});
  const time = `${hhmm(item.starts_at)}${item.ends_at ? `–${hhmm(item.ends_at)}` : ""}`;
  const referent = members.find((m) => m.id === item.assignee_id)?.label;
  const who = [item.location, bookings.find((b) => b.id === item.booking_id)?.label, referent && `Referente: ${referent}`].filter(Boolean);
  return (
    <li aria-label={`${hhmm(item.starts_at)} ${item.title}`} className="flex flex-col gap-2 py-3">
      <div className="flex gap-4 text-sm">
        <span className="w-24 shrink-0 font-mono tabular-nums">{time}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{item.title}</p>
          {who.length > 0 && <p className="text-muted">{who.join(" · ")}</p>}
          {item.notes && <p className="mt-1 whitespace-pre-line text-muted">{item.notes}</p>}
        </div>
      </div>
      <details className="ml-28 text-sm">
        <summary className="cursor-pointer text-muted">Modifica</summary>
        <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="eventId" value={eventId} />
          <ItemFields item={item} days={days} defaultDay={item.day} members={members} bookings={bookings} state={state} />
          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary" disabled={pending}>
              Salva
            </Button>
            <Button
              type="submit"
              variant="danger"
              className="ic-host"
              formAction={deleteScheduleItem}
              formNoValidate
              disabled={pending}
              onClick={(e) => {
                if (!confirm("Togliere questo momento dalla scaletta?")) e.preventDefault();
              }}
            >
              <TrashIcon />
              Elimina
            </Button>
          </div>
          {state.error && <p className="text-danger sm:col-span-2">{state.error}</p>}
        </form>
      </details>
    </li>
  );
}

export function SuggestedScheduleForm({ eventId, days, count }: { eventId: string; days: string[]; count: number }) {
  const [state, action, pending] = useActionState<RosState, FormData>(addSuggestedSchedule, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-ui bg-surface px-4 py-4 text-sm">
      <input type="hidden" name="eventId" value={eventId} />
      <p>Parti dalla scaletta tipo per i servizi di questo evento: {count} momenti, dal montaggio alla chiusura, da adattare.</p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Giorno dell'evento" error={state.fields?.day}>
          {days.length > 1 ? (
            <Select name="day" defaultValue={days[0]}>
              {days.map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </Select>
          ) : (
            <Input type="date" name="day" defaultValue={days[0] ?? ""} required />
          )}
        </Field>
        <Field label="Apertura porte" error={state.fields?.doors_open}>
          <Input type="time" name="doors_open" defaultValue="19:00" required />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          Crea la scaletta tipo
        </Button>
      </div>
      {state.error && <p className="text-danger">{state.error}</p>}
    </form>
  );
}
