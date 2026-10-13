import { packFor } from "../countries/packs";
import type { Registration } from "../compliance/rules";
import type { Profile } from "../store/types";

/**
 * Turning a handful of answers into a configured business.
 *
 * The questions are only the ones whose answers change something. Anything we can work out from
 * the country, or that has a sensible default, is not asked: a form that takes four minutes before
 * the product does anything is how people leave.
 */

export interface Answers {
  country: string;
  businessName: string;
  /** What they do, used only to pick a sensible first document and HSN hint. */
  trade?: "services" | "goods" | "both";
  registrations: Registration[];
  quarterlyGst?: boolean;
  taxId?: string;
  region?: string;
  currency?: string;
  /** Where their numbering is up to, so NXOne carries on rather than restarting. */
  invoiceStart?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface SetupSummary {
  profile: Profile;
  /** What was configured, in the order it is worth telling someone about. */
  configured: Array<{ title: string; detail: string }>;
}

/** The question about registration only makes sense in the country's own words. */
export function registrationChoices(country: string): Array<{ value: Registration; label: string; help: string }> {
  const pack = packFor(country);
  const out: Array<{ value: Registration; label: string; help: string }> = [];

  if (pack.taxSystem === "GST") out.push({ value: "gst", label: `Registered for ${pack.taxLabel}`, help: `You charge ${pack.taxLabel} and file returns` });
  if (pack.taxSystem === "VAT") out.push({ value: "vat", label: `Registered for ${pack.taxLabel}`, help: `You charge ${pack.taxLabel} and file returns` });

  if (country.toUpperCase() === "IN") {
    out.push({ value: "tds", label: "You deduct TDS", help: "Tax deducted at source from suppliers or salaries" });
    out.push({ value: "payroll", label: "You run payroll", help: "With PF or ESI for employees" });
  } else {
    out.push({ value: "payroll", label: "You run payroll", help: "You employ people and pay them through payroll" });
  }

  return out;
}

export function buildProfile(answers: Answers): SetupSummary {
  const pack = packFor(answers.country);
  const currency = answers.currency || pack.currency;

  const profile: Profile = {
    name: answers.businessName.trim(),
    country: answers.country,
    currency,
    region: answers.region,
    taxId: answers.taxId?.trim() || undefined,
    email: answers.email?.trim() || undefined,
    phone: answers.phone?.trim() || undefined,
    address: answers.address?.trim() || undefined,
    registrations: answers.registrations,
    quarterlyGst: answers.quarterlyGst,
    template: "classic",
    accentColor: "#0B3D2E",
    nextNumbers: {
      invoice: answers.invoiceStart?.trim() || "INV-0001",
      quote: "QUO-0001",
      "purchase-order": "PO-0001",
      receipt: "RCP-0001"
    },
    defaultTerms: defaultTermsFor(answers.country),
    version: 1,
    updatedAt: new Date().toISOString()
  };

  const configured: Array<{ title: string; detail: string }> = [
    { title: "Tax rules", detail: registrationSummary(answers, pack.taxLabel) },
    { title: "Invoice format", detail: `${pack.invoiceTitle} for ${pack.name}, with the fields ${pack.name} expects` },
    { title: "Currency", detail: `${currency}, formatted the way ${pack.name} writes numbers and dates` },
    { title: "Numbering", detail: `Your next invoice will be ${profile.nextNumbers?.invoice}` }
  ];

  if (answers.registrations.length) {
    configured.push({ title: "Filing calendar", detail: "Your deadlines are worked out from what you are registered for" });
  }

  return { profile, configured };
}

function registrationSummary(answers: Answers, taxLabel: string): string {
  if (!answers.registrations.length) return `Not registered, so nothing is added to your invoices`;
  const parts: string[] = [];
  if (answers.registrations.includes("gst") || answers.registrations.includes("vat")) {
    parts.push(answers.quarterlyGst ? `${taxLabel} at the rates in force, filed quarterly` : `${taxLabel} at the rates in force on each invoice date`);
  }
  if (answers.registrations.includes("tds")) parts.push("TDS deadlines included");
  if (answers.registrations.includes("payroll")) parts.push("payroll deadlines included");
  return parts.join(", ");
}

function defaultTermsFor(country: string): string {
  if (country.toUpperCase() === "IN") return "Payment due within 14 days. Interest at 1.5% a month applies to overdue amounts.";
  return "Payment due within 14 days of the invoice date.";
}

/** How far through setup someone is, so the screen can show it honestly. */
export function missingPieces(profile?: Profile): string[] {
  if (!profile?.name) return ["your business details"];
  const missing: string[] = [];
  if (!profile.taxId && (profile.registrations ?? []).length) missing.push("your tax number");
  if (!profile.address) missing.push("your address");
  if (!profile.paymentDetails && !profile.upiId) missing.push("how customers should pay you");
  if (!profile.logoDataUrl) missing.push("your logo");
  return missing;
}
