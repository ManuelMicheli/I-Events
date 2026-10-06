"use client";

import { submitDraft, saveDraft, type SaveResult } from "@/app/(app)/client/richieste/actions";
import { Button, Card, Field, Input, Notice, Select } from "@/components/ui";
import type { ReachableAgency } from "@/lib/requests";
import {
  briefCompleteness,
  MAX_CAMPAIGN_EVENTS,
  OBJECTIVES,
  SERVICE_CATALOG,
  submissionIssues,
  type RequestDraft,
} from "@i-events/core";
import { useMemo, useState, useTransition } from "react";
import { QuestionField } from "./question-field";

const OBJECTIVE_LABEL: Record<(typeof OBJECTIVES)[number], string> = {
  product_launch: "Lancio prodotto",
  brand_awareness: "Brand awareness",
  internal: "Evento interno",
  trade_fair: "Fiera",
  pop_up: "Pop-up",
  other: "Altro",
};

type Step = "tipo" | "basi" | "campagna" | "servizi" | "note" | "agenzie" | "riepilogo";
const STEP_LABEL: Record<Step, string> = {
  tipo: "Tipo",
  basi: "Informazioni",
  campagna: "Tappe",
  servizi: "Servizi",
  note: "Richieste libere",
  agenzie: "Agenzie",
  riepilogo: "Riepilogo",
};

export const EMPTY_DRAFT: RequestDraft = {
  kind: "single",
  basics: { title: "", objective: "product_launch", isPublic: false },
  items: [],
};

function resizeStages(draft: RequestDraft, count: number): RequestDraft {
  const c = draft.campaign ?? { eventsCount: 2, sameVenue: false, servicesMode: "shared" as const, stages: [] };
  const stages = Array.from({ length: count }, (_, i) => c.stages[i] ?? {});
  const items = draft.items.filter((i) => i.stageIndex === undefined || i.stageIndex < count);
  return { ...draft, campaign: { ...c, eventsCount: count, stages }, items };
}

type Props = { requestId: string | null; initial: RequestDraft; agencies: ReachableAgency[] };

export function RequestWizard({ requestId: initialId, initial, agencies }: Props) {
  const [draft, setDraft] = useState<RequestDraft>(initial);
  const [requestId, setRequestId] = useState(initialId);
  const [step, setStep] = useState<Step>(initialId ? "basi" : "tipo");
  const [result, setResult] = useState<SaveResult>({});
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [stageTab, setStageTab] = useState(0);
  const [agencyQuery, setAgencyQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const steps: Step[] = ["tipo", "basi", ...(draft.kind === "campaign" ? (["campagna"] as const) : []), "servizi", "note", "agenzie", "riepilogo"];
  const index = steps.indexOf(step);
  const perStage = draft.kind === "campaign" && draft.campaign?.servicesMode === "per_stage";
  const fieldError = (path: string) => result.issues?.find((i) => i.path === path)?.message;
  const completeness = useMemo(() => briefCompleteness(draft), [draft]);

  const setBasics = (patch: Partial<RequestDraft["basics"]>) => setDraft((d) => ({ ...d, basics: { ...d.basics, ...patch } }));

  function persist(then?: () => void) {
    startTransition(async () => {
      const res = await saveDraft(requestId, draft);
      setResult(res);
      if (res.id) {
        if (!requestId) {
          setRequestId(res.id);
          window.history.replaceState(null, "", `/client/richieste/${res.id}/modifica`);
        }
        then?.();
      }
    });
  }

  function go(to: Step) {
    // Going back never blocks; going forward saves the draft first and stops on validation errors.
    if (steps.indexOf(to) <= index) return setStep(to);
    persist(() => setStep(to));
  }

  function submit() {
    startTransition(async () => {
      const res = await submitDraft(requestId, draft, selectedAgencies);
      setResult(res);
      if (res.id && !requestId) setRequestId(res.id);
    });
  }

  // ----- services helpers -----
  const scope = perStage ? stageTab : undefined;
  const itemFor = (category: string) => draft.items.find((i) => i.category === category && i.stageIndex === scope);
  function toggleService(category: string, on: boolean) {
    setDraft((d) => ({
      ...d,
      items: on
        ? [...d.items, { category, stageIndex: scope, answers: {} }]
        : d.items.filter((i) => !(i.category === category && i.stageIndex === scope)),
    }));
  }
  function setAnswer(category: string, key: string, value: unknown) {
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => {
        if (i.category !== category || i.stageIndex !== scope) return i;
        const answers = { ...i.answers };
        if (value === undefined) delete answers[key];
        else answers[key] = value;
        return { ...i, answers };
      }),
    }));
  }

  const visibleAgencies = agencies.filter((a) => {
    const q = agencyQuery.trim().toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || (a.city ?? "").toLowerCase().includes(q) || a.regions.some((r) => r.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Passaggi">
        {steps.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={pending || (i > index && !requestId)}
              onClick={() => go(s)}
              aria-current={s === step ? "step" : undefined}
              className={s === step ? "font-semibold" : "text-muted"}
            >
              {i + 1}. {STEP_LABEL[s]}
            </button>
          </li>
        ))}
      </ol>

      {step === "tipo" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              { kind: "single", title: "Evento singolo", text: "Un evento, in un luogo e in una data." },
              { kind: "campaign", title: "Campagna pubblicitaria", text: "Più eventi, nello stesso posto o in città diverse." },
            ] as const
          ).map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => {
                setDraft((d) => (o.kind === "campaign" ? resizeStages({ ...d, kind: "campaign" }, d.campaign?.eventsCount ?? 2) : { ...d, kind: "single", campaign: undefined, items: d.items.filter((i) => i.stageIndex === undefined) }));
                setStep("basi");
              }}
              className={`rounded-ui border p-6 text-left ${draft.kind === o.kind ? "border-accent" : "border-border"}`}
            >
              <span className="block text-lg font-semibold">{o.title}</span>
              <span className="block text-sm text-muted">{o.text}</span>
            </button>
          ))}
        </div>
      )}

      {step === "basi" && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome dell'evento o della campagna *" error={fieldError("basics.title")}>
                <Input value={draft.basics.title} onChange={(e) => setBasics({ title: e.target.value })} maxLength={120} />
              </Field>
            </div>
            <Field label="Obiettivo *">
              <Select value={draft.basics.objective} onChange={(e) => setBasics({ objective: e.target.value as RequestDraft["basics"]["objective"] })}>
                {OBJECTIVES.map((o) => (
                  <option key={o} value={o}>
                    {OBJECTIVE_LABEL[o]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Città o zona" error={fieldError("basics.city")}>
              <Input value={draft.basics.city ?? ""} onChange={(e) => setBasics({ city: e.target.value || undefined })} />
            </Field>
            <Field label={draft.kind === "campaign" ? "Inizio campagna" : "Data"} error={fieldError("basics.startDate")}>
              <Input type="date" value={draft.basics.startDate ?? ""} onChange={(e) => setBasics({ startDate: e.target.value || undefined })} />
            </Field>
            <Field label={draft.kind === "campaign" ? "Fine campagna" : "Data di fine (se più giorni)"} error={fieldError("basics.endDate")}>
              <Input type="date" value={draft.basics.endDate ?? ""} onChange={(e) => setBasics({ endDate: e.target.value || undefined })} />
            </Field>
            <Field label={draft.kind === "campaign" ? "Ospiti per evento" : "Ospiti previsti"} error={fieldError("basics.guests")}>
              <Input type="number" min={1} value={draft.basics.guests ?? ""} onChange={(e) => setBasics({ guests: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
            <Field label="Target" hint="Chi parteciperà: clienti, stampa, dipendenti…">
              <Input value={draft.basics.audience ?? ""} onChange={(e) => setBasics({ audience: e.target.value || undefined })} />
            </Field>
            <Field label="Budget minimo (€)" error={fieldError("basics.budgetMin")}>
              <Input type="number" min={0} value={draft.basics.budgetMin ?? ""} onChange={(e) => setBasics({ budgetMin: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
            <Field label="Budget massimo (€)" error={fieldError("basics.budgetMax")}>
              <Input type="number" min={0} value={draft.basics.budgetMax ?? ""} onChange={(e) => setBasics({ budgetMax: e.target.value ? Number(e.target.value) : undefined })} />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={draft.basics.isPublic} onChange={(e) => setBasics({ isPublic: e.target.checked })} />
              Evento aperto al pubblico (comparirà nel calendario pubblico)
            </label>
          </div>
        </Card>
      )}

      {step === "campagna" && draft.campaign && (
        <Card>
          <div className="flex flex-col gap-5">
            <Field label="Quanti eventi?" error={fieldError("campaign.eventsCount") ?? fieldError("campaign.stages")}>
              <Input
                type="number"
                min={2}
                max={MAX_CAMPAIGN_EVENTS}
                value={draft.campaign.eventsCount}
                onChange={(e) => setDraft((d) => resizeStages(d, Math.min(MAX_CAMPAIGN_EVENTS, Math.max(2, Number(e.target.value) || 2))))}
              />
            </Field>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1 font-medium">Dove</legend>
              {[
                { v: true, label: "Tutti nello stesso posto" },
                { v: false, label: "In posti diversi" },
              ].map((o) => (
                <label key={String(o.v)} className="flex items-center gap-2">
                  <input type="radio" name="sameVenue" checked={draft.campaign!.sameVenue === o.v} onChange={() => setDraft((d) => ({ ...d, campaign: { ...d.campaign!, sameVenue: o.v } }))} />
                  {o.label}
                </label>
              ))}
            </fieldset>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1 font-medium">Servizi</legend>
              {[
                { v: "shared", label: "Gli stessi servizi per tutte le tappe" },
                { v: "per_stage", label: "Servizi diversi per ogni tappa" },
              ].map((o) => (
                <label key={o.v} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="servicesMode"
                    checked={draft.campaign!.servicesMode === o.v}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        campaign: { ...d.campaign!, servicesMode: o.v as "shared" | "per_stage" },
                        // Switching mode starts the service choice again, to avoid half-assigned items.
                        items: [],
                      }))
                    }
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Tappe</h3>
              {draft.campaign.stages.map((s, i) => (
                <div key={i} className="grid gap-3 rounded-ui border border-border p-3 sm:grid-cols-3">
                  <Field label={`Tappa ${i + 1} · città`}>
                    <Input
                      value={draft.campaign!.sameVenue && i > 0 ? draft.campaign!.stages[0]?.city ?? "" : s.city ?? ""}
                      disabled={draft.campaign!.sameVenue && i > 0}
                      onChange={(e) => setDraft((d) => ({ ...d, campaign: { ...d.campaign!, stages: d.campaign!.stages.map((x, j) => (j === i ? { ...x, city: e.target.value || undefined } : x)) } }))}
                    />
                  </Field>
                  <Field label="Luogo (se già noto)">
                    <Input
                      value={s.venueHint ?? ""}
                      disabled={draft.campaign!.sameVenue && i > 0}
                      onChange={(e) => setDraft((d) => ({ ...d, campaign: { ...d.campaign!, stages: d.campaign!.stages.map((x, j) => (j === i ? { ...x, venueHint: e.target.value || undefined } : x)) } }))}
                    />
                  </Field>
                  <Field label="Data">
                    <Input
                      type="date"
                      value={s.date ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, campaign: { ...d.campaign!, stages: d.campaign!.stages.map((x, j) => (j === i ? { ...x, date: e.target.value || undefined } : x)) } }))}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {step === "servizi" && (
        <div className="flex flex-col gap-4">
          {perStage && draft.campaign && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tappe">
              {draft.campaign.stages.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={stageTab === i}
                  onClick={() => setStageTab(i)}
                  className={`rounded-ui border px-3 py-1.5 text-sm ${stageTab === i ? "border-accent font-medium" : "border-border text-muted"}`}
                >
                  Tappa {i + 1}
                  {s.city ? ` · ${s.city}` : ""}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATALOG.map((c) => {
              const on = Boolean(itemFor(c.key));
              return (
                <label key={c.key} className={`flex cursor-pointer items-center gap-3 rounded-ui border p-4 ${on ? "border-accent" : "border-border"}`}>
                  <input type="checkbox" checked={on} onChange={(e) => toggleService(c.key, e.target.checked)} />
                  <span className="font-medium">{c.name.it}</span>
                </label>
              );
            })}
          </div>
          {SERVICE_CATALOG.filter((c) => itemFor(c.key)).map((c) => {
            const item = itemFor(c.key)!;
            const itemIndex = draft.items.indexOf(item);
            return (
              <Card key={c.key} title={c.name.it}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {c.questions.map((q) => (
                    <div key={q.key} className={q.type === "text" && "multiline" in q && q.multiline ? "sm:col-span-2" : undefined}>
                      <QuestionField
                        idPrefix={`${c.key}-${scope ?? "all"}`}
                        question={q}
                        value={item.answers[q.key]}
                        onChange={(v) => setAnswer(c.key, q.key, v)}
                        error={fieldError(`items.${itemIndex}.answers.${q.key}`)}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {step === "note" && (
        <Card>
          <Field label="Richieste libere" hint="Tutto quello che non rientra nei servizi: idee, vincoli, riferimenti.">
            <textarea
              rows={8}
              maxLength={10000}
              className="rounded-ui border border-border bg-bg p-3"
              value={draft.freeText ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, freeText: e.target.value || undefined }))}
            />
          </Field>
        </Card>
      )}

      {step === "agenzie" && (
        <Card title="A chi inviare la richiesta">
          <p className="mb-4 text-sm text-muted">Puoi sceglierne più di una: ognuna ti invierà la sua proposta e potrai confrontarle.</p>
          <Input placeholder="Cerca per nome, città o zona" value={agencyQuery} onChange={(e) => setAgencyQuery(e.target.value)} className="mb-4 w-full" />
          {visibleAgencies.length === 0 ? (
            <Notice>Nessuna agenzia trovata. Collega le agenzie con cui lavori da Agenzie collegate.</Notice>
          ) : (
            <ul className="divide-y divide-border">
              {visibleAgencies.map((a) => (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedAgencies.includes(a.id)}
                      onChange={(e) => setSelectedAgencies((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))}
                    />
                    <span>
                      <span className="font-medium">{a.name}</span>
                      {a.connected && <span className="ml-2 text-xs text-success">Collegata</span>}
                      <span className="block text-muted">{[a.city, a.headline].filter(Boolean).join(" · ")}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {step === "riepilogo" && (
        <Review draft={draft} completeness={completeness} agencies={agencies.filter((a) => selectedAgencies.includes(a.id))} />
      )}

      {result.error && <Notice tone="error">{result.error}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        {index > 0 && (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => go(steps[index - 1]!)}>
            Indietro
          </Button>
        )}
        {step !== "tipo" && step !== "riepilogo" && (
          <Button type="button" disabled={pending} onClick={() => go(steps[index + 1]!)}>
            Avanti
          </Button>
        )}
        {step === "riepilogo" && (
          <Button type="button" disabled={pending || selectedAgencies.length === 0} onClick={submit}>
            Invia a {selectedAgencies.length} {selectedAgencies.length === 1 ? "agenzia" : "agenzie"}
          </Button>
        )}
        {step !== "tipo" && (
          <Button type="button" variant="secondary" disabled={pending} onClick={() => persist()}>
            Salva bozza
          </Button>
        )}
        <span className="text-sm text-muted">{pending ? "Salvataggio…" : requestId ? "Bozza salvata" : ""}</span>
        <span className="ml-auto text-sm text-muted">Completezza del brief: {completeness}%</span>
      </div>
    </div>
  );
}

function Review({ draft, completeness, agencies }: { draft: RequestDraft; completeness: number; agencies: ReachableAgency[] }) {
  const blocking = submissionIssues(draft);
  const b = draft.basics;
  return (
    <Card title="Riepilogo">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Tipo</dt>
          <dd>{draft.kind === "campaign" ? `Campagna di ${draft.campaign?.eventsCount} eventi` : "Evento singolo"}</dd>
        </div>
        <div>
          <dt className="text-muted">Nome</dt>
          <dd>{b.title}</dd>
        </div>
        <div>
          <dt className="text-muted">Date</dt>
          <dd>{[b.startDate, b.endDate].filter(Boolean).join(" → ") || "Da definire"}</dd>
        </div>
        <div>
          <dt className="text-muted">Ospiti</dt>
          <dd>{b.guests ?? "–"}</dd>
        </div>
        <div>
          <dt className="text-muted">Servizi</dt>
          <dd>
            {[...new Set(draft.items.map((i) => SERVICE_CATALOG.find((c) => c.key === i.category)?.name.it))].join(", ") || "Nessuno"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Agenzie</dt>
          <dd>{agencies.map((a) => a.name).join(", ") || "Nessuna scelta"}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm">Completezza del brief: {completeness}%. Più è completo, più precise saranno le proposte.</p>
      {blocking.length > 0 && (
        <div className="mt-4">
          <Notice tone="error">{blocking.join(". ")}</Notice>
        </div>
      )}
    </Card>
  );
}
