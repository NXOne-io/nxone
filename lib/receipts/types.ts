/**
 * Reading a photographed bill.
 *
 * Extraction needs a service we do not have keys for, so this is the interface plus an adapter
 * that says so plainly. The useful half works regardless: the photo is attached to the expense,
 * held on the device like everything else, so the paperwork is where the money is even when
 * nothing is read automatically.
 */

export interface ExtractedReceipt {
  supplier?: string;
  date?: string;
  /** Minor units, in the currency below if one was found. */
  totalMinor?: number;
  taxMinor?: number;
  currency?: string;
  invoiceNumber?: string;
  /** A category code from the chart of accounts, where we can tell. */
  category?: string;
  lines?: Array<{ description: string; amountMinor: number }>;
  /** How much of this to trust, 0 to 1. */
  confidence: number;
  /** What the service actually read, so a person can check rather than assume. */
  rawText?: string;
}

export type ExtractionResult =
  | { status: "extracted"; receipt: ExtractedReceipt }
  | { status: "unavailable"; message: string }
  | { status: "failed"; message: string };

export interface ReceiptReader {
  readonly name: string;
  readonly available: boolean;
  read(image: { dataUrl: string; fileName: string }): Promise<ExtractionResult>;
}

/** Keeps the image small enough to store and send: a phone photo is otherwise several megabytes. */
export async function shrinkImage(file: File, maxEdge = 1600, quality = 0.75): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });

  if (file.type === "application/pdf") return dataUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That image could not be opened."));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  if (scale === 1 && dataUrl.length < 600_000) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
