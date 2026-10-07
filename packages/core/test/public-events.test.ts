import { describe, expect, it } from "vitest";
import { isDay, isMonth, monthGrid, onDay, placesLabel, placesLeft, registrationErrorMessage, registrationSchema, shiftMonth } from "../src";

describe("public events", () => {
  it("validates a registration", () => {
    const ok = registrationSchema.safeParse({ name: "  Giulia Rossi ", email: "giulia@example.com", guests: "2", consent: true });
    expect(ok.success && ok.data).toEqual({ name: "Giulia Rossi", email: "giulia@example.com", guests: 2, consent: true });
    expect(registrationSchema.safeParse({ name: "G", email: "giulia@example.com", guests: 1, consent: true }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: "Giulia", email: "giulia", guests: 1, consent: true }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: "Giulia", email: "giulia@example.com", guests: 5, consent: true }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: "Giulia", email: "giulia@example.com", guests: 1, consent: false }).success).toBe(false);
  });

  it("counts the places left", () => {
    expect(placesLeft(null, 10)).toBeNull();
    expect(placesLeft(10, 12)).toBe(0);
    expect(placesLabel(null, 0)).toBeNull();
    expect(placesLabel(200, 10)).toBeNull();
    expect(placesLabel(30, 18)).toBe("Ultimi 12 posti");
    expect(placesLabel(30, 29)).toBe("Ultimo posto");
    expect(placesLabel(30, 30)).toBe("Esaurito");
  });

  it("explains why a registration failed", () => {
    expect(registrationErrorMessage({ code: "P0001", message: "not enough places: 2" })).toBe("Restano 2 posti: iscrivi al massimo 2 persone.");
    expect(registrationErrorMessage({ code: "P0001", message: "not enough places: 0" })).toBe("I posti sono finiti mentre ti iscrivevi.");
    expect(registrationErrorMessage({ code: "23505", message: "already registered" })).toMatch(/già iscritta/);
    expect(registrationErrorMessage({ code: "XX000", message: "boom" })).toMatch(/Riprova/);
  });

  it("lays out a month from Monday", () => {
    const oct = monthGrid(2026, 10);
    expect(oct[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(oct.at(-1)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", null]);
    expect(monthGrid(2027, 2).flat().filter(Boolean)).toHaveLength(28);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(isMonth("2026-13")).toBe(false);
    expect(isDay("2026-10-07")).toBe(true);
    expect(isDay("2026-1-7")).toBe(false);
    expect(onDay({ start_date: "2026-10-07", end_date: "2026-10-09" }, "2026-10-08")).toBe(true);
    expect(onDay({ start_date: "2026-10-07", end_date: null }, "2026-10-08")).toBe(false);
  });
});
