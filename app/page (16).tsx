import Link from "next/link";
import HsnFinder from "@/components/HsnFinder";
import { HSN } from "@/lib/countries/hsn";

export const metadata = {
  title: { absolute: "HSN and SAC Code Finder - Search by What You Sell" },
  description: "Find the HSN or SAC code for your product or service by typing what you sell, with the GST rate usually applied. Free, no sign-up."
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">HSN and SAC code finder</h1>
        <p className="mt-2 text-ink-soft">Search {HSN.length} common codes by what you actually sell, rather than reading the schedule. Goods use HSN codes and services use SAC codes.</p>
      </header>

      <div className="mt-5"><HsnFinder /></div>

      <section className="prose-ft mt-12 max-w-[68ch]">
        <h2 className="text-2xl">What these codes are for</h2>
        <p className="mt-3 text-ink-soft">HSN stands for Harmonised System of Nomenclature, an international way of classifying goods that India uses for GST. Services have their own list, the Services Accounting Code. Both exist so that everyone describes the same thing the same way, and so the rate follows from the classification rather than from an opinion.</p>
        <p className="mt-3 text-ink-soft">How many digits you must print depends on your turnover, and the requirement has tightened over the years. Small businesses have generally been allowed four digits on business to business invoices, while larger ones print six. Check the rule that applies to your turnover for the current year.</p>
        <h2 className="mt-8 text-2xl">Rates that change with price</h2>
        <p className="mt-3 text-ink-soft">Some codes carry more than one rate, and which applies depends on the price of a single piece rather than the invoice total. Apparel and footwear are the everyday examples: 5 percent up to 2,500 rupees a piece and 18 percent above it since 22 September 2025, when the threshold was raised from 1,000 rupees. Ten shirts at 2,000 each stay at 5 percent even though the bill comes to 20,000.</p>
        <p className="mt-3 text-ink-soft">The <Link href="/invoice-generator">invoice generator</Link> applies this for you: pick the code, type the price, and the rate follows, with a line explaining why it chose what it chose.</p>
        <h2 className="mt-8 text-2xl">A word of caution</h2>
        <p className="mt-3 text-ink-soft">These are the rates commonly applied to each category, offered as a starting point. Classification can turn on packaging, composition, branding or end use, and the rate follows the classification. If your product sits near a boundary, check the schedule or ask your accountant before you invoice.</p>
      </section>
    </div>
  );
}
