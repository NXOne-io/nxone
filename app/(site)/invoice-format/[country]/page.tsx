import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNTRY_GUIDES, countryGuideBySlug, liveRates } from "@/content/countries";
import { packFor } from "@/lib/countries/packs";
import { absoluteUrl } from "@/lib/config";

export const dynamicParams = false;
export const generateStaticParams = () => COUNTRY_GUIDES.map((c) => ({ country: c.slug }));

type Props = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = countryGuideBySlug((await params).country);
  if (!g) return {};
  return {
    title: { absolute: g.title },
    description: g.description,
    alternates: { canonical: absoluteUrl(`/invoice-format/${g.slug}`) },
    openGraph: { title: g.title, description: g.description, url: absoluteUrl(`/invoice-format/${g.slug}`), type: "article" }
  };
}

export default async function Page({ params }: Props) {
  const g = countryGuideBySlug((await params).country);
  if (!g) notFound();
  const pack = packFor(g.code);
  const today = new Date().toISOString().slice(0, 10);
  const rates = liveRates(pack, today);
  const others = COUNTRY_GUIDES.filter((c) => c.slug !== g.slug);
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
  };

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/guides" className="hover:text-ink hover:underline">Guides</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink-soft">{pack.name}</li>
        </ol>
      </nav>

      <article className="mt-6">
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">{g.h1}</h1>
        <p className="mt-4 max-w-[68ch] text-lg text-ink-soft">{g.intro}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="card p-4"><p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Tax</p><p className="font-display text-xl">{pack.taxLabel}</p></div>
          <div className="card p-4"><p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Your number</p><p className="font-display text-xl">{pack.taxIdLabel}</p></div>
          <div className="card p-4"><p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Currency</p><p className="font-display text-xl">{pack.currency}</p></div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl">Rates in force today</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-canvas text-left"><tr><th className="px-4 py-2.5 font-semibold">Rate</th><th className="px-4 py-2.5 font-semibold">Applies to</th><th className="px-4 py-2.5 font-semibold">Since</th></tr></thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-4 py-2.5 tabular font-medium">{r.rate}%</td>
                    <td className="px-4 py-2.5">{r.label}</td>
                    <td className="px-4 py-2.5 tabular text-ink-soft">{r.effectiveFrom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-ink-faint">Source: {rates[0]?.source}. Check anything you rely on against the authority itself.</p>
        </section>

        <div className="prose-ft mt-10 max-w-[68ch]">
          {g.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-2xl">{s.h}</h2>
              {s.p.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
            </section>
          ))}

          <h2 className="text-2xl">Fields the generator asks for</h2>
          <ul>
            {pack.requiredFields.map((f) => <li key={f.key}><strong>{f.label}</strong>{f.required ? "" : " (optional)"}{f.help ? `. ${f.help}` : ""}</li>)}
          </ul>
        </div>

        <section className="mt-10 rounded-xl border border-forest bg-forest-pale p-6">
          <h2 className="font-display text-2xl">Make one now</h2>
          <p className="mt-2 max-w-xl text-ink-soft">The generator sets the currency, the tax rules and the document layout for {pack.name} as soon as you pick it. Free, no account, and nothing is uploaded.</p>
          <Link href={`/invoice-generator?country=${pack.code}`} className="btn-primary mt-4">Create a {g.docName}</Link>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl">Questions</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {g.faq.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}<span aria-hidden="true" className="text-xl leading-none text-ink-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl">Other countries</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => <li key={o.slug}><Link href={`/invoice-format/${o.slug}`} className="btn-ghost">{o.h1}</Link></li>)}
            <li><Link href="/guides/invoice-format-for-gst" className="btn-ghost">India GST invoice format</Link></li>
          </ul>
        </section>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
