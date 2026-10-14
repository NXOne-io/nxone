import { customerStanding } from "../analysis/receivables";
import { forecast } from "../analysis/cashflow";
import { openingOf } from "../ledger/opening";
import { ledgerFor } from "../ledger/posting";
import { profitAndLoss } from "../ledger/statements";
import { formatMoney, fromMinor, type Money } from "../money";
import { monthPeriod } from "../store/reports";
import type { Expense, Profile, SavedDocument } from "../store/types";

/**
 * Things worth noticing, worked out rather than guessed.
 *
 * Each insight carries the figures behind it, because "margin is down" is useless without the two
 * numbers it came from. Nothing appears unless it passes a threshold worth a person's attention:
 * a dashboard that always has five observations is one nobody reads.
 */

export type InsightTone = "good" | "watch" | "bad" | "neutral";

export interface Insight {
  id: string;
  title: string;
  /** Why we are saying it, with the numbers. */
  because: string[];
  tone: InsightTone;
  /** What to do about it, where there is something sensible. */
  action?: { label: string; href: string };
  /** Bigger numbers come first. */
  weight: number;
}

const money = (v: Money) => formatMoney(v, "en-IN");
const pctChange = (now: number, before: number) => (before === 0 ? null : Math.round(((now - before) / Math.abs(before)) * 100));

export function insights(opts: {
  documents: SavedDocument[];
  expenses: Expense[];
  profile?: Profile;
  today: string;
  currency: string;
}): Insight[] {
  const { documents, expenses, profile, today, currency } = opts;
  const out: Insight[] = [];

  const opening = openingOf(profile);
  const ledger = ledgerFor(documents, expenses.filter((e) => !e.deletedAt).map((e) => ({
    id: e.id, date: e.date, supplier: e.supplier, category: e.category, currency: e.currency,
    netMinor: e.netMinor, taxMinor: e.taxMinor, paidFrom: e.paidFrom
  })), currency, opening);

  const [y, m] = today.split("-").map(Number);
  const thisMonth = monthPeriod(today);
  const lastMonth = monthPeriod(new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10));
  const now = profitAndLoss(ledger, currency, thisMonth.from, thisMonth.to);
  const before = profitAndLoss(ledger, currency, lastMonth.from, lastMonth.to);

  /* ---- income ---- */
  const incomeChange = pctChange(now.totalIncome.minor, before.totalIncome.minor);
  if (incomeChange !== null && Math.abs(incomeChange) >= 10 && before.totalIncome.minor > 0) {
    out.push({
      id: "income-change",
      title: `Income is ${incomeChange > 0 ? "up" : "down"} ${Math.abs(incomeChange)}% on last month`,
      because: [
        `${money(now.totalIncome)} so far in ${thisMonth.label}, against ${money(before.totalIncome)} in ${lastMonth.label}.`,
        incomeChange < 0 ? "Part of this may simply be that the month is not finished." : ""
      ].filter(Boolean),
      tone: incomeChange > 0 ? "good" : "watch",
      action: { label: "See the accounts", href: "/books/" },
      weight: Math.abs(incomeChange) * 2
    });
  }

  /* ---- margin ---- */
  if (now.totalIncome.minor > 0 && before.totalIncome.minor > 0) {
    const marginChange = Math.round((now.marginPct - before.marginPct) * 10) / 10;
    if (Math.abs(marginChange) >= 5) {
      out.push({
        id: "margin-change",
        title: `Your margin ${marginChange > 0 ? "improved" : "fell"} by ${Math.abs(marginChange)} points`,
        because: [
          `${now.marginPct}% of income kept this month, against ${before.marginPct}% last month.`,
          marginChange < 0 ? `Costs are ${money(now.totalExpenses)} on ${money(now.totalIncome)} of income.` : ""
        ].filter(Boolean),
        tone: marginChange > 0 ? "good" : "bad",
        action: { label: "See the accounts", href: "/books/" },
        weight: Math.abs(marginChange) * 6
      });
    }
  }

  /* ---- a cost that jumped ---- */
  for (const category of now.expenses) {
    const previous = before.expenses.find((e) => e.code === category.code);
    if (!previous || previous.balance.minor < 100000) continue;
    const change = pctChange(category.balance.minor, previous.balance.minor);
    if (change !== null && change >= 25) {
      out.push({
        id: `cost-${category.code}`,
        title: `${category.name} is up ${change}% this month`,
        because: [`${money(category.balance)} so far, against ${money(previous.balance)} last month.`],
        tone: "watch",
        action: { label: "See money out", href: "/expenses/" },
        weight: change + category.balance.minor / 100000
      });
    }
  }

  /* ---- customers who pay late ---- */
  const standing = customerStanding(documents, today, currency);
  const late = standing.filter((c) => c.habituallyLate);
  if (late.length) {
    out.push({
      id: "late-payers",
      title: `${late.length} customer${late.length === 1 ? " pays" : "s pay"} consistently late`,
      because: late.slice(0, 3).map((c) => `${c.name} pays about ${c.averageDaysLate} days after the due date, across ${c.settled} invoices.`),
      tone: "watch",
      action: { label: "See how customers pay", href: "/receivables/" },
      weight: 120
    });
  }

  /* ---- one customer carrying too much ---- */
  const owed = standing.filter((c) => c.outstanding.minor > 0);
  const totalOwed = owed.reduce((a, c) => a + c.outstanding.minor, 0);
  if (owed.length > 1 && totalOwed > 0) {
    const share = Math.round((owed[0].outstanding.minor / totalOwed) * 100);
    if (share >= 60) {
      out.push({
        id: "concentration",
        title: `${share}% of what you are owed sits with one customer`,
        because: [
          `${owed[0].name} owes ${money(owed[0].outstanding)} of ${money(fromMinor(totalOwed, currency))} outstanding.`,
          "If they pay late, so does everything you were planning to pay with it."
        ],
        tone: share >= 75 ? "bad" : "watch",
        action: { label: "See what you are owed", href: "/receivables/" },
        weight: share
      });
    }
  }

  /* ---- cash ---- */
  const f = forecast(documents, expenses, today, currency, 90, 0, opening);
  if (f.runwayDays !== null) {
    out.push({
      id: "runway",
      title: `Cash runs out in about ${f.runwayDays} days at this rate`,
      because: [
        `${money(f.openingCash)} now, spending about ${money(f.monthlyBurn)} a month.`,
        f.atRisk.minor > 0 ? `${money(f.atRisk)} of the money coming in is already overdue, so this is the optimistic case.` : ""
      ].filter(Boolean),
      tone: f.runwayDays < 30 ? "bad" : "watch",
      action: { label: "See cash", href: "/cash-flow/" },
      weight: 300 - f.runwayDays
    });
  }

  /* ---- money sitting uncollected ---- */
  const overdueTotal = standing.reduce((a, c) => a + c.overdue.minor, 0);
  if (overdueTotal > 0 && f.openingCash.minor > 0 && overdueTotal > f.openingCash.minor / 2) {
    out.push({
      id: "overdue-vs-cash",
      title: "The money you are owed is large next to the cash you hold",
      because: [
        `${money(fromMinor(overdueTotal, currency))} is overdue, against ${money(f.openingCash)} in the bank.`,
        "Collecting even part of it would change your position more than anything else you could do this week."
      ],
      tone: "watch",
      action: { label: "Chase it", href: "/receivables/" },
      weight: 180
    });
  }

  /* ---- things left undone ---- */
  const drafts = documents.filter((d) => d.status === "draft");
  if (drafts.length >= 2) {
    const value = drafts.reduce((a, d) => a + d.totalMinor, 0);
    out.push({
      id: "drafts",
      title: `${drafts.length} invoices are still drafts, worth ${money(fromMinor(value, currency))}`,
      because: ["Drafts are left out of your reports and out of what you are owed, so this money is invisible until they are sent."],
      tone: "watch",
      action: { label: "See them", href: "/documents/" },
      weight: 90
    });
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/** The morning summary, as sentences, from the same figures. */
export function dailyBrief(opts: Parameters<typeof insights>[0]): string[] {
  const { documents, expenses, profile, today, currency } = opts;
  const opening = openingOf(profile);
  const f = forecast(documents, expenses, today, currency, 30, 0, opening);
  const standing = customerStanding(documents, today, currency);
  const overdue = standing.reduce((a, c) => a + c.overdue.minor, 0);

  const [y, m] = today.split("-").map(Number);
  const ledger = ledgerFor(documents, expenses.filter((e) => !e.deletedAt).map((e) => ({
    id: e.id, date: e.date, supplier: e.supplier, category: e.category, currency: e.currency,
    netMinor: e.netMinor, taxMinor: e.taxMinor, paidFrom: e.paidFrom
  })), currency, opening);
  const thisMonth = monthPeriod(today);
  const lastMonth = monthPeriod(new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10));
  const now = profitAndLoss(ledger, currency, thisMonth.from, thisMonth.to);
  const before = profitAndLoss(ledger, currency, lastMonth.from, lastMonth.to);
  const change = pctChange(now.totalIncome.minor, before.totalIncome.minor);

  const lines: string[] = [];
  lines.push(change === null
    ? `You have invoiced ${money(now.totalIncome)} this month.`
    : `Income is ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on last month, at ${money(now.totalIncome)}.`);

  if (overdue > 0) {
    const worst = standing.filter((c) => c.overdue.minor > 0).sort((a, b) => b.overdue.minor - a.overdue.minor)[0];
    lines.push(`${money(fromMinor(overdue, currency))} is overdue, most of it from ${worst.name}.`);
  } else {
    lines.push("Nothing is overdue.");
  }

  lines.push(`You have ${money(f.openingCash)} in cash, with ${money(f.expectedIn)} expected in over the next month.`);
  if (f.runwayDays !== null) lines.push(`At this rate the balance goes below zero in ${f.runwayDays} days.`);

  return lines;
}
