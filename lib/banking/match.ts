import { EXPENSE_CATEGORIES } from "../ledger/accounts";
import type { Expense, SavedDocument } from "../store/types";
import type { BankRow } from "./parse";

/**
 * Working out what each line on the statement is.
 *
 * Money in is usually a customer paying an invoice; money out is usually a bill. We suggest, with
 * a reason and a confidence, and the person confirms. Nothing posts by itself: a wrongly matched
 * payment is worse than an unmatched one, because it quietly closes an invoice that is still owed.
 */

export type SuggestionKind = "payment" | "expense" | "transfer" | "unknown";

export interface Suggestion {
  row: BankRow;
  kind: SuggestionKind;
  /** The invoice this looks like a payment for. */
  document?: SavedDocument;
  /** For money out, the expense category we would file it under. */
  category?: string;
  supplier?: string;
  /** 0 to 1. Anything under 0.5 is shown as a guess rather than a suggestion. */
  confidence: number;
  reason: string;
  /** An existing expense that looks like the same thing, so it is not recorded twice. */
  duplicateOf?: Expense;
}

const owedOn = (d: SavedDocument) => Math.max(0, d.totalMinor - d.paidMinor);
const daysApart = (a: string, b: string) => Math.abs(Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000));

/** Strips the noise banks add, so "NEFT-GLOBEX PRIVATE LTD-0012" can match "Globex Private Limited". */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(neft|imps|rtgs|upi|ach|chq|cheque|ref|txn|payment|from|to|inv|invoice|bank|transfer|pvt|private|ltd|limited|llp|inc|co)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** How much two descriptions have in common, as a share of the shorter one's words. */
export function similarity(a: string, b: string): number {
  const left = new Set(normalise(a).split(" ").filter((w) => w.length > 2));
  const right = new Set(normalise(b).split(" ").filter((w) => w.length > 2));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / Math.min(left.size, right.size);
}

const CATEGORY_HINTS: Array<[string, string[]]> = [
  ["6010", ["rent", "lease", "wework", "office space"]],
  ["6020", ["salary", "payroll", "wages", "stipend"]],
  ["6030", ["electricity", "power", "water", "gas bill", "broadband", "internet", "airtel", "jio", "bsnl"]],
  ["6040", ["software", "subscription", "aws", "google cloud", "azure", "adobe", "figma", "slack", "zoom", "github", "openai"]],
  ["6050", ["ads", "advertis", "marketing", "facebook", "meta platforms", "google ads"]],
  ["6060", ["uber", "ola", "flight", "airlines", "indigo", "hotel", "travel", "irctc", "railway"]],
  ["6070", ["consultant", "legal", "advocate", "accountant", "audit", "professional fee"]],
  ["6090", ["bank charge", "service charge", "processing fee", "gateway", "razorpay", "stripe"]],
  ["6100", ["stationery", "printer", "amazon", "office supplies"]]
];

export function guessCategory(description: string): { code: string; reason: string } | null {
  const text = description.toLowerCase();
  for (const [code, hints] of CATEGORY_HINTS) {
    const hit = hints.find((h) => text.includes(h));
    if (hit) return { code, reason: `"${hit}" usually means ${EXPENSE_CATEGORIES.find((c) => c.code === code)?.name.toLowerCase()}` };
  }
  return null;
}

export function suggestFor(row: BankRow, documents: SavedDocument[], expenses: Expense[], currency: string): Suggestion {
  // money in: look for an invoice it could be paying
  if (row.amountMinor > 0) {
    const candidates = documents
      .filter((d) => (d.kind === "invoice" || d.kind === "proforma") && d.currency === currency && d.status !== "draft" && d.status !== "cancelled" && owedOn(d) > 0)
      .map((d) => {
        const exact = owedOn(d) === row.amountMinor;
        const nameScore = similarity(row.description, d.clientName);
        const numberHit = row.description.toLowerCase().includes(d.number.toLowerCase()) || (row.reference ?? "").toLowerCase().includes(d.number.toLowerCase());
        const dateScore = d.dueDate ? Math.max(0, 1 - daysApart(row.date, d.dueDate) / 60) : 0.2;
        const confidence = Math.min(1, (exact ? 0.55 : 0) + (numberHit ? 0.35 : 0) + nameScore * 0.35 + dateScore * 0.1);
        const reasons = [exact ? "the amount matches exactly" : "", numberHit ? "the invoice number appears" : "", nameScore > 0.4 ? "the name matches" : ""].filter(Boolean);
        return { d, confidence, reason: reasons.join(", ") || "nothing much matches" };
      })
      .sort((a, b) => b.confidence - a.confidence);

    const best = candidates[0];
    if (best && best.confidence >= 0.4) {
      return { row, kind: "payment", document: best.d, confidence: best.confidence, reason: `Looks like payment for ${best.d.number}: ${best.reason}` };
    }
    return { row, kind: "unknown", confidence: 0.2, reason: "Money in, but no invoice obviously matches it" };
  }

  // money out: a bill, unless it is obviously a transfer between your own accounts
  const amount = Math.abs(row.amountMinor);
  if (/\b(transfer to own|self|own account|sweep)\b/i.test(row.description)) {
    return { row, kind: "transfer", confidence: 0.6, reason: "Looks like a transfer between your own accounts" };
  }

  const duplicate = expenses.find((e) => !e.deletedAt && e.currency === currency
    && e.netMinor + e.taxMinor === amount && daysApart(e.date, row.date) <= 5);

  const guess = guessCategory(row.description);
  return {
    row,
    kind: "expense",
    category: guess?.code ?? "6900",
    supplier: supplierFrom(row.description),
    confidence: guess ? 0.7 : 0.35,
    reason: guess ? guess.reason : "Money out, so we have filed it under other expenses for you to correct",
    duplicateOf: duplicate
  };
}

/** A readable supplier name out of a bank line. */
export function supplierFrom(description: string): string {
  const cleaned = description
    .replace(/\b(neft|imps|rtgs|upi|ach|chq|cheque|ref|txn|payment|dr|cr)\b/gi, " ")
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/[^\w\s&.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 1).slice(0, 4);
  if (!words.length) return "Unknown";
  return words.map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase())).join(" ");
}

export function suggestAll(rows: BankRow[], documents: SavedDocument[], expenses: Expense[], currency: string): Suggestion[] {
  const taken = new Set<string>();
  const out: Suggestion[] = [];

  // highest confidence first, so one invoice is not matched to two different deposits
  const scored = rows.map((row) => suggestFor(row, documents, expenses, currency)).sort((a, b) => b.confidence - a.confidence);
  for (const s of scored) {
    if (s.document && taken.has(s.document.id)) {
      out.push({ ...s, kind: "unknown", document: undefined, confidence: 0.2, reason: "Another line already matches that invoice" });
      continue;
    }
    if (s.document) taken.add(s.document.id);
    out.push(s);
  }

  return out.sort((a, b) => a.row.date.localeCompare(b.row.date) || a.row.line - b.row.line);
}
