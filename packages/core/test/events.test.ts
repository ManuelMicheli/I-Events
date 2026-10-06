import { describe, expect, it } from "vitest";
import { bookingSchema, eventBudget, quoteSchema, soldLines } from "../src";

describe("bookingSchema", () => {
  const base = { service_key: "security", contact_id: null, status: "to_book", planned_cost: null, actual_cost: null } as const;

  it("needs a supplier before asking or confirming", () => {
    expect(bookingSchema.safeParse(base).success).toBe(true);
    expect(bookingSchema.safeParse({ ...base, status: "confirmed" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...base, status: "confirmed", contact_id: "6f1c1b4e-5d2a-4c3b-9a8e-1f2d3c4b5a69" }).success).toBe(true);
  });

  it("rejects unknown services and negative costs", () => {
    expect(bookingSchema.safeParse({ ...base, service_key: "spaceship" }).success).toBe(false);
    expect(bookingSchema.safeParse({ ...base, planned_cost: -1 }).success).toBe(false);
  });
});

describe("eventBudget", () => {
  const bookings = [
    { service_key: "security", status: "confirmed", planned_cost: 3000, actual_cost: 3200.1 },
    { service_key: "venue", status: "requested", planned_cost: 5000, actual_cost: null },
    { service_key: "venue", status: "cancelled", planned_cost: 9000, actual_cost: null },
    { service_key: "entertainment", status: "to_book", planned_cost: null, actual_cost: null },
  ] as const;

  it("compares what was sold with what suppliers cost", () => {
    const b = eventBudget(bookings, [
      { category: "security", amount: 4500 },
      { category: "venue", amount: 7000.2 },
      { category: "other", amount: 500 },
    ]);
    expect(b.sold).toBe(12000.2);
    expect(b.planned).toBe(8000);
    expect(b.actual).toBe(3200.1);
    expect(b.forecast).toBe(8200.1);
    expect(b.margin).toBe(3800.1);
    expect(b.confirmed).toBe(1);
    expect(b.open).toBe(2);
    expect(b.rows.find((r) => r.service === "venue")).toEqual({ service: "venue", sold: 7000.2, planned: 5000, actual: 0, hasActual: false });
    expect(b.rows.find((r) => r.service === "other")?.sold).toBe(500);
  });

  it("has no margin when the selling price of this event is unknown", () => {
    const b = eventBudget(bookings, null);
    expect(b.sold).toBeNull();
    expect(b.margin).toBeNull();
    expect(b.rows.every((r) => r.sold === null)).toBe(true);
  });
});

describe("soldLines", () => {
  const proposal = [{ category: "catering", description: "Buffet", amount: 5000 }];
  const quote = (version: number, status: "approved" | "sent" | "superseded", amount: number) => ({
    version,
    status,
    lines: [{ category: "catering", description: "Buffet", amount }],
  });

  it("uses the latest approved quote", () => {
    const sold = soldLines([quote(1, "approved", 4000), quote(3, "sent", 9000), quote(2, "approved", 4500)], proposal, true);
    expect(sold).toEqual({ lines: [{ category: "catering", description: "Buffet", amount: 4500 }], source: "quote", version: 2 });
  });

  it("falls back to the proposal only when it covers this event alone", () => {
    expect(soldLines([quote(1, "sent", 4000)], proposal, true)?.source).toBe("proposal");
    expect(soldLines([quote(1, "sent", 4000)], proposal, false)).toBeNull();
    expect(soldLines([quote(1, "approved", 4000)], proposal, false)?.source).toBe("quote");
  });
});

describe("quoteSchema", () => {
  it("needs at least one valid line", () => {
    expect(quoteSchema.safeParse({ lines: [] }).success).toBe(false);
    expect(quoteSchema.safeParse({ lines: [{ category: "venue", description: "Villa", amount: 3000 }] }).success).toBe(true);
    expect(quoteSchema.safeParse({ lines: [{ category: "venue", description: "", amount: 3000 }] }).success).toBe(false);
  });
});
