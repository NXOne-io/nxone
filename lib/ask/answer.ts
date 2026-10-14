import { forecast } from "../analysis/cashflow";
import { payables } from "../analysis/payables";
import { chaseList, customerStanding } from "../analysis/receivables";
import { calendarFor, nextDeadline } from "../compliance/calendar";
import { formatDate } from "../format";
import { trialBalance } from "../ledger/journal";
import { openingOf } from "../ledger/opening";
import { ledgerFor } from "../ledger/posting";
import { profitAndLoss } from "../ledger/statements";
import { formatMoney, fromMinor, type Money } from "../money";
import { reportFor, financialYear, monthPeriod, quarterPeriod, type Period as ReportPeriod } from "../store/reports";
import type { Expense, Profile, SavedDocument } from "../store/types";
import { EXAMPLE_QUESTIONS, parseQuestion, type Intent, type Period } from "./intents";

/**
 * Answering from the ledger.
 *
 * Every figure here is calculated by the same engine that produces the reports, so an answer can
 * never disagree with the accounts. Each answer carries its working and where it came from, since
 * a number about your own money is worth nothing if you cannot check it.
 */

export interface Answer {
  /** The headline, in a sentence. */
  headline: string;
  /** The figure, where there is one. */
  value?: Money;
  /** Supporting lines, each already worked out. */
  detail: string[];
  /** Where in the app to see it for yourself. */
  source?: { label: string; href: string };
  /** What the question was understood to mean, so a wrong reading is obvious. */
  understood: string;
  /** Set when we could not answer, so the screen can offer help rather than a blank. */
  unanswered?: boolean;
}

export interface AskContext {
  documents: SavedDocument[];
  expenses: Expense[];
  profile?: Profile;
  today: string;
  currency: string;
}

const money = (v: Money) => formatMoney(v, "en-IN");

function rangeFor(period: Period, today: string): ReportPeriod {
  const [y, m] = today.split("-").map(Number);
  const shift = (months: number) => {
    const d = new Date(Date.UTC(y, m - 1 + months, 1));
    return monthPeriod(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`);
  };
  const back = (days: number) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return { from: d.toISOString().slice(0, 10), to: today, label: `the last ${days} days` };
  };

  switch (period.kind) {
    case "this-month": return shift(0);
    case "last-month": return shift(-1);
    case "this-quarter": return quarterPeriod(today);
    case "this-year": return financialYear(today);
    case "last-year": {
      const fy = financialYear(today);
      const previous = `${Number(fy.from.slice(0, 4)) - 1}-${fy.from.slice(5)}`;
      return financialYear(previous);
    }
    case "last-30": return back(30);
    case "last-90": return back(90);
    default: return { from: "1900-01-01", to: today, label: "all time" };
  }
}

export function ask(question: string, context: AskContext): Answer {
  const intent = parseQuestion(question);
  const { documents, expenses, today, currency, profile } = context;
  const range = rangeFor(intent.period, today);
  const opening = openingOf(profile);
  const ledger = ledgerFor(documents, expenses.filter((e) => !e.deletedAt).map((e) => ({
    id: e.id, date: e.date, supplier: e.supplier, category: e.category, currency: e.currency,
    netMinor: e.netMinor, taxMinor: e.taxMinor, paidFrom: e.paidFrom
  })), currency, opening);

  const understood = `${intent.name.replace(/-/g, " ")}, ${range.label}`;
  const pl = () => profitAndLoss(ledger, currency, range.from, range.to);

  switch (intent.name) {
    case "profit": {
      const p = pl();
      return {
        headline: p.netProfit.minor >= 0
          ? `You made ${money(p.netProfit)} in ${range.label}.`
          : `You lost ${money({ ...p.netProfit, minor: -p.netProfit.minor })} in ${range.label}.`,
        value: p.netProfit,
        detail: [
          `${money(p.totalIncome)} earned, ${money(p.totalExpenses)} spent.`,
          `That is ${p.marginPct}% of what you earned.`,
          "Tax you collected is not counted as income, because it is not yours."
        ],
        source: { label: "See the accounts", href: "/books/" },
        understood
      };
    }

    case "revenue": {
      const report = reportFor(documents, range, currency);
      return {
        headline: `You invoiced ${money(report.grossTotal)} in ${range.label}.`,
        value: report.grossTotal,
        detail: [
          `${money(report.taxableTotal)} before tax, across ${report.count} document${report.count === 1 ? "" : "s"}.`,
          report.outstanding.minor > 0 ? `${money(report.outstanding)} of it is still unpaid.` : "All of it has been paid."
        ],
        source: { label: "See the report", href: "/reports/" },
        understood
      };
    }

    case "expenses": {
      const p = pl();
      return {
        headline: `You spent ${money(p.totalExpenses)} in ${range.label}.`,
        value: p.totalExpenses,
        detail: p.expenses.slice(0, 4).map((e) => `${e.name}: ${money(e.balance)}`),
        source: { label: "See money out", href: "/expenses/" },
        understood
      };
    }

    case "biggest-expenses": {
      const p = pl();
      const top = [...p.expenses].sort((a, b) => b.balance.minor - a.balance.minor).slice(0, 5);
      if (!top.length) return { headline: `Nothing was spent in ${range.label}.`, detail: [], understood };
      const share = Math.round((top[0].balance.minor / Math.max(1, p.totalExpenses.minor)) * 100);
      return {
        headline: `${top[0].name} is your biggest cost in ${range.label}, at ${money(top[0].balance)}.`,
        value: top[0].balance,
        detail: [
          `That is ${share}% of everything you spent.`,
          ...top.slice(1).map((e) => `${e.name}: ${money(e.balance)}`)
        ],
        source: { label: "See money out", href: "/expenses/" },
        understood
      };
    }

    case "cash": {
      const f = forecast(documents, expenses, today, currency, 30, 0, opening);
      return {
        headline: `You have ${money(f.openingCash)} in cash today.`,
        value: f.openingCash,
        detail: [
          `${money(f.expectedIn)} is expected in over the next 30 days, ${money(f.expectedOut)} expected out.`,
          opening ? "" : "This counts only money that has passed through NXOne. Add your opening balance in your business details if it looks low."
        ].filter(Boolean),
        source: { label: "See cash", href: "/cash-flow/" },
        understood
      };
    }

    case "runway": {
      const f = forecast(documents, expenses, today, currency, 90, 0, opening);
      if (f.runwayDays === null) {
        return {
          headline: "Your cash does not run out within the next 90 days.",
          detail: [
            `You have ${money(f.openingCash)} now, and are spending about ${money(f.monthlyBurn)} a month.`,
            "That assumes every unpaid invoice arrives when it is due."
          ],
          source: { label: "See cash", href: "/cash-flow/" },
          understood
        };
      }
      return {
        headline: `At this rate, your cash runs out in ${f.runwayDays} days, around ${formatDate(f.points[f.runwayDays - 1].date, profile?.country ?? "IN")}.`,
        detail: [
          `You have ${money(f.openingCash)} now and spend about ${money(f.monthlyBurn)} a month.`,
          f.atRisk.minor > 0 ? `${money(f.atRisk)} of the money coming in is already overdue, so this is the optimistic case.` : ""
        ].filter(Boolean),
        source: { label: "See cash", href: "/cash-flow/" },
        understood
      };
    }

    case "owed":
    case "who-owes": {
      const standing = customerStanding(documents, today, currency).filter((c) => c.outstanding.minor > 0);
      const total = standing.reduce((a, c) => a + c.outstanding.minor, 0);
      if (!standing.length) return { headline: "Nobody owes you anything at the moment.", detail: [], source: { label: "See what you are owed", href: "/receivables/" }, understood };
      return {
        headline: intent.name === "who-owes"
          ? `${standing[0].name} owes you the most, at ${money(standing[0].outstanding)}.`
          : `You are owed ${money(fromMinor(total, currency))} in total.`,
        value: intent.name === "who-owes" ? standing[0].outstanding : fromMinor(total, currency),
        detail: standing.slice(0, 5).map((c) => `${c.name}: ${money(c.outstanding)}${c.overdue.minor > 0 ? `, ${money(c.overdue)} of it overdue` : ""}`),
        source: { label: "See what you are owed", href: "/receivables/" },
        understood
      };
    }

    case "overdue": {
      const late = chaseList(documents, today, currency, 100).filter((c) => c.daysLate > 0);
      const total = late.reduce((a, c) => a + c.owed.minor, 0);
      if (!late.length) return { headline: "Nothing is overdue.", detail: ["Every invoice is either paid or not yet due."], source: { label: "See what you are owed", href: "/receivables/" }, understood };
      return {
        headline: `${money(fromMinor(total, currency))} is overdue, across ${late.length} invoice${late.length === 1 ? "" : "s"}.`,
        value: fromMinor(total, currency),
        detail: late.slice(0, 4).map((c) => `${c.doc.clientName}, ${c.doc.number}: ${money(c.owed)}, ${c.daysLate} days late`),
        source: { label: "Chase them", href: "/receivables/" },
        understood
      };
    }

    case "late-payers": {
      const standing = customerStanding(documents, today, currency).filter((c) => c.habituallyLate);
      if (!standing.length) {
        return { headline: "Nobody is consistently late, from what we can see.", detail: ["This needs at least two paid invoices per customer before it means anything."], source: { label: "See how customers pay", href: "/receivables/" }, understood };
      }
      return {
        headline: `${standing.length} customer${standing.length === 1 ? " is" : "s are"} consistently late.`,
        detail: standing.map((c) => `${c.name} pays about ${c.averageDaysLate} days after the due date, across ${c.settled} invoices.`),
        source: { label: "See how customers pay", href: "/receivables/" },
        understood
      };
    }

    case "owe-suppliers": {
      const f = forecast(documents, expenses, today, currency, 1, 0, opening);
      const view = payables(expenses, today, currency, f.openingCash.minor);
      if (view.total.minor === 0) return { headline: "You have no unpaid bills recorded.", detail: [], source: { label: "See what you owe", href: "/payables/" }, understood };
      return {
        headline: `You owe ${money(view.total)} to suppliers.`,
        value: view.total,
        detail: [
          ...view.bySupplier.slice(0, 4).map((s) => `${s.supplier}: ${money(s.owed)}`),
          view.shortfall.minor > 0 ? `Paying everything today would leave you ${money(view.shortfall)} short.` : "Your cash covers all of it."
        ],
        source: { label: "See what you owe", href: "/payables/" },
        understood
      };
    }

    case "tax": {
      const report = reportFor(documents, range, currency);
      return {
        headline: `You collected ${money(report.taxTotal)} of tax on sales in ${range.label}.`,
        value: report.taxTotal,
        detail: [
          ...report.byRate.map((r) => `${r.label}: ${money(r.tax)} on ${money(r.taxable)} of sales`),
          "Tax you paid on purchases may be reclaimable against this. Check with your accountant before filing."
        ],
        source: { label: "See the report", href: "/reports/" },
        understood
      };
    }

    case "filings": {
      const calendar = calendarFor({
        country: profile?.country ?? "IN",
        registrations: profile?.registrations ?? [],
        today,
        quarterlyGst: profile?.quarterlyGst
      });
      const next = nextDeadline(calendar);
      const overdue = calendar.filter((d) => d.state === "overdue");
      if (!next && !overdue.length) {
        return { headline: "No filings are set up.", detail: ["Tell us what you are registered for and the dates appear."], source: { label: "Filing calendar", href: "/compliance/" }, understood };
      }
      return {
        headline: next
          ? `${next.rule.name} for ${next.period} is due on ${formatDate(next.dueDate, profile?.country ?? "IN")}, in ${next.daysAway} days.`
          : `${overdue.length} filing${overdue.length === 1 ? " is" : "s are"} overdue.`,
        detail: [
          ...overdue.slice(0, 3).map((d) => `${d.rule.name} for ${d.period} was due ${-d.daysAway} days ago.`),
          next ? next.rule.plain : ""
        ].filter(Boolean),
        source: { label: "Filing calendar", href: "/compliance/" },
        understood
      };
    }

    case "best-customers": {
      const report = reportFor(documents, range, currency);
      if (!report.byClient.length) return { headline: `Nothing was invoiced in ${range.label}.`, detail: [], understood };
      const total = report.byClient.reduce((a, c) => a + c.invoiced.minor, 0);
      const share = Math.round((report.byClient[0].invoiced.minor / Math.max(1, total)) * 100);
      return {
        headline: `${report.byClient[0].name} is your biggest customer in ${range.label}, at ${money(report.byClient[0].invoiced)}.`,
        value: report.byClient[0].invoiced,
        detail: [
          `That is ${share}% of everything you invoiced.`,
          share > 50 ? "More than half your income comes from one customer, which is worth knowing before planning around it." : "",
          ...report.byClient.slice(1, 4).map((c) => `${c.name}: ${money(c.invoiced)}`)
        ].filter(Boolean),
        source: { label: "See the report", href: "/reports/" },
        understood
      };
    }

    case "compare": {
      const current = rangeFor({ kind: "this-month", label: "this month" }, today);
      const [y, m] = today.split("-").map(Number);
      const prior = monthPeriod(new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10));
      const now = profitAndLoss(ledger, currency, current.from, current.to);
      const before = profitAndLoss(ledger, currency, prior.from, prior.to);
      const change = (a: Money, b: Money) => (b.minor === 0 ? null : Math.round(((a.minor - b.minor) / Math.abs(b.minor)) * 100));
      const incomeChange = change(now.totalIncome, before.totalIncome);
      const spendChange = change(now.totalExpenses, before.totalExpenses);

      return {
        headline: incomeChange === null
          ? `You earned ${money(now.totalIncome)} this month. There is nothing from ${prior.label} to compare it with.`
          : `Income is ${incomeChange >= 0 ? "up" : "down"} ${Math.abs(incomeChange)}% on ${prior.label}.`,
        value: now.totalIncome,
        detail: [
          `${money(now.totalIncome)} this month against ${money(before.totalIncome)} in ${prior.label}.`,
          spendChange === null ? `You spent ${money(now.totalExpenses)}.` : `Spending is ${spendChange >= 0 ? "up" : "down"} ${Math.abs(spendChange)}%, at ${money(now.totalExpenses)}.`,
          `Profit ${now.netProfit.minor >= before.netProfit.minor ? "improved to" : "fell to"} ${money(now.netProfit)}.`
        ],
        source: { label: "See the accounts", href: "/books/" },
        understood: "this month compared with last month"
      };
    }

    case "afford": {
      const f = forecast(documents, expenses, today, currency, 90, 0, opening);
      const monthlyCostMinor = (intent.amount ?? 0) * 100;
      if (!monthlyCostMinor) {
        return {
          headline: "Tell me the monthly cost and I can work it out.",
          detail: [`For example: can we afford to hire someone at 60,000 a month?`, `You have ${money(f.openingCash)} in cash and spend about ${money(f.monthlyBurn)} a month.`],
          source: { label: "See cash", href: "/cash-flow/" },
          understood: "whether you can afford something"
        };
      }

      const withExtra = f.openingCash.minor + f.expectedIn.minor - f.expectedOut.minor - monthlyCostMinor * 3;
      const monthsCovered = monthlyCostMinor > 0 ? Math.floor(f.openingCash.minor / monthlyCostMinor) : 0;
      return {
        headline: withExtra > 0
          ? `Probably. Adding ${money(fromMinor(monthlyCostMinor, currency))} a month still leaves you in credit over the next three months.`
          : `It would be tight. Adding ${money(fromMinor(monthlyCostMinor, currency))} a month puts you ${money(fromMinor(-withExtra, currency))} short within three months.`,
        value: fromMinor(withExtra, currency),
        detail: [
          `Cash today is ${money(f.openingCash)}, which alone covers ${monthsCovered} month${monthsCovered === 1 ? "" : "s"} of that cost.`,
          `Expected in over 90 days: ${money(f.expectedIn)}. Expected out: ${money(f.expectedOut)}.`,
          f.atRisk.minor > 0 ? `${money(f.atRisk)} of the money coming in is already overdue, so treat this as the optimistic case.` : "",
          "This is arithmetic on your own figures, not advice."
        ].filter(Boolean),
        source: { label: "See cash", href: "/cash-flow/" },
        understood: `whether you can afford ${money(fromMinor(monthlyCostMinor, currency))} a month`
      };
    }

    default: {
      const balanced = trialBalance(ledger, currency).balanced;
      return {
        headline: "I did not understand that one.",
        detail: [
          "I answer from your own books rather than guessing, so I would rather say so than make something up.",
          ...EXAMPLE_QUESTIONS.slice(0, 4).map((q) => `Try: ${q}`),
          balanced ? "" : "Separately, your books are out of balance, which should not happen. That is worth reporting."
        ].filter(Boolean),
        understood: "nothing I recognised",
        unanswered: true
      };
    }
  }
}
