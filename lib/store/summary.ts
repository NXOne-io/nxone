import { fromMinor, type Money } from "../money";
import type { SavedDocument } from "./types";

/** What the dashboard answers: who owes you, how much is late, and how the month is going. */
export interface MoneySummary {
  currency: string;
  outstanding: Money;
  overdue: Money;
  dueThisWeek: Money;
  paidThisMonth: Money;
  draftCount: number;
  overdueCount: number;
  /** Oldest unpaid invoices first, because those are the ones to chase. */
  chase: Array<{ doc: SavedDocument; daysLate: number }>;
  /** Totals by client, largest first. */
  byClient: Array<{ name: string; outstandingMinor: number; count: number }>;
}

const isBill = (d: SavedDocument) => d.kind === "invoice" || d.kind === "proforma";
const days = (from: string, to: string) => Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function summarise(documents: SavedDocument[], todayIso: string, currency: string): MoneySummary {
  const live = documents.filter((d) => isBill(d) && d.currency === currency && d.status !== "cancelled" && d.status !== "draft");
  const unpaid = live.filter((d) => d.status !== "paid");

  let outstanding = 0, overdue = 0, dueThisWeek = 0, paidThisMonth = 0, overdueCount = 0;
  const chase: MoneySummary["chase"] = [];
  const clients = new Map<string, { outstandingMinor: number; count: number }>();

  for (const d of unpaid) {
    const owed = Math.max(0, d.totalMinor - d.paidMinor);
    outstanding += owed;
    const entry = clients.get(d.clientName) ?? { outstandingMinor: 0, count: 0 };
    clients.set(d.clientName, { outstandingMinor: entry.outstandingMinor + owed, count: entry.count + 1 });

    if (d.dueDate) {
      const late = days(d.dueDate, todayIso);
      if (late > 0) { overdue += owed; overdueCount += 1; chase.push({ doc: d, daysLate: late }); }
      else if (late >= -7) dueThisWeek += owed;
    }
  }

  const month = todayIso.slice(0, 7);
  for (const d of documents) {
    if (d.currency !== currency) continue;
    if (d.status === "paid" && d.updatedAt.slice(0, 7) === month) paidThisMonth += d.totalMinor;
    if (d.kind === "receipt" && d.issueDate.slice(0, 7) === month && d.status !== "cancelled") paidThisMonth += 0;
  }

  return {
    currency,
    outstanding: fromMinor(outstanding, currency),
    overdue: fromMinor(overdue, currency),
    dueThisWeek: fromMinor(dueThisWeek, currency),
    paidThisMonth: fromMinor(paidThisMonth, currency),
    draftCount: documents.filter((d) => d.status === "draft").length,
    overdueCount,
    chase: chase.sort((a, b) => b.daysLate - a.daysLate).slice(0, 5),
    byClient: [...clients.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.outstandingMinor - a.outstandingMinor).slice(0, 5)
  };
}
