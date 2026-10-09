import type { DocumentData, ExportKind, ExportTaxMode } from "./types";

/**
 * Wording that an Indian export invoice is expected to carry. The declaration differs depending on
 * whether you have a letter of undertaking, in which case no tax is charged, or whether you charge
 * IGST and reclaim it afterwards.
 */
export function exportDeclaration(kind: ExportKind, mode: ExportTaxMode, lutNumber?: string): string {
  const where = kind === "sez" ? "to a special economic zone" : "for export";
  if (mode === "lut") {
    const ref = lutNumber ? ` under LUT ${lutNumber}` : " under a letter of undertaking";
    return `Supply meant ${where} without payment of integrated tax${ref}.`;
  }
  return `Supply meant ${where} with payment of integrated tax. Refund to be claimed as applicable.`;
}

/** Countries people commonly bill from India, with a few of the rest kept short deliberately. */
export const COMMON_BUYER_COUNTRIES = [
  "United States", "United Kingdom", "United Arab Emirates", "Singapore", "Australia", "Canada",
  "Germany", "Netherlands", "France", "Saudi Arabia", "Qatar", "Japan", "New Zealand", "Ireland",
  "Switzerland", "South Africa", "Malaysia", "Hong Kong", "Sweden", "Spain", "Italy", "Other"
];

/** Fields a country expects on an export document, used to prompt rather than to block. */
export function missingExportFields(doc: DocumentData): string[] {
  const e = doc.export;
  if (!e?.enabled) return [];
  const missing: string[] = [];
  if (!e.buyerCountry) missing.push("the buyer's country");
  if (e.kind === "goods" && !e.shippingBillNumber) missing.push("the shipping bill number");
  if (e.kind === "goods" && !e.portCode) missing.push("the port code");
  if (e.taxMode === "lut" && !e.lutNumber) missing.push("your LUT reference");
  return missing;
}
