import type { Question, ServiceCategory } from "./services";
import { getServiceCategory } from "./services";
import type { RequestDraft } from "./requests";

export type Locale = "it" | "en";

const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** Human-readable value of one answer, using the option labels of the question. */
export function formatAnswer(question: Question, value: unknown, locale: Locale = "it"): string | null {
  if (isEmpty(value)) return null;
  switch (question.type) {
    case "boolean":
      return value ? (locale === "it" ? "Sì" : "Yes") : "No";
    case "number":
      return question.unit ? `${value} ${question.unit}` : String(value);
    case "select":
      return question.options.find((o) => o.value === value)?.label[locale] ?? String(value);
    case "multiselect":
      return (value as string[]).map((v) => question.options.find((o) => o.value === v)?.label[locale] ?? v).join(", ");
    case "text":
      return String(value);
  }
}

export type AnswerRow = { key: string; label: string; value: string | null; required: boolean };

/** Every question of a category with its formatted answer (null when not answered). */
export function answerRows(category: ServiceCategory, answers: Record<string, unknown>, locale: Locale = "it"): AnswerRow[] {
  return category.questions.map((q) => ({
    key: q.key,
    label: q.label[locale],
    value: formatAnswer(q, answers[q.key], locale),
    required: Boolean(q.required),
  }));
}

export type OpenQuestion = { category: string; categoryName: string; stageIndex?: number; question: string };

/** Unanswered questions of the selected services, listed in the agency report as "Domande aperte". */
export function openQuestions(draft: Pick<RequestDraft, "items">, locale: Locale = "it"): OpenQuestion[] {
  const out: OpenQuestion[] = [];
  for (const item of draft.items) {
    const category = getServiceCategory(item.category);
    if (!category) continue;
    for (const q of category.questions) {
      if (q.key === "notes") continue;
      if (isEmpty(item.answers[q.key])) {
        out.push({ category: category.key, categoryName: category.name[locale], stageIndex: item.stageIndex, question: q.label[locale] });
      }
    }
  }
  return out;
}
