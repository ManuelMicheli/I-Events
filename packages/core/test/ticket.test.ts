import { describe, expect, it } from "vitest";
import { eventCountdown, formatTicketNumber } from "../src";

describe("ticket", () => {
  it("formats the number with four digits and the campaign stage", () => {
    expect(formatTicketNumber(142)).toBe("#0142");
    expect(formatTicketNumber(142, 1)).toBe("#0142-2");
    expect(formatTicketNumber(12345)).toBe("#12345");
  });

  it("counts down to the event", () => {
    const today = "2026-10-14";
    const at = (start_date: string | null, status: "planning" | "live" | "completed" = "planning", end_date: string | null = null) =>
      eventCountdown({ start_date, end_date, status }, today);
    expect(at("2026-10-17")).toEqual({ label: "TRA 3 G", live: false });
    expect(at("2026-10-15")).toEqual({ label: "DOMANI", live: false });
    expect(at("2026-10-14")).toEqual({ label: "OGGI", live: false });
    expect(at("2026-10-13", "planning", "2026-10-15")).toEqual({ label: "OGGI", live: false });
    expect(at("2026-10-14", "live")).toEqual({ label: "IN SCENA", live: true });
    expect(at("2026-10-10")).toBeNull();
    expect(at("2026-10-20", "completed")).toBeNull();
    expect(at(null)).toBeNull();
    // Across the end of a month and of a year.
    expect(eventCountdown({ start_date: "2027-01-02", end_date: null, status: "planning" }, "2026-12-31")).toEqual({ label: "TRA 2 G", live: false });
  });
});
