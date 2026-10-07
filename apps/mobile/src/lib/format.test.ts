import { describe, expect, it } from "vitest";
import { ago, dateRange, euro, firstName, greeting, initials, parseItalianDate, plural, requestMeta, stampDay, until } from "./format";

describe("format", () => {
  it("writes the facts line of a request", () => {
    expect(
      requestMeta({
        kind: "single",
        start_date: "2026-11-14",
        end_date: null,
        city: "Milano",
        guests: 350,
      }),
    ).toBe("14 NOV · MILANO · 350 OSPITI");
    expect(
      requestMeta({
        kind: "campaign",
        start_date: "2026-11-21",
        end_date: null,
        city: null,
        guests: 1200,
        campaign: { eventsCount: 4 },
      }),
    ).toBe("DAL 21 NOV · 4 TAPPE · 1.200 OSPITI");
    expect(requestMeta({ kind: "single", start_date: null, end_date: null, city: null, guests: null })).toBe("DATA DA DEFINIRE");
  });

  it("writes date ranges", () => {
    expect(dateRange("2026-11-14", null)).toBe("14 nov 2026");
    expect(dateRange("2026-11-14", "2026-12-05")).toBe("14 nov – 5 dic 2026");
    expect(dateRange(null, null)).toBeNull();
    expect(stampDay("2027-06-15")).toBe("15 GIU 2027");
    expect(stampDay("2026-12-31T23:30:00Z")).toBe("1 GEN 2027");
    expect(stampDay(null)).toBe("");
  });

  it("greets by the time in Italy", () => {
    expect(greeting(new Date("2026-10-07T07:00:00Z"))).toBe("Buongiorno");
    expect(greeting(new Date("2026-10-07T13:00:00Z"))).toBe("Buon pomeriggio");
    expect(greeting(new Date("2026-10-07T19:00:00Z"))).toBe("Buonasera");
    expect(greeting(new Date("2026-10-07T01:00:00Z"))).toBe("Buonasera");
  });

  it("makes names and initials", () => {
    expect(firstName(" Manuel Micheli ")).toBe("Manuel");
    expect(firstName("")).toBeNull();
    expect(initials("NSS Eventi")).toBe("NE");
    expect(initials("Brand")).toBe("BR");
    expect(initials(null)).toBe("?");
    expect(plural(1, "evento", "eventi")).toBe("1 evento");
    expect(plural(1200, "evento", "eventi")).toBe("1.200 eventi");
    expect(euro(12400)).toBe("12.400,00 €");
    expect(euro("3000.5")).toBe("3.000,50 €");
    expect(euro(null)).toBe("–");
  });

  it("counts days", () => {
    const now = new Date("2026-10-07T10:00:00Z");
    expect(ago("2026-10-07T06:00:00Z", now)).toBe("oggi");
    expect(ago("2026-10-06T21:30:00Z", now)).toBe("ieri");
    expect(ago("2026-10-04T10:00:00Z", now)).toBe("3 giorni fa");
    expect(ago("2026-09-20T10:00:00Z", now)).toBe("il 20 set");
    expect(until("2026-10-07", "2026-10-07")).toBe("oggi");
    expect(until("2026-10-19", "2026-10-07")).toBe("tra 12 giorni");
    expect(until("2026-10-01", "2026-10-07")).toBeNull();
  });
});

describe("typed dates", () => {
  it("reads GG/MM/AAAA and rejects days that do not exist", () => {
    expect(parseItalianDate("14/11/2026")).toBe("2026-11-14");
    expect(parseItalianDate("31/02/2026")).toBeNull();
    expect(parseItalianDate("14/11")).toBeNull();
  });
});
