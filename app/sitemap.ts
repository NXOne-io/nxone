import type { MetadataRoute } from "next";
import { COUNTRY_GUIDES } from "@/content/countries";
import { GUIDES } from "@/content/guides";
import { LEGAL } from "@/content/legal";
import { CALCULATORS } from "@/lib/calc/registry";
import { absoluteUrl } from "@/lib/config";

export const dynamic = "force-static";

const TOOLS = ["/pricing", "/dashboard", "/documents", "/receivables", "/cash-flow", "/reports", "/expenses", "/books", "/settings", "/sign-in", "/invoice-generator", "/quotation-generator", "/purchase-order-generator", "/receipt-generator", "/hsn-code-finder", "/calculators"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...TOOLS.map((t) => ({ url: absoluteUrl(t), lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...CALCULATORS.map((c) => ({ url: absoluteUrl(`/calculators/${c.slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: absoluteUrl("/guides"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...GUIDES.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...COUNTRY_GUIDES.map((c) => ({ url: absoluteUrl(`/invoice-format/${c.slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...LEGAL.map((p) => ({ url: absoluteUrl(`/${p.slug}`), lastModified: now, changeFrequency: "yearly" as const, priority: 0.3 }))
  ];
}
