/**
 * STATIC=1 builds a fully static site into out/, which is what we deploy. Everything in NXOne runs
 * in the browser, so there is no server to host. Headers move to out/_headers, written by
 * scripts/static-extras.mjs, because a static host applies them at the edge instead.
 */
const STATIC = process.env.STATIC === "1";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : [])
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Directory style output: every page becomes its own folder with an index.html, which every
   * static host resolves without special configuration. Flat files such as calculators/markup.html
   * depend on the host rewriting extensionless paths, and not all of them do.
   */
  ...(STATIC ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  ...(STATIC ? {} : { async headers() { return [{ source: "/(.*)", headers: SECURITY_HEADERS }]; } })
};

export default nextConfig;
