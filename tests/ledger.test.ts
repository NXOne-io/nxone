import { describe, expect, it } from "vitest";
import { entry, reversalOf, trialBalance, UnbalancedEntry } from "@/lib/ledger/journal";
import { ledgerFor, postExpense, postInvoice, postPayment } from "@/lib/ledger/posting";
import { balanceSheet, cashFlow, profitAndLoss } from "@/lib/ledger/statements";
import { toMajor } from "@/lib/money";
import type { DocumentData } from "@/lib/documents/types";
import type { SavedDocument } from "@/lib/store/types";

const invoice = (over: Partial<DocumentData> = {}): DocumentData => ({
  kind: "invoice", country: "IN", currency: "INR", issueDate: "2026-05-10", number: "INV-1",
  seller: { name: "Acme", region: "MH" }, buyer: { name: "Globex" }, placeOfSupply: "MH",
  items: [{ id: "1", description: "Work", quantity: 1, rate: 100000, taxRuleId: "in-gst-18" }],
  taxInclusive: false, ...over
});

describe("journal rules", () => {
  it("refuses an entry that does not balance", () => {
    expect(() => entry({
      date: "2026-05-10", narration: "Wrong", currency: "INR",
      lines: [{ account: "1020", debit: 1000 }, { account: "4000", credit: 900 }],
      source: { kind: "manual" }
    })).toThrow(UnbalancedEntry);
  });
  it("refuses an account that does not exist", () => {
    expect(() => entry({
      date: "2026-05-10", narration: "Wrong", currency: "INR",
      lines: [{ account: "9999", debit: 100 }, { account: "4000", credit: 100 }],
      source: { kind: "manual" }
    })).toThrow(/No such account/);
  });
  it("refuses a line that is both a debit and a credit", () => {
    expect(() => entry({
      date: "2026-05-10", narration: "Wrong", currency: "INR",
      lines: [{ account: "1020", debit: 100, credit: 100 }],
      source: { kind: "manual" }
    })).toThrow(/either a debit or a credit/);
  });
  it("corrects by reversal rather than by editing history", () => {
    const original = postInvoice(invoice());
    const back = reversalOf(original, "2026-06-01", "Cancelled by the customer.");
    expect(back.reverses).toBe(original.id);
    expect(back.lines.find((l) => l.account === "1200")?.credit).toBe(original.lines.find((l) => l.account === "1200")?.debit);
    expect(trialBalance([original, back], "INR").debit).toEqual(trialBalance([original, back], "INR").credit);
  });
});

describe("posting what the business does", () => {
  it("posts a sale as debt, income and tax held for the government", () => {
    const e = postInvoice(invoice());
    expect(e.lines.find((l) => l.account === "1200")?.debit).toBe(11800000);
    expect(e.lines.find((l) => l.account === "4000")?.credit).toBe(10000000);
    expect(e.lines.find((l) => l.account === "2100")?.credit).toBe(1800000);
  });
  it("posts a receipt as bank up and debt down", () => {
    const e = postPayment({ date: "2026-05-20", amountMinor: 11800000, currency: "INR", account: "1020", documentNumber: "INV-1" });
    expect(e.lines.find((l) => l.account === "1020")?.debit).toBe(11800000);
    expect(e.lines.find((l) => l.account === "1200")?.credit).toBe(11800000);
  });
  it("posts an expense paid in cash, keeping reclaimable tax separate", () => {
    const e = postExpense({ date: "2026-05-12", supplier: "WeWork", category: "6010", currency: "INR", netMinor: 5000000, taxMinor: 900000, paidFrom: "1020" });
    expect(e.lines.find((l) => l.account === "6010")?.debit).toBe(5000000);
    expect(e.lines.find((l) => l.account === "1400")?.debit).toBe(900000);
    expect(e.lines.find((l) => l.account === "1020")?.credit).toBe(5900000);
  });
  it("posts an unpaid expense as money owed to the supplier", () => {
    const e = postExpense({ date: "2026-05-12", supplier: "Printer", category: "6100", currency: "INR", netMinor: 100000 });
    expect(e.lines.find((l) => l.account === "2010")?.credit).toBe(100000);
  });
});

describe("the statements", () => {
  const saved = (over: Partial<SavedDocument>, d: DocumentData): SavedDocument => ({
    id: over.id ?? "x", kind: "invoice", number: d.number, clientName: d.buyer.name, issueDate: d.issueDate,
    currency: "INR", totalMinor: 11800000, paidMinor: 0, status: "sent", doc: d,
    createdAt: "", updatedAt: "2026-05-25T00:00:00Z", ...over
  });

  const docs = [
    saved({ id: "a" }, invoice()),
    saved({ id: "b", paidMinor: 11800000, status: "paid" }, invoice({ number: "INV-2", issueDate: "2026-05-12" }))
  ];
  const expenses = [
    { id: "e1", date: "2026-05-15", supplier: "WeWork", category: "6010", currency: "INR", netMinor: 5000000, taxMinor: 900000, paidFrom: "1020" },
    { id: "e2", date: "2026-05-18", supplier: "Ads", category: "6050", currency: "INR", netMinor: 2000000, paidFrom: "1020" }
  ];
  const ledger = ledgerFor(docs, expenses, "INR");

  it("always balances", () => {
    expect(trialBalance(ledger, "INR").balanced).toBe(true);
  });
  it("shows profit as income less costs", () => {
    const pl = profitAndLoss(ledger, "INR", "2026-05-01", "2026-05-31");
    expect(toMajor(pl.totalIncome)).toBe(200000);
    expect(toMajor(pl.totalExpenses)).toBe(70000);
    expect(toMajor(pl.netProfit)).toBe(130000);
    expect(pl.marginPct).toBe(65);
  });
  it("keeps tax out of profit, because it was never yours", () => {
    const pl = profitAndLoss(ledger, "INR", "2026-05-01", "2026-05-31");
    expect(toMajor(pl.totalIncome)).toBe(200000);
  });
  it("balances the balance sheet", () => {
    const bs = balanceSheet(ledger, "INR", "2026-05-31");
    expect(bs.balanced).toBe(true);
    expect(toMajor(bs.assets.find((a) => a.code === "1200")!.balance)).toBe(118000);
  });
  it("follows the cash", () => {
    const cf = cashFlow(ledger, "INR", "2026-05-01", "2026-05-31");
    expect(toMajor(cf.received)).toBe(118000);
    expect(toMajor(cf.spent)).toBe(59000 + 20000);
    expect(toMajor(cf.closing)).toBe(118000 - 79000);
  });
  it("leaves drafts and cancelled documents out of the books", () => {
    const withDraft = ledgerFor([...docs, saved({ id: "c", status: "draft" }, invoice({ number: "INV-3" }))], [], "INR");
    expect(withDraft.filter((e) => e.source.kind === "invoice")).toHaveLength(2);
  });
});
