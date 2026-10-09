import { ogImage, OG_SIZE } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "NXOne";

export default function OG() {
  return ogImage("Invoices that are right the first time", "Invoices, quotations, purchase orders and receipts for any country");
}
