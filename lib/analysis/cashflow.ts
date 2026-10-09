import { ledgerFor } from "../ledger/posting";
import { cashFlow } from "../ledger/statements";
import { fromMinor, type Money } from "../money";
import type { Expense, SavedDocument } from "../store/types";
import { addDays } from "../format";

/**
 * What the next three months look like.
 *
 * Everything here is a projection built from things that already exist: invoices with due dates,
 * bills not yet paid, and a run rate taken from what has actually been spent. It is never
 * presented as fact, and the screen says which parts are known and which are guessed.
 */

export interface CashPoint {
  date: string;
  /** Balance projected at the end of that day. */
  balance: Money;
  inflow: Money;
  outflow: Money;
  /** Known means a dated invoice or bill. Estimated means the run rate. */
  basis: "known" | "estimated";
}

export interface Forecast {
  currency: string;
  openingCash: Money;
  /** Day by day, from today forward. */
  points: CashPoint[];
  expectedIn: Money;
  expectedOut: Money;
  closing: Money;
  /** Days until cash runs out at this rate, or null when it does not within the horizon. */
  runwayDays: number | null;
  /** The day the balance first drops below the threshold, if it does. */
  dipsBelowOn: string | null;
  /** Monthly running costs implied by recent spending. */
  monthlyBurn: Money;
  /** How much of the inflow is late invoices, which may not arrive when assumed. */
  atRisk: Money;
}

const owedOn = (d: SavedDocument) => Math.max(0, d.totalMinor - d.paidMinor);
const isBill = (d: SavedDocument) => d.kind === "invoice" || d.kind === "proforma";

/**
 * Spending per month from the last 90 days. Recent reality beats a budget nobody updates, and
 * three months is long enough to even out a quarterly bill without including last year.
 */
export function monthlyBurnRate(expenses: Expense[], today: string, currency: string): number {
  const from = addDays(today, -90);
  const recent = expenses.filter((e) => e.currency === currency && !e.deletedAt && e.date >= from && e.date <= today);
  if (!recent.length) return 0;
  const total = recent.reduce((a, e) => a + e.netMinor + e.taxMinor, 0);
  const span = Math.max(30, Math.min(90, Math.round((Date.parse(today) - Date.parse(recent[recent.length - 1].date)) / 86_400_000) || 90));
  return Math.round((total / span) * 30);
}

export function forecast(
  documents: SavedDocument[],
  expenses: Expense[],
  today: string,
  currency: string,
  horizonDays = 90,
  minimumCashMinor = 0
): Forecast {
  const ledger = ledgerFor(documents, expenses.filter((e) => !e.deletedAt).map((e) => ({
    id: e.id, date: e.date, supplier: e.supplier, description: e.description, category: e.category,
    currency: e.currency, netMinor: e.netMinor, taxMinor: e.taxMinor, paidFrom: e.paidFrom
  })), currency);

  const cash = cashFlow(ledger, currency, "1900-01-01", today);
  const opening = cash.closing.minor;

  // money we are owed, assumed to arrive on its due date, and overdue invoices assumed to arrive soon
  const inflows = new Map<string, number>();
  let atRisk = 0;
  for (const d of documents.filter((x) => isBill(x) && x.currency === currency && x.status !== "draft" && x.status !== "cancelled" && x.status !== "paid")) {
    const owed = owedOn(d);
    if (!owed) continue;
    const due = d.dueDate ?? d.issueDate;
    // an invoice already past its date is assumed to land a week out rather than yesterday
    const when = due > today ? due : addDays(today, 7);
    if (due <= today) atRisk += owed;
    inflows.set(when, (inflows.get(when) ?? 0) + owed);
  }

  // bills recorded but not paid, assumed due within a fortnight
  const outflows = new Map<string, number>();
  for (const e of expenses.filter((x) => x.currency === currency && !x.paidFrom && !x.deletedAt)) {
    const when = addDays(today, 14);
    outflows.set(when, (outflows.get(when) ?? 0) + e.netMinor + e.taxMinor);
  }

  const burn = monthlyBurnRate(expenses, today, currency);
  const dailyBurn = Math.round(burn / 30);

  const points: CashPoint[] = [];
  let balance = opening;
  let runwayDays: number | null = null;
  let dipsBelowOn: string | null = null;
  let totalIn = 0;
  let totalOut = 0;

  for (let i = 1; i <= horizonDays; i++) {
    const date = addDays(today, i);
    const inflow = inflows.get(date) ?? 0;
    const scheduledOut = outflows.get(date) ?? 0;
    const outflow = scheduledOut + dailyBurn;

    balance += inflow - outflow;
    totalIn += inflow;
    totalOut += outflow;

    if (balance < 0 && runwayDays === null) runwayDays = i;
    if (minimumCashMinor > 0 && balance < minimumCashMinor && !dipsBelowOn) dipsBelowOn = date;

    points.push({
      date,
      balance: fromMinor(balance, currency),
      inflow: fromMinor(inflow, currency),
      outflow: fromMinor(outflow, currency),
      basis: inflow > 0 || scheduledOut > 0 ? "known" : "estimated"
    });
  }

  return {
    currency,
    openingCash: fromMinor(opening, currency),
    points,
    expectedIn: fromMinor(totalIn, currency),
    expectedOut: fromMinor(totalOut, currency),
    closing: fromMinor(balance, currency),
    runwayDays,
    dipsBelowOn,
    monthlyBurn: fromMinor(burn, currency),
    atRisk: fromMinor(atRisk, currency)
  };
}

/** The headline figures for a given number of days ahead. */
export function windowOf(f: Forecast, days: number) {
  const slice = f.points.slice(0, days);
  const last = slice[slice.length - 1];
  return {
    days,
    inflow: fromMinor(slice.reduce((a, p) => a + p.inflow.minor, 0), f.currency),
    outflow: fromMinor(slice.reduce((a, p) => a + p.outflow.minor, 0), f.currency),
    closing: last?.balance ?? f.openingCash
  };
}
