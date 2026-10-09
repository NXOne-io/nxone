import Link from "next/link";
import { BRAND } from "@/lib/config";
import Logo from "./Logo";

const GROUPS: Array<[string, Array<[string, string]>]> = [
  ["Documents", [["/invoice-generator", "Invoice generator"], ["/quotation-generator", "Quotation generator"], ["/purchase-order-generator", "Purchase order"], ["/receipt-generator", "Receipt generator"]]],
  ["Work out", [["/calculators/profit-margin", "Profit margin"], ["/calculators/break-even", "Break even"], ["/calculators/late-payment-interest", "Late payment interest"], ["/hsn-code-finder", "HSN and SAC codes"]]],
  ["Learn", [["/guides/invoice-format-for-gst", "GST invoice format"], ["/guides/quotation-format", "Quotation format"], ["/guides", "All guides"], ["/hsn-code-finder", "HSN and SAC codes"]]],
  ["Company", [["/pricing", "Pricing"], ["/about", "About"], ["/contact", "Contact"], ["/privacy-policy", "Privacy"], ["/terms", "Terms"], ["/disclaimer", "Disclaimer"]]]
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-soft">{BRAND.tagline}. Documents are built in your browser, so your customer and pricing data stays on your device.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map(([title, links]) => (
            <div key={title}>
              <h2 className="mb-2 text-sm font-semibold">{title}</h2>
              <ul className="space-y-1.5 text-sm text-ink-soft">
                {links.map(([href, label]) => <li key={href}><Link href={href} className="hover:text-ink hover:underline">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <p className="wrap py-4 text-xs text-ink-faint">© {new Date().getFullYear()} {BRAND.name}. Tax rates shown are published reference rates with their sources; check them against your own tax authority before filing.</p>
      </div>
    </footer>
  );
}
