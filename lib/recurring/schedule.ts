import { addDays } from "../format";
import type { DocumentData } from "../documents/types";

/**
 * Invoices that repeat.
 *
 * The awkward parts are month ends and skipped runs. A retainer billed on the 31st should go out
 * on the 28th in February rather than slipping into March, and a laptop that was closed for three
 * weeks should not quietly produce three invoices nobody looked at. Both are handled here, and the
 * person always sees a draft before anything is sent.
 */

export type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";

export interface RecurringTemplate {
  id: string;
  /** What it is, in the owner's words: "Globex retainer". */
  name: string;
  frequency: Frequency;
  /** The day of the month to bill on, for monthly and longer. Clamped to short months. */
  dayOfMonth?: number;
  startDate: string;
  /** Stops after this date, if set. */
  endDate?: string;
  /** Stops after this many invoices, if set. */
  maxOccurrences?: number;
  occurrences: number;
  /** The date the next invoice is for. */
  nextDate: string;
  /** Days between the invoice date and its due date. */
  dueInDays: number;
  paused: boolean;
  /** Everything needed to make the invoice, minus the number and the dates. */
  document: DocumentData;
  lastGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  deletedAt?: string;
  syncedAt?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOf = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * The next date after this one. Monthly and longer keep to the chosen day of the month, clamping
 * where the month is too short, so the 31st becomes the 28th in February and then returns to the
 * 31st in March rather than drifting earlier for ever.
 */
export function nextDateAfter(date: string, frequency: Frequency, dayOfMonth?: number): string {
  if (frequency === "weekly") return addDays(date, 7);
  if (frequency === "fortnightly") return addDays(date, 14);

  const [y, m] = date.split("-").map(Number);
  const step = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const target = new Date(Date.UTC(y, m - 1 + step, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth() + 1;
  const wanted = dayOfMonth ?? Number(date.split("-")[2]);
  return `${year}-${pad(month)}-${pad(Math.min(wanted, lastDayOf(year, month)))}`;
}

export const isFinished = (t: RecurringTemplate): boolean =>
  Boolean((t.endDate && t.nextDate > t.endDate) || (t.maxOccurrences && t.occurrences >= t.maxOccurrences));

/** Templates with an invoice waiting to be made today. */
export function due(templates: RecurringTemplate[], today: string): RecurringTemplate[] {
  return templates
    .filter((t) => !t.paused && !t.deletedAt && !isFinished(t) && t.nextDate <= today)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

/**
 * How many runs were missed, and when the next one is. Rather than making an invoice for every
 * missed period, which produces a surprise pile of backdated bills, we make the one that is due
 * and report how many were skipped so the person can decide.
 */
export function catchUp(template: RecurringTemplate, today: string): { skipped: number; nextDate: string } {
  let cursor = template.nextDate;
  let skipped = 0;
  while (cursor <= today) {
    const next = nextDateAfter(cursor, template.frequency, template.dayOfMonth);
    if (next > today) return { skipped, nextDate: next };
    cursor = next;
    skipped += 1;
  }
  return { skipped, nextDate: cursor };
}

export interface GeneratedInvoice {
  document: DocumentData;
  /** The template as it should be stored after this run. */
  template: RecurringTemplate;
  skipped: number;
}

/**
 * Builds the invoice. It arrives as a draft with today's numbering and dates, never sent on its
 * own: an invoice going out without anyone reading it is how a wrong amount reaches a customer.
 */
export function generate(template: RecurringTemplate, number: string, today: string): GeneratedInvoice {
  const issueDate = template.nextDate <= today ? template.nextDate : today;
  const { skipped, nextDate } = catchUp(template, today);

  return {
    document: {
      ...template.document,
      kind: "invoice",
      number,
      issueDate,
      dueDate: addDays(issueDate, template.dueInDays),
      amountPaid: undefined
    },
    template: {
      ...template,
      nextDate,
      occurrences: template.occurrences + 1,
      lastGeneratedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: (template.version ?? 1) + 1
    },
    skipped
  };
}

/** A plain description, for the list: "Monthly on the 1st, next on 1 November". */
export function describe(t: RecurringTemplate): string {
  const day = t.dayOfMonth ?? Number(t.startDate.split("-")[2]);
  const ordinal = `${day}${["th", "st", "nd", "rd"][(day % 100 >> 3) ^ 1 && day % 10 > 3 ? 0 : day % 10] ?? "th"}`;
  const how = t.frequency === "weekly" ? "Every week"
    : t.frequency === "fortnightly" ? "Every two weeks"
    : t.frequency === "monthly" ? `Monthly on the ${ordinal}`
    : t.frequency === "quarterly" ? `Every three months on the ${ordinal}`
    : `Yearly on the ${ordinal}`;
  if (t.paused) return `${how}, paused`;
  if (isFinished(t)) return `${how}, finished`;
  return how;
}
