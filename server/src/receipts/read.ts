/**
 * Reading a photographed bill, behind an interface.
 *
 * No service is wired up, and rather than pretend otherwise this returns a clear answer that the
 * app can show. When a key is configured the adapter below does the work; without one, nothing
 * silently fails and nobody is left wondering why the fields stayed empty.
 */

export interface ExtractedReceipt {
  supplier?: string;
  date?: string;
  totalMinor?: number;
  taxMinor?: number;
  currency?: string;
  invoiceNumber?: string;
  category?: string;
  confidence: number;
  rawText?: string;
}

export interface ReceiptService {
  readonly name: string;
  readonly connected: boolean;
  read(dataUrl: string): Promise<ExtractedReceipt | null>;
}

class NotConnected implements ReceiptService {
  readonly name = "none";
  readonly connected = false;
  async read(): Promise<null> { return null; }
}

/**
 * Google Cloud Vision, chosen because it reads a phone photo of a crumpled bill better than most
 * and bills per request rather than per month. The fields are pulled out of the text here, so a
 * different service can be swapped in without changing what the app receives.
 */
class VisionService implements ReceiptService {
  readonly name = "google-vision";
  readonly connected = true;
  constructor(private apiKey: string) {}

  async read(dataUrl: string): Promise<ExtractedReceipt | null> {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ image: { content: base64 }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] }] })
    });
    if (!res.ok) {
      console.error("Vision refused the request:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const body = (await res.json()) as { responses?: Array<{ fullTextAnnotation?: { text?: string } }> };
    const text = body.responses?.[0]?.fullTextAnnotation?.text;
    return text ? fieldsFromText(text) : null;
  }
}

export function receiptService(env: { RECEIPT_PROVIDER?: string; GOOGLE_VISION_KEY?: string }): ReceiptService {
  if (env.RECEIPT_PROVIDER === "google-vision" && env.GOOGLE_VISION_KEY) return new VisionService(env.GOOGLE_VISION_KEY);
  return new NotConnected();
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Pulls the few fields worth having out of whatever text came back. Deliberately conservative. */
export function fieldsFromText(text: string): ExtractedReceipt {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  const amounts = [...text.matchAll(/(?:₹|rs\.?|inr|\$|£|€)?\s*(\d{1,3}(?:[,\s]\d{2,3})*(?:\.\d{1,2})?)/gi)]
    .map((m) => Number(m[1].replace(/[,\s]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  // the total is usually the largest number on a bill, and usually near the word total
  const totalLine = lines.find((l) => /\b(grand\s*total|total\s*amount|total|amount\s*payable|net\s*payable)\b/i.test(l));
  const fromTotalLine = totalLine ? Number((totalLine.match(/(\d{1,3}(?:[,\s]\d{2,3})*(?:\.\d{1,2})?)\s*$/)?.[1] ?? "").replace(/[,\s]/g, "")) : NaN;
  const total = Number.isFinite(fromTotalLine) && fromTotalLine > 0 ? fromTotalLine : amounts.length ? Math.max(...amounts) : undefined;

  const taxLine = lines.find((l) => /\b(gst|vat|tax|cgst|sgst|igst)\b/i.test(l) && /\d/.test(l));
  const taxValue = taxLine ? Number((taxLine.match(/(\d{1,3}(?:[,\s]\d{2,3})*(?:\.\d{1,2})?)\s*$/)?.[1] ?? "").replace(/[,\s]/g, "")) : NaN;

  const currency = /₹|\brs\b|\binr\b/i.test(lower) ? "INR" : /\$|\busd\b/i.test(lower) ? "USD" : /£|\bgbp\b/i.test(lower) ? "GBP" : /€|\beur\b/i.test(lower) ? "EUR" : undefined;

  const dateMatch = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/)
    ?? text.match(new RegExp(`\\b(\\d{1,2})\\s*(${MONTHS.join("|")})[a-z]*\\s*(\\d{2,4})\\b`, "i"));
  let date: string | undefined;
  if (dateMatch) {
    const [, a, b, c] = dateMatch;
    const year = c.length === 2 ? `20${c}` : c;
    const month = Number.isNaN(Number(b)) ? String(MONTHS.indexOf(b.slice(0, 3).toLowerCase()) + 1) : b;
    const candidate = `${year}-${String(month).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    if (!Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))) date = candidate;
  }

  // the supplier is nearly always the first substantial line, before any address or number
  const supplier = lines.find((l) => l.length > 2 && l.length < 40 && !/\d{4}/.test(l) && !/invoice|receipt|bill|tax/i.test(l));

  const invoiceNumber = text.match(/\b(?:invoice|bill|receipt)\s*(?:no\.?|number|#)\s*:?\s*([A-Za-z0-9/-]{3,20})/i)?.[1];

  const found = [supplier, date, total, currency].filter(Boolean).length;

  return {
    supplier,
    date,
    totalMinor: total ? Math.round(total * 100) : undefined,
    taxMinor: Number.isFinite(taxValue) && taxValue > 0 ? Math.round(taxValue * 100) : undefined,
    currency,
    invoiceNumber,
    confidence: Math.min(0.9, found / 4),
    rawText: text.slice(0, 2000)
  };
}
