import { describe, expect, it } from "vitest";
import { calendarFor, nextDeadline } from "@/lib/compliance/calendar";
import { obligationsFor } from "@/lib/compliance/rules";

const TODAY = "2026-06-10";

describe("which obligations apply", () => {
  it("only returns rules for the country", () => {
    expect(obligationsFor("GB", TODAY).every((o) => o.jurisdiction === "GB")).toBe(true);
  });
  it("shows nothing to a business registered for nothing", () => {
    expect(calendarFor({ country: "IN", registrations: [], today: TODAY })).toHaveLength(0);
  });
  it("does not mention TDS to someone who does not deduct it", () => {
    const cal = calendarFor({ country: "IN", registrations: ["gst"], today: TODAY });
    expect(cal.some((d) => d.rule.requires === "tds")).toBe(false);
  });
});

describe("Indian GST dates", () => {
  const monthly = calendarFor({ country: "IN", registrations: ["gst"], today: TODAY });

  it("puts GSTR-3B for May on the 20th of June", () => {
    const row = monthly.find((d) => d.rule.name === "GSTR-3B" && d.period === "May 2026")!;
    expect(row.dueDate).toBe("2026-06-20");
    expect(row.state).toBe("due-soon");
  });
  it("puts GSTR-1 for May on the 11th of June, which has already passed", () => {
    const row = monthly.find((d) => d.rule.name === "GSTR-1" && d.period === "May 2026")!;
    expect(row.dueDate).toBe("2026-06-11");
  });
  it("switches to quarterly dates for a QRMP business", () => {
    const quarterly = calendarFor({ country: "IN", registrations: ["gst"], today: TODAY, quarterlyGst: true });
    expect(quarterly.some((d) => d.rule.name === "GSTR-1")).toBe(false);
    const row = quarterly.find((d) => d.rule.name === "GSTR-1 (QRMP)")!;
    expect(row.period).toMatch(/April to June|January to March/);
  });
  it("counts Indian quarters from April", () => {
    const quarterly = calendarFor({ country: "IN", registrations: ["gst"], today: "2026-08-01", quarterlyGst: true });
    expect(quarterly.some((d) => d.period === "April to June 2026")).toBe(true);
  });
});

describe("elsewhere", () => {
  it("gives a UK business one month and seven days after the quarter", () => {
    const cal = calendarFor({ country: "GB", registrations: ["vat"], today: "2026-04-10" });
    const row = cal.find((d) => d.period === "January to March 2026")!;
    expect(row.dueDate).toBe("2026-05-07");
  });
  it("gives an Australian business 28 days after the quarter", () => {
    const cal = calendarFor({ country: "AU", registrations: ["gst"], today: "2026-04-10" });
    expect(cal.find((d) => d.period === "January to March 2026")!.dueDate).toBe("2026-04-28");
  });
});

describe("the state of each deadline", () => {
  const cal = calendarFor({ country: "IN", registrations: ["gst", "payroll"], today: TODAY });

  it("marks what has been missed", () => {
    expect(cal.some((d) => d.state === "overdue")).toBe(true);
    expect(cal.filter((d) => d.state === "overdue").every((d) => d.daysAway < 0)).toBe(true);
  });
  it("is ordered by date", () => {
    const dates = cal.map((d) => d.dueDate);
    expect([...dates].sort()).toEqual(dates);
  });
  it("finds the next thing due", () => {
    const next = nextDeadline(cal)!;
    expect(next.daysAway).toBeGreaterThanOrEqual(0);
  });
  it("never puts a due date on the 31st of a short month", () => {
    const tds = calendarFor({ country: "IN", registrations: ["tds"], today: "2026-02-01" });
    for (const d of tds) {
      const [y, m, day] = d.dueDate.split("-").map(Number);
      expect(day).toBeLessThanOrEqual(new Date(Date.UTC(y, m, 0)).getUTCDate());
    }
  });
});

describe("the Today view", () => {
  const doc = {
    kind: "invoice", country: "IN", currency: "INR", issueDate: "2026-05-01", number: "INV-1",
    seller: { name: "Acme", region: "MH" }, buyer: { name: "Globex" }, placeOfSupply: "MH",
    items: [{ id: "1", description: "Work", quantity: 1, rate: 100000, taxRuleId: "in-gst-18" }],
    taxInclusive: false
  } as import("@/lib/documents/types").DocumentData;

  const bill = (over: Partial<import("@/lib/store/types").SavedDocument> = {}): import("@/lib/store/types").SavedDocument => ({
    id: over.id ?? Math.random().toString(36).slice(2), kind: "invoice", number: "INV-1", clientName: "Globex",
    issueDate: "2026-04-01", dueDate: "2026-04-15", currency: "INR", totalMinor: 10000000, paidMinor: 0,
    status: "sent", doc, createdAt: "", updatedAt: "2026-04-20T00:00:00Z", ...over
  });

  it("asks you to chase what is late, with the biggest first", async () => {
    const { todayView } = await import("@/lib/analysis/today");
    const t = todayView({
      documents: [bill({ id: "a", totalMinor: 5000000 }), bill({ id: "b", totalMinor: 50000000 })],
      expenses: [], today: TODAY, currency: "INR", country: "IN", registrations: []
    });
    const collect = t.items.filter((i) => i.kind === "collect");
    expect(collect).toHaveLength(2);
    expect(collect[0].amount!.minor).toBe(50000000);
  });

  it("says nothing at all when there is nothing to do", async () => {
    const { todayView } = await import("@/lib/analysis/today");
    const t = todayView({ documents: [], expenses: [], today: TODAY, currency: "INR", country: "IN", registrations: [] });
    expect(t.items).toHaveLength(0);
  });

  it("surfaces a filing that is due, and only for what you are registered for", async () => {
    const { todayView } = await import("@/lib/analysis/today");
    const withGst = todayView({ documents: [], expenses: [], today: TODAY, currency: "INR", country: "IN", registrations: ["gst"] });
    expect(withGst.items.some((i) => i.kind === "compliance")).toBe(true);
    expect(withGst.nextDeadline).not.toBeNull();

    const without = todayView({ documents: [], expenses: [], today: TODAY, currency: "INR", country: "IN", registrations: [] });
    expect(without.items.some((i) => i.kind === "compliance")).toBe(false);
  });

  it("mentions drafts and invoices with no due date, quietly rather than urgently", async () => {
    const { todayView } = await import("@/lib/analysis/today");
    const t = todayView({
      documents: [bill({ id: "d", status: "draft" }), bill({ id: "n", dueDate: undefined })],
      expenses: [], today: TODAY, currency: "INR", country: "IN", registrations: []
    });
    const tidy = t.items.filter((i) => i.kind === "tidy");
    expect(tidy).toHaveLength(2);
    expect(tidy.every((i) => i.urgency === "watch")).toBe(true);
  });

  it("puts the urgent things first", async () => {
    const { todayView } = await import("@/lib/analysis/today");
    const t = todayView({
      documents: [bill({ id: "old", dueDate: "2026-01-01" }), bill({ id: "draft", status: "draft" })],
      expenses: [], today: TODAY, currency: "INR", country: "IN", registrations: ["gst"]
    });
    expect(t.items[0].urgency).toBe("now");
    expect(t.items[t.items.length - 1].urgency).toBe("watch");
  });
});
