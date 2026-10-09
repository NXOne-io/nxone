import type { Money } from "../money";

export type ExportKind = "goods" | "services" | "sez";
/** With a letter of undertaking no tax is charged; without one, IGST is charged and refunded later. */
export type ExportTaxMode = "lut" | "with-igst";

export interface ExportDetails {
  enabled: boolean;
  kind: ExportKind;
  taxMode: ExportTaxMode;
  /** ISO country of the buyer, printed in place of a state. */
  buyerCountry?: string;
  /** The currency the customer is billed in, when it differs from your books. */
  conversionRate?: number;
  /** Shipping bill or port details, where a country asks for them. */
  shippingBillNumber?: string;
  shippingBillDate?: string;
  portCode?: string;
  /** Your letter of undertaking reference, printed on the declaration. */
  lutNumber?: string;
}

export type TemplateId = "classic" | "modern" | "minimal" | "compact";

export type DocumentKind = "invoice" | "proforma" | "quote" | "purchase-order" | "receipt" | "credit-note" | "delivery-note";

export interface Party {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  taxId?: string;
  /** Region code inside the country, used where tax depends on it (Indian states, Canadian provinces). */
  region?: string;
}

export interface LineItem {
  id: string;
  description: string;
  /** Free text: hours, pieces, kg. Printed next to the quantity. */
  unit?: string;
  quantity: number;
  /** Unit price in major units, as typed by the user. */
  rate: number;
  /** Percentage discount on this line. */
  discountPct?: number;
  /** Which tax rule from the country pack applies to this line. */
  taxRuleId?: string;
  /** Overrides the rule's rate when a country pack cannot know it, such as US sales tax. */
  taxRateOverride?: number;
  /** HSN, SAC or any product code the country asks for. */
  code?: string;
}

export interface DocumentData {
  kind: DocumentKind;
  /** Country pack code; decides tax rules, formats and the printed title. */
  country: string;
  currency: string;
  /** ISO date. Tax rules in force on this date are the ones that apply, for ever. */
  issueDate: string;
  dueDate?: string;
  number: string;
  reference?: string;
  seller: Party;
  buyer: Party;
  /** Where the supply happens, for taxes that depend on it. Falls back to the buyer's region. */
  placeOfSupply?: string;
  /**
   * How the supply is treated. "auto" compares your state with the place of supply, which is right
   * almost always. Set it by hand for exports, supplies to an SEZ, or anything else unusual.
   */
  supplyType?: "auto" | "intra" | "inter";
  items: LineItem[];
  /** Whether the rates typed by the user already include tax. */
  taxInclusive: boolean;
  /** Discount applied to the whole document, after line discounts. */
  discountPct?: number;
  shipping?: number;
  /** Rounds the final total to the nearest whole unit, common on Indian invoices. */
  roundOff?: boolean;
  notes?: string;
  terms?: string;
  paymentDetails?: string;
  /** Amount already paid, so the document can show a balance due. */
  amountPaid?: number;
  /** Where goods should be delivered, used on purchase orders. */
  shipTo?: string;
  /** Date the goods or work are needed by, used on purchase orders. */
  deliveryDate?: string;
  /** How the money arrived, used on receipts. */
  paymentMethod?: string;
  /** Cheque number, UPI reference or transaction id, used on receipts. */
  paymentReference?: string;
  /** The customer's own order number, printed on invoices that quote it. */
  buyerOrderRef?: string;
  /** Which visual template to print. */
  template?: TemplateId;
  /** UPI id and payment link, so the customer can pay from the document itself. */
  payment?: { upiId?: string; paymentLink?: string; includeAmount?: boolean };
  /**
   * An export or SEZ supply. Zero rated under a letter of undertaking, or charged IGST and
   * reclaimed later. Replaces the place of supply with the buyer's country.
   */
  export?: ExportDetails;
  logoDataUrl?: string;
  accentColor?: string;
  /** "none" prints the electronically generated note instead of a signature block. */
  signMode?: "none" | "image" | "line";
  /** Drawn or uploaded signature, as a data URL. */
  signatureDataUrl?: string;
  /** Printed under the signature, e.g. "Asha Verma, Partner". */
  signatoryName?: string;
}

export interface TaxBreakdownRow {
  label: string;
  rate: number;
  /** Amount the tax was calculated on. */
  taxable: Money;
  tax: Money;
  /** CGST and SGST style split, when the rule defines components. */
  components?: Array<{ label: string; amount: Money }>;
  ruleId?: string;
  source?: string;
  effectiveFrom?: string;
}

/** One row of the HSN-wise summary that Indian tax invoices carry. */
export interface HsnSummaryRow {
  code: string;
  rate: number;
  taxable: Money;
  cgst: Money;
  sgst: Money;
  igst: Money;
  total: Money;
}

export interface DocumentTotals {
  lines: Array<{ id: string; gross: Money; discount: Money; net: Money; tax: Money; total: Money; rate: number; label: string }>;
  subtotal: Money;
  lineDiscounts: Money;
  documentDiscount: Money;
  taxableTotal: Money;
  taxTotal: Money;
  taxRows: TaxBreakdownRow[];
  /** Whether this document is being taxed as a supply inside the state or between states. */
  supply: { interRegion: boolean; automatic: boolean; stateTaxLabel: "SGST" | "UTGST" };
  /** Tax grouped by HSN or SAC code and rate, split into CGST, SGST and IGST. */
  hsnSummary: HsnSummaryRow[];
  shipping: Money;
  roundOff: Money;
  total: Money;
  paid: Money;
  balanceDue: Money;
  currency: string;
  /** Anything the user should know: unverified rates, missing tax numbers, mixed rules. */
  warnings: string[];
}
