"use client";

import { Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import { formatEuro, proposalTotal, SERVICE_CATALOG, type ProposalLine } from "@i-events/core";
import { useState, useTransition } from "react";
import { submitProposal } from "../actions";

type Props = { proposalId: string; initialLines: ProposalLine[]; initialSummary: string; resubmit: boolean };

export function ProposalEditor({ proposalId, initialLines, initialSummary, resubmit }: Props) {
  const [lines, setLines] = useState<ProposalLine[]>(initialLines);
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const update = (i: number, patch: Partial<ProposalLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <Card title={resubmit ? "Aggiorna la proposta" : "Prepara la proposta"}>
      <div className="flex flex-col gap-4">
        <Field label="Sintesi per l'azienda">
          <textarea rows={4} maxLength={5000} value={summary} onChange={(e) => setSummary(e.target.value)} className="rounded-ui border border-border bg-bg p-3 text-sm" />
        </Field>
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
                  <Select aria-label="Servizio" value={l.category} onChange={(e) => update(i, { category: e.target.value })}>
                    {SERVICE_CATALOG.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name.it}
                      </option>
                    ))}
                    <option value="other">Altro</option>
                  </Select>
                </td>
                <td className="py-1 pr-2">
                  <Input aria-label="Descrizione" className="w-full" value={l.description} onChange={(e) => update(i, { description: e.target.value })} />
                </td>
                <td className="py-1 pr-2">
                  <Input
                    aria-label="Importo"
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
        {error && <Notice tone="error">{error}</Notice>}
        <Button
          type="button"
          className="self-start"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await submitProposal(proposalId, { summary, lines });
              setError(res.error);
            })
          }
        >
          {resubmit ? "Invia proposta aggiornata" : "Invia proposta all'azienda"}
        </Button>
      </div>
    </Card>
  );
}
