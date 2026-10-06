"use client";

import { addCrew, deleteCrew, syncCheckins, updateCrew, type RosState } from "@/app/(app)/pro/eventi/run-of-show-actions";
import { ContactActions } from "@/components/contacts/contact-actions";
import { Button, Field, Input, Select } from "@/components/ui";
import { crewState, hhmm } from "@i-events/core";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { clock, useItalyNow } from "./now";
import { dayLabel } from "./format";
import type { Option } from "./schedule";

/** Someone expected on site, as shown: suppliers carry their service, colleagues and externals a role. */
export type CrewMember = {
  id: string;
  kind: "supplier" | "staff" | "external";
  day: string;
  call_time: string | null;
  checked_in_at: string | null;
  name: string;
  /** The service for suppliers, the role for the others. */
  detail: string | null;
  role: string | null;
  phone: string | null;
};

export function CrewStatus({ member, now }: { member: CrewMember; now: { day: string; time: string } | null }) {
  if (member.checked_in_at) return <span className="text-success">Arrivato alle {clock(member.checked_in_at)}</span>;
  if (now && crewState(member, now) === "late") return <span className="text-danger">In ritardo</span>;
  return <span className="text-muted">{member.call_time ? `Atteso alle ${hhmm(member.call_time)}` : "Atteso"}</span>;
}

export function CrewRow({ eventId, member, days }: { eventId: string; member: CrewMember; days: string[] }) {
  const [state, action, pending] = useActionState<RosState, FormData>(updateCrew, {});
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string>();
  const now = useItalyNow();
  const arrived = member.checked_in_at !== null;

  const toggle = () =>
    startSaving(async () => {
      const res = await syncCheckins(eventId, [{ id: member.id, at: arrived ? null : new Date().toISOString() }]);
      setError(res.error);
    });

  return (
    <li aria-label={member.name} className="flex flex-col gap-2 py-3 text-sm">
      <div className="flex flex-wrap items-start gap-4">
        <span className="w-14 shrink-0 font-mono tabular-nums">{hhmm(member.call_time) ?? "–"}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{member.name}</p>
          <p className="text-muted">{[member.detail, member.kind === "staff" ? "Team" : null].filter(Boolean).join(" · ")}</p>
          <ContactActions name={member.name} phone={member.phone} email={null} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <CrewStatus member={member} now={now} />
          <Button
            type="button"
            variant={arrived ? "secondary" : "primary"}
            onClick={toggle}
            disabled={saving}
            aria-label={arrived ? `Annulla check-in di ${member.name}` : `Check-in ${member.name}`}
          >
            {arrived ? "Annulla check-in" : "Check-in"}
          </Button>
          {error && <span className="text-danger">{error}</span>}
        </div>
      </div>
      <details className="ml-18">
        <summary className="cursor-pointer text-muted">Modifica</summary>
        <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={member.id} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="hasName" value={member.kind === "external" ? "1" : "0"} />
          {member.kind === "external" && (
            <Field label="Nome" error={state.fields?.name}>
              <Input name="name" defaultValue={member.name} maxLength={120} required />
            </Field>
          )}
          <DayField days={days} value={member.day} error={state.fields?.day} />
          <Field label="Orario di arrivo" error={state.fields?.call_time}>
            <Input type="time" name="call_time" defaultValue={hhmm(member.call_time) ?? ""} />
          </Field>
          <Field label="Ruolo">
            <Input name="role" defaultValue={member.role ?? ""} maxLength={120} />
          </Field>
          {member.kind !== "supplier" && (
            <Field label="Telefono">
              <Input type="tel" name="phone" defaultValue={member.phone ?? ""} maxLength={40} />
            </Field>
          )}
          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary" disabled={pending}>
              Salva
            </Button>
            <Button
              type="submit"
              variant="danger"
              formAction={deleteCrew}
              formNoValidate
              disabled={pending}
              onClick={(e) => {
                if (!confirm(`Togliere ${member.name} dagli arrivi?`)) e.preventDefault();
              }}
            >
              Elimina
            </Button>
          </div>
          {state.error && <p className="text-danger sm:col-span-2">{state.error}</p>}
        </form>
      </details>
    </li>
  );
}

function DayField({ days, value, error }: { days: string[]; value: string; error?: string }) {
  return (
    <Field label="Giorno" error={error}>
      {days.length > 1 ? (
        <Select name="day" defaultValue={value}>
          {days.map((d) => (
            <option key={d} value={d}>
              {dayLabel(d)}
            </option>
          ))}
        </Select>
      ) : (
        <Input type="date" name="day" defaultValue={value} required />
      )}
    </Field>
  );
}

/** Adds a colleague or an external person (hostess, freelance) to the people expected on site. */
export function NewCrewForm({ eventId, days, defaultDay, members }: { eventId: string; days: string[]; defaultDay: string; members: Option[] }) {
  const [state, action, pending] = useActionState<RosState, FormData>(addCrew, {});
  const [person, setPerson] = useState(members[0]?.id ?? "external");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok]);
  return (
    <form ref={form} action={action} aria-label="Nuovo arrivo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Chi">
        <Select name="person" value={person} onChange={(e) => setPerson(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value="external">Persona esterna (hostess, staff a chiamata…)</option>
        </Select>
      </Field>
      {person === "external" && (
        <>
          <Field label="Nome" error={state.fields?.name}>
            <Input name="name" maxLength={120} required />
          </Field>
          <Field label="Telefono">
            <Input type="tel" name="phone" maxLength={40} />
          </Field>
        </>
      )}
      <Field label="Ruolo">
        <Input name="role" maxLength={120} placeholder="Ad esempio: hostess accoglienza" />
      </Field>
      <DayField days={days} value={defaultDay} error={state.fields?.day} />
      <Field label="Orario di arrivo" error={state.fields?.call_time}>
        <Input type="time" name="call_time" />
      </Field>
      <div className="flex items-end">
        <Button type="submit" variant="secondary" disabled={pending}>
          Aggiungi agli arrivi
        </Button>
      </div>
      {state.error && <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">{state.error}</p>}
    </form>
  );
}
