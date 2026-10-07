import { describe, expect, it } from "vitest";
import { compareProposals, proposalBadge, sentAgo, type Priced } from "./proposal-compare";

const line = (category: string, amount: number) => ({ category, description: "", amount });
const p = (id: string, lines: ReturnType<typeof line>[], status: Priced["status"] = "submitted"): Priced => ({
  id,
  status,
  lines,
  total: lines.reduce((s, l) => s + l.amount, 0),
});

describe("compareProposals", () => {
  const a = p("a", [line("catering", 1000), line("dj", 500)]);
  const b = p("b", [line("catering", 900)]);
  const c = p("c", [line("catering", 2000), line("dj", 400)]);

  it("lists every service once, in order of first appearance", () => {
    expect(compareProposals([b, a]).categories).toEqual(["catering", "dj"]);
  });

  it("gives null for a service an agency leaves out and finds the lowest per row", () => {
    const r = compareProposals([a, b, c]);
    expect(r.amount(b, "dj")).toBeNull();
    expect(r.lowestFor("catering")).toBe(900);
    expect(r.lowestFor("dj")).toBe(400);
  });

  it("labels the cheapest and the most complete only when one agency has it", () => {
    const r = compareProposals([a, b, c]);
    expect(r.cheapestId).toBe("b");
    expect(r.mostCompleteId).toBeNull();
    expect(compareProposals([a, b]).mostCompleteId).toBe("a");
    expect(compareProposals([a, p("d", [line("catering", 1000), line("dj", 500)])]).cheapestId).toBeNull();
  });

  it("leaves rejected proposals out of the labels", () => {
    expect(compareProposals([a, { ...b, status: "rejected" }]).cheapestId).toBeNull();
  });
});

describe("proposalBadge", () => {
  const now = Date.parse("2026-10-07T12:00:00Z");
  it("is Nuova with the live dot for two days, then Da valutare", () => {
    expect(proposalBadge("submitted", "2026-10-06T12:00:00Z", now)).toEqual({ label: "Nuova", tone: "accent", live: true });
    expect(proposalBadge("submitted", "2026-10-04T12:00:00Z", now).label).toBe("Da valutare");
    expect(proposalBadge("rejected", null, now).label).toBe("Non scelta");
  });
});

describe("sentAgo", () => {
  const now = new Date("2026-10-07T10:00:00Z");
  it("says oggi, ieri, days, then the date", () => {
    expect(sentAgo("2026-10-07T06:00:00Z", now)).toBe("oggi");
    expect(sentAgo("2026-10-06T10:00:00Z", now)).toBe("ieri");
    expect(sentAgo("2026-10-03T10:00:00Z", now)).toBe("4 giorni fa");
    expect(sentAgo("2026-09-12T10:00:00Z", now)).toBe("12 set");
  });
});
