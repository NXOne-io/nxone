import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug } from "@/content/guides";
import { absoluteUrl } from "@/lib/config";

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return {
    title: { absolute: g.title },
    description: g.description,
    alternates: { canonical: absoluteUrl(`/guides/${g.slug}`) },
    openGraph: { title: g.title, description: g.description, url: absoluteUrl(`/guides/${g.slug}`), type: "article" }
  };
}

export default async function Page({ params }: Props) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const others = GUIDES.filter((x) => x.slug !== g.slug);

  return (
    <div className="wrap py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/guides" className="hover:text-ink hover:underline">Guides</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink-soft">{g.h1}</li>
        </ol>
      </nav>

      <article className="mt-6">
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">{g.h1}</h1>
        <p className="mt-2 text-sm text-ink-faint">{g.readMins} min read, updated {g.updated}</p>
        <div className="prose-ft mt-6"><g.Body /></div>
      </article>

      <aside className="mt-12">
        <h2 className="text-xl">More guides</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {others.map((o) => (
            <li key={o.slug}><Link href={`/guides/${o.slug}`} className="card block h-full p-4 hover:border-forest"><span className="font-semibold">{o.h1}</span><span className="mt-1 block text-sm text-ink-soft">{o.description}</span></Link></li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
