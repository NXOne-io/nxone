import { calculate } from "../documents/totals";
import { fromMinor, type Money } from "../money";
import type { SavedDocument } from "./types";

/**
 * Period summaries over your saved documents: what you invoiced, what tax you charged and who it
 * came from. Figures are recalculated from each document rather than trusted from the row, so a
 * document edited after it was saved still reports correctly.
 */

export type PeriodKind = "month" | "quarter" | "financial-year" | "custom";

export interface Period { from: string; to: string; label: string }

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Indian financial years run April to March, which is what most of our users file against. */
export function financialYear(iso: string, startMonth = 4): Period {
  const [y, m] = iso.split("-").map(Number);
  const startYear = m >= startMonth ? y : y - 1;
  return {
    from: `${startYear}-${pad(startMonth)}-01`,
    to: `${startYear + 1}-${pad(startMonth - 1 || 12)}-${startMonth === 1 ? "31" : new Date(Date.UTC(startYear + 1, startMonth - 1, 0)).getUTCDate()}`,
    label: `FY ${startYear}-${String(startYear + 1).slice(2)}`
  };
}

export function monthPeriod(iso: string): Period {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${last}`, label: `${MONTHS[m - 1]} ${y}` };
}

export function quarterPeriod(iso: string, startMonth = 4): Period {
  const [y, m] = iso.split("-").map(Number);
  const offset = (m - startMonth + 12) % 12;
  const qStart = ((m - (offset % 3) + 11) % 12) + 1;
  const year = m < qStart ? y - 1 : y;
  const endMonth = ((qStart + 1) % 12) + 1;
  const endYear = qStart + 2 > 12 ? year + 1 : year;
  const last = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  return {
    from: `${year}-${pad(qStart)}-01`,
    to: `${endYear}-${pad(endMonth)}-${last}`,
    label: `${MONTHS[qStart - 1]} to ${MONTHS[endMonth - 1]} ${endYear}`
  };
}

export interface TaxRow { label: string; rate: number; taxable: Money; cgst: Money; sgst: Money; igst: Money; tax: Money }
export interface ClientRow { name: string; invoiced: Money; tax: Money; count: number; outstandingMinor: number }

export interface PeriodReport {
  period: Period;
  currency: string;
  /** Documents that count as sales: invoices, not quotations or purchase orders. */
  count: number;
  taxableTotal: Money;
  taxTotal: Money;
  grossTotal: Money;
  /** What has actually been collected against those documents. */
  received: Money;
  outstanding: Money;
  byRate: TaxRow[];
  byHsn: Array<{ code: string; rate: number; taxable: Money; tax: Money }>;
  byClient: ClientRow[];
  /** Supplies inside your state versus outside it, which is the split a return asks for. */
  intraStateTaxable: Money;
  interStateTaxable: Money;
  exportTaxable: Money;
}

const SALES: SavedDocument["kind"][] = ["invoice", "proforma", "credit-note"];
const inPeriod = (d: SavedDocument, p: Period) => d.issueDate >= p.from && d.issueDate <= p.to;

export function reportFor(documents: SavedDocument[], period: Period, currency: string): PeriodReport {
  const docs = documents.filter((d) => SALES.includes(d.kind) && d.currency === currency && d.status !== "cancelled" && d.status !== "draft" && inPeriod(d, period));

  const zero = () => fromMinor(0, currency);
  const rates = new Map<string, TaxRow>();
  const hsn = new Map<string, { code: string; rate: number; taxable: number; tax: number }>();
  const clients = new Map<string, { invoiced: number; tax: number; count: number; outstanding: number }>();

  let taxable = 0, tax = 0, gross = 0, received = 0, intra = 0, inter = 0, exported = 0;

  for (const d of docs) {
    const t = calculate(d.doc);
    taxable += t.taxableTotal.minor;
    tax += t.taxTotal.minor;
    gross += t.total.minor;
    received += Math.min(d.paidMinor, d.totalMinor);

    if (d.doc.export?.enabled) exported += t.taxableTotal.minor;
    else if (t.supply.interRegion) inter += t.taxableTotal.minor;
    else intra += t.taxableTotal.minor;

    for (const row of t.hsnSummary) {
      const key = `${row.code}|${row.rate}`;
      const existing = hsn.get(key) ?? { code: row.code, rate: row.rate, taxable: 0, tax: 0 };
      hsn.set(key, { ...existing, taxable: existing.taxable + row.taxable.minor, tax: existing.tax + row.total.minor });

      const rKey = `${row.rate}`;
      const r = rates.get(rKey) ?? { label: `${row.rate}%`, rate: row.rate, taxable: zero(), cgst: zero(), sgst: zero(), igst: zero(), tax: zero() };
      rates.set(rKey, {
        ...r,
        taxable: fromMinor(r.taxable.minor + row.taxable.minor, currency),
        cgst: fromMinor(r.cgst.minor + row.cgst.minor, currency),
        sgst: fromMinor(r.sgst.minor + row.sgst.minor, currency),
        igst: fromMinor(r.igst.minor + row.igst.minor, currency),
        tax: fromMinor(r.tax.minor + row.total.minor, currency)
      });
    }

    const c = clients.get(d.clientName) ?? { invoiced: 0, tax: 0, count: 0, outstanding: 0 };
    clients.set(d.clientName, {
      invoiced: c.invoiced + t.total.minor,
      tax: c.tax + t.taxTotal.minor,
      count: c.count + 1,
      outstanding: c.outstanding + Math.max(0, d.totalMinor - d.paidMinor)
    });
  }

  return {
    period, currency, count: docs.length,
    taxableTotal: fromMinor(taxable, currency),
    taxTotal: fromMinor(tax, currency),
    grossTotal: fromMinor(gross, currency),
    received: fromMinor(received, currency),
    outstanding: fromMinor(gross - received, currency),
    byRate: [...rates.values()].sort((a, b) => a.rate - b.rate),
    byHsn: [...hsn.values()].sort((a, b) => b.taxable - a.taxable).map((h) => ({ code: h.code, rate: h.rate, taxable: fromMinor(h.taxable, currency), tax: fromMinor(h.tax, currency) })),
    byClient: [...clients.entries()].map(([name, v]) => ({ name, invoiced: fromMinor(v.invoiced, currency), tax: fromMinor(v.tax, currency), count: v.count, outstandingMinor: v.outstanding }))
      .sort((a, b) => b.invoiced.minor - a.invoiced.minor),
    intraStateTaxable: fromMinor(intra, currency),
    interStateTaxable: fromMinor(inter, currency),
    exportTaxable: fromMinor(exported, currency)
  };
}

/** One row per document, which is what an accountant actually wants to be handed. */
export function documentsCsv(documents: SavedDocument[], period?: Period): string {
  const rows = documents
    .filter((d) => !period || inPeriod(d, period))
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate));

  const head = ["Date", "Type", "Number", "Customer", "Customer tax id", "Place of supply", "Currency", "Taxable value", "CGST", "SGST", "IGST", "Total tax", "Total", "Paid", "Status"];
  const lines = rows.map((d) => {
    const t = calculate(d.doc);
    const sum = t.hsnSummary.reduce((a, r) => ({ cgst: a.cgst + r.cgst.minor, sgst: a.sgst + r.sgst.minor, igst: a.igst + r.igst.minor }), { cgst: 0, sgst: 0, igst: 0 });
    const major = (minor: number) => (minor / 100).toFixed(2);
    return [
      d.issueDate, d.kind, d.number, d.clientName, d.doc.buyer.taxId ?? "",
      d.doc.export?.enabled ? (d.doc.export.buyerCountry ?? "Export") : (d.doc.placeOfSupply ?? ""),
      d.currency, major(t.taxableTotal.minor), major(sum.cgst), major(sum.sgst), major(sum.igst),
      major(t.taxTotal.minor), major(t.total.minor), major(d.paidMinor), d.status
    ];
  });

  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [head, ...lines].map((r) => r.map((v) => escape(String(v))).join(",")).join("\n");
}
