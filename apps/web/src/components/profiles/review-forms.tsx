"use client";

import { Button, Notice } from "@/components/ui";
import { leaveReview, replyToReview, type FormState } from "@/lib/profile-actions";
import { useActionState, useId, useState } from "react";

const LABELS = ["", "Pessimo", "Scarso", "Nella media", "Molto buono", "Eccellente"];

/** Five stars as radio buttons, so the keyboard and screen readers work as usual. */
function StarPicker({ name, defaultValue, label }: { name: string; defaultValue: number | null; label: string }) {
  const [value, setValue] = useState(defaultValue ?? 0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="relative flex h-10 w-10 items-center justify-center rounded-ui text-2xl leading-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text"
            onMouseEnter={() => setHover(n)}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => setValue(n)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={`${n} ${n === 1 ? "stella" : "stelle"}, ${LABELS[n]!.toLowerCase()}`}
              aria-describedby={id}
            />
            <span aria-hidden className={n <= shown ? "text-accent" : "text-muted"}>
              {n <= shown ? "★" : "☆"}
            </span>
          </label>
        ))}
        <span id={id} className="ml-2 text-sm text-muted">
          {LABELS[shown]}
        </span>
      </div>
    </fieldset>
  );
}

/** Leave or change the review of one organization for an event. */
export function ReviewForm({
  eventId,
  subjectId,
  subjectName,
  existing,
}: {
  eventId: string;
  subjectId: string;
  subjectName: string;
  existing: { rating: number; comment: string } | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(leaveReview, {});
  const f = state.fields ?? {};
  return (
    <form action={action} className="flex flex-col gap-3" aria-label={`Recensione per ${subjectName}`}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <StarPicker name="rating" defaultValue={existing?.rating ?? null} label={`Come valuti ${subjectName}?`} />
      {f.rating && <span className="text-sm text-danger">{f.rating}</span>}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Racconta com&apos;è andata</span>
        <textarea
          name="comment"
          defaultValue={existing?.comment}
          rows={3}
          maxLength={2000}
          placeholder="Puntualità, qualità, comunicazione: cosa diresti a chi deve sceglierli?"
          className="rounded-ui border border-border bg-bg p-3"
        />
        <span className="text-muted">La recensione compare sul profilo pubblico con il nome della tua organizzazione.</span>
      </label>
      {state.error && !f.rating && <Notice tone="error">{state.error}</Notice>}
      {state.ok && <Notice tone="success">Grazie, recensione pubblicata.</Notice>}
      <Button type="submit" disabled={pending} className="self-start">
        {existing ? "Aggiorna la recensione" : "Pubblica la recensione"}
      </Button>
    </form>
  );
}

/** The reviewed organization answers publicly. */
export function ReplyForm({ reviewId, reply }: { reviewId: string; reply: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const next = await replyToReview(prev, form);
    if (next.ok) setOpen(false);
    return next;
  }, {});
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm underline">
        {reply ? "Modifica la risposta" : "Rispondi"}
      </button>
    );
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={reviewId} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">La tua risposta</span>
        <textarea name="reply" defaultValue={reply ?? ""} rows={2} maxLength={2000} className="rounded-ui border border-border bg-bg p-3" />
      </label>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Pubblica
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
