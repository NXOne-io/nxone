import { describe, expect, it } from "vitest";
import { aging, chaseList, customerStanding, reminderText, whatsappLink } from "@/lib/analysis/receivables";
import { forecast, monthlyBurnRate, windowOf } from "@/lib/analysis/cashflow";
import { toMajor } from "@/lib/money";
import type { Expense, SavedDocument } from "@/lib/store/types";
import type { DocumentData } from "@/lib/documents/types";

const doc = {
  kind: "invoice", country: "IN", currency: "INR", issueDate: "2026-05-01", number: "INV-1",
  seller: { name: "Acme", region: "MH" }, buyer: { name: "Globex" }, placeOfSupply: "MH",
  items: [{ id: "1", description: "Work", quantity: 1, rate: 100000, taxRuleId: "in-gst-18" }],
  taxInclusive: false
} as DocumentData;
const TODAY = "2026-06-30";

const bill = (over: Partial<SavedDocument>): SavedDocument => ({
  id: over.id ?? Math.random().toString(36).slice(2), kind: "invoice", number: "INV-1", clientName: "Globex",
  issueDate: "2026-05-01", dueDate: "2026-05-15", currency: "INR", totalMinor: 10000000, paidMinor: 0,
  status: "sent", doc, createdAt: "", updatedAt: "2026-05-20T00:00:00Z", ...over
});

const spend = (over: Partial<Expense>): Expense => ({
  id: Math.random().toString(36).slice(2), date: "2026-06-01", supplier: "WeWork", category: "6010",
  currency: "INR", netMinor: 5000000, taxMinor: 0, paidFrom: "1020", createdAt: "", updatedAt: "", ...over
});

describe("aging", () => {
  const docs = [
    bill({ id: "a", dueDate: "2026-07-15" }),
    bill({ id: "b", dueDate: "2026-06-20", totalMinor: 20000000 }),
    bill({ id: "c", dueDate: "2026-05-01", totalMinor: 30000000 }),
    bill({ id: "d", dueDate: "2026-01-01", totalMinor: 40000000 }),
    bill({ id: "e", status: "paid", paidMinor: 10000000 }),
    bill({ id: "f", status: "draft" })
  ];
  const a = aging(docs, TODAY, "INR");

  it("puts each unpaid invoice in the right bucket", () => {
    expect(toMajor(a.current)).toBe(100000);
    expect(toMajor(a.days1to30)).toBe(200000);
    expect(toMajor(a.days31to60)).toBe(300000);
    expect(toMajor(a.over90)).toBe(400000);
  });
  it("leaves out what is paid, drafted or cancelled", () => {
    expect(toMajor(a.total)).toBe(1000000);
  });
});

describe("how customers behave", () => {
  const docs = [
    bill({ id: "a", clientName: "Initech", status: "paid", paidMinor: 10000000, dueDate: "2026-04-01", updatedAt: "2026-04-25T00:00:00Z" }),
    bill({ id: "b", clientName: "Initech", status: "paid", paidMinor: 10000000, dueDate: "2026-05-01", updatedAt: "2026-05-21T00:00:00Z" }),
    bill({ id: "c", clientName: "Initech", dueDate: "2026-06-01" }),
    bill({ id: "d", clientName: "Globex", status: "paid", paidMinor: 10000000, dueDate: "2026-05-01", updatedAt: "2026-04-28T00:00:00Z" })
  ];
  const standing = customerStanding(docs, TODAY, "INR");

  it("works out how late each customer usually pays", () => {
    const initech = standing.find((c) => c.name === "Initech")!;
    expect(initech.averageDaysLate).toBe(22);
    expect(initech.habituallyLate).toBe(true);
  });
  it("does not accuse someone who pays early", () => {
    const globex = standing.find((c) => c.name === "Globex")!;
    expect(globex.averageDaysLate).toBe(-3);
    expect(globex.habituallyLate).toBe(false);
  });
  it("needs more than one invoice before calling anyone a late payer", () => {
    const one = customerStanding([bill({ clientName: "New", status: "paid", paidMinor: 1, dueDate: "2026-01-01", updatedAt: "2026-03-01T00:00:00Z" })], TODAY, "INR");
    expect(one[0].habituallyLate).toBe(false);
  });
});

describe("who to chase", () => {
  it("puts bigger and later first", () => {
    const list = chaseList([
      bill({ id: "small-old", totalMinor: 500000, dueDate: "2026-01-01" }),
      bill({ id: "big-recent", totalMinor: 50000000, dueDate: "2026-06-20" })
    ], TODAY, "INR");
    expect(list[0].doc.id).toBe("big-recent");
  });
  it("includes what is about to fall due, so it can be headed off", () => {
    const list = chaseList([bill({ id: "soon", dueDate: "2026-07-02" })], TODAY, "INR");
    expect(list[0].reason).toMatch(/Due in 2 days/);
  });
});

describe("reminders", () => {
  const base = { businessName: "Acme Consulting", customerName: "Asha Verma", number: "INV-0007", amount: "₹1,18,000", dueDate: "15/05/2026", daysLate: 46 };

  it("gets firmer as the invoice gets older, without becoming rude", () => {
    const gentle = reminderText({ ...base, tone: "gentle" });
    const final = reminderText({ ...base, tone: "final" });
    expect(gentle.body).toMatch(/ignore this/);
    expect(final.subject).toMatch(/46 days overdue/);
    expect(final.body).not.toMatch(/legal|solicitor|court/i);
  });
  it("uses the first name and names the invoice", () => {
    expect(reminderText({ ...base, tone: "firm" }).body).toMatch(/Hello Asha/);
    expect(reminderText({ ...base, tone: "firm" }).body).toContain("INV-0007");
  });
  it("builds a WhatsApp link, adding the country code for a ten digit number", () => {
    expect(whatsappLink("98200 00000", "hello")).toContain("wa.me/919820000000");
    expect(whatsappLink("+44 7700 900000", "hello")).toContain("wa.me/447700900000");
  });
});

describe("cash forecast", () => {
  const docs = [
    bill({ id: "paid", status: "paid", paidMinor: 10000000, updatedAt: "2026-06-01T00:00:00Z" }),
    bill({ id: "due-soon", dueDate: "2026-07-10", totalMinor: 20000000 }),
    bill({ id: "overdue", dueDate: "2026-05-01", totalMinor: 5000000 })
  ];
  const expenses = [spend({ date: "2026-06-01" }), spend({ date: "2026-06-15", netMinor: 2500000 })];
  const f = forecast(docs, expenses, TODAY, "INR", 90);

  it("starts from the cash actually in the books", () => {
    expect(toMajor(f.openingCash)).toBe(100000 - 50000 - 25000);
  });
  it("expects an invoice on its due date", () => {
    const july10 = f.points.find((p) => p.date === "2026-07-10")!;
    expect(toMajor(july10.inflow)).toBe(200000);
    expect(july10.basis).toBe("known");
  });
  it("assumes an overdue invoice lands soon rather than never, and flags it as at risk", () => {
    expect(toMajor(f.atRisk)).toBe(50000);
    expect(f.points.find((p) => p.date === "2026-07-07")!.inflow.minor).toBe(5000000);
  });
  it("spreads recent spending as a daily run rate", () => {
    expect(monthlyBurnRate(expenses, TODAY, "INR")).toBeGreaterThan(0);
    expect(f.monthlyBurn.minor).toBeGreaterThan(0);
  });
  it("says when the money runs out", () => {
    const broke = forecast([], [spend({ date: "2026-06-01", netMinor: 50000000 })], TODAY, "INR", 90);
    expect(broke.runwayDays).not.toBeNull();
  });
  it("answers for a shorter window too", () => {
    const week = windowOf(f, 7);
    expect(week.days).toBe(7);
    expect(week.closing.minor).toBe(f.points[6].balance.minor);
  });
});
