import { describe, expect, it } from "vitest";
import { normalizeDraft, answerRows, formatAnswer, formatEuro, getServiceCategory, openQuestions, proposalSchema, proposalTotal } from "../src";

describe("answers", () => {
  const venue = getServiceCategory("venue")!;

  it("formats answers with option labels", () => {
    const [spaceType, setting, capacity] = venue.questions;
    expect(formatAnswer(spaceType!, "private")).toBe("Privato");
    expect(formatAnswer(setting!, "outdoor", "en")).toBe("Outdoor");
    expect(formatAnswer(capacity!, 300)).toBe("300 persone");
    expect(formatAnswer(capacity!, undefined)).toBeNull();
    const av = getServiceCategory("av")!;
    expect(formatAnswer(av.questions[0]!, ["audio", "ledwall"])).toBe("Audio, Ledwall");
  });

  it("lists every question with its answer", () => {
    const rows = answerRows(venue, { space_type: "public", has_venue: false });
    expect(rows.find((r) => r.key === "has_venue")?.value).toBe("No");
    expect(rows.find((r) => r.key === "city")?.value).toBeNull();
  });

  it("collects open questions, ignoring free notes", () => {
    const open = openQuestions({ items: [{ category: "security", answers: { guards: 4 } }] });
    expect(open.map((o) => o.question)).toEqual(["Steward", "Presidio sanitario"]);
  });
});

describe("proposals", () => {
  it("validates lines and sums totals exactly", () => {
    const lines = [
      { category: "venue", description: "Location", amount: 0.1 },
      { category: "other", description: "Fee", amount: 0.2 },
    ];
    expect(proposalTotal(lines)).toBe(0.3);
    expect(proposalSchema.safeParse({ summary: "Ok", lines }).success).toBe(true);
    expect(proposalSchema.safeParse({ summary: "Ok", lines: [] }).success).toBe(false);
    expect(proposalSchema.safeParse({ summary: "Ok", lines: [{ category: "castle", description: "x", amount: 1 }] }).success).toBe(false);
  });

  it("formats euro amounts", () => {
    expect(formatEuro(18500).replace(/\s/g, " ")).toMatch(/18\.500,00 €/);
    expect(formatEuro(1700).replace(/\s/g, " ")).toBe("1.700,00 €");
    expect(formatEuro(null)).toBe("–");
  });
});

describe("normalizeDraft", () => {
  it("copies the shared venue to every stage", () => {
    const d = normalizeDraft({
      kind: "campaign",
      basics: { title: "Tour", objective: "pop_up", isPublic: false },
      campaign: { eventsCount: 2, sameVenue: true, servicesMode: "shared", stages: [{ city: "Milano", venueHint: "Fabbrica" }, { date: "2027-01-01" }] },
      items: [],
    });
    expect(d.campaign!.stages[1]).toEqual({ city: "Milano", venueHint: "Fabbrica", date: "2027-01-01" });
  });

  it("drops campaign data from a single event", () => {
    const d = normalizeDraft({
      kind: "single",
      basics: { title: "Evento", objective: "pop_up", isPublic: false },
      campaign: { eventsCount: 2, sameVenue: true, servicesMode: "per_stage", stages: [{}, {}] },
      items: [{ category: "venue", stageIndex: 1, answers: {} }],
    });
    expect(d.campaign).toBeUndefined();
    expect(d.items[0]!.stageIndex).toBeUndefined();
  });
});
