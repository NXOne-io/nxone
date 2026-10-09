import Link from "next/link";
import Logo from "./Logo";

const NAV = [
  { href: "/invoice-generator", label: "Invoice" },
  { href: "/quotation-generator", label: "Quotation" },
  { href: "/purchase-order-generator", label: "Purchase order" },
  { href: "/receipt-generator", label: "Receipt" },
  { href: "/calculators", label: "Calculators" },
  { href: "/guides", label: "Guides" },
  { href: "/pricing", label: "Pricing" }
];

export default function Header() {
  return (
    <header className="border-b border-line bg-canvas/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-lime focus:px-3 focus:py-2">Skip to content</a>
      <div className="wrap flex h-16 items-center gap-6">
        <Link href="/" aria-label="NXOne home"><Logo /></Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm font-medium">
            {NAV.map((n) => (
              <li key={n.href}><Link href={n.href} className="rounded-md px-3 py-2 text-ink-soft hover:bg-white hover:text-ink">{n.label}</Link></li>
            ))}
          </ul>
        </nav>
        <Link href="/invoice-generator" className="btn-primary ml-auto">Create an invoice</Link>
      </div>
    </header>
  );
}
