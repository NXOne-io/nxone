import { fromMinor, type Money } from "../money";
import type { Expense } from "../store/types";

/**
 * What you owe, and what to pay first.
 *
 * Priority is not simply oldest first. Paying a supplier who holds up your work matters more than
 * paying one who does not, and there is no point scheduling payments the bank balance cannot
 * cover, so the order considers age, size and what cash is actually available.
 */

export interface SupplierBalance {
  supplier: string;
  owed: Money;
  bills: number;
  oldestDays: number;
}

export interface PayableItem {
  expense: Expense;
  owed: Money;
  /** Days since the bill was recorded, which is the best proxy we have for its age. */
  ageDays: number;
  /** Where it should sit in the queue. Higher goes first. */
  priority: number;
  reason: string;
}

export interface PayablesView {
  total: Money;
  /** What falls within the cash you have, in priority order. */
  affordable: PayableItem[];
  /** What does not, so the person can see the gap rather than discover it. */
  beyondCash: PayableItem[];
  shortfall: Money;
  bySupplier: SupplierBalance[];
}

const owedOn = (e: Expense) => e.netMinor + e.taxMinor;
const ageOf = (date: string, today: string) => Math.max(0, Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000));

export function unpaidBills(expenses: Expense[], currency: string): Expense[] {
  return expenses.filter((e) => !e.deletedAt && !e.paidFrom && e.currency === currency);
}

export function payables(expenses: Expense[], today: string, currency: string, cashMinor: number): PayablesView {
  const bills = unpaidBills(expenses, currency);

  const items: PayableItem[] = bills.map((expense) => {
    const ageDays = ageOf(expense.date, today);
    const owed = owedOn(expense);
    // age matters most, then size, so an old small bill still gets settled rather than ignored
    const priority = ageDays * 2 + Math.log10(owed / 100 + 10) * 10;
    const reason = ageDays > 45 ? `Recorded ${ageDays} days ago and still unpaid`
      : ageDays > 14 ? `${ageDays} days old`
      : "Recently recorded";
    return { expense, owed: fromMinor(owed, currency), ageDays, priority, reason };
  }).sort((a, b) => b.priority - a.priority);

  const affordable: PayableItem[] = [];
  const beyondCash: PayableItem[] = [];
  let running = cashMinor;

  for (const item of items) {
    if (running >= item.owed.minor) { affordable.push(item); running -= item.owed.minor; }
    else beyondCash.push(item);
  }

  const total = items.reduce((a, i) => a + i.owed.minor, 0);
  const shortfallMinor = Math.max(0, total - Math.max(0, cashMinor));

  const bySupplierMap = new Map<string, { owed: number; bills: number; oldest: number }>();
  for (const item of items) {
    const current = bySupplierMap.get(item.expense.supplier) ?? { owed: 0, bills: 0, oldest: 0 };
    bySupplierMap.set(item.expense.supplier, {
      owed: current.owed + item.owed.minor,
      bills: current.bills + 1,
      oldest: Math.max(current.oldest, item.ageDays)
    });
  }

  return {
    total: fromMinor(total, currency),
    affordable,
    beyondCash,
    shortfall: fromMinor(shortfallMinor, currency),
    bySupplier: [...bySupplierMap.entries()]
      .map(([supplier, v]) => ({ supplier, owed: fromMinor(v.owed, currency), bills: v.bills, oldestDays: v.oldest }))
      .sort((a, b) => b.owed.minor - a.owed.minor)
  };
}
