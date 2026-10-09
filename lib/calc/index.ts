/**
 * Pure business arithmetic. No formatting, no rounding surprises: every function takes and returns
 * plain numbers so the results can be tested and reused wherever they are needed.
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ---------- margin and markup ---------- */

export interface MarginResult {
  profit: number;
  /** Profit as a share of the selling price. */
  marginPct: number;
  /** Profit as a share of the cost. */
  markupPct: number;
}

export function margin(revenue: number, cost: number): MarginResult {
  const profit = revenue - cost;
  return {
    profit: round2(profit),
    marginPct: revenue ? round2((profit / revenue) * 100) : 0,
    markupPct: cost ? round2((profit / cost) * 100) : 0
  };
}

/** The price that leaves you a given margin on the selling price. */
export function priceForMargin(cost: number, marginPct: number): number {
  if (marginPct >= 100) return Infinity;
  return round2(cost / (1 - marginPct / 100));
}

/** The price that adds a given markup on top of cost. */
export function priceForMarkup(cost: number, markupPct: number): number {
  return round2(cost * (1 + markupPct / 100));
}

export const marginToMarkup = (marginPct: number) => (marginPct >= 100 ? Infinity : round2((marginPct / (100 - marginPct)) * 100));
export const markupToMargin = (markupPct: number) => round2((markupPct / (100 + markupPct)) * 100);

/* ---------- break even ---------- */

export interface BreakEven {
  /** Money left from each sale after the costs that vary with it. */
  contributionPerUnit: number;
  contributionMarginPct: number;
  /** Units you must sell before you stop losing money. */
  units: number;
  revenue: number;
  /** How far current sales are above the break-even point, as a share. */
  marginOfSafetyPct?: number;
  /** Profit at the sales level given, if one was given. */
  profitAtVolume?: number;
  /** True when each sale loses money, so no volume ever breaks even. */
  impossible: boolean;
}

export function breakEven(fixedCosts: number, pricePerUnit: number, variableCostPerUnit: number, currentUnits?: number): BreakEven {
  const contribution = pricePerUnit - variableCostPerUnit;
  const impossible = contribution <= 0;
  const units = impossible ? Infinity : Math.ceil(fixedCosts / contribution);
  const result: BreakEven = {
    contributionPerUnit: round2(contribution),
    contributionMarginPct: pricePerUnit ? round2((contribution / pricePerUnit) * 100) : 0,
    units,
    revenue: impossible ? Infinity : round2(units * pricePerUnit),
    impossible
  };
  if (currentUnits && Number.isFinite(units)) {
    result.marginOfSafetyPct = currentUnits ? round2(((currentUnits - units) / currentUnits) * 100) : 0;
    result.profitAtVolume = round2(currentUnits * contribution - fixedCosts);
  }
  return result;
}

/* ---------- late payment interest ---------- */

export type LateFeeBasis = "annual" | "monthly";

export interface LateFee {
  daysLate: number;
  interest: number;
  total: number;
  /** Daily rate used, as a percentage, for showing the working. */
  dailyRatePct: number;
}

/**
 * Interest on an overdue invoice. Indian contracts usually quote a monthly rate such as 1.5%,
 * and many other places quote an annual one, so both are supported. Interest is simple, not
 * compounded, which is what a late payment clause normally means.
 */
export function lateFee(amount: number, dueDateIso: string, asOfIso: string, rate: number, basis: LateFeeBasis = "monthly", graceDays = 0): LateFee {
  const due = Date.parse(`${dueDateIso}T00:00:00Z`);
  const asOf = Date.parse(`${asOfIso}T00:00:00Z`);
  if (!Number.isFinite(due) || !Number.isFinite(asOf)) return { daysLate: 0, interest: 0, total: round2(amount), dailyRatePct: 0 };
  const rawDays = Math.floor((asOf - due) / 86_400_000);
  const daysLate = Math.max(0, rawDays - graceDays);
  const annualPct = basis === "monthly" ? rate * 12 : rate;
  const dailyRatePct = annualPct / 365;
  const interest = round2((amount * dailyRatePct * daysLate) / 100);
  return { daysLate, interest, total: round2(amount + interest), dailyRatePct: Math.round(dailyRatePct * 10000) / 10000 };
}

/* ---------- discount ---------- */

export function discount(listPrice: number, firstPct: number, secondPct = 0) {
  const afterFirst = listPrice * (1 - firstPct / 100);
  const final = afterFirst * (1 - secondPct / 100);
  return {
    final: round2(final),
    saved: round2(listPrice - final),
    effectivePct: listPrice ? round2(((listPrice - final) / listPrice) * 100) : 0
  };
}

/* ---------- hourly rate ---------- */

/**
 * What to charge an hour to take home what you want. Billable days are what freelancers get
 * wrong: holidays, admin and sales eat a third of the year before you start.
 */
export function hourlyRate(targetIncome: number, businessCosts: number, billableHoursPerWeek: number, workingWeeks: number) {
  const hours = billableHoursPerWeek * workingWeeks;
  const needed = targetIncome + businessCosts;
  return {
    billableHours: hours,
    rate: hours ? round2(needed / hours) : 0,
    dayRate: hours ? round2((needed / hours) * 8) : 0,
    /** What the same money looks like spread over every hour, billable or not. */
    effectiveOnAllHours: round2(needed / (40 * 52))
  };
}

/* ---------- tax on a price ---------- */

export interface TaxSplit {
  taxable: number;
  tax: number;
  gross: number;
  /** For India, the halves that appear on the invoice. */
  parts: Array<{ label: string; amount: number }>;
}

/**
 * Add tax to a price, or pull it back out of one that already includes it. Removing is where
 * people go wrong: taking 18 percent off an inclusive 1,180 gives 967.60, when the answer is 1,000.
 */
export function taxOnPrice(amount: number, ratePct: number, mode: "add" | "remove", split: "cgst-sgst" | "igst" | "none" = "none"): TaxSplit {
  const taxable = mode === "add" ? amount : amount / (1 + ratePct / 100);
  const tax = mode === "add" ? amount * (ratePct / 100) : amount - taxable;
  const parts = split === "cgst-sgst"
    ? [{ label: `CGST ${round2(ratePct / 2)}%`, amount: round2(tax / 2) }, { label: `SGST ${round2(ratePct / 2)}%`, amount: round2(tax - round2(tax / 2)) }]
    : split === "igst" ? [{ label: `IGST ${ratePct}%`, amount: round2(tax) }] : [];
  return { taxable: round2(taxable), tax: round2(tax), gross: round2(taxable + tax), parts };
}

/* ---------- invoice dates ---------- */

export type TermsBasis = "net" | "eom" | "on-receipt";

export interface DueDate {
  due: string;
  days: number;
  /** Plain description of what the terms mean. */
  explanation: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * When an invoice falls due. Net terms count days from the invoice date; end of month terms count
 * from the last day of the month the invoice falls in, which is why a 1st and a 28th behave so
 * differently under the same words.
 */
export function dueDate(invoiceDateIso: string, days: number, basis: TermsBasis = "net"): DueDate {
  const start = new Date(`${invoiceDateIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return { due: invoiceDateIso, days: 0, explanation: "Enter a valid invoice date." };
  if (basis === "on-receipt") return { due: invoiceDateIso, days: 0, explanation: "Payment is due as soon as the invoice is received." };

  const from = basis === "eom" ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)) : start;
  const due = new Date(from.getTime());
  due.setUTCDate(due.getUTCDate() + days);
  const total = Math.round((due.getTime() - start.getTime()) / 86_400_000);
  return {
    due: iso(due),
    days: total,
    explanation: basis === "eom"
      ? `${days} days from the end of the invoice month, which is ${total} days from the invoice date.`
      : `${days} days from the invoice date.`
  };
}
