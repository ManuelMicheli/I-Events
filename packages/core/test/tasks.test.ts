import { describe, expect, it } from "vitest";
import { daysBetween, groupTasks, suggestedTasks, taskBucket, taskSchema, todayInItaly } from "../src";

describe("suggestedTasks", () => {
  it("builds the usual checklist for the requested services, ordered by deadline", () => {
    const tasks = suggestedTasks(["security", "catering", "security"], "2027-06-15");
    expect(tasks[0]).toEqual({ title: "Confermare con il cliente data, orari e numero di ospiti", due_date: "2027-05-16", service: null });
    expect(tasks.filter((t) => t.service === "security")).toHaveLength(2);
    expect(tasks.find((t) => t.title.includes("coperti"))?.due_date).toBe("2027-06-12");
    expect(tasks.at(-1)?.due_date).toBe("2027-06-22");
    const dates = tasks.map((t) => t.due_date!);
    expect([...dates].sort()).toEqual(dates);
  });

  it("leaves deadlines empty when the event has no date", () => {
    expect(suggestedTasks(["venue"], null).every((t) => t.due_date === null)).toBe(true);
  });
});

describe("timeline", () => {
  const today = "2027-06-01";

  it("places tasks by deadline", () => {
    expect(taskBucket({ due_date: "2027-05-31", done_at: null }, today)).toBe("overdue");
    expect(taskBucket({ due_date: today, done_at: null }, today)).toBe("today");
    expect(taskBucket({ due_date: "2027-06-08", done_at: null }, today)).toBe("week");
    expect(taskBucket({ due_date: "2027-06-09", done_at: null }, today)).toBe("later");
    expect(taskBucket({ due_date: null, done_at: null }, today)).toBe("undated");
    expect(taskBucket({ due_date: "2027-05-01", done_at: "2027-05-02T10:00:00Z" }, today)).toBe("done");
  });

  it("sorts each group", () => {
    const g = groupTasks(
      [
        { id: 1, due_date: "2027-06-05", done_at: null },
        { id: 2, due_date: "2027-06-03", done_at: null },
        { id: 3, due_date: null, done_at: "2027-05-01T10:00:00Z" },
        { id: 4, due_date: null, done_at: "2027-05-03T10:00:00Z" },
      ],
      today,
    );
    expect(g.week.map((t) => t.id)).toEqual([2, 1]);
    expect(g.done.map((t) => t.id)).toEqual([4, 3]);
  });

  it("counts days across daylight saving changes", () => {
    expect(daysBetween("2027-03-27", "2027-03-29")).toBe(2);
    expect(daysBetween("2027-06-15", "2027-06-01")).toBe(-14);
  });

  it("uses the Italian calendar day", () => {
    expect(todayInItaly(new Date("2027-06-01T22:30:00Z"))).toBe("2027-06-02");
  });
});

describe("taskSchema", () => {
  it("needs a title", () => {
    expect(taskSchema.safeParse({ title: " ", due_date: null, assignee_id: null, booking_id: null }).success).toBe(false);
  });
});
