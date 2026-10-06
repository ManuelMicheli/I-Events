import { describe, expect, it, vi } from "vitest";
import { jevClassifier, servicesFromAnswer, type ContactDraft } from "../src";

const contacts: ContactDraft[] = [
  { name: "Marco Rossi", company: "Sound Lab", services: [] },
  { name: "Giulia", company: "Vigilanza Nord", services: [] },
  { name: "Zia Carla", services: [] },
];

/** Fake Jev that answers every question with the given probabilities, keyed by question index. */
function fakeJev(byIndex: (i: number) => Record<string, number>) {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    const answers = Object.fromEntries(
      Object.keys(body.questions).map((k) => {
        const probabilities = byIndex(Number(k.slice(1)));
        const choice = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]![0];
        return [k, { type: "choice", choice, confidence: 0.9, probabilities }];
      }),
    );
    return new Response(JSON.stringify({ model: "jev-1.13.0", answers, usage: { input_tokens: 1, output_tokens: 1 } }), {
      headers: { "content-type": "application/json" },
    });
  });
}

describe("Jev answers", () => {
  it("keeps the top pick, a close second, and drops none or unsure answers", () => {
    expect(servicesFromAnswer({ probabilities: { av: 0.8, entertainment: 0.1 } })).toEqual(["av"]);
    expect(servicesFromAnswer({ probabilities: { av: 0.5, entertainment: 0.4 } })).toEqual(["av", "entertainment"]);
    expect(servicesFromAnswer({ probabilities: { none: 0.7, av: 0.3 } })).toEqual([]);
    expect(servicesFromAnswer({ probabilities: { av: 0.2, catering: 0.2 } })).toEqual([]);
    expect(servicesFromAnswer({ probabilities: { hacked: 0.99 } })).toEqual([]);
    expect(servicesFromAnswer(undefined)).toEqual([]);
  });
});

describe("jevClassifier", () => {
  it("sends one choice question per contact and maps the answers back in order", async () => {
    const fetch = fakeJev((i): Record<string, number> => (i === 0 ? { av: 0.9 } : i === 1 ? { security: 0.85 } : { none: 0.9 }));
    const out = await jevClassifier({ apiKey: "k", fetch }).classify(contacts);
    expect(out).toEqual([["av"], ["security"], []]);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer k");
    const body = JSON.parse(String(init!.body));
    expect(body.model).toBe("jev-latest");
    expect(body.questions.c1.type).toBe("choice");
    expect(body.questions.c1.instructions.contatto).toEqual({ nome: "Giulia", azienda: "Vigilanza Nord" });
    expect(Object.keys(body.questions.c1.criteria)).toContain("security");
  });

  it("splits large imports into requests of 32 questions", async () => {
    const many = Array.from({ length: 70 }, (_, i) => ({ name: `Persona ${i}`, services: [] }));
    const fetch = fakeJev(() => ({ catering: 0.9 }));
    const out = await jevClassifier({ apiKey: "k", fetch }).classify(many);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(out.every((s) => s[0] === "catering")).toBe(true);
  });

  it("falls back to keywords on errors and when Jev is unsure", async () => {
    const onError = vi.fn();
    const failing = vi.fn(async () => new Response("down", { status: 503 }));
    const kw = await jevClassifier({ apiKey: "k", fetch: failing, onError }).classify([{ name: "DJ Max", services: [] }]);
    expect(kw).toEqual([["entertainment"]]);
    expect(onError).toHaveBeenCalledOnce();

    const unsure = fakeJev(() => ({ none: 0.9 }));
    expect(await jevClassifier({ apiKey: "k", fetch: unsure }).classify([{ name: "Sicurezza Srl", services: [] }])).toEqual([["security"]]);
  });

  it("falls back to keywords when Jev is too slow", async () => {
    const hanging = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    const onError = vi.fn();
    const out = await jevClassifier({ apiKey: "k", fetch: hanging, timeoutMs: 20, onError }).classify([{ name: "Catering Bello", services: [] }]);
    expect(out).toEqual([["catering"]]);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("timed out") }));
  });
});
