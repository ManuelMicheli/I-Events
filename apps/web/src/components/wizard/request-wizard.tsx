"use client";

import { submitDraft, saveDraft, type SaveResult } from "@/app/(app)/client/richieste/actions";
import { EventCover, TypeChip } from "@/components/event-type";
import { SaveIcon, SendIcon } from "@/components/icons";
import { Chips, Segmented, Stepper, Toggle } from "@/components/controls";
import { Button, buttonClass, Card, Field, Input, Notice } from "@/components/ui";
import type { ReachableAgency } from "@/lib/requests";
import {
  briefCompleteness,
  EVENT_TYPE_INFO,
  EVENT_TYPES,
  formatEuro,
  MAX_CAMPAIGN_EVENTS,
  OBJECTIVES,
  SERVICE_CATALOG,
  submissionIssues,
  type RequestDraft,
} from "@i-events/core";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { QuestionField } from "./question-field";
import type { WizardStep as Step } from "./steps";

const OBJECTIVE_LABEL: Record<(typeof OBJECTIVES)[number], string> = {
  product_launch: "Lancio prodotto",
  brand_awareness: "Brand awareness",
  internal: "Evento interno",
  trade_fair: "Fiera",
  pop_up: "Pop-up",
  other: "Altro",
};

const STEP_LABEL: Record<Step, string> = {
  evento: "Evento",
  tipo: "Formato",
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

type Props = {
  requestId: string | null;
  initial: RequestDraft;
  agencies: ReachableAgency[];
  initialStep?: Step;
  /** Files of the request, shown with the free requests once the draft exists. */
  attachments?: ReactNode;
  /** Agencies already ticked, e.g. when starting from an agency's marketplace profile. */
  initialAgencies?: string[];
};

export function RequestWizard({ requestId: initialId, initial, agencies, initialStep, attachments, initialAgencies }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<RequestDraft>(initial);
  const [requestId, setRequestId] = useState(initialId);
  const [step, setStep] = useState<Step>(initialStep ?? (initialId ? "basi" : "evento"));
  const [result, setResult] = useState<SaveResult>({});
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>(initialAgencies ?? []);
  const [stageTab, setStageTab] = useState(0);
  const [agencyQuery, setAgencyQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const steps: Step[] = ["evento", "tipo", "basi", ...(draft.kind === "campaign" ? (["campagna"] as const) : []), "servizi", "note", "agenzie", "riepilogo"];
  const index = steps.indexOf(step);
  const perStage = draft.kind === "campaign" && draft.campaign?.servicesMode === "per_stage";
  const fieldError = (path: string) => result.issues?.find((i) => i.path === path)?.message;
  const completeness = useMemo(() => briefCompleteness(draft), [draft]);

  const setBasics = (patch: Partial<RequestDraft["basics"]>) => setDraft((d) => ({ ...d, basics: { ...d.basics, ...patch } }));

  function persist(then?: () => void, to?: Step) {
    startTransition(async () => {
      const res = await saveDraft(requestId, draft);
      setResult(res);
      if (res.id) {
        if (!requestId) {
          // From now on the draft lives at its own address, where its files can be attached.
          // Everything typed so far is saved, so loading it there loses nothing.
          setRequestId(res.id);
          router.replace(`/client/richieste/${res.id}/modifica?passo=${to ?? step}`);
          return;
        }
        then?.();
      }
    });
  }

  function go(to: Step) {
    // Going back never blocks; going forward saves the draft first and stops on validation errors.
    if (steps.indexOf(to) <= index) return setStep(to);
    persist(() => setStep(to), to);
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

  // From 1536 px the chosen details stay in view in a panel on the right; from 1920 px the steps move to a
  // column on the left, so the step itself gets the middle (A11 in globals.css).
  return (
    <div className="flex flex-col gap-6 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:items-start 3xl:grid-cols-[13rem_minmax(0,1fr)_24rem] 4xl:grid-cols-[14rem_minmax(0,1fr)_28rem] 4xl:gap-8">
      <ol className="flex flex-wrap gap-2 text-sm 2xl:col-start-1 2xl:row-start-1 3xl:sticky 3xl:top-20 3xl:flex-col 3xl:flex-nowrap" aria-label="Passaggi">
        {steps.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={pending || (i > index && !requestId)}
              onClick={() => go(s)}
              aria-current={s === step ? "step" : undefined}
              className={`min-h-10 rounded-full px-3 transition-colors 3xl:w-full 3xl:text-left duration-[120ms] disabled:text-disabled ${
                s === step ? "bg-surface font-medium text-text" : "text-muted hover:bg-surface hover:text-text"
              }`}
            >
              {i + 1}. {STEP_LABEL[s]}
            </button>
          </li>
        ))}
      </ol>

      <div className="flex min-w-0 flex-col gap-6 2xl:col-start-1 2xl:row-start-2 3xl:col-start-2 3xl:row-start-1">
      {step === "evento" && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-medium">Che evento è?</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" role="radiogroup" aria-label="Che evento è?">
            {EVENT_TYPES.map((t) => {
              const info = EVENT_TYPE_INFO[t];
              const selected = draft.eventType === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setDraft((d) => ({ ...d, eventType: t }))}
                  className={`flex flex-col items-start gap-3 rounded-card border p-4 text-left transition-colors duration-[120ms] ${
                    selected ? "border-2 border-accent bg-accent-subtle p-[15px]" : "border-border bg-bg hover:bg-surface"
                  }`}
                >
                  <EventCover type={t} className="size-12 rounded-ui" />
                  <span className="flex flex-col gap-1">
                    <span className="font-medium">{info.label}</span>
                    <span className="text-xs text-muted">{info.examples}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom))] -mx-4 bg-app/95 px-4 pt-3 pb-4 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              type="button"
              disabled={!draft.eventType}
              onClick={() => setStep("tipo")}
              className={buttonClass("primary", "l", "w-full sm:w-auto")}
            >
              {draft.eventType ? `Scegli ${EVENT_TYPE_INFO[draft.eventType].label}` : "Scegli il tipo di evento"}
            </button>
          </div>
        </div>
      )}

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
              className={`rounded-card border p-6 text-left transition-colors duration-[120ms] ${draft.kind === o.kind ? "border-2 border-accent bg-accent-subtle p-[23px]" : "border-border bg-bg hover:bg-surface"}`}
            >
              <span className="block text-xl font-medium">{o.title}</span>
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
            <div className="sm:col-span-2">
              <Chips
                legend="Obiettivo *"
                options={OBJECTIVES.map((o) => ({ value: o, label: OBJECTIVE_LABEL[o] }))}
                value={draft.basics.objective}
                onChange={(v) => setBasics({ objective: v as RequestDraft["basics"]["objective"] })}
              />
            </div>
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
            <div className="sm:col-span-2">
              <Toggle
                label="Evento aperto al pubblico"
                hint="Comparirà nel calendario pubblico di I-Events."
                checked={draft.basics.isPublic}
                onChange={(on) => setBasics({ isPublic: on })}
              />
            </div>
          </div>
        </Card>
      )}

      {step === "campagna" && draft.campaign && (
        <Card>
          <div className="flex flex-col gap-5">
            <Field label="Quanti eventi?" error={fieldError("campaign.eventsCount") ?? fieldError("campaign.stages")}>
              <Stepper
                label="Eventi"
                min={2}
                max={MAX_CAMPAIGN_EVENTS}
                value={draft.campaign.eventsCount}
                onChange={(n) => setDraft((d) => resizeStages(d, Math.min(MAX_CAMPAIGN_EVENTS, Math.max(2, n ?? 2))))}
              />
            </Field>
            <Segmented
              legend="Dove si tengono?"
              options={[
                { value: "same", label: "Stesso posto" },
                { value: "different", label: "Posti diversi" },
              ]}
              value={draft.campaign.sameVenue ? "same" : "different"}
              onChange={(v) => setDraft((d) => ({ ...d, campaign: { ...d.campaign!, sameVenue: v === "same" } }))}
            />
            <Segmented
              legend="Servizi delle tappe"
              options={[
                { value: "shared", label: "Uguali per tutte" },
                { value: "per_stage", label: "Diversi per tappa" },
              ]}
              value={draft.campaign.servicesMode}
              onChange={(v) =>
                setDraft((d) => ({
                  ...d,
                  campaign: { ...d.campaign!, servicesMode: v },
                  // Switching mode starts the service choice again, to avoid half-assigned items.
                  items: [],
                }))
              }
            />
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
                  className={`min-h-10 rounded-full border px-4 text-sm ${stageTab === i ? "border-accent bg-accent-subtle font-medium" : "border-border-strong bg-bg text-muted hover:bg-surface"}`}
                >
                  Tappa {i + 1}
                  {s.city ? ` · ${s.city}` : ""}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 4xl:grid-cols-4">
            {SERVICE_CATALOG.map((c) => {
              const on = Boolean(itemFor(c.key));
              return (
                <label key={c.key} className={`flex cursor-pointer items-center gap-3 rounded-ui border p-4 ${on ? "border-accent bg-accent-subtle" : "border-border bg-bg hover:bg-surface"}`}>
                  <input type="checkbox" checked={on} onChange={(e) => toggleService(c.key, e.target.checked)} />
                  <span className="font-medium">{c.name.it}</span>
                </label>
              );
            })}
          </div>
          {/* Newest first: the service just ticked opens right under the tiles, above the ones already filled in.
              draft.items keeps the order of selection, and that is the order saved and shown to the agencies. */}
          {draft.items
            .filter((i) => i.stageIndex === scope)
            .reverse()
            .map((item) => {
            const c = SERVICE_CATALOG.find((x) => x.key === item.category);
            if (!c) return null;
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
        <div className={`grid items-start gap-6 ${attachments ? "4xl:grid-cols-2" : ""}`}>
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
        {attachments}
        </div>
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
          <Button type="button" pending={pending} variant="secondary" disabled={pending} onClick={() => go(steps[index - 1]!)}>
            Indietro
          </Button>
        )}
        {step !== "evento" && step !== "tipo" && step !== "riepilogo" && (
          <Button type="button" pending={pending} disabled={pending} onClick={() => go(steps[index + 1]!)}>
            Avanti
          </Button>
        )}
        {step === "riepilogo" && (
          <Button type="button" pending={pending} disabled={pending || selectedAgencies.length === 0} onClick={submit} className="ic-host">
            <SendIcon />
            Invia a {selectedAgencies.length} {selectedAgencies.length === 1 ? "agenzia" : "agenzie"}
          </Button>
        )}
        {step !== "evento" && step !== "tipo" && (
          <Button type="button" pending={pending} variant="secondary" disabled={pending} onClick={() => persist()}>
            Salva bozza
          </Button>
        )}
        {(pending || requestId) && (
          <span className="flex items-center gap-2 text-sm text-muted">
            <SaveIcon saving={pending} saved={Boolean(requestId)} />
            {pending ? "Salvataggio…" : "Bozza salvata"}
          </span>
        )}
        <span className="ml-auto text-sm text-muted 2xl:hidden">Completezza del brief: {completeness}%</span>
      </div>
      </div>

      <Summary draft={draft} completeness={completeness} agencies={agencies.filter((a) => selectedAgencies.includes(a.id))} />
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
          <dt className="text-muted">Che evento è</dt>
          <dd className="pt-1">{draft.eventType ? <TypeChip type={draft.eventType} /> : "Da scegliere"}</dd>
        </div>
        <div>
          <dt className="text-muted">Formato</dt>
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

const dayFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const day = (d: string) => dayFmt.format(new Date(`${d}T00:00:00Z`));

/** From 1536 px, beside the steps: what has been chosen so far. The services read newest first, as in the step. */
function Summary({ draft, completeness, agencies }: { draft: RequestDraft; completeness: number; agencies: ReachableAgency[] }) {
  const b = draft.basics;
  const services = [...new Set([...draft.items].reverse().map((i) => SERVICE_CATALOG.find((c) => c.key === i.category)?.name.it ?? i.category))];
  const cities = draft.kind === "campaign" ? [...new Set(draft.campaign?.stages.map((s) => s.city).filter(Boolean))] : [];
  const where = cities.length ? cities.join(", ") : b.city;
  const budget =
    b.budgetMin !== undefined || b.budgetMax !== undefined
      ? [b.budgetMin, b.budgetMax].filter((v) => v !== undefined).map((v) => formatEuro(v)).join(" – ")
      : undefined;
  const empty = <span className="text-muted">–</span>;
  const rows: { label: string; value: ReactNode }[] = [
    { label: "Che evento è", value: draft.eventType ? <TypeChip type={draft.eventType} /> : empty },
    { label: "Formato", value: draft.kind === "campaign" ? `Campagna di ${draft.campaign?.eventsCount ?? 2} eventi` : "Evento singolo" },
    { label: "Nome", value: b.title || empty },
    {
      label: "Quando",
      value: b.startDate ? <span className="font-mono tabular-nums">{[b.startDate, b.endDate].filter(Boolean).map((d) => day(d!)).join(" → ")}</span> : empty,
    },
    { label: "Dove", value: where || empty },
    { label: draft.kind === "campaign" ? "Ospiti per evento" : "Ospiti", value: b.guests ? <span className="font-mono tabular-nums">{b.guests}</span> : empty },
    { label: "Budget", value: budget ? <span className="font-mono tabular-nums">{budget}</span> : empty },
    {
      label: "Servizi",
      value: services.length ? (
        <ul className="flex flex-col gap-1">
          {services.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : (
        empty
      ),
    },
    { label: "Agenzie", value: agencies.length ? agencies.map((a) => a.name).join(", ") : empty },
  ];
  return (
    <aside aria-label="Riepilogo richiesta" className="hidden 2xl:sticky 2xl:top-20 2xl:col-start-2 2xl:row-span-2 2xl:row-start-1 2xl:block 3xl:col-start-3 3xl:row-span-1">
      <Card title="Riepilogo richiesta">
        <dl className="flex flex-col gap-3 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted">{r.label}</dt>
              <dd className="min-w-0 break-words">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 border-t border-border pt-4 text-sm">
          Completezza del brief: <span className="font-mono tabular-nums">{completeness}%</span>
        </p>
      </Card>
    </aside>
  );
}
