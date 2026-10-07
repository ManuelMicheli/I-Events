"use client";

import { deleteTask, toggleTask, updateTask, type TaskState } from "@/app/(app)/pro/attivita/actions";
import { TrashIcon } from "@/components/icons";
import { Button, Field, Input, Select } from "@/components/ui";
import { daysBetween } from "@i-events/core";
import Link from "next/link";
import { useActionState } from "react";

export type Task = {
  id: string;
  event_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  done_at: string | null;
  assignee_id: string | null;
  booking_id: string | null;
};
export type Option = { id: string; label: string };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });

function dueLabel(due: string, today: string) {
  const d = daysBetween(today, due);
  const rel = d === 0 ? "oggi" : d === 1 ? "domani" : d === -1 ? "ieri" : d > 0 ? `tra ${d} giorni` : `${-d} giorni fa`;
  return `${dateFmt.format(new Date(`${due}T12:00:00`))} · ${rel}`;
}

function eventOffset(due: string, start: string) {
  const d = daysBetween(due, start);
  if (d === 0) return "giorno dell'evento";
  return d > 0 ? `${d} ${d === 1 ? "giorno" : "giorni"} prima dell'evento` : `${-d} ${d === -1 ? "giorno" : "giorni"} dopo l'evento`;
}

/** One task: tick it off, see who and when, and edit it in place. */
export function TaskRow({
  task,
  today,
  members,
  bookings,
  eventStart,
  event,
}: {
  task: Task;
  today: string;
  members: Option[];
  /** The event's bookings; omitted on pages that list tasks of several events. */
  bookings?: Option[];
  eventStart: string | null;
  /** Shown when listing tasks of several events. */
  event?: { title: string };
}) {
  const [state, action, pending] = useActionState<TaskState, FormData>(updateTask, {});
  const done = task.done_at !== null;
  const overdue = !done && task.due_date !== null && daysBetween(today, task.due_date) < 0;
  const assignee = members.find((m) => m.id === task.assignee_id)?.label;
  const booking = bookings?.find((b) => b.id === task.booking_id)?.label;

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start gap-3">
        <form action={toggleTask}>
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="eventId" value={task.event_id} />
          <input type="hidden" name="done" value={done ? "0" : "1"} />
          <button
            type="submit"
            aria-label={done ? `Riapri ${task.title}` : `Segna come fatta ${task.title}`}
            aria-pressed={done}
            className={`relative mt-0.5 h-5 w-5 shrink-0 rounded-full border after:absolute after:-inset-3 after:content-[''] ${done ? "border-success bg-success" : "border-control hover:bg-surface"}`}
          />
        </form>
        <div className="min-w-0 flex-1 text-sm">
          <p className={done ? "text-muted line-through" : "font-medium"}>{task.title}</p>
          <p className="text-muted">
            {[
              event && (
                <Link key="e" href={`/pro/eventi/${task.event_id}`} className="underline">
                  {event.title}
                </Link>
              ),
              task.due_date && (
                <span key="d" className={overdue ? "text-danger" : undefined}>
                  {dueLabel(task.due_date, today)}
                </span>
              ),
              task.due_date && eventStart && <span key="o">{eventOffset(task.due_date, eventStart)}</span>,
              assignee && <span key="a">{assignee}</span>,
              booking && <span key="b">{booking}</span>,
            ]
              .filter(Boolean)
              .flatMap((el, i) => (i === 0 ? [el] : [" · ", el]))}
          </p>
          {task.notes && <p className="mt-1 whitespace-pre-line text-muted">{task.notes}</p>}
        </div>
      </div>
      <details className="ml-8 text-sm">
        <summary className="cursor-pointer text-muted">Modifica</summary>
        <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="eventId" value={task.event_id} />
          <Field label="Attività" error={state.fields?.title}>
            <Input name="title" defaultValue={task.title} maxLength={200} required />
          </Field>
          <Field label="Scadenza">
            <Input type="date" name="due_date" defaultValue={task.due_date ?? ""} />
          </Field>
          <Field label="Assegnata a">
            <Select name="assignee_id" defaultValue={task.assignee_id ?? ""}>
              <option value="">Nessuno</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          {bookings ? (
            <Field label="Servizio">
              <Select name="booking_id" defaultValue={task.booking_id ?? ""}>
                <option value="">Nessuno</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="booking_id" value={task.booking_id ?? ""} />
          )}
          <Field label="Note">
            <Input name="notes" defaultValue={task.notes ?? ""} maxLength={2000} />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary" disabled={pending}>
              Salva
            </Button>
            <Button
              type="submit"
              variant="danger"
              className="ic-host"
              formAction={deleteTask}
              disabled={pending}
              onClick={(e) => {
                if (!confirm("Eliminare questa attività?")) e.preventDefault();
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
