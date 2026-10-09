/** Brand and site configuration. Change the brand here only. */
export const BRAND = {
  name: "NXOne",
  wordmark: "NXOne",
  tagline: "Run your business money in one place",
  email: "hello@nxone.io",
  themeColor: "#101828"
} as const;

const clean = (u: string | undefined) => (u || "").trim().replace(/\/+$/, "");
export const SITE_URL = clean(process.env.NEXT_PUBLIC_SITE_URL) || (process.env.NODE_ENV === "production" ? "https://nxone.io" : "http://localhost:3000");
/** Static builds serve every page as a folder, so addresses carry a trailing slash and so must we. */
const TRAILING = process.env.STATIC === "1";

export function absoluteUrl(p: string): string {
  const path = p.startsWith("/") ? p : `/${p}`;
  if (!TRAILING || path === "/" || path.includes(".") || path.includes("?")) return `${SITE_URL}${path}`;
  return `${SITE_URL}${path.endsWith("/") ? path : `${path}/`}`;
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
export const GSC_VERIFICATION = process.env.NEXT_PUBLIC_GSC_VERIFICATION || "";
