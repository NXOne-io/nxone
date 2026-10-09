import { calculate } from "../documents/totals";
import type { DocumentData } from "../documents/types";
import type { SavedDocument } from "../store/types";
import { entry, type JournalEntry } from "./journal";

/**
 * Turning what a business does into what accountants record. A sale debits what the customer owes
 * and credits income plus the tax you now hold for the government. A payment moves the debt into
 * the bank. An expense is the mirror image.
 *
 * Nobody using NXOne has to know any of this, which is rather the point.
 */

export interface PaymentInput {
  id?: string;
  date: string;
  amountMinor: number;
  currency: string;
  /** Which cash account it landed in. */
  account: string;
  reference?: string;
  documentNumber?: string;
}

export interface ExpenseInput {
  id?: string;
  date: string;
  supplier: string;
  description?: string;
  /** Expense account code from the chart. */
  category: string;
  currency: string;
  /** What the expense cost before any reclaimable tax. */
  netMinor: number;
  /** Tax you can reclaim, where the rules allow it. Zero when you cannot. */
  taxMinor?: number;
  /** Paid now from an account, or left owing to the supplier. */
  paidFrom?: string;
}

/** A sale: the customer owes you, you have earned income, and you hold tax for the government. */
export function postInvoice(doc: DocumentData, savedId?: string): JournalEntry {
  const t = calculate(doc);
  const cur = doc.currency;
  const lines = [
    { account: "1200", debit: t.total.minor, memo: doc.buyer.name || "Customer" },
    { account: "4000", credit: t.taxableTotal.minor, memo: doc.number }
  ];

  if (t.taxTotal.minor > 0) lines.push({ account: "2100", credit: t.taxTotal.minor, memo: `Tax on ${doc.number}` });
  if (t.shipping.minor > 0) {
    // shipping is income too, and was already inside the total
    lines[1] = { account: "4000", credit: t.taxableTotal.minor + t.shipping.minor, memo: doc.number };
  }
  if (t.roundOff.minor !== 0) {
    const r = t.roundOff.minor;
    lines.push(r > 0 ? { account: "4100", credit: r, memo: "Rounding" } : { account: "6900", debit: -r, memo: "Rounding" });
  }

  return entry({
    date: doc.issueDate,
    narration: `${doc.number} to ${doc.buyer.name || "customer"}`,
    currency: cur,
    lines,
    source: { kind: "invoice", id: savedId, number: doc.number }
  });
}

/** Money arriving against an invoice: the debt shrinks and the bank grows. */
export function postPayment(input: PaymentInput): JournalEntry {
  return entry({
    date: input.date,
    narration: `Payment received${input.documentNumber ? ` for ${input.documentNumber}` : ""}`,
    currency: input.currency,
    lines: [
      { account: input.account, debit: input.amountMinor, memo: input.reference },
      { account: "1200", credit: input.amountMinor, memo: input.documentNumber }
    ],
    source: { kind: "payment", id: input.id, number: input.documentNumber }
  });
}

/** Something you bought: a cost, any reclaimable tax, and either cash out or a supplier owed. */
export function postExpense(input: ExpenseInput): JournalEntry {
  const tax = input.taxMinor ?? 0;
  const gross = input.netMinor + tax;
  const lines = [
    { account: input.category, debit: input.netMinor, memo: input.description || input.supplier },
    ...(tax > 0 ? [{ account: "1400", debit: tax, memo: "Reclaimable tax" }] : []),
    input.paidFrom
      ? { account: input.paidFrom, credit: gross, memo: input.supplier }
      : { account: "2010", credit: gross, memo: input.supplier }
  ];

  return entry({
    date: input.date,
    narration: `${input.supplier}${input.description ? `: ${input.description}` : ""}`,
    currency: input.currency,
    lines,
    source: { kind: "expense", id: input.id }
  });
}

/** Paying a supplier you already owed. */
export function postBillPayment(input: PaymentInput): JournalEntry {
  return entry({
    date: input.date,
    narration: `Paid supplier${input.reference ? ` (${input.reference})` : ""}`,
    currency: input.currency,
    lines: [
      { account: "2010", debit: input.amountMinor, memo: input.reference },
      { account: input.account, credit: input.amountMinor }
    ],
    source: { kind: "payment", id: input.id }
  });
}

/**
 * The ledger for everything saved. Documents produce a sale entry, and whatever has been paid
 * against them produces a receipt entry, so the books follow the documents without double entry
 * of data by the user.
 */
export function ledgerFor(documents: SavedDocument[], expenses: ExpenseInput[], currency: string): JournalEntry[] {
  const out: JournalEntry[] = [];

  for (const d of documents) {
    if (d.currency !== currency) continue;
    if (d.status === "draft" || d.status === "cancelled") continue;
    if (d.kind !== "invoice" && d.kind !== "proforma") continue;

    out.push(postInvoice(d.doc, d.id));
    if (d.paidMinor > 0) {
      out.push(postPayment({
        id: `${d.id}-paid`,
        date: d.status === "paid" ? d.updatedAt.slice(0, 10) : d.issueDate,
        amountMinor: Math.min(d.paidMinor, d.totalMinor),
        currency: d.currency,
        account: "1020",
        documentNumber: d.number
      }));
    }
  }

  for (const e of expenses) {
    if (e.currency !== currency) continue;
    out.push(postExpense(e));
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}
