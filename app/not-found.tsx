import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[60vh] flex-col justify-center py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-ink-faint">404</p>
      <h1 className="mt-2 max-w-2xl text-3xl font-semibold sm:text-4xl">That page is not here</h1>
      <p className="mt-3 max-w-xl text-ink-soft">It may have moved, or the address may have a typo in it. These are the places worth trying.</p>
      <ul className="mt-6 flex flex-wrap gap-3">
        {[["/invoice-generator", "Make an invoice"], ["/quotation-generator", "Write a quotation"], ["/calculators", "Calculators"], ["/hsn-code-finder", "HSN and SAC codes"], ["/guides", "Guides"]].map(([href, label]) => (
          <li key={href}><Link href={href} className="btn-ghost">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
