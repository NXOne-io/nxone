import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL, legalBySlug } from "@/content/legal";
import { absoluteUrl } from "@/lib/config";

export const dynamicParams = false;
export const generateStaticParams = () => LEGAL.map((p) => ({ slug: p.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = legalBySlug((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.description, alternates: { canonical: absoluteUrl(`/${p.slug}`) } };
}

export default async function Page({ params }: Props) {
  const p = legalBySlug((await params).slug);
  if (!p) notFound();
  return (
    <div className="wrap py-10">
      <article className="max-w-[68ch]">
        <h1 className="text-3xl font-semibold sm:text-4xl">{p.title}</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated {p.updated}</p>
        <div className="prose-ft mt-6"><p.Body /></div>
      </article>
    </div>
  );
}
