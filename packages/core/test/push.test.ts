import { describe, expect, it } from "vitest";
import { batchOutcomes, buildPushMessages, chunk, parsePushData, settlePushes, type PushRow } from "../src";

const row = (id: string, tokens: string[], body: string | null = "Testo"): PushRow => ({
  id,
  org_id: "org-1",
  kind: "message",
  title: `Titolo ${id}`,
  body,
  link: "/pro/eventi/x",
  tokens,
  unread: 3,
});

describe("push", () => {
  it("sends one message per phone with what the app needs to open it", () => {
    const m = buildPushMessages([row("n1", ["ExpoPushToken[a]", "ExpoPushToken[b]"]), row("n2", [], null)]);
    expect(m).toHaveLength(2);
    expect(m[0]).toEqual({
      notificationId: "n1",
      message: {
        to: "ExpoPushToken[a]",
        title: "Titolo n1",
        body: "Testo",
        data: { notificationId: "n1", orgId: "org-1", kind: "message", link: "/pro/eventi/x" },
        sound: "default",
        badge: 3,
        channelId: "default",
        priority: "high",
      },
    });
    expect(buildPushMessages([row("n3", ["t"], null)])[0]!.message).not.toHaveProperty("body");
  });

  it("splits into batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 100)).toEqual([]);
  });

  it("reads Expo's answer", () => {
    expect(batchOutcomes(2, null, null)).toEqual(["retry", "retry"]);
    expect(batchOutcomes(1, 503, null)).toEqual(["retry"]);
    expect(batchOutcomes(1, 429, null)).toEqual(["retry"]);
    expect(batchOutcomes(1, 400, null)).toEqual(["error"]);
    expect(
      batchOutcomes(5, 200, [
        { status: "ok", id: "1" },
        { status: "error", details: { error: "DeviceNotRegistered" } },
        { status: "error", details: { error: "MessageRateExceeded" } },
        { status: "error", details: { error: "MessageTooBig" } },
      ]),
    ).toEqual(["ok", "dead", "retry", "error", "retry"]);
  });

  it("settles each notification across its phones", () => {
    const s = settlePushes([
      { notificationId: "a", token: "t1", outcome: "dead" },
      { notificationId: "a", token: "t2", outcome: "ok" },
      { notificationId: "b", token: "t1", outcome: "dead" },
      { notificationId: "b", token: "t3", outcome: "retry" },
      { notificationId: "c", token: "t4", outcome: "error" },
    ]);
    expect(s).toEqual({ sent: ["a"], retry: ["b"], failed: ["c"], deadTokens: ["t1"] });
  });

  it("reads the data of a received push", () => {
    expect(parsePushData({ notificationId: "n", orgId: "o", kind: "message", link: "/x" })).toEqual({
      notificationId: "n",
      orgId: "o",
      kind: "message",
      link: "/x",
    });
    expect(parsePushData({ notificationId: "n", orgId: "o", link: null })).toEqual({ notificationId: "n", orgId: "o", kind: "", link: null });
    expect(parsePushData({ notificationId: "n" })).toBeNull();
    expect(parsePushData(null)).toBeNull();
    expect(parsePushData("x")).toBeNull();
  });
});
