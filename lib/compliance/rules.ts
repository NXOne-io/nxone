/**
 * Filing deadlines, as data rather than code.
 *
 * Same discipline as the tax rules: every obligation carries where it came from, the dates it
 * applies between and how far it has been verified. Deadlines move, exemptions apply, and a
 * calendar that silently goes stale is worse than no calendar, so each one is shown with its
 * source and a reminder to check it.
 */

export type Frequency = "monthly" | "quarterly" | "half-yearly" | "yearly";

/** What a business has to be signed up to before an obligation applies to it. */
export type Registration = "gst" | "vat" | "tds" | "payroll" | "income-tax" | "none";

export interface ObligationRule {
  id: string;
  jurisdiction: string;
  name: string;
  /** Said plainly, for someone who does not already know what the form is. */
  plain: string;
  frequency: Frequency;
  /** Day of the month it is due, counted from the end of the period it covers. */
  dueDay: number;
  /** Months after the period ends. 1 means the month after. */
  monthsAfterPeriod: number;
  requires: Registration;
  /** Only applies above or below a turnover, where that matters. */
  appliesWhen?: string;
  source: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  status: "verified" | "published" | "draft";
  /** For a yearly obligation, the month the period ends in. */
  periodEndMonth?: number;
}

export const OBLIGATIONS: ObligationRule[] = [
  /* ---------- India ---------- */
  {
    id: "in-gstr1-monthly", jurisdiction: "IN", name: "GSTR-1",
    plain: "The details of everything you sold last month",
    frequency: "monthly", dueDay: 11, monthsAfterPeriod: 1, requires: "gst",
    appliesWhen: "Monthly filers, generally above the QRMP turnover limit",
    source: "GST portal, return filing dates", effectiveFrom: "2021-01-01", status: "published"
  },
  {
    id: "in-gstr3b-monthly", jurisdiction: "IN", name: "GSTR-3B",
    plain: "The summary return, and the month's tax payment",
    frequency: "monthly", dueDay: 20, monthsAfterPeriod: 1, requires: "gst",
    appliesWhen: "Monthly filers",
    source: "GST portal, return filing dates", effectiveFrom: "2021-01-01", status: "published"
  },
  {
    id: "in-gstr1-quarterly", jurisdiction: "IN", name: "GSTR-1 (QRMP)",
    plain: "Quarterly sales details, for smaller businesses on the QRMP scheme",
    frequency: "quarterly", dueDay: 13, monthsAfterPeriod: 1, requires: "gst",
    appliesWhen: "QRMP scheme, broadly turnover up to five crore",
    source: "GST portal, QRMP scheme", effectiveFrom: "2021-01-01", status: "published"
  },
  {
    id: "in-gstr3b-quarterly", jurisdiction: "IN", name: "GSTR-3B (QRMP)",
    plain: "Quarterly summary return and payment",
    frequency: "quarterly", dueDay: 22, monthsAfterPeriod: 1, requires: "gst",
    appliesWhen: "QRMP scheme. The date is 22nd or 24th depending on your state",
    source: "GST portal, QRMP scheme", effectiveFrom: "2021-01-01", status: "published"
  },
  {
    id: "in-tds-payment", jurisdiction: "IN", name: "TDS payment",
    plain: "Paying over the tax you deducted from suppliers or salaries",
    frequency: "monthly", dueDay: 7, monthsAfterPeriod: 1, requires: "tds",
    appliesWhen: "March has its own later date",
    source: "Income Tax Department, TDS due dates", effectiveFrom: "2020-04-01", status: "published"
  },
  {
    id: "in-tds-return", jurisdiction: "IN", name: "TDS return",
    plain: "The quarterly statement of tax deducted",
    frequency: "quarterly", dueDay: 31, monthsAfterPeriod: 1, requires: "tds",
    source: "Income Tax Department, TDS due dates", effectiveFrom: "2020-04-01", status: "published"
  },
  {
    id: "in-pf-esi", jurisdiction: "IN", name: "PF and ESI",
    plain: "Provident fund and employee insurance for last month's payroll",
    frequency: "monthly", dueDay: 15, monthsAfterPeriod: 1, requires: "payroll",
    source: "EPFO and ESIC", effectiveFrom: "2020-04-01", status: "published"
  },
  {
    id: "in-gstr9", jurisdiction: "IN", name: "GSTR-9",
    plain: "The annual GST return",
    frequency: "yearly", dueDay: 31, monthsAfterPeriod: 9, requires: "gst", periodEndMonth: 3,
    appliesWhen: "Generally required above the prescribed turnover",
    source: "GST portal, annual return", effectiveFrom: "2021-04-01", status: "published"
  },

  /* ---------- United Kingdom ---------- */
  {
    id: "gb-vat-return", jurisdiction: "GB", name: "VAT return",
    plain: "Your quarterly VAT return and payment",
    frequency: "quarterly", dueDay: 7, monthsAfterPeriod: 2, requires: "vat",
    appliesWhen: "One calendar month and seven days after the period ends",
    source: "HMRC, VAT return deadlines", effectiveFrom: "2019-04-01", status: "published"
  },

  /* ---------- United Arab Emirates ---------- */
  {
    id: "ae-vat-return", jurisdiction: "AE", name: "VAT return",
    plain: "Your VAT return and payment",
    frequency: "quarterly", dueDay: 28, monthsAfterPeriod: 1, requires: "vat",
    source: "Federal Tax Authority", effectiveFrom: "2018-01-01", status: "published"
  },

  /* ---------- Singapore ---------- */
  {
    id: "sg-gst-return", jurisdiction: "SG", name: "GST return",
    plain: "Your quarterly GST return and payment",
    frequency: "quarterly", dueDay: 30, monthsAfterPeriod: 1, requires: "gst",
    source: "IRAS, filing due dates", effectiveFrom: "2019-01-01", status: "published"
  },

  /* ---------- Australia ---------- */
  {
    id: "au-bas", jurisdiction: "AU", name: "Business activity statement",
    plain: "Your quarterly BAS and GST payment",
    frequency: "quarterly", dueDay: 28, monthsAfterPeriod: 1, requires: "gst",
    source: "Australian Taxation Office, BAS due dates", effectiveFrom: "2019-01-01", status: "published"
  }
];

export const obligationsFor = (country: string, isoDate: string) =>
  OBLIGATIONS.filter((o) => o.jurisdiction === country.toUpperCase()
    && o.effectiveFrom <= isoDate && (!o.effectiveUntil || o.effectiveUntil > isoDate));
