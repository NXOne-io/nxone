import { fromMinor, type Money } from "../money";
import type { SavedDocument } from "../store/types";

/**
 * Who owes you, how late they are, and who to chase first.
 *
 * The useful question is not "what is outstanding" but "who should I ring today", so the ordering
 * weighs size against lateness rather than sorting by one of them.
 */

export interface AgingBuckets {
  current: Money;
  days1to30: Money;
  days31to60: Money;
  days61to90: Money;
  over90: Money;
  total: Money;
}

export interface CustomerStanding {
  name: string;
  outstanding: Money;
  overdue: Money;
  invoices: number;
  oldestDays: number;
  /** Average days between the due date and payment, across settled invoices. Negative means early. */
  averageDaysLate: number | null;
  /** How many invoices this customer has actually paid, so the average means something. */
  settled: number;
  /** A customer who is consistently late, which is worth knowing before extending more credit. */
  habituallyLate: boolean;
}

export interface ChaseItem {
  doc: SavedDocument;
  daysLate: number;
  owed: Money;
  /** Bigger and later rises to the top. */
  priority: number;
  reason: string;
}

const daysBetween = (from: string, to: string) =>
  Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

const isBill = (d: SavedDocument) => d.kind === "invoice" || d.kind === "proforma";
const owedOn = (d: SavedDocument) => Math.max(0, d.totalMinor - d.paidMinor);

export function unpaidBills(documents: SavedDocument[], currency: string): SavedDocument[] {
  return documents.filter((d) => isBill(d) && d.currency === currency && d.status !== "draft" && d.status !== "cancelled" && d.status !== "paid" && owedOn(d) > 0);
}

export function aging(documents: SavedDocument[], today: string, currency: string): AgingBuckets {
  const buckets = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };

  for (const d of unpaidBills(documents, currency)) {
    const late = d.dueDate ? daysBetween(d.dueDate, today) : 0;
    const owed = owedOn(d);
    if (late <= 0) buckets.current += owed;
    else if (late <= 30) buckets.days1to30 += owed;
    else if (late <= 60) buckets.days31to60 += owed;
    else if (late <= 90) buckets.days61to90 += owed;
    else buckets.over90 += owed;
  }

  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  return {
    current: fromMinor(buckets.current, currency),
    days1to30: fromMinor(buckets.days1to30, currency),
    days31to60: fromMinor(buckets.days31to60, currency),
    days61to90: fromMinor(buckets.days61to90, currency),
    over90: fromMinor(buckets.over90, currency),
    total: fromMinor(total, currency)
  };
}

/** How each customer actually behaves, which is more useful than what they promised. */
export function customerStanding(documents: SavedDocument[], today: string, currency: string): CustomerStanding[] {
  const map = new Map<string, { outstanding: number; overdue: number; invoices: number; oldest: number; lateDays: number[] }>();

  for (const d of documents.filter((x) => isBill(x) && x.currency === currency && x.status !== "draft" && x.status !== "cancelled")) {
    const entry = map.get(d.clientName) ?? { outstanding: 0, overdue: 0, invoices: 0, oldest: 0, lateDays: [] };

    if (d.status === "paid") {
      // the day it was marked paid is the best evidence we have of when the money arrived
      if (d.dueDate) entry.lateDays.push(daysBetween(d.dueDate, d.updatedAt.slice(0, 10)));
    } else {
      const owed = owedOn(d);
      if (owed > 0) {
        entry.outstanding += owed;
        entry.invoices += 1;
        const late = d.dueDate ? daysBetween(d.dueDate, today) : 0;
        if (late > 0) { entry.overdue += owed; entry.oldest = Math.max(entry.oldest, late); }
      }
    }
    map.set(d.clientName, entry);
  }

  return [...map.entries()]
    .map(([name, v]) => {
      const average = v.lateDays.length ? Math.round(v.lateDays.reduce((a, b) => a + b, 0) / v.lateDays.length) : null;
      return {
        name,
        outstanding: fromMinor(v.outstanding, currency),
        overdue: fromMinor(v.overdue, currency),
        invoices: v.invoices,
        oldestDays: v.oldest,
        averageDaysLate: average,
        settled: v.lateDays.length,
        habituallyLate: v.lateDays.length >= 2 && average !== null && average > 7
      };
    })
    .filter((c) => c.outstanding.minor > 0 || c.settled > 0)
    .sort((a, b) => b.outstanding.minor - a.outstanding.minor);
}

/**
 * Who to chase today. Priority rises with the amount and with lateness, so a large invoice a week
 * late outranks a small one a month late, which is how people actually decide.
 */
export function chaseList(documents: SavedDocument[], today: string, currency: string, limit = 10): ChaseItem[] {
  return unpaidBills(documents, currency)
    .map((doc) => {
      const daysLate = doc.dueDate ? daysBetween(doc.dueDate, today) : 0;
      const owed = owedOn(doc);
      const priority = daysLate > 0 ? (owed / 100) * Math.log10(daysLate + 10) : 0;
      const reason = daysLate > 60 ? "Very overdue" : daysLate > 0 ? `${daysLate} days late` : daysLate === 0 ? "Due today" : `Due in ${-daysLate} days`;
      return { doc, daysLate, owed: fromMinor(owed, currency), priority, reason };
    })
    .filter((item) => item.daysLate >= -3)
    .sort((a, b) => b.priority - a.priority || b.daysLate - a.daysLate)
    .slice(0, limit);
}

export type ReminderTone = "gentle" | "firm" | "final";

/**
 * A reminder the person can actually send. Written to be short, specific and not apologetic,
 * because long polite emails about money get skimmed and filed.
 */
export function reminderText(opts: {
  tone: ReminderTone;
  businessName: string;
  customerName: string;
  number: string;
  amount: string;
  dueDate: string;
  daysLate: number;
  paymentLine?: string;
}): { subject: string; body: string } {
  const { tone, businessName, customerName, number, amount, dueDate, daysLate, paymentLine } = opts;
  const who = customerName.split(/[\s,]+/)[0] || "there";

  if (tone === "gentle") {
    return {
      subject: `Invoice ${number} from ${businessName}`,
      body: [
        `Hello ${who},`,
        "",
        `A quick note that invoice ${number} for ${amount} was due on ${dueDate}.`,
        daysLate > 0 ? "It may well be in your payment run already, in which case please ignore this." : "",
        paymentLine ? `` : "",
        paymentLine ?? "",
        "",
        "Happy to resend the invoice if it would help.",
        "",
        `Thank you,`,
        businessName
      ].filter((l) => l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n")
    };
  }

  if (tone === "firm") {
    return {
      subject: `Overdue: invoice ${number} for ${amount}`,
      body: [
        `Hello ${who},`,
        "",
        `Invoice ${number} for ${amount} was due on ${dueDate} and is now ${daysLate} days overdue.`,
        "",
        "Could you let me know when it will be paid, or who I should speak to in accounts?",
        paymentLine ?? "",
        "",
        `Thank you,`,
        businessName
      ].join("\n").replace(/\n{3,}/g, "\n\n")
    };
  }

  return {
    subject: `Invoice ${number}: ${daysLate} days overdue`,
    body: [
      `Hello ${who},`,
      "",
      `Invoice ${number} for ${amount} was due on ${dueDate}, which is now ${daysLate} days ago. I have not had a reply to my earlier messages.`,
      "",
      "Please let me know by return when payment will be made. If there is a problem with the invoice, tell me what it is and I will sort it out.",
      paymentLine ?? "",
      "",
      `Thank you,`,
      businessName
    ].join("\n").replace(/\n{3,}/g, "\n\n")
  };
}

/** Opens WhatsApp with the message ready, which is how most Indian businesses actually chase. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export const mailtoLink = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
