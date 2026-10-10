import Link from "next/link";
import { COUNTRY_GUIDES } from "@/content/countries";
import { GUIDES } from "@/content/guides";

export const metadata = {
  title: "Guides to Invoicing, Quotations and GST",
  description: "Plain explanations of what belongs on an invoice, a quotation, a purchase order and a receipt, including GST rules and the September 2025 rate change."
};

export default function Page() {
  return (
    <div className="wrap py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">Guides</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">What these documents have to contain, and why, written for people who have to send them rather than for accountants.</p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {GUIDES.map((g) => (
          <li key={g.slug} className="py-6">
            <Link href={`/guides/${g.slug}`} className="font-display text-2xl font-semibold hover:underline">{g.h1}</Link>
            <p className="mt-2 max-w-3xl text-ink-soft">{g.description}</p>
            <p className="mt-2 text-sm text-ink-faint">{g.readMins} min read, updated {g.updated}</p>
          </li>
        ))}
      </ul>
      <section className="mt-12">
        <h2 className="text-2xl">Invoice formats by country</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">What a valid invoice must show where you sell, with the rates in force today.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COUNTRY_GUIDES.map((c) => (
            <li key={c.slug}>
              <Link href={`/invoice-format/${c.slug}`} className="card block h-full p-5 transition-colors hover:border-forest">
                <span className="block font-display text-lg">{c.h1}</span>
                <span className="mt-1 block text-sm text-ink-soft">{c.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
