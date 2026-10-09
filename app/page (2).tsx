import Link from "next/link";
import { GUIDES } from "@/content/guides";
import { Calculator, FileText, Quote, Receipt, Search, ShoppingCart } from "lucide-react";

const DOCS = [
  { href: "/invoice-generator", icon: FileText, title: "Invoice", text: "Bill a customer, with GST, VAT or sales tax already worked out." },
  { href: "/quotation-generator", icon: Quote, title: "Quotation", text: "Agree the price before you start. Turn it into an invoice later." },
  { href: "/purchase-order-generator", icon: ShoppingCart, title: "Purchase order", text: "Tell a supplier what you want, at what price, by when." },
  { href: "/receipt-generator", icon: Receipt, title: "Receipt", text: "Confirm money that has already landed, tax shown separately." }
];

export default function Home() {
  return (
    <>
      <section className="wrap py-14 sm:py-20">
        <p className="chip">Free, no sign-up</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">Send an invoice your accountant will not send back.</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-soft">Invoices, quotations, purchase orders and receipts, with the tax worked out for the country you sell from. It runs in your browser, so your prices and your customer list stay on your own machine.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/invoice-generator" className="btn-primary px-6 py-3 text-base">Create an invoice</Link>
          <Link href="/quotation-generator" className="btn-ghost px-6 py-3 text-base">Start a quotation</Link>
        </div>
      </section>

      <section className="wrap pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOCS.map((d) => (
            <Link key={d.href} href={d.href} className="card group p-5 transition-colors hover:border-forest">
              <d.icon size={22} className="text-forest" aria-hidden="true" />
              <h2 className="mt-3 font-display text-lg group-hover:underline">{d.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{d.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap pb-16">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/hsn-code-finder" className="card group flex gap-4 p-5 transition-colors hover:border-forest">
            <Search size={22} className="mt-1 shrink-0 text-forest" aria-hidden="true" />
            <span>
              <span className="block font-display text-lg group-hover:underline">Find your HSN or SAC code</span>
              <span className="mt-1 block text-sm text-ink-soft">Type what you sell and get the code, with the rate usually applied, including the ones that change with price.</span>
            </span>
          </Link>
          <Link href="/calculators" className="card group flex gap-4 p-5 transition-colors hover:border-forest">
            <Calculator size={22} className="mt-1 shrink-0 text-forest" aria-hidden="true" />
            <span>
              <span className="block font-display text-lg group-hover:underline">Work out the numbers first</span>
              <span className="mt-1 block text-sm text-ink-soft">Margin, markup, break even, discounts, late payment interest and what to charge an hour.</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="border-y border-line bg-white py-14">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="text-3xl">Tax rules change. Old invoices should not.</h2>
            <p className="mt-4 text-ink-soft">India moved to 5%, 18% and 40% on 22 September 2025. Raise an invoice dated before that and you still get the old slabs, because every rate here knows the dates it applies between and where it came from.</p>
            <p className="mt-3 text-ink-soft">Change the place of supply and every line switches between CGST with SGST and IGST on its own. Pick a country and the currency, tax labels and layout follow. Where a rate depends on your exact street, as US sales tax does, you type it in and we say so rather than guessing.</p>
          </div>
          <dl className="grid content-start gap-4 sm:grid-cols-2">
            {[["Nothing is uploaded", "Your customer list and your prices never reach us. There is nowhere for them to go."], ["No account to make", "Open it, type, download. Your work waits here when you come back."], ["Numbers that add up", "Amounts are counted in whole paise and cents, so a long invoice never drifts by a rupee."], ["A4 and print ready", "The PDF looks the same for your client, your bank and your auditor."]].map(([t, d]) => (
              <div key={t} className="card p-5"><dt className="font-display text-lg">{t}</dt><dd className="mt-1 text-sm text-ink-soft">{d}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section className="wrap py-14">
        <h2 className="text-3xl">Learn the format before you send it</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="card block h-full p-5 transition-colors hover:border-forest">
                <span className="block font-display text-lg">{g.h1}</span>
                <span className="mt-1 block text-sm text-ink-soft">{g.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
