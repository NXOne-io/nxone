import { forecast } from "./cashflow";
import { chaseList } from "./receivables";
import { calendarFor, nextDeadline, type Deadline } from "../compliance/calendar";
import type { Registration } from "../compliance/rules";
import { fromMinor, type Money } from "../money";
import type { Expense, SavedDocument } from "../store/types";

/**
 * One screen that answers what needs doing.
 *
 * The rule here is that nothing appears unless there is something to do about it. A row saying
 * everything is fine teaches people to stop reading, so a quiet day shows a short screen.
 */

export interface TodayItem {
  id: string;
  kind: "collect" | "pay" | "compliance" | "cash" | "tidy";
  title: string;
  detail: string;
  amount?: Money;
  /** Where to go to deal with it. */
  href?: string;
  action?: string;
  urgency: "now" | "soon" | "watch";
}

export interface Today {
  cashNow: Money;
  owedToYou: Money;
  overdue: Money;
  youOwe: Money;
  nextDeadline: Deadline | null;
  items: TodayItem[];
}

export function todayView(opts: {
  documents: SavedDocument[];
  expenses: Expense[];
  today: string;
  currency: string;
  country: string;
  registrations: Registration[];
  quarterlyGst?: boolean;
  businessName?: string;
}): Today {
  const { documents, expenses, today, currency, country, registrations, quarterlyGst } = opts;

  const f = forecast(documents, expenses, today, currency, 30);
  const chase = chaseList(documents, today, currency, 3);
  const calendar = calendarFor({ country, registrations, today, backDays: 30, aheadDays: 45, quarterlyGst });
  const unpaidBills = expenses.filter((e) => !e.paidFrom && !e.deletedAt && e.currency === currency);

  const owed = documents
    .filter((d) => (d.kind === "invoice" || d.kind === "proforma") && d.currency === currency && d.status !== "draft" && d.status !== "cancelled" && d.status !== "paid")
    .reduce((a, d) => a + Math.max(0, d.totalMinor - d.paidMinor), 0);
  const overdue = chaseList(documents, today, currency, 500).filter((c) => c.daysLate > 0).reduce((a, c) => a + c.owed.minor, 0);
  const youOwe = unpaidBills.reduce((a, e) => a + e.netMinor + e.taxMinor, 0);

  const items: TodayItem[] = [];

  for (const c of chase.filter((x) => x.daysLate > 0)) {
    items.push({
      id: `chase-${c.doc.id}`,
      kind: "collect",
      title: `${c.doc.clientName} owes you`,
      detail: `${c.doc.number}, ${c.daysLate} days past the due date`,
      amount: c.owed,
      href: "/receivables/",
      action: "Send a reminder",
      urgency: c.daysLate > 30 ? "now" : "soon"
    });
  }

  if (unpaidBills.length) {
    items.push({
      id: "bills",
      kind: "pay",
      title: `${unpaidBills.length} bill${unpaidBills.length === 1 ? "" : "s"} not yet paid`,
      detail: unpaidBills.slice(0, 3).map((e) => e.supplier).join(", "),
      amount: fromMinor(youOwe, currency),
      href: "/expenses/",
      action: "Look at them",
      urgency: "soon"
    });
  }

  for (const d of calendar.filter((x) => x.state !== "upcoming").slice(0, 3)) {
    items.push({
      id: `due-${d.id}`,
      kind: "compliance",
      title: d.state === "overdue" ? `${d.rule.name} was due` : `${d.rule.name} is due`,
      detail: `${d.rule.plain}, for ${d.period}. ${d.state === "overdue" ? `${-d.daysAway} days ago` : `in ${d.daysAway} days`}`,
      href: "/compliance/",
      action: "See the calendar",
      urgency: d.state === "overdue" ? "now" : d.daysAway <= 5 ? "now" : "soon"
    });
  }

  if (f.runwayDays !== null && f.runwayDays <= 60) {
    items.push({
      id: "runway",
      kind: "cash",
      title: "Cash runs out before the end of the window",
      detail: `At the current rate, the balance goes below zero in ${f.runwayDays} days, assuming every unpaid invoice arrives on time`,
      href: "/cash-flow/",
      action: "See the forecast",
      urgency: f.runwayDays <= 21 ? "now" : "soon"
    });
  }

  const drafts = documents.filter((d) => d.status === "draft");
  if (drafts.length) {
    items.push({
      id: "drafts",
      kind: "tidy",
      title: `${drafts.length} document${drafts.length === 1 ? "" : "s"} still a draft`,
      detail: "Drafts are left out of your reports and the money you are owed",
      href: "/documents/",
      action: "Finish them",
      urgency: "watch"
    });
  }

  const withoutDue = documents.filter((d) => d.kind === "invoice" && !d.dueDate && d.status !== "paid" && d.status !== "cancelled");
  if (withoutDue.length) {
    items.push({
      id: "no-due-date",
      kind: "tidy",
      title: `${withoutDue.length} invoice${withoutDue.length === 1 ? "" : "s"} without a due date`,
      detail: "Without one they never show as overdue, so they are easy to forget",
      href: "/documents/",
      action: "Add dates",
      urgency: "watch"
    });
  }

  const order = { now: 0, soon: 1, watch: 2 };
  items.sort((a, b) => order[a.urgency] - order[b.urgency] || (b.amount?.minor ?? 0) - (a.amount?.minor ?? 0));

  return {
    cashNow: f.openingCash,
    owedToYou: fromMinor(owed, currency),
    overdue: fromMinor(overdue, currency),
    youOwe: fromMinor(youOwe, currency),
    nextDeadline: nextDeadline(calendar) ?? null,
    items
  };
}
