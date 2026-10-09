import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/config";

export const dynamic = "force-static";

/** Search and AI crawlers are welcome, and named so a future default cannot quietly exclude them. */
const AI = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }, { userAgent: AI, allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml")
  };
}
