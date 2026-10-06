import { describe, expect, it } from "vitest";
import { crewSchema, crewState, hhmm, nowInItaly, scheduleItemSchema, scheduleTimeline, suggestedSchedule } from "../src";

const item = (id: string, starts_at: string, ends_at: string | null = null, day = "2027-06-12") => ({ id, day, starts_at, ends_at });

describe("run of show", () => {
  it("validates times as typed", () => {
    const base = {
      day: "2027-06-12",
      ends_at: null,
      title: "Apertura porte",
      booking_id: null,
      assignee_id: null,
    };
    expect(scheduleItemSchema.safeParse({ ...base, starts_at: "19:30" }).success).toBe(true);
    expect(scheduleItemSchema.safeParse({ ...base, starts_at: "24:00" }).success).toBe(false);
    expect(scheduleItemSchema.safeParse({ ...base, starts_at: "9:30" }).success).toBe(false);
    expect(crewSchema.safeParse({ day: "2027-06-12", call_time: null }).success).toBe(true);
    expect(hhmm("19:30:00")).toBe("19:30");
    expect(hhmm(null)).toBeNull();
  });

  it("reads the time in Italy", () => {
    expect(nowInItaly(new Date("2027-06-12T21:05:00Z"))).toEqual({
      day: "2027-06-12",
      time: "23:05",
    });
    expect(nowInItaly(new Date("2027-01-10T23:30:00Z"))).toEqual({
      day: "2027-01-11",
      time: "00:30",
    });
  });

  it("says what is over, happening and next", () => {
    const items = [item("c", "21:00"), item("a", "17:00", "18:00"), item("b", "19:00"), item("d", "23:30", "01:00")];
    const at = (time: string, day = "2027-06-12") => Object.fromEntries(scheduleTimeline(items, { day, time }).map((s) => [s.item.id, s.state]));
    expect(scheduleTimeline(items, { day: "2027-06-12", time: "08:00" }).map((s) => s.item.id)).toEqual(["a", "b", "c", "d"]);
    expect(at("17:30")).toEqual({ a: "current", b: "next", c: "upcoming", d: "upcoming" });
    expect(at("18:30")).toEqual({ a: "past", b: "next", c: "upcoming", d: "upcoming" });
    // Without an end, an item lasts until the next one starts.
    expect(at("20:59")).toEqual({ a: "past", b: "current", c: "next", d: "upcoming" });
    expect(at("23:00")).toEqual({ a: "past", b: "past", c: "current", d: "next" });
    // One ending after midnight runs into the next day; the last one without an end lasts 30 minutes.
    expect(at("00:30", "2027-06-13")).toEqual({ a: "past", b: "past", c: "past", d: "current" });
    const last = scheduleTimeline([item("x", "22:00")], { day: "2027-06-12", time: "22:31" });
    expect(last[0]!.state).toBe("past");
  });

  it("flags who is late", () => {
    const now = { day: "2027-06-12", time: "17:10" };
    expect(crewState({ day: "2027-06-12", call_time: "17:00:00", checked_in_at: null }, now)).toBe("late");
    expect(crewState({ day: "2027-06-12", call_time: "17:00:00", checked_in_at: "2027-06-12T15:05:00Z" }, now)).toBe("arrived");
    expect(crewState({ day: "2027-06-12", call_time: "18:00:00", checked_in_at: null }, now)).toBe("expected");
    expect(crewState({ day: "2027-06-12", call_time: null, checked_in_at: null }, now)).toBe("expected");
  });

  it("suggests the usual evening around doors opening", () => {
    const items = suggestedSchedule(["catering", "security", "catering", "venue"], "2027-06-12", "19:00");
    expect(items.map((i) => `${i.starts_at} ${i.title}`)).toEqual([
      "16:30 Arrivo catering e allestimento buffet",
      "18:00 Arrivo sicurezza e controllo vie di fuga",
      "18:15 Briefing con tutto lo staff",
      "19:00 Apertura porte e accoglienza ospiti",
      "19:30 Servizio catering",
      "23:00 Fine evento e uscita ospiti",
    ]);
    expect(items[0]).toMatchObject({ day: "2027-06-12", ends_at: "18:00", service: "catering" });
    // Early setup for a morning event starts the day before.
    const morning = suggestedSchedule(["setup"], "2027-06-12", "03:00");
    expect(morning[0]).toMatchObject({
      day: "2027-06-11",
      starts_at: "22:00",
      ends_at: "01:00",
      title: "Montaggio allestimento",
    });
  });
});
