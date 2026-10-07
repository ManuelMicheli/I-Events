"use client";

import { deleteQuoteDraft, saveQuoteDraft } from "@/app/(app)/pro/eventi/quote-actions";
import { TrashIcon } from "@/components/icons";
import { Button, Field, Input, Notice, Select } from "@/components/ui";
import { formatEuro, proposalTotal, SERVICE_CATALOG, type ProposalLine } from "@i-events/core";
import { useState, useTransition } from "react";

/** The agency's draft quote: edit the lines, save, or send it to the client for approval. */
export function QuoteEditor({
  quoteId,
  eventId,
  initialLines,
  initialNote,
  nextVersion,
  lead = true,
}: {
  quoteId: string;
  eventId: string;
  initialLines: ProposalLine[];
  initialNote: string;
  nextVersion: number;
  /** Whether sending is the page's main action (the one Fiamma button). */
  lead?: boolean;
}) {
  const [lines, setLines] = useState(initialLines);
  const [note, setNote] = useState(initialNote);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string }>();
  const [pending, start] = useTransition();
  const update = (i: number, patch: Partial<ProposalLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const save = (send: boolean) =>
    start(async () => {
      if (send && !confirm(`Inviare la versione ${nextVersion} del preventivo al cliente per l'approvazione?`)) return;
      const res = await saveQuoteDraft(quoteId, eventId, { lines, note }, send);
      setMessage(res.error ? { tone: "error", text: res.error } : send ? undefined : { tone: "success", text: "Bozza salvata." });
    });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Bozza della versione {nextVersion}: il cliente la vede solo quando la invii.</p>
      <table className="w-full text-sm">
        <thead className="text-left text-muted">
          <tr>
            <th className="py-1 font-medium">Servizio</th>
            <th className="py-1 font-medium">Descrizione</th>
            <th className="py-1 text-right font-medium">Importo (€)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="py-1 pr-2">
                <Select aria-label={`Servizio voce ${i + 1}`} value={l.category} onChange={(e) => update(i, { category: e.target.value })}>
                  {SERVICE_CATALOG.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name.it}
                    </option>
                  ))}
                  <option value="other">Altro</option>
                </Select>
              </td>
              <td className="py-1 pr-2">
                <Input aria-label={`Descrizione voce ${i + 1}`} className="w-full" maxLength={300} value={l.description} onChange={(e) => update(i, { description: e.target.value })} />
              </td>
              <td className="py-1 pr-2">
                <Input
                  aria-label={`Importo voce ${i + 1}`}
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-32 text-right"
                  value={Number.isNaN(l.amount) ? "" : l.amount}
                  onChange={(e) => update(i, { amount: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
              </td>
              <td>
                <button type="button" className="text-muted underline" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                  Rimuovi
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between">
        <button type="button" className="text-sm underline" onClick={() => setLines((ls) => [...ls, { category: "other", description: "", amount: 0 }])}>
          + Aggiungi voce
        </button>
        <span className="text-base font-semibold">Totale {formatEuro(proposalTotal(lines))}</span>
      </div>
      <Field label="Nota per il cliente">
        <textarea rows={3} maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-ui border border-border bg-bg p-3 text-sm" />
      </Field>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" pending={pending} variant={lead ? "primary" : "secondary"} disabled={pending} onClick={() => save(true)}>
          Invia al cliente per l&apos;approvazione
        </Button>
        <Button type="button" pending={pending} variant="secondary" disabled={pending} onClick={() => save(false)}>
          Salva bozza
        </Button>
        <form
          action={deleteQuoteDraft}
          onSubmit={(e) => {
            if (!confirm("Eliminare la bozza?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="eventId" value={eventId} />
          <Button type="submit" variant="danger" disabled={pending} className="ic-host">
            <TrashIcon />
            Elimina bozza
          </Button>
        </form>
      </div>
    </div>
  );
}
