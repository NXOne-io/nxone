import { describe, expect, it } from "vitest";
import { dailyBrief, insights } from "@/lib/insights/engine";
import type { DocumentData } from "@/lib/documents/types";
import type { Expense, SavedDocument } from "@/lib/store/types";

const TODAY = "2026-06-15";

const docData = (over: Partial<DocumentData> = {}): DocumentData => ({
  kind: "invoice", country: "IN", currency: "INR", issueDate: "2026-06-01", number: "INV-1",
  seller: { name: "Acme", region: "MH" }, buyer: { name: "Globex" }, placeOfSupply: "MH",
  items: [{ id: "1", description: "Work", quantity: 1, rate: 100000, taxRuleId: "in-gst-0" }],
  taxInclusive: false, ...over
});

const bill = (over: Partial<SavedDocument> = {}, doc = docData()): SavedDocument => ({
  id: over.id ?? Math.random().toString(36).slice(2), kind: "invoice", number: doc.number,
  clientName: doc.buyer.name, issueDate: doc.issueDate, dueDate: "2026-06-10", currency: "INR",
  totalMinor: 10000000, paidMinor: 0, status: "sent", doc, createdAt: "", updatedAt: "2026-06-12T00:00:00Z", ...over
});

const spend = (over: Partial<Expense> = {}): Expense => ({
  id: Math.random().toString(36).slice(2), date: "2026-06-05", supplier: "WeWork", category: "6010",
  currency: "INR", netMinor: 2000000, taxMinor: 0, paidFrom: "1020", createdAt: "", updatedAt: "", ...over
});

const base = {
  profile: { name: "Acme", country: "IN", currency: "INR", openingCashMinor: 50000000, openingCashDate: "2026-01-01" },
  today: TODAY, currency: "INR"
};

describe("noticing things worth noticing", () => {
  it("says nothing when there is nothing to say", () => {
    expect(insights({ ...base, documents: [], expenses: [] })).toHaveLength(0);
  });

  // the ledger recalculates from the document, so the lines are what matter, not the stored total
  const invoiceFor = (rate: number, issueDate: string, number: string) =>
    docData({ issueDate, number, items: [{ id: "1", description: "Work", quantity: 1, rate, taxRuleId: "in-gst-0" }] });

  it("spots income moving, with both figures behind it", () => {
    const list = insights({
      ...base,
      documents: [
        bill({ id: "now" }, invoiceFor(200000, "2026-06-01", "INV-1")),
        bill({ id: "before" }, invoiceFor(100000, "2026-05-01", "INV-0"))
      ],
      expenses: []
    });
    const income = list.find((i) => i.id === "income-change")!;
    expect(income.title).toMatch(/up 100%/);
    expect(income.because[0]).toMatch(/₹2,00,000.00.*₹1,00,000.00/);
  });

  it("ignores a small wobble rather than reporting every change", () => {
    const list = insights({
      ...base,
      documents: [
        bill({ id: "now" }, invoiceFor(102000, "2026-06-01", "INV-1")),
        bill({ id: "before" }, invoiceFor(100000, "2026-05-01", "INV-0"))
      ],
      expenses: []
    });
    expect(list.find((i) => i.id === "income-change")).toBeUndefined();
  });

  it("notices a cost that jumped, but not a tiny one", () => {
    const list = insights({
      ...base,
      documents: [],
      expenses: [
        spend({ date: "2026-05-02", netMinor: 1000000 }),
        spend({ date: "2026-06-02", netMinor: 2000000 }),
        spend({ date: "2026-05-03", category: "6100", netMinor: 50000 }),
        spend({ date: "2026-06-03", category: "6100", netMinor: 90000 })
      ]
    });
    expect(list.some((i) => i.id === "cost-6010")).toBe(true);
    expect(list.some((i) => i.id === "cost-6100")).toBe(false);
  });

  it("warns when one customer holds most of what is owed", () => {
    const list = insights({
      ...base,
      documents: [
        bill({ id: "a", totalMinor: 90000000 }),
        bill({ id: "b", totalMinor: 5000000 }, docData({ number: "INV-2", buyer: { name: "Initech" } }))
      ],
      expenses: []
    });
    const concentration = list.find((i) => i.id === "concentration")!;
    expect(concentration.title).toMatch(/95%/);
    expect(concentration.tone).toBe("bad");
  });

  it("puts the urgent things first", () => {
    const list = insights({
      ...base,
      profile: { ...base.profile, openingCashMinor: 100000 },
      documents: [bill({ id: "a" })],
      expenses: [spend({ date: "2026-06-01", netMinor: 8000000 })]
    });
    expect(list[0].id).toBe("runway");
  });

  it("mentions drafts, which are invisible money", () => {
    const list = insights({
      ...base,
      documents: [bill({ id: "a", status: "draft" }), bill({ id: "b", status: "draft" })],
      expenses: []
    });
    expect(list.find((i) => i.id === "drafts")!.title).toMatch(/2 invoices are still drafts/);
  });

  it("gives every insight something to act on, or nothing at all", () => {
    const list = insights({
      ...base,
      documents: [bill({ id: "a", totalMinor: 90000000 }), bill({ id: "b", totalMinor: 5000000 }, docData({ number: "INV-2", buyer: { name: "Initech" } }))],
      expenses: []
    });
    for (const i of list) {
      expect(i.because.length).toBeGreaterThan(0);
      if (i.action) expect(i.action.href).toMatch(/^\//);
    }
  });
});

describe("the daily brief", () => {
  const lines = dailyBrief({
    ...base,
    documents: [bill({ id: "a" }), bill({ id: "b", totalMinor: 5000000 }, docData({ number: "INV-2", issueDate: "2026-05-01" }))],
    expenses: [spend()]
  });

  it("opens with how income is moving", () => {
    expect(lines[0]).toMatch(/Income is (up|down)|You have invoiced/);
  });
  it("says what is overdue and who has most of it", () => {
    expect(lines[1]).toMatch(/overdue/);
  });
  it("says where the cash stands", () => {
    expect(lines[2]).toMatch(/in cash/);
  });
  it("stays short enough to actually read", () => {
    expect(lines.length).toBeLessThanOrEqual(4);
  });
});
