import { describe, expect, it } from "vitest";
import { agencyHome, clientHome, firstName, greeting, isEventToday, plural } from "../src";

const today = "2026-10-07";
type S = "planning" | "preparing" | "live" | "completed" | "cancelled";
const ev = (status: S, start: string | null, end: string | null = null, sold = 0, planned = 0) => ({
  status,
  start_date: start,
  end_date: end,
  money: { sold, planned },
  latestQuote: null as { status: "sent" | "approved" } | null,
});

describe("home", () => {
  it("counts the agency's requests, events and margin like the app", () => {
    const h = agencyHome(
      [
        { status: "invited" },
        { status: "invited" },
        { status: "reviewing" },
        { status: "submitted" },
        { status: "accepted" },
      ],
      [
        ev("preparing", today),
        ev("planning", "2026-10-10", null, 10_000, 7_000),
        ev("planning", "2026-10-20", null, 5_000, 0),
        ev("cancelled", "2026-10-09"),
        ev("completed", "2026-06-01", null, 1_000, 500),
        ev("completed", "2026-09-01", null, 10_000, 9_000),
      ],
      today,
    );
    expect(h.fresh).toHaveLength(2);
    expect(h.toReview).toHaveLength(3);
    expect(h.waiting).toHaveLength(1);
    expect(h.todays).toHaveLength(1);
    expect(h.thisWeek.map((e) => e.start_date)).toEqual(["2026-10-10"]);
    expect(h.eventsThisWeek).toBe(2);
    expect(h.thisMonth).toHaveLength(3);
    // 20.000 sold, 16.000 planned: the June event is older than 90 days, the 20 Oct one has no costs.
    expect(h.margin).toBe(20);
    expect(h.priced).toHaveLength(2);
    expect(agencyHome([], [], today).margin).toBeNull();
  });

  it("collects what the company has to decide and the next event", () => {
    const quoted = { ...ev("planning", "2026-10-19"), latestQuote: { status: "sent" as const } };
    const h = clientHome(
      [
        {
          status: "sent",
          proposals: [{ status: "submitted" }, { status: "clarification" }, { status: "accepted" }],
        },
        { status: "sent", proposals: [{ status: "invited" }] },
        { status: "awarded", proposals: [{ status: "submitted" }] },
      ],
      [ev("completed", "2026-09-01"), quoted, ev("planning", null), ev("preparing", "2026-10-09")],
      today,
    );
    expect(h.open).toHaveLength(2);
    expect(h.fresh).toHaveLength(1);
    expect(h.priced).toHaveLength(2);
    expect(h.questions).toHaveLength(1);
    expect(h.awaitingQuotes).toHaveLength(1);
    expect(h.quotes).toEqual([quoted]);
    expect(h.toDecide).toBe(2);
    expect(h.upcoming.map((e) => e.start_date)).toEqual(["2026-10-09", "2026-10-19", null]);
    expect(h.next?.start_date).toBe("2026-10-09");
  });

  it("writes the greeting, the first name and counts", () => {
    expect(greeting(new Date("2026-10-07T07:00:00Z"))).toBe("Buongiorno");
    expect(greeting(new Date("2026-10-07T13:00:00Z"))).toBe("Buon pomeriggio");
    expect(greeting(new Date("2026-10-07T19:00:00Z"))).toBe("Buonasera");
    expect(firstName("  Manuel Micheli ")).toBe("Manuel");
    expect(firstName("")).toBeNull();
    expect(plural(1, "evento", "eventi")).toBe("1 evento");
    expect(plural(1200, "ospite", "ospiti")).toBe("1.200 ospiti");
    expect(
      isEventToday({ status: "planning", start_date: "2026-10-06", end_date: "2026-10-08" }, today),
    ).toBe(true);
    expect(isEventToday({ status: "cancelled", start_date: today, end_date: null }, today)).toBe(
      false,
    );
  });
});
