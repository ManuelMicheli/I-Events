import { describe, expect, it } from "vitest";
import {
  checkinSyncOutcome,
  crewMembers,
  dequeueCheckins,
  enqueueCheckin,
  findPass,
  eventDays,
  keepDayOnPhone,
  liveDay,
  parseCheckinQueue,
  passCode,
  passFitsNow,
  passUrl,
  readPass,
  withPendingCheckins,
  withSentCheckins,
  type CrewRow,
} from "../src";

const row = (id: string, over: Partial<CrewRow> = {}): CrewRow => ({
  id,
  booking_id: null,
  user_id: null,
  name: null,
  role: null,
  phone: null,
  day: "2027-06-12",
  call_time: "18:00:00",
  checked_in_at: null,
  profile: null,
  ...over,
});

describe("event day", () => {
  it("lists the event's days", () => {
    expect(eventDays("2027-06-12", "2027-06-14", [])).toEqual(["2027-06-12", "2027-06-13", "2027-06-14"]);
    expect(eventDays("2027-06-12", null, ["2027-06-11"])).toEqual(["2027-06-11", "2027-06-12"]);
    expect(eventDays(null, null, ["2027-06-12", "2027-06-12"])).toEqual(["2027-06-12"]);
    expect(eventDays("2027-06-01", "2027-07-30", [])).toHaveLength(14);
  });

  it("opens on today, else on the first planned day", () => {
    const days = ["2027-06-12", "2027-06-13", "2027-06-14"];
    expect(liveDay(days, [], "2027-06-13")).toBe("2027-06-13");
    expect(liveDay(days, ["2027-06-14"], "2027-06-20")).toBe("2027-06-14");
    expect(liveDay(days, [], null)).toBe("2027-06-12");
    expect(liveDay([], [], "2027-06-12")).toBeUndefined();
  });

  it("names the people expected on site", () => {
    const crew = crewMembers(
      [
        row("a", { booking_id: "b1", role: "Capo squadra" }),
        row("b", { user_id: "u1", profile: { full_name: "Giulia Neri" }, role: "Regia" }),
        row("c", { user_id: "u2", profile: null }),
        row("d", { name: "Sara", phone: "333" }),
        row("e", { booking_id: "b2" }),
      ],
      [
        { id: "b1", service_key: "security", contact: { name: "Mario", company: "Vigilanza Nord", phone: "+39 333" } },
        { id: "b2", service_key: "catering", contact: null },
      ],
    );
    expect(crew.map((c) => [c.kind, c.name, c.detail, c.phone])).toEqual([
      ["supplier", "Vigilanza Nord", "Sicurezza e steward · Capo squadra", "+39 333"],
      ["staff", "Giulia Neri", "Regia", null],
      ["staff", "Collega senza nome", null, null],
      ["external", "Sara", null, "333"],
      ["supplier", "Catering e bar", "Catering e bar", null],
    ]);
  });

  it("keeps one check-in per person, the latest one", () => {
    let q = enqueueCheckin([], { id: "a", at: "2027-06-12T16:00:00.000Z" });
    q = enqueueCheckin(q, { id: "b", at: "2027-06-12T16:05:00.000Z" });
    q = enqueueCheckin(q, { id: "a", at: null });
    expect(q).toEqual([
      { id: "b", at: "2027-06-12T16:05:00.000Z" },
      { id: "a", at: null },
    ]);
  });

  it("drops only what was sent unchanged", () => {
    const sent = [
      { id: "a", at: "2027-06-12T16:00:00.000Z" },
      { id: "b", at: "2027-06-12T16:05:00.000Z" },
    ];
    // While sending, "a" was undone on the phone: the undo must still go out.
    const now = [
      { id: "a", at: null },
      { id: "b", at: "2027-06-12T16:05:00.000Z" },
      { id: "c", at: "2027-06-12T16:06:00.000Z" },
    ];
    expect(dequeueCheckins(now, sent)).toEqual([
      { id: "a", at: null },
      { id: "c", at: "2027-06-12T16:06:00.000Z" },
    ]);
  });

  it("reads the saved queue defensively", () => {
    expect(parseCheckinQueue(null)).toEqual([]);
    expect(parseCheckinQueue("not json")).toEqual([]);
    expect(parseCheckinQueue('{"id":"a"}')).toEqual([]);
    expect(parseCheckinQueue('[{"id":"a","at":null},{"id":"b","at":"x"},{"id":3,"at":null},{"id":"c","at":"2027-06-12T16:00:00Z"}]')).toEqual([
      { id: "a", at: null },
      { id: "c", at: "2027-06-12T16:00:00Z" },
    ]);
  });

  it("shows queued check-ins over the server's state", () => {
    const crew = [
      { id: "a", checked_in_at: null },
      { id: "b", checked_in_at: "2027-06-12T15:00:00Z" },
      { id: "c", checked_in_at: null },
    ];
    expect(
      withPendingCheckins(crew, [
        { id: "a", at: "2027-06-12T16:00:00Z" },
        { id: "b", at: null },
      ]),
    ).toEqual([
      { id: "a", checked_in_at: "2027-06-12T16:00:00Z", pending: true },
      { id: "b", checked_in_at: null, pending: true },
      { id: "c", checked_in_at: null, pending: false },
    ]);
  });

  it("keeps a check-in queued only when it can still go through", () => {
    expect(checkinSyncOutcome(204)).toBe("sent");
    expect(checkinSyncOutcome(0)).toBe("retry");
    expect(checkinSyncOutcome(401)).toBe("retry");
    expect(checkinSyncOutcome(503)).toBe("retry");
    expect(checkinSyncOutcome(403)).toBe("refused");
    expect(checkinSyncOutcome(400)).toBe("refused");
  });

  it("keeps the day on the phone around the event", () => {
    const e = (start: string | null, end: string | null = null, status = "preparing") => ({ status, start_date: start, end_date: end });
    expect(keepDayOnPhone(e("2027-06-12"), "2027-06-10")).toBe(true);
    expect(keepDayOnPhone(e("2027-06-13"), "2027-06-10")).toBe(false);
    expect(keepDayOnPhone(e("2027-06-10", "2027-06-12"), "2027-06-12")).toBe(true);
    expect(keepDayOnPhone(e("2027-06-10", "2027-06-12"), "2027-06-13")).toBe(false);
    expect(keepDayOnPhone(e("2027-06-12", null, "cancelled"), "2027-06-12")).toBe(false);
    expect(keepDayOnPhone(e(null), "2027-06-12")).toBe(false);
  });

  it("reads passes from the QR code or the short code", () => {
    const token = "4f7a2c0123456789abcdef0123456789";
    expect(passUrl("https://i-events.app/", token)).toBe(`https://i-events.app/pass/${token}`);
    expect(passCode(token)).toBe("4F7A2C");
    expect(readPass(`https://i-events.app/pass/${token}`)).toEqual({ token });
    expect(readPass(`https://i-events.app/pass/${token.toUpperCase()}?utm=wa`)).toEqual({ token });
    expect(readPass(` ${token} `)).toEqual({ token });
    expect(readPass("4F7 A2C")).toEqual({ code: "4f7a2c" });
    expect(readPass("https://example.com/biglietto/123")).toBeNull();
    expect(readPass("4F7A2")).toBeNull();
    expect(readPass("")).toBeNull();
  });

  it("finds whose pass it is", () => {
    const crew = [
      { id: "a", pass: "4f7a2c0123456789abcdef0123456789" },
      { id: "b", pass: "99aa000000000000000000000000000b" },
      { id: "c", pass: "99aa000000000000000000000000000c" },
      { id: "d", pass: null },
    ];
    expect(findPass(crew, { token: "4f7a2c0123456789abcdef0123456789" })?.id).toBe("a");
    expect(findPass(crew, { code: "4f7a2c" })?.id).toBe("a");
    expect(findPass(crew, { code: "99aa00" })).toBeUndefined();
    expect(findPass(crew, { token: "ffffffffffffffffffffffffffffffff" })).toBeUndefined();
  });

  it("accepts a pass on its day and through the night after it", () => {
    expect(passFitsNow("2027-06-12", { day: "2027-06-12", time: "09:00" })).toBe(true);
    expect(passFitsNow("2027-06-12", { day: "2027-06-13", time: "01:30" })).toBe(true);
    expect(passFitsNow("2027-06-12", { day: "2027-06-13", time: "07:00" })).toBe(false);
    expect(passFitsNow("2027-06-13", { day: "2027-06-12", time: "23:00" })).toBe(false);
  });

  it("keeps check-ins already sent until the next load includes them", () => {
    const crew = [
      { id: "a", checked_in_at: null },
      { id: "b", checked_in_at: "2027-06-12T15:00:00Z" },
    ];
    expect(
      withSentCheckins(crew, [
        { id: "a", at: "2027-06-12T16:00:00Z" },
        { id: "b", at: null },
      ]),
    ).toEqual([
      { id: "a", checked_in_at: "2027-06-12T16:00:00Z" },
      { id: "b", checked_in_at: null },
    ]);
    expect(withSentCheckins(crew, [])).toEqual(crew);
  });
});
