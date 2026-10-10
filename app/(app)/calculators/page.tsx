import Link from "next/link";
import { CALCULATORS } from "@/lib/calc/registry";

export const metadata = {
  title: "Business Calculators - Margin, Break Even, Late Payment Interest",
  description: "Free calculators for pricing and cash: profit margin, markup, break even, discounts, late payment interest and a freelance hourly rate. Nothing is uploaded."
};

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Calculators</h1>
        <p className="mt-2 text-ink-soft">The arithmetic behind pricing and getting paid. Each one works out in your browser as you type.</p>
      </header>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULATORS.map((c) => (
          <li key={c.slug}>
            <Link href={`/calculators/${c.slug}`} className="card block h-full p-5 transition-colors hover:border-forest">
              <h2 className="font-display text-lg">{c.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">{c.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
