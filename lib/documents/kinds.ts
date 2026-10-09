import type { DocumentKind } from "./types";

/**
 * What each document is for, and therefore what belongs on it. An invoice asks for money, a
 * quotation offers a price, a purchase order gives an instruction, a receipt confirms money that
 * has already arrived. They share an engine and differ in what they show.
 */
export interface KindConfig {
  /** Printed title, unless the country pack overrides it for tax invoices. */
  title: string;
  /** What the other party is called on this document. */
  partyLabel: string;
  /** Label for the second date, if there is one. */
  secondDateLabel?: string;
  /** Default number of days between the two dates. */
  secondDateDays?: number;
  showPaymentDetails: boolean;
  showPaidAndBalance: boolean;
  /** A signing line for the customer, used on quotations. */
  showAcceptance: boolean;
  /** Delivery address and required-by date, used on purchase orders. */
  showDelivery: boolean;
  /** How the money arrived, used on receipts. */
  showPaymentReceived: boolean;
  /** Marks the document as settled. */
  showPaidStamp: boolean;
  defaultTerms?: string;
  defaultNotes?: string;
  numberPrefix: string;
}

export const KINDS: Record<DocumentKind, KindConfig> = {
  invoice: {
    title: "Invoice", partyLabel: "Bill to", secondDateLabel: "Due date", secondDateDays: 14,
    showPaymentDetails: true, showPaidAndBalance: true, showAcceptance: false, showDelivery: false,
    showPaymentReceived: false, showPaidStamp: false,
    defaultTerms: "", numberPrefix: "INV-"
  },
  proforma: {
    title: "Proforma Invoice", partyLabel: "Bill to", secondDateLabel: "Valid until", secondDateDays: 30,
    showPaymentDetails: true, showPaidAndBalance: false, showAcceptance: false, showDelivery: false,
    showPaymentReceived: false, showPaidStamp: false,
    defaultNotes: "This is a proforma invoice and is not a demand for payment.", numberPrefix: "PI-"
  },
  quote: {
    title: "Quotation", partyLabel: "Prepared for", secondDateLabel: "Valid until", secondDateDays: 30,
    showPaymentDetails: false, showPaidAndBalance: false, showAcceptance: true, showDelivery: false,
    showPaymentReceived: false, showPaidStamp: false,
    defaultTerms: "This quotation is valid until the date shown above. Work begins once it is accepted in writing.",
    numberPrefix: "QUO-"
  },
  "purchase-order": {
    title: "Purchase Order", partyLabel: "Supplier", secondDateLabel: "Required by", secondDateDays: 14,
    showPaymentDetails: false, showPaidAndBalance: false, showAcceptance: false, showDelivery: true,
    showPaymentReceived: false, showPaidStamp: false,
    defaultTerms: "Please confirm acceptance and the expected delivery date. Quote this order number on your invoice.",
    numberPrefix: "PO-"
  },
  receipt: {
    title: "Receipt", partyLabel: "Received from", showPaymentDetails: false, showPaidAndBalance: false,
    showAcceptance: false, showDelivery: false, showPaymentReceived: true, showPaidStamp: true,
    defaultNotes: "Payment received with thanks.", numberPrefix: "RCP-"
  },
  "credit-note": {
    title: "Credit Note", partyLabel: "Credit to", showPaymentDetails: false, showPaidAndBalance: false,
    showAcceptance: false, showDelivery: false, showPaymentReceived: false, showPaidStamp: false,
    defaultNotes: "This credit note adjusts the invoice referenced above.", numberPrefix: "CN-"
  },
  "delivery-note": {
    title: "Delivery Note", partyLabel: "Deliver to", secondDateLabel: "Delivery date", secondDateDays: 0,
    showPaymentDetails: false, showPaidAndBalance: false, showAcceptance: false, showDelivery: true,
    showPaymentReceived: false, showPaidStamp: false, numberPrefix: "DN-"
  }
};

export const kindConfig = (kind: DocumentKind) => KINDS[kind];
