import Ionicons from "@expo/vector-icons/Ionicons";
import {
  briefCompleteness,
  EVENT_TYPE_INFO,
  EVENT_TYPES,
  MAX_CAMPAIGN_EVENTS,
  OBJECTIVE_LABEL,
  OBJECTIVES,
  SERVICE_CATALOG,
  submissionIssues,
  type RequestDraft,
} from "@i-events/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions, View } from "react-native";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Chip, ChipRow } from "@/components/chip";
import { DateField } from "@/components/date-field";
import { EventCover, TypeChip } from "@/components/event-type";
import { Notice } from "@/components/notice";
import { Choices, QuestionField } from "@/components/question-field";
import { Divider, InfoRow } from "@/components/rows";
import { Screen } from "@/components/screen";
import { Segmented } from "@/components/segmented";
import { SelectTile } from "@/components/select-tile";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/states";
import { T } from "@/components/text";
import { TextField } from "@/components/text-field";
import { EMPTY_DRAFT, fetchReachableAgencies, saveDraft, submitDraft, type ReachableAgency, type SaveResult } from "@/lib/drafts";
import { dateRange, plural } from "@/lib/format";
import { fetchRequest } from "@/lib/requests";
import { serviceIcon } from "@/lib/service-icons";
import { useActiveOrg } from "@/lib/session";
import { useQuery } from "@/lib/use-query";
import { control, radius, space, useTheme } from "@/theme";

type Step = "evento" | "formato" | "basi" | "tappe" | "servizi" | "note" | "agenzie" | "riepilogo";

const STEP_LABEL: Record<Step, string> = {
  evento: "Evento",
  formato: "Formato",
  basi: "Informazioni",
  tappe: "Tappe",
  servizi: "Servizi",
  note: "Richieste libere",
  agenzie: "Agenzie",
  riepilogo: "Riepilogo",
};

function resizeStages(draft: RequestDraft, count: number): RequestDraft {
  const c = draft.campaign ?? { eventsCount: 2, sameVenue: false, servicesMode: "shared" as const, stages: [] };
  const stages = Array.from({ length: count }, (_, i) => c.stages[i] ?? {});
  const items = draft.items.filter((i) => i.stageIndex === undefined || i.stageIndex < count);
  return { ...draft, campaign: { ...c, eventsCount: count, stages }, items };
}

/** The company's request, step by step as on the website: what, where and when, services, agencies. */
export default function NewRequestScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const org = useActiveOrg();
  const loaded = useQuery(id ? `draft:${id}` : null, () => fetchRequest(id!));
  const agencies = useQuery(`reachable-agencies:${org.id}`, () => fetchReachableAgencies(org.id));

  if (org.type !== "client") {
    return (
      <Screen>
        <EmptyState icon="business-outline" title="Solo per le aziende" body="Le richieste di evento si creano dall'organizzazione di un'azienda." />
      </Screen>
    );
  }
  if (id && loaded.loading) {
    return (
      <Screen>
        <CardSkeletons count={2} />
      </Screen>
    );
  }
  if (id && loaded.error && !loaded.data) {
    return (
      <Screen>
        <ErrorState error={loaded.error} onRetry={loaded.refresh} />
      </Screen>
    );
  }
  if (id && (!loaded.data || loaded.data.status !== "draft" || loaded.data.clientOrgId !== org.id)) {
    return (
      <Screen>
        <EmptyState icon="document-outline" title="Bozza non disponibile" body="Forse è già stata inviata o eliminata." />
      </Screen>
    );
  }
  return <Wizard orgId={org.id} requestId={id ?? null} initial={loaded.data?.draft ?? EMPTY_DRAFT} agencies={agencies.data ?? []} />;
}

function Wizard({
  orgId,
  requestId: initialId,
  initial,
  agencies,
}: {
  orgId: string;
  requestId: string | null;
  initial: RequestDraft;
  agencies: ReachableAgency[];
}) {
  const { c } = useTheme();
  const [draft, setDraft] = useState<RequestDraft>(initial);
  const [requestId, setRequestId] = useState(initialId);
  const [step, setStep] = useState<Step>(initialId ? "basi" : "evento");
  const [result, setResult] = useState<SaveResult>({});
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [stageTab, setStageTab] = useState(0);
  const [agencyQuery, setAgencyQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const narrow = useWindowDimensions().width < 360;
  const pillX = useRef<Partial<Record<Step, number>>>({});
  useEffect(() => {
    scroll.current?.scrollTo({ x: Math.max(0, (pillX.current[step] ?? 0) - space[8]), animated: true });
  }, [step]);

  const steps: Step[] = [
    "evento",
    "formato",
    "basi",
    ...(draft.kind === "campaign" ? (["tappe"] as const) : []),
    "servizi",
    "note",
    "agenzie",
    "riepilogo",
  ];
  const index = steps.indexOf(step);
  const perStage = draft.kind === "campaign" && draft.campaign?.servicesMode === "per_stage";
  const fieldError = (path: string) => result.issues?.find((i) => i.path === path)?.message;
  const completeness = useMemo(() => briefCompleteness(draft), [draft]);
  const setBasics = (patch: Partial<RequestDraft["basics"]>) => setDraft((d) => ({ ...d, basics: { ...d.basics, ...patch } }));

  async function persist(): Promise<boolean> {
    setPending(true);
    const res = await saveDraft(orgId, requestId, draft);
    setPending(false);
    setResult(res);
    if (res.id) {
      setRequestId(res.id);
      setSavedOnce(true);
    }
    return Boolean(res.id);
  }

  async function go(to: Step) {
    const target = steps.indexOf(to);
    // Back never blocks; the first steps have nothing to check; from Informazioni on, forward saves first.
    if (target <= index || index < steps.indexOf("basi")) {
      setResult({});
      setStep(to);
      return;
    }
    if (await persist()) setStep(to);
  }

  async function submit() {
    setPending(true);
    const res = await submitDraft(orgId, requestId, draft, selectedAgencies);
    setPending(false);
    setResult(res);
    if (res.id) setRequestId(res.id);
    if (res.id && !res.error && !res.issues) router.replace({ pathname: "/richiesta-azienda/[id]", params: { id: res.id } });
  }

  // ----- services -----
  const scope = perStage ? stageTab : undefined;
  const itemFor = (category: string) => draft.items.find((i) => i.category === category && i.stageIndex === scope);
  const toggleService = (category: string) =>
    setDraft((d) => ({
      ...d,
      items: itemFor(category)
        ? d.items.filter((i) => !(i.category === category && i.stageIndex === scope))
        : [...d.items, { category, stageIndex: scope, answers: {} }],
    }));
  const setAnswer = (category: string, key: string, value: unknown) =>
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
  const setStage = (i: number, patch: Partial<NonNullable<RequestDraft["campaign"]>["stages"][number]>) =>
    setDraft((d) => ({ ...d, campaign: { ...d.campaign!, stages: d.campaign!.stages.map((x, j) => (j === i ? { ...x, ...patch } : x)) } }));

  const visibleAgencies = agencies.filter((a) => {
    const q = agencyQuery.trim().toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || (a.city ?? "").toLowerCase().includes(q) || a.regions.some((r) => r.toLowerCase().includes(q));
  });

  const next = steps[index + 1];
  const primary =
    step === "evento"
      ? {
          label: draft.eventType ? `Scegli ${EVENT_TYPE_INFO[draft.eventType].label}` : "Scegli il tipo di evento",
          disabled: !draft.eventType,
          onPress: () => go("formato"),
        }
      : step === "riepilogo"
        ? {
            label: selectedAgencies.length ? `Invia a ${plural(selectedAgencies.length, "agenzia", "agenzie")}` : "Scegli almeno un'agenzia",
            disabled: selectedAgencies.length === 0,
            onPress: submit,
          }
        : { label: "Avanti", disabled: false, onPress: () => go(next!) };

  return (
    <Screen
      footerBar
      footer={
        <View style={styles.footerStack}>
          {/* The error sits by the buttons: after a failed save the wrong field may be far up the page. */}
          {result.error && <Notice tone="danger">{result.error}</Notice>}
          <View style={styles.footer}>
            {index > 0 && (
              <Pressable
                onPress={() => go(steps[index - 1]!)}
                disabled={pending}
                accessibilityRole="button"
                accessibilityLabel="Passo precedente"
                style={({ pressed }) => [styles.back, { borderColor: c.borderStrong, backgroundColor: pressed ? c.bgSubtle : c.bgSurface }]}
              >
                <Ionicons name="arrow-back" size={24} color={pending ? c.textDisabled : c.textPrimary} />
              </Pressable>
            )}
            <View style={styles.flex}>
              <Button label={primary.label} block loading={pending} disabled={primary.disabled} onPress={primary.onPress} />
            </View>
          </View>
        </View>
      }
      header={
        <View style={styles.header}>
          <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.steps}>
            {steps.map((s, i) => {
              const current = s === step;
              const locked = pending || (i > index && !requestId);
              return (
                <Pressable
                  key={s}
                  onPress={() => go(s)}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityState={{ selected: current, disabled: locked }}
                  accessibilityLabel={`Passo ${i + 1}: ${STEP_LABEL[s]}`}
                  onLayout={(e) => {
                    pillX.current[s] = e.nativeEvent.layout.x;
                  }}
                  style={styles.stepTouch}
                >
                  <View
                    style={[
                      styles.stepPill,
                      current ? { backgroundColor: c.bgSurface, borderColor: c.borderStrong } : { borderColor: "transparent" },
                    ]}
                  >
                    <T variant="label" tone={current ? "primary" : locked ? "disabled" : "secondary"}>
                      {`${i + 1}. ${STEP_LABEL[s]}`}
                    </T>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <T variant="caption" tone="secondary">
            {pending
              ? "Salvataggio…"
              : savedOnce || requestId
                ? `Bozza salvata · completezza del brief ${completeness}%`
                : `Completezza del brief ${completeness}%`}
          </T>
        </View>
      }
    >
      <Stack.Screen options={{ title: requestId ? "Bozza di richiesta" : "Nuova richiesta" }} />

      {step === "evento" && (
        <StepBody title="Che evento è?" lead="Il tipo dà il colore all'evento e aiuta le agenzie a capire subito di cosa si tratta.">
          <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Che evento è?">
            {EVENT_TYPES.map((t) => {
              const info = EVENT_TYPE_INFO[t];
              return (
                <SelectTile
                  key={t}
                  selected={draft.eventType === t}
                  onPress={() => setDraft((d) => ({ ...d, eventType: t }))}
                  accessibilityLabel={`${info.label}: ${info.examples}`}
                  style={styles.cell}
                >
                  <EventCover type={t} />
                  <View style={styles.tileTexts}>
                    <T variant="calloutStrong">{info.label}</T>
                    <T variant="caption" tone="secondary">
                      {info.examples}
                    </T>
                  </View>
                </SelectTile>
              );
            })}
          </View>
        </StepBody>
      )}

      {step === "formato" && (
        <StepBody title="Un evento o una campagna?">
          {(
            [
              { kind: "single", title: "Evento singolo", text: "Un evento, in un luogo e in una data.", icon: "calendar-outline" },
              {
                kind: "campaign",
                title: "Campagna pubblicitaria",
                text: "Più eventi, nello stesso posto o in città diverse.",
                icon: "git-network-outline",
              },
            ] as const
          ).map((o) => (
            <SelectTile
              key={o.kind}
              selected={draft.kind === o.kind}
              accessibilityLabel={`${o.title}: ${o.text}`}
              onPress={() => {
                setDraft((d) =>
                  o.kind === "campaign"
                    ? resizeStages({ ...d, kind: "campaign" }, d.campaign?.eventsCount ?? 2)
                    : { ...d, kind: "single", campaign: undefined, items: d.items.filter((i) => i.stageIndex === undefined) },
                );
                setStep("basi");
              }}
              style={styles.row}
            >
              <Ionicons name={o.icon} size={24} color={c.textPrimary} />
              <View style={styles.tileTexts}>
                <T variant="title3">{o.title}</T>
                <T variant="callout" tone="secondary">
                  {o.text}
                </T>
              </View>
            </SelectTile>
          ))}
        </StepBody>
      )}

      {step === "basi" && (
        <StepBody title="Le informazioni di base">
          <TextField
            label="Nome dell'evento o della campagna *"
            value={draft.basics.title}
            onChangeText={(t) => setBasics({ title: t })}
            maxLength={120}
            error={fieldError("basics.title")}
          />
          <Choices label="Obiettivo *">
            {OBJECTIVES.map((o) => (
              <Chip key={o} label={OBJECTIVE_LABEL[o]} selected={draft.basics.objective === o} onPress={() => setBasics({ objective: o })} />
            ))}
          </Choices>
          <TextField
            label="Città o zona"
            value={draft.basics.city ?? ""}
            onChangeText={(t) => setBasics({ city: t || undefined })}
            error={fieldError("basics.city")}
          />
          <DateField
            label={draft.kind === "campaign" ? "Inizio campagna" : "Data"}
            value={draft.basics.startDate}
            onChange={(v) => setBasics({ startDate: v })}
            error={fieldError("basics.startDate")}
          />
          <DateField
            label={draft.kind === "campaign" ? "Fine campagna" : "Data di fine (se dura più giorni)"}
            value={draft.basics.endDate}
            onChange={(v) => setBasics({ endDate: v })}
            error={fieldError("basics.endDate")}
          />
          <NumberField
            label={draft.kind === "campaign" ? "Ospiti per evento" : "Ospiti previsti"}
            value={draft.basics.guests}
            onChange={(v) => setBasics({ guests: v })}
            error={fieldError("basics.guests")}
          />
          <TextField
            label="Target"
            hint="Chi parteciperà: clienti, stampa, dipendenti…"
            value={draft.basics.audience ?? ""}
            onChangeText={(t) => setBasics({ audience: t || undefined })}
          />
          <View style={styles.pair}>
            <View style={styles.flex}>
              <NumberField
                label="Budget minimo (€)"
                value={draft.basics.budgetMin}
                onChange={(v) => setBasics({ budgetMin: v })}
                error={fieldError("basics.budgetMin")}
              />
            </View>
            <View style={styles.flex}>
              <NumberField
                label="Budget massimo (€)"
                value={draft.basics.budgetMax}
                onChange={(v) => setBasics({ budgetMax: v })}
                error={fieldError("basics.budgetMax")}
              />
            </View>
          </View>
          <ToggleRow
            label="Aperto al pubblico"
            hint="Comparirà nel calendario pubblico di I-Events."
            value={draft.basics.isPublic}
            onChange={(v) => setBasics({ isPublic: v })}
          />
        </StepBody>
      )}

      {step === "tappe" && draft.campaign && (
        <StepBody title="Le tappe della campagna">
          <View style={styles.group}>
            <T variant="label" tone="secondary">
              Quanti eventi?
            </T>
            <Stepper
              value={draft.campaign.eventsCount}
              min={2}
              max={MAX_CAMPAIGN_EVENTS}
              onChange={(n) => {
                setDraft((d) => resizeStages(d, n));
                setStageTab((t) => Math.min(t, n - 1));
              }}
            />
          </View>
          <View style={styles.group}>
            <T variant="label" tone="secondary">
              Dove
            </T>
            <Segmented
              value={draft.campaign.sameVenue ? "same" : "different"}
              onChange={(v) => setDraft((d) => ({ ...d, campaign: { ...d.campaign!, sameVenue: v === "same" } }))}
              accessibilityLabel="Dove"
              options={[
                { value: "same", label: "Stesso posto" },
                { value: "different", label: "Posti diversi" },
              ]}
            />
          </View>
          <View style={styles.group}>
            <T variant="label" tone="secondary">
              Servizi
            </T>
            <Segmented
              value={draft.campaign.servicesMode}
              // Switching mode starts the service choice again, to avoid half-assigned items.
              onChange={(v) => setDraft((d) => ({ ...d, campaign: { ...d.campaign!, servicesMode: v }, items: [] }))}
              accessibilityLabel="Servizi"
              options={[
                { value: "shared", label: "Uguali per tutte" },
                { value: "per_stage", label: "Diversi per tappa" },
              ]}
            />
          </View>
          {fieldError("campaign.stages") && <Notice tone="danger">{fieldError("campaign.stages")!}</Notice>}
          {draft.campaign.stages.map((s, i) => {
            const shared = draft.campaign!.sameVenue && i > 0;
            return (
              <Card key={i} style={styles.stage}>
                <T variant="bodyStrong">Tappa {i + 1}</T>
                {shared ? (
                  <T variant="callout" tone="secondary">
                    Stesso posto della tappa 1.
                  </T>
                ) : (
                  <>
                    <TextField label="Città" value={s.city ?? ""} onChangeText={(t) => setStage(i, { city: t || undefined })} />
                    <TextField
                      label="Luogo (se già noto)"
                      value={s.venueHint ?? ""}
                      onChangeText={(t) => setStage(i, { venueHint: t || undefined })}
                    />
                  </>
                )}
                <DateField label="Data" value={s.date} onChange={(v) => setStage(i, { date: v })} error={fieldError(`campaign.stages.${i}.date`)} />
              </Card>
            );
          })}
        </StepBody>
      )}

      {step === "servizi" && (
        <StepBody
          title="Di quali servizi hai bisogno?"
          lead="Scegli i servizi e rispondi alle domande: più il brief è completo, più precise saranno le proposte."
        >
          {perStage && draft.campaign && (
            <ChipRow accessibilityLabel="Tappa">
              {draft.campaign.stages.map((s, i) => (
                <Chip key={i} label={`Tappa ${i + 1}${s.city ? ` · ${s.city}` : ""}`} selected={stageTab === i} onPress={() => setStageTab(i)} />
              ))}
            </ChipRow>
          )}
          <View style={styles.grid}>
            {SERVICE_CATALOG.map((s) => {
              const on = Boolean(itemFor(s.key));
              return (
                <SelectTile
                  key={s.key}
                  multi
                  selected={on}
                  onPress={() => toggleService(s.key)}
                  accessibilityLabel={s.name.it}
                  // On narrow phones two columns would break long names mid-word: one row each instead.
                  style={narrow ? [styles.row, styles.full] : [styles.cell, styles.service]}
                >
                  <Ionicons name={serviceIcon(s.key)} size={24} color={c.textPrimary} />
                  <T variant="calloutStrong">{s.name.it}</T>
                </SelectTile>
              );
            })}
          </View>
          {SERVICE_CATALOG.filter((s) => itemFor(s.key)).map((s) => {
            const item = itemFor(s.key)!;
            const itemIndex = draft.items.indexOf(item);
            return (
              <Card key={`${s.key}:${scope ?? "all"}`} style={styles.stage}>
                <View style={styles.row}>
                  <Ionicons name={serviceIcon(s.key)} size={20} color={c.textPrimary} />
                  <T variant="title3" style={styles.flex}>
                    {s.name.it}
                  </T>
                </View>
                {s.questions.map((q) => (
                  <QuestionField
                    key={q.key}
                    question={q}
                    value={item.answers[q.key]}
                    onChange={(v) => setAnswer(s.key, q.key, v)}
                    error={fieldError(`items.${itemIndex}.answers.${q.key}`)}
                  />
                ))}
              </Card>
            );
          })}
        </StepBody>
      )}

      {step === "note" && (
        <StepBody title="Richieste libere" lead="Tutto quello che non rientra nei servizi: idee, vincoli, riferimenti.">
          <TextField
            label="Richieste libere"
            value={draft.freeText ?? ""}
            onChangeText={(t) => setDraft((d) => ({ ...d, freeText: t || undefined }))}
            maxLength={10000}
            multiline
            textAlignVertical="top"
            style={styles.notes}
            error={fieldError("freeText")}
          />
        </StepBody>
      )}

      {step === "agenzie" && (
        <StepBody title="A chi inviarla" lead="Puoi sceglierne più di una: ognuna ti manderà la sua proposta e potrai confrontarle.">
          <TextField label="Cerca" placeholder="Nome, città o zona" value={agencyQuery} onChangeText={setAgencyQuery} autoCorrect={false} />
          {visibleAgencies.length === 0 ? (
            <Notice>
              {agencies.length === 0 ? "Non ci sono ancora agenzie a cui inviarla. Collega le agenzie con cui lavori." : "Nessuna agenzia trovata."}
            </Notice>
          ) : (
            <Card style={styles.list}>
              {visibleAgencies.map((a, i) => (
                <View key={a.id}>
                  {i > 0 && <Divider />}
                  <AgencyRow
                    agency={a}
                    selected={selectedAgencies.includes(a.id)}
                    onToggle={() => setSelectedAgencies((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))}
                  />
                </View>
              ))}
            </Card>
          )}
        </StepBody>
      )}

      {step === "riepilogo" && (
        <Review draft={draft} completeness={completeness} agencies={agencies.filter((a) => selectedAgencies.includes(a.id))} />
      )}
    </Screen>
  );
}

function StepBody({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <View style={styles.body}>
      <View style={styles.titles}>
        <T variant="title2" accessibilityRole="header">
          {title}
        </T>
        {lead && (
          <T variant="callout" tone="secondary">
            {lead}
          </T>
        )}
      </View>
      {children}
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  error?: string;
}) {
  return (
    <TextField
      label={label}
      value={value === undefined ? "" : String(value)}
      keyboardType="number-pad"
      error={error}
      onChangeText={(t) => {
        const digits = t.replace(/\D/g, "").slice(0, 9);
        onChange(digits === "" ? undefined : Number(digits));
      }}
    />
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <T variant="bodyStrong" nativeID="public-label">
          {label}
        </T>
        <T variant="caption" tone="secondary">
          {hint}
        </T>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.borderControl, true: c.textPrimary }}
        thumbColor={c.bgSurface}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** − 4 +: big buttons for a small number. */
function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const { c } = useTheme();
  const button = (icon: "remove" | "add", to: number, label: string) => (
    <Pressable
      onPress={() => onChange(to)}
      disabled={to < min || to > max}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepperButton, { borderColor: c.borderStrong, backgroundColor: pressed ? c.bgSubtle : c.bgSurface }]}
    >
      <Ionicons name={icon} size={24} color={to < min || to > max ? c.textDisabled : c.textPrimary} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {button("remove", value - 1, "Un evento in meno")}
      <T variant="monoMetric" accessibilityLiveRegion="polite" accessibilityLabel={plural(value, "evento", "eventi")} style={styles.stepperValue}>
        {String(value)}
      </T>
      {button("add", value + 1, "Un evento in più")}
    </View>
  );
}

function AgencyRow({ agency: a, selected, onToggle }: { agency: ReachableAgency; selected: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const detail = [a.city, a.headline].filter(Boolean).join(" · ");
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[a.name, a.connected ? "collegata" : null, detail].filter(Boolean).join(", ")}
      style={({ pressed }) => [styles.agency, pressed && { backgroundColor: c.bgSubtle }]}
    >
      <View
        style={[styles.box, { borderColor: selected ? c.textPrimary : c.borderControl, backgroundColor: selected ? c.textPrimary : "transparent" }]}
      >
        {selected && <Ionicons name="checkmark" size={16} color={c.bgApp} />}
      </View>
      <View style={styles.flex}>
        <T variant="bodyStrong">{a.name}</T>
        {detail !== "" && (
          <T variant="callout" tone="secondary">
            {detail}
          </T>
        )}
      </View>
      {a.connected && (
        <T variant="label" tone="success">
          Collegata
        </T>
      )}
    </Pressable>
  );
}

function Review({ draft, completeness, agencies }: { draft: RequestDraft; completeness: number; agencies: ReachableAgency[] }) {
  const blocking = submissionIssues(draft);
  const b = draft.basics;
  const services = [...new Set(draft.items.map((i) => SERVICE_CATALOG.find((s) => s.key === i.category)?.name.it))].filter(Boolean);
  return (
    <StepBody title="Riepilogo" lead={`Completezza del brief: ${completeness}%. Più è completo, più precise saranno le proposte.`}>
      <Card style={styles.facts}>
        <View style={styles.group}>
          <T variant="label" tone="secondary">
            Che evento è
          </T>
          {draft.eventType ? <TypeChip type={draft.eventType} /> : <T variant="body">Da scegliere</T>}
        </View>
        <InfoRow label="Formato" value={draft.kind === "campaign" ? `Campagna di ${draft.campaign?.eventsCount} eventi` : "Evento singolo"} />
        <InfoRow label="Nome" value={b.title || "Da scrivere"} />
        <InfoRow label="Date" value={dateRange(b.startDate ?? null, b.endDate ?? null) ?? "Da definire"} />
        <InfoRow label="Ospiti" value={b.guests ? String(b.guests) : "Da definire"} />
        <InfoRow label="Servizi" value={services.join(", ") || "Nessuno"} />
        <InfoRow label="Agenzie" value={agencies.map((a) => a.name).join(", ") || "Nessuna scelta"} />
      </Card>
      {blocking.length > 0 && <Notice tone="danger">{`Prima di inviare: ${blocking.join(". ").toLowerCase()}.`}</Notice>}
    </StepBody>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[1] },
  bleed: { marginHorizontal: -space[4], flexGrow: 0 },
  steps: { paddingHorizontal: space[4], gap: space[1] },
  stepTouch: { minHeight: control.touch, justifyContent: "center" },
  stepPill: { height: control.s, justifyContent: "center", paddingHorizontal: space[3], borderRadius: radius.full, borderWidth: 1 },
  footerStack: { gap: space[3] },
  footer: { flexDirection: "row", gap: space[2], alignItems: "center" },
  back: { width: control.l, height: control.l, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  body: { gap: space[4] },
  titles: { gap: space[2] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  cell: { width: "47.5%", flexGrow: 1 },
  service: { minHeight: 96 },
  full: { width: "100%" },
  tileTexts: { gap: space[1], flexShrink: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  group: { gap: space[2] },
  pair: { flexDirection: "row", gap: space[3] },
  toggle: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: control.l },
  stage: { gap: space[4] },
  notes: { minHeight: 160 },
  list: { paddingVertical: space[1], gap: 0 },
  agency: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: 56,
    paddingVertical: space[3],
    marginHorizontal: -space[2],
    paddingHorizontal: space[2],
    borderRadius: radius.sm,
  },
  box: { width: 24, height: 24, borderRadius: radius.xs, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: space[4] },
  stepperButton: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepperValue: { minWidth: 56, textAlign: "center" },
  facts: { gap: space[4] },
});
