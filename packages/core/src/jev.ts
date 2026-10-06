import { keywordClassifier, type ContactDraft, type ServiceClassifier } from "./contacts";
import { SERVICE_CATALOG, type ServiceKey } from "./services";

/**
 * Service classifier backed by Jev (TypeSafe AI), the decision model that answers typed questions.
 * Each contact becomes one choice question over the service catalog; up to 32 questions travel in
 * one request. Any contact Jev cannot place (error, timeout, no clear answer) keeps the keyword rules,
 * so an import never waits on or fails because of the model.
 *
 * API: POST {baseUrl}/v1/systemone with { model, state, questions } and Bearer auth; every choice
 * answer carries { choice, confidence, probabilities }. Shape taken from the official SDK
 * (@typesafe-ai/sdk 0.6). The key is passed in, never read here: this module also ships to mobile.
 */

export interface JevOptions {
  apiKey: string;
  /** Defaults to https://api.typesafe.ai */
  baseUrl?: string;
  /** Defaults to jev-latest. */
  model?: string;
  /** Budget for the whole import; contacts still waiting after it keep the keyword proposal. */
  timeoutMs?: number;
  /** Parallel requests. */
  concurrency?: number;
  fetch?: typeof fetch;
  /** Called once per failed request, without contact data or key, so the server can log it. */
  onError?: (error: unknown) => void;
}

/** Jev's per-request question limit. */
export const JEV_MAX_QUESTIONS = 32;
/** A second service is proposed only when Jev gives it at least this probability. */
const SECOND_SERVICE_MIN = 0.3;
/** Below this the top pick is not trusted and the keyword rules decide. */
const TOP_SERVICE_MIN = 0.35;
const NONE = "none";

const CRITERIA: Record<string, string> = {
  ...Object.fromEntries(SERVICE_CATALOG.map((c) => [c.key, `${c.name.it} (${c.name.en})`])),
  [NONE]: "Nessuno di questi: contatto personale o non legato ai servizi per eventi",
};

const STATE =
  "Rubrica di un'agenzia italiana che organizza eventi. Ogni domanda descrive un contatto (fornitore, persona o azienda): indica quale servizio per eventi offre.";

/** The contact as Jev reads it: only the fields that say what someone does. */
function describe(c: ContactDraft, hint: string | undefined) {
  const entry: Record<string, string> = { nome: c.name };
  if (c.company) entry.azienda = c.company;
  if (c.role_title) entry.ruolo = c.role_title;
  if (hint) entry.categoria = hint;
  if (c.website) entry.sito = c.website;
  if (c.notes) entry.note = c.notes.slice(0, 500);
  return entry;
}

export function jevQuestions(contacts: readonly ContactDraft[], hints?: readonly (string | undefined)[], offset = 0) {
  return Object.fromEntries(
    contacts.map((c, i) => [
      `c${offset + i}`,
      { type: "choice", instructions: { domanda: "Quale servizio offre questo contatto?", contatto: describe(c, hints?.[offset + i]) }, criteria: CRITERIA },
    ]),
  );
}

type ChoiceAnswer = { choice?: unknown; probabilities?: Record<string, unknown> };

/** Services from one choice answer: the top pick, plus a close second. Empty when Jev is unsure. */
export function servicesFromAnswer(answer: ChoiceAnswer | undefined): ServiceKey[] {
  const probs = Object.entries(answer?.probabilities ?? {})
    .filter((e): e is [string, number] => typeof e[1] === "number" && e[0] in CRITERIA)
    .sort((a, b) => b[1] - a[1]);
  const top = probs[0];
  if (!top || top[0] === NONE || top[1] < TOP_SERVICE_MIN) return [];
  const out = [top[0]];
  const second = probs[1];
  if (second && second[0] !== NONE && second[1] >= SECOND_SERVICE_MIN) out.push(second[0]);
  return out as ServiceKey[];
}

export function jevClassifier(options: JevOptions): ServiceClassifier {
  const baseUrl = (options.baseUrl ?? "https://api.typesafe.ai").replace(/\/+$/, "");
  const model = options.model ?? "jev-latest";
  const timeoutMs = options.timeoutMs ?? 12_000;
  const concurrency = Math.max(1, options.concurrency ?? 6);
  const doFetch = options.fetch ?? fetch;

  return {
    async classify(contacts, hints) {
      const fallback = await keywordClassifier.classify(contacts, hints);
      if (contacts.length === 0) return fallback;
      const result: ServiceKey[][] = fallback.map(() => []);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const chunks: number[] = [];
      for (let i = 0; i < contacts.length; i += JEV_MAX_QUESTIONS) chunks.push(i);

      async function run(offset: number) {
        const slice = contacts.slice(offset, offset + JEV_MAX_QUESTIONS);
        const res = await doFetch(`${baseUrl}/v1/systemone`, {
          method: "POST",
          headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ model, state: STATE, questions: jevQuestions(slice, hints, offset) }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Jev answered ${res.status}`);
        const body = (await res.json()) as { answers?: Record<string, ChoiceAnswer> };
        slice.forEach((_, i) => (result[offset + i] = servicesFromAnswer(body.answers?.[`c${offset + i}`])));
      }

      let next = 0;
      const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, async () => {
        while (next < chunks.length && !controller.signal.aborted) {
          const offset = chunks[next++]!;
          try {
            await run(offset);
          } catch (error) {
            if (!controller.signal.aborted) options.onError?.(error);
          }
        }
      });
      await Promise.all(workers);
      clearTimeout(timer);
      if (controller.signal.aborted) options.onError?.(new Error(`Jev timed out after ${timeoutMs}ms`));

      return result.map((services, i) => (services.length ? services : fallback[i]!));
    },
  };
}
