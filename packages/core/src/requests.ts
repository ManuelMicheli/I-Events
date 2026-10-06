import { z } from "zod";
import { answersSchema, getServiceCategory, SERVICE_KEYS } from "./services";

export const REQUEST_KINDS = ["single", "campaign"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const OBJECTIVES = ["product_launch", "brand_awareness", "internal", "trade_fair", "pop_up", "other"] as const;

export const MAX_CAMPAIGN_EVENTS = 50;

const isoDate = z.iso.date();

export const basicsSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    objective: z.enum(OBJECTIVES),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    guests: z.number().int().min(1).max(1_000_000).optional(),
    budgetMin: z.number().min(0).optional(),
    budgetMax: z.number().min(0).optional(),
    isPublic: z.boolean().default(false),
    audience: z.string().trim().max(300).optional(),
    city: z.string().trim().max(120).optional(),
  })
  .refine((b) => !b.startDate || !b.endDate || b.startDate <= b.endDate, {
    message: "La data di fine deve essere uguale o successiva a quella di inizio",
    path: ["endDate"],
  })
  .refine((b) => b.budgetMin === undefined || b.budgetMax === undefined || b.budgetMin <= b.budgetMax, {
    message: "Il budget minimo supera il massimo",
    path: ["budgetMax"],
  });

export const stageSchema = z.object({
  city: z.string().trim().max(120).optional(),
  venueHint: z.string().trim().max(200).optional(),
  date: isoDate.optional(),
});

export const campaignSchema = z.object({
  eventsCount: z.number().int().min(2).max(MAX_CAMPAIGN_EVENTS),
  sameVenue: z.boolean(),
  /** "shared": one set of services for every stage; "per_stage": services chosen stage by stage. */
  servicesMode: z.enum(["shared", "per_stage"]),
  stages: z.array(stageSchema),
});

export const requestItemSchema = z.object({
  category: z.enum(SERVICE_KEYS as [string, ...string[]]),
  /** Index into campaign.stages when servicesMode is "per_stage". */
  stageIndex: z.number().int().min(0).optional(),
  answers: z.record(z.string(), z.unknown()),
});

export const requestDraftSchema = z
  .object({
    kind: z.enum(REQUEST_KINDS),
    basics: basicsSchema,
    campaign: campaignSchema.optional(),
    items: z.array(requestItemSchema),
    freeText: z.string().trim().max(10_000).optional(),
  })
  .superRefine((r, ctx) => {
    if (r.kind === "single" && r.campaign) {
      ctx.addIssue({ code: "custom", path: ["campaign"], message: "Un evento singolo non ha tappe" });
    }
    if (r.kind === "campaign") {
      if (!r.campaign) {
        ctx.addIssue({ code: "custom", path: ["campaign"], message: "Indica numero di eventi e luoghi" });
        return;
      }
      if (r.campaign.stages.length !== r.campaign.eventsCount) {
        ctx.addIssue({
          code: "custom",
          path: ["campaign", "stages"],
          message: `Servono ${r.campaign.eventsCount} tappe, ne sono state indicate ${r.campaign.stages.length}`,
        });
      }
    }
    const perStage = r.kind === "campaign" && r.campaign?.servicesMode === "per_stage";
    const seen = new Set<string>();
    r.items.forEach((item, i) => {
      if (perStage) {
        if (item.stageIndex === undefined || item.stageIndex >= (r.campaign?.stages.length ?? 0)) {
          ctx.addIssue({ code: "custom", path: ["items", i, "stageIndex"], message: "Tappa non valida" });
        }
      } else if (item.stageIndex !== undefined) {
        ctx.addIssue({ code: "custom", path: ["items", i, "stageIndex"], message: "I servizi sono comuni a tutte le tappe" });
      }
      const dedupeKey = `${item.category}:${item.stageIndex ?? "all"}`;
      if (seen.has(dedupeKey)) {
        ctx.addIssue({ code: "custom", path: ["items", i, "category"], message: "Servizio ripetuto" });
      }
      seen.add(dedupeKey);
      const category = getServiceCategory(item.category);
      if (!category) return;
      const parsed = answersSchema(category).safeParse(item.answers);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({ code: "custom", path: ["items", i, "answers", ...issue.path.map(String)], message: issue.message });
        }
      }
    });
  });

export type RequestDraft = z.infer<typeof requestDraftSchema>;

/** Applies the campaign choices before saving: with one venue every stage shares the first stage's place. */
export function normalizeDraft(draft: RequestDraft): RequestDraft {
  if (draft.kind !== "campaign" || !draft.campaign) return { ...draft, campaign: undefined, items: draft.items.map(({ stageIndex: _s, ...i }) => i) };
  const { campaign } = draft;
  const first = campaign.stages[0];
  const stages = campaign.sameVenue && first ? campaign.stages.map((s) => ({ ...s, city: first.city, venueHint: first.venueHint })) : campaign.stages;
  const items = campaign.servicesMode === "shared" ? draft.items.map(({ stageIndex: _s, ...i }) => i) : draft.items;
  return { ...draft, campaign: { ...campaign, stages }, items };
}

/** A request can be sent only when it is valid and asks for at least one service or has free text. */
export function submissionIssues(draft: RequestDraft): string[] {
  const issues: string[] = [];
  if (draft.items.length === 0 && !draft.freeText) issues.push("Scegli almeno un servizio o scrivi una richiesta libera");
  if (!draft.basics.startDate) issues.push("Indica almeno una data o un periodo");
  return issues;
}

/**
 * How complete a brief is, 0 to 100, shown to the agency in the report header.
 * Counts filled basics and answered questions of the selected services.
 */
export function briefCompleteness(draft: RequestDraft): number {
  const b = draft.basics;
  const basics = [b.startDate, b.endDate, b.guests, b.budgetMin ?? b.budgetMax, b.audience, b.city];
  let filled = basics.filter((v) => v !== undefined && v !== "").length;
  let total = basics.length;
  for (const item of draft.items) {
    const category = getServiceCategory(item.category);
    if (!category) continue;
    for (const q of category.questions) {
      total += 1;
      const v = item.answers[q.key];
      if (v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)) filled += 1;
    }
  }
  if (draft.kind === "campaign" && draft.campaign) {
    for (const s of draft.campaign.stages) {
      total += 2;
      if (s.city || draft.campaign.sameVenue) filled += 1;
      if (s.date) filled += 1;
    }
  }
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}
