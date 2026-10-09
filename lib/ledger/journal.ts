import { add, fromMinor, zero, type Money } from "../money";
import { accountByCode, type AccountType } from "./accounts";

/**
 * Double-entry journals. Every financial event becomes one entry whose debits equal its credits,
 * and nothing is ever edited in place: a correction is a reversal plus a new entry, so the history
 * of what was believed and when survives.
 */

export interface JournalLine {
  account: string;
  /** Positive minor units. A line is either a debit or a credit, never both. */
  debit?: number;
  credit?: number;
  /** Free text shown in the ledger, such as the customer name. */
  memo?: string;
}

export type SourceKind = "invoice" | "payment" | "expense" | "bill" | "manual" | "opening" | "reversal";

export interface JournalEntry {
  id: string;
  /** The date the event happened, which decides the period it falls in. */
  date: string;
  narration: string;
  currency: string;
  lines: JournalLine[];
  /** What produced it, so a document can be traced to its accounting and back. */
  source: { kind: SourceKind; id?: string; number?: string };
  createdAt: string;
  /** Set when this entry has been reversed, pointing at the reversal. */
  reversedBy?: string;
  /** Set on a reversal, pointing at what it reversed. */
  reverses?: string;
}

export class UnbalancedEntry extends Error {
  constructor(public debits: number, public credits: number) {
    super(`A journal entry must balance. Debits came to ${debits} and credits to ${credits}.`);
    this.name = "UnbalancedEntry";
  }
}

export const totalDebits = (lines: JournalLine[]) => lines.reduce((a, l) => a + (l.debit ?? 0), 0);
export const totalCredits = (lines: JournalLine[]) => lines.reduce((a, l) => a + (l.credit ?? 0), 0);

/** Builds an entry, refusing anything that does not balance or names an account that does not exist. */
export function entry(input: Omit<JournalEntry, "id" | "createdAt"> & { id?: string }): JournalEntry {
  const lines = input.lines.filter((l) => (l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
  const debits = totalDebits(lines);
  const credits = totalCredits(lines);
  if (debits !== credits) throw new UnbalancedEntry(debits, credits);

  for (const l of lines) {
    if (!accountByCode(l.account)) throw new Error(`No such account: ${l.account}`);
    if ((l.debit ?? 0) < 0 || (l.credit ?? 0) < 0) throw new Error("A journal line cannot be negative. Put it on the other side instead.");
    if ((l.debit ?? 0) > 0 && (l.credit ?? 0) > 0) throw new Error("A journal line is either a debit or a credit, not both.");
  }

  return {
    ...input,
    lines,
    id: input.id ?? `je_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString()
  };
}

/** A correction never edits history: it posts the opposite entry and links the two. */
export function reversalOf(original: JournalEntry, date: string, reason: string): JournalEntry {
  return entry({
    date,
    narration: `Reversal of ${original.narration}. ${reason}`.trim(),
    currency: original.currency,
    lines: original.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit, memo: l.memo })),
    source: { kind: "reversal", id: original.id, number: original.source.number },
    reverses: original.id
  });
}

export interface AccountBalance { code: string; name: string; type: AccountType; debit: Money; credit: Money; balance: Money }

/**
 * Balances per account for a period. Balance is signed the way the account normally sits, so an
 * asset with more debits is positive and so is income with more credits.
 */
export function balances(entries: JournalEntry[], currency: string, from?: string, to?: string): AccountBalance[] {
  const live = entries.filter((e) => e.currency === currency && (!from || e.date >= from) && (!to || e.date <= to));
  const map = new Map<string, { debit: number; credit: number }>();

  for (const e of live) {
    for (const l of e.lines) {
      const cur = map.get(l.account) ?? { debit: 0, credit: 0 };
      map.set(l.account, { debit: cur.debit + (l.debit ?? 0), credit: cur.credit + (l.credit ?? 0) });
    }
  }

  return [...map.entries()]
    .map(([code, v]) => {
      const acct = accountByCode(code)!;
      const signed = acct.normal === "debit" ? v.debit - v.credit : v.credit - v.debit;
      return { code, name: acct.name, type: acct.type, debit: fromMinor(v.debit, currency), credit: fromMinor(v.credit, currency), balance: fromMinor(signed, currency) };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** The check an accountant runs first: across every account, debits equal credits. */
export function trialBalance(entries: JournalEntry[], currency: string, to?: string) {
  const rows = balances(entries, currency, undefined, to);
  const debit = rows.reduce((a, r) => a + r.debit.minor, 0);
  const credit = rows.reduce((a, r) => a + r.credit.minor, 0);
  return { rows, debit: fromMinor(debit, currency), credit: fromMinor(credit, currency), balanced: debit === credit };
}

export function sumOf(rows: AccountBalance[], type: AccountType, currency: string): Money {
  return rows.filter((r) => r.type === type).reduce((a, r) => add(a, r.balance), zero(currency));
}
