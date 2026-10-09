import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Analytics from "@/components/Analytics";
import { BRAND, SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND.name} - Free Invoice Generator and Business Finance Tools`, template: `%s | ${BRAND.name}` },
  description: "Create invoices, quotations, purchase orders and receipts for any country, with the right tax format. Free, no sign-up, and your data never leaves your browser.",
  applicationName: BRAND.name
};

export const viewport: Viewport = { themeColor: BRAND.themeColor, width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink">{children}<Analytics /></body>
    </html>
  );
}
