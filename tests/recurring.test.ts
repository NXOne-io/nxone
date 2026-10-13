import { describe, expect, it } from "vitest";
import { catchUp, describe as describeTemplate, due, generate, isFinished, nextDateAfter, type RecurringTemplate } from "@/lib/recurring/schedule";
import type { DocumentData } from "@/lib/documents/types";

const doc = {
  kind: "invoice", country: "IN", currency: "INR", issueDate: "2026-01-01", number: "INV-1",
  seller: { name: "Acme", region: "MH" }, buyer: { name: "Globex" }, placeOfSupply: "MH",
  items: [{ id: "1", description: "Retainer", quantity: 1, rate: 50000, taxRuleId: "in-gst-18" }],
  taxInclusive: false
} as DocumentData;

const template = (over: Partial<RecurringTemplate> = {}): RecurringTemplate => ({
  id: "rc_1", name: "Globex retainer", frequency: "monthly", dayOfMonth: 1,
  startDate: "2026-01-01", nextDate: "2026-02-01", occurrences: 1, dueInDays: 14,
  paused: false, document: doc, createdAt: "", updatedAt: "", ...over
});

describe("working out the next date", () => {
  it("steps by week and fortnight", () => {
    expect(nextDateAfter("2026-01-01", "weekly")).toBe("2026-01-08");
    expect(nextDateAfter("2026-01-01", "fortnightly")).toBe("2026-01-15");
  });
  it("keeps to the chosen day each month", () => {
    expect(nextDateAfter("2026-01-15", "monthly", 15)).toBe("2026-02-15");
    expect(nextDateAfter("2026-11-30", "quarterly", 30)).toBe("2027-02-28");
    expect(nextDateAfter("2026-01-01", "yearly", 1)).toBe("2027-01-01");
  });
  it("clamps to the last day of a short month rather than spilling into the next one", () => {
    expect(nextDateAfter("2026-01-31", "monthly", 31)).toBe("2026-02-28");
  });
  it("returns to the chosen day afterwards, instead of drifting earlier for ever", () => {
    const feb = nextDateAfter("2026-01-31", "monthly", 31);
    expect(nextDateAfter(feb, "monthly", 31)).toBe("2026-03-31");
  });
  it("handles a leap year", () => {
    expect(nextDateAfter("2028-01-31", "monthly", 31)).toBe("2028-02-29");
  });
});

describe("what is due", () => {
  it("lists only what has come round, oldest first", () => {
    const list = due([
      template({ id: "a", nextDate: "2026-03-01" }),
      template({ id: "b", nextDate: "2026-02-01" }),
      template({ id: "c", nextDate: "2026-12-01" })
    ], "2026-06-01");
    expect(list.map((t) => t.id)).toEqual(["b", "a"]);
  });
  it("leaves out anything paused, finished or deleted", () => {
    const list = due([
      template({ id: "p", paused: true }),
      template({ id: "e", endDate: "2026-01-31" }),
      template({ id: "n", maxOccurrences: 1 }),
      template({ id: "d", deletedAt: "2026-02-02T00:00:00Z" })
    ], "2026-06-01");
    expect(list).toHaveLength(0);
  });
  it("knows when a run has finished", () => {
    expect(isFinished(template({ maxOccurrences: 1, occurrences: 1 }))).toBe(true);
    expect(isFinished(template({ endDate: "2026-01-01" }))).toBe(true);
    expect(isFinished(template({ maxOccurrences: 12, occurrences: 3 }))).toBe(false);
  });
});

describe("catching up after a gap", () => {
  it("counts the runs that were missed without making an invoice for each", () => {
    const result = catchUp(template({ nextDate: "2026-02-01" }), "2026-05-15");
    expect(result.skipped).toBe(3);
    expect(result.nextDate).toBe("2026-06-01");
  });
  it("skips nothing when it is simply due today", () => {
    expect(catchUp(template({ nextDate: "2026-02-01" }), "2026-02-01")).toMatchObject({ skipped: 0, nextDate: "2026-03-01" });
  });
});

describe("making the invoice", () => {
  it("uses the scheduled date and works out the due date", () => {
    const { document } = generate(template(), "INV-0042", "2026-02-03");
    expect(document.issueDate).toBe("2026-02-01");
    expect(document.dueDate).toBe("2026-02-15");
    expect(document.number).toBe("INV-0042");
  });
  it("carries the customer and the lines across, and clears any payment", () => {
    const { document } = generate(template({ document: { ...doc, amountPaid: 5000 } }), "INV-2", "2026-02-01");
    expect(document.buyer.name).toBe("Globex");
    expect(document.items[0].rate).toBe(50000);
    expect(document.amountPaid).toBeUndefined();
  });
  it("moves the schedule on and counts the run", () => {
    const { template: next } = generate(template(), "INV-2", "2026-02-01");
    expect(next.nextDate).toBe("2026-03-01");
    expect(next.occurrences).toBe(2);
    expect(next.lastGeneratedAt).toBeTruthy();
  });
  it("reports how many runs were missed, so the person can decide what to do", () => {
    expect(generate(template({ nextDate: "2026-02-01" }), "INV-2", "2026-05-15").skipped).toBe(3);
  });
});

describe("saying it plainly", () => {
  it("describes the schedule the way a person would", () => {
    expect(describeTemplate(template({ dayOfMonth: 1 }))).toBe("Monthly on the 1st");
    expect(describeTemplate(template({ frequency: "weekly" }))).toBe("Every week");
    expect(describeTemplate(template({ paused: true }))).toMatch(/paused/);
    expect(describeTemplate(template({ maxOccurrences: 1, occurrences: 1 }))).toMatch(/finished/);
  });
});

describe("it shows up on Today", () => {
  it("says how many invoices are waiting to be made", async () => {
    const { todayView } = await import("@/lib/analysis/today");
    const t = todayView({
      documents: [], expenses: [], recurring: [template({ nextDate: "2026-02-01" })],
      today: "2026-03-01", currency: "INR", country: "IN", registrations: []
    });
    const item = t.items.find((i) => i.id === "recurring")!;
    expect(item.title).toMatch(/1 repeating invoice ready/);
  });
  it("stays quiet when nothing is due", async () => {
    const { todayView } = await import("@/lib/analysis/today");
    const t = todayView({
      documents: [], expenses: [], recurring: [template({ nextDate: "2026-12-01" })],
      today: "2026-03-01", currency: "INR", country: "IN", registrations: []
    });
    expect(t.items).toHaveLength(0);
  });
});
