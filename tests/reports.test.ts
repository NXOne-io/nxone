import { describe, expect, it } from "vitest";
import { documentsCsv, financialYear, monthPeriod, quarterPeriod, reportFor } from "@/lib/store/reports";
import type { SavedDocument } from "@/lib/store/types";
import type { DocumentData } from "@/lib/documents/types";
import { toMajor } from "@/lib/money";

const doc = (over: Partial<DocumentData> = {}): DocumentData => ({
  kind: "invoice", country: "IN", currency: "INR", issueDate: "2026-05-10", number: "INV-1",
  seller: { name: "Acme", region: "MH" }, buyer: { name: "Globex", taxId: "29AACCG1234M1ZP" }, placeOfSupply: "MH",
  items: [{ id: "1", description: "Work", quantity: 1, rate: 100000, code: "998314", taxRuleId: "in-gst-18" }],
  taxInclusive: false, ...over
});

const saved = (over: Partial<SavedDocument> = {}, d: DocumentData = doc()): SavedDocument => ({
  id: over.id ?? Math.random().toString(36).slice(2), kind: "invoice", number: d.number, clientName: d.buyer.name,
  issueDate: d.issueDate, currency: "INR", totalMinor: 11800000, paidMinor: 0, status: "sent", doc: d,
  createdAt: "", updatedAt: "", ...over
});

describe("periods", () => {
  it("works out the Indian financial year", () => {
    expect(financialYear("2026-05-10").label).toBe("FY 2026-27");
    expect(financialYear("2026-02-10")).toMatchObject({ from: "2025-04-01", label: "FY 2025-26" });
  });
  it("works out a month, including a leap February", () => {
    expect(monthPeriod("2028-02-10")).toMatchObject({ from: "2028-02-01", to: "2028-02-29" });
  });
  it("works out a quarter from April", () => {
    expect(quarterPeriod("2026-05-10")).toMatchObject({ from: "2026-04-01", to: "2026-06-30" });
  });
});

describe("period report", () => {
  const docs = [
    saved({ id: "a" }),
    saved({ id: "b", paidMinor: 11800000, status: "paid" }, doc({ number: "INV-2" })),
    saved({ id: "c" }, doc({ number: "INV-3", placeOfSupply: "KA", items: [{ id: "1", description: "Work", quantity: 1, rate: 50000, code: "998311", taxRuleId: "in-igst-18" }] })),
    saved({ id: "d" }, doc({ number: "INV-4", issueDate: "2026-09-01" })),
    saved({ id: "e", status: "draft" }, doc({ number: "INV-5" })),
    saved({ id: "f", kind: "quote" }, doc({ number: "QUO-1" }))
  ];
  const r = reportFor(docs, monthPeriod("2026-05-01"), "INR");

  it("counts only sales documents inside the period, and ignores drafts", () => {
    expect(r.count).toBe(3);
  });
  it("adds up taxable value and tax", () => {
    expect(toMajor(r.taxableTotal)).toBe(250000);
    expect(toMajor(r.taxTotal)).toBe(45000);
  });
  it("separates what has been received from what is outstanding", () => {
    expect(toMajor(r.received)).toBe(118000);
    expect(toMajor(r.outstanding)).toBe(295000 - 118000);
  });
  it("splits supplies inside and outside the state", () => {
    expect(toMajor(r.intraStateTaxable)).toBe(200000);
    expect(toMajor(r.interStateTaxable)).toBe(50000);
  });
  it("groups tax by rate with the CGST, SGST and IGST split", () => {
    const row = r.byRate.find((x) => x.rate === 18)!;
    expect(toMajor(row.cgst)).toBe(18000);
    expect(toMajor(row.sgst)).toBe(18000);
    expect(toMajor(row.igst)).toBe(9000);
  });
  it("groups by HSN code", () => {
    expect(r.byHsn.map((h) => h.code)).toEqual(["998314", "998311"]);
  });
  it("totals by client", () => {
    expect(r.byClient[0]).toMatchObject({ name: "Globex", count: 3 });
  });
});

describe("csv for the accountant", () => {
  const csv = documentsCsv([saved({ id: "a" })]);
  it("has a header and one row per document", () => {
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv.split("\n")[0]).toContain("Taxable value,CGST,SGST,IGST");
  });
  it("writes amounts in major units with two decimals", () => {
    expect(csv.split("\n")[1]).toContain("100000.00,9000.00,9000.00,0.00");
  });
  it("escapes a customer name containing a comma", () => {
    const d = doc({ buyer: { name: "Globex, Inc" } });
    expect(documentsCsv([saved({ clientName: "Globex, Inc" }, d)])).toContain('"Globex, Inc"');
  });
});
