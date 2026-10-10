import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CALCULATORS, calcBySlug } from "@/lib/calc/registry";
import { absoluteUrl } from "@/lib/config";

export const dynamicParams = false;
export const generateStaticParams = () => CALCULATORS.map((c) => ({ slug: c.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = calcBySlug((await params).slug);
  if (!c) return {};
  return {
    title: { absolute: c.title },
    description: c.description,
    alternates: { canonical: absoluteUrl(`/calculators/${c.slug}`) },
    openGraph: { title: c.title, description: c.description, url: absoluteUrl(`/calculators/${c.slug}`) }
  };
}

export default async function Page({ params }: Props) {
  const c = calcBySlug((await params).slug);
  if (!c) notFound();
  const others = CALCULATORS.filter((x) => c.related.includes(x.slug));
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/calculators" className="hover:text-ink hover:underline">Calculators</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink-soft">{c.name}</li>
        </ol>
      </nav>

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">{c.name} calculator</h1>
        <p className="mt-2 text-ink-soft">{c.blurb}</p>
      </header>

      <div className="mt-5"><c.Component /></div>

      <section className="prose-ft mt-12 max-w-[68ch]">
        <h2 className="text-2xl">How this works</h2>
        {c.about.map((p) => <p key={p.slice(0, 24)} className="mt-3 text-ink-soft">{p}</p>)}
      </section>

      <section className="mt-12 max-w-[68ch]">
        <h2 className="text-2xl">Questions</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {c.faq.map((f) => (
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
        <h2 className="text-xl">Next</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {others.map((o) => (
            <li key={o.slug}><Link href={`/calculators/${o.slug}`} className="card block h-full p-4 hover:border-forest"><span className="font-semibold">{o.name}</span><span className="mt-1 block text-sm text-ink-soft">{o.blurb}</span></Link></li>
          ))}
        </ul>
        <p className="mt-6 text-ink-soft">Ready to bill for it? <Link href="/invoice-generator" className="font-semibold underline">Make an invoice</Link>, with the tax worked out for your country.</p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
