import QRCode from "qrcode";
import { toMajor, type Money } from "../money";

/**
 * Payment details that go on the document: a UPI string for Indian invoices, which a customer can
 * scan straight from the PDF, or a link to wherever you take payment.
 */
export interface PaymentOptions {
  /** Your UPI id, such as acme@hdfcbank. India only. */
  upiId?: string;
  /** The name shown in the payer's app. Falls back to your business name. */
  upiName?: string;
  /** A hosted payment page, for cards and for customers outside India. */
  paymentLink?: string;
  /** Put the amount in the QR so the customer does not type it. */
  includeAmount?: boolean;
}

/**
 * A UPI deep link, as defined by the UPI linking specification. Scanning it opens the payer's app
 * with the payee, the amount and the reference already filled in.
 */
export function upiUri(opts: { upiId: string; name: string; amount?: Money; note?: string }): string {
  const params = new URLSearchParams();
  params.set("pa", opts.upiId.trim());
  params.set("pn", opts.name.trim().slice(0, 50));
  if (opts.amount && opts.amount.minor > 0 && opts.amount.currency === "INR") {
    params.set("am", toMajor(opts.amount).toFixed(2));
    params.set("cu", "INR");
  }
  if (opts.note) params.set("tn", opts.note.replace(/[^\w\s-]/g, "").slice(0, 50));
  // UPI apps expect the unreserved characters unescaped, which URLSearchParams escapes
  return `upi://pay?${params.toString().replace(/\+/g, "%20")}`;
}

/** Rough check that a UPI id looks like one, so we can warn rather than produce a dead QR. */
export const looksLikeUpiId = (id: string) => /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(id.trim());

/** A QR as a PNG data URL, ready for both the preview and the PDF. */
export async function qrDataUrl(text: string, size = 320): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#121712ff", light: "#ffffffff" }
  });
}
