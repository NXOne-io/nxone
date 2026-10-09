import { ImageResponse } from "next/og";
import { BRAND } from "./config";

export const OG_SIZE = { width: 1200, height: 630 };

/** One social image style for every page, drawn at build time. */
export function ogImage(title: string, subtitle?: string) {
  return new ImageResponse(
    (
      <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0B3D2E", padding: 72, color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#C6F24E", display: "flex", alignItems: "center", justifyContent: "center", color: "#0B3D2E", fontSize: 26, fontWeight: 700 }}>N</div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>{BRAND.wordmark}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: title.length > 48 ? 58 : 70, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1 }}>{title}</div>
          {subtitle ? <div style={{ marginTop: 22, fontSize: 30, color: "#C8D8CF", lineHeight: 1.3 }}>{subtitle}</div> : null}
        </div>
        <div style={{ fontSize: 24, color: "#C6F24E" }}>Free. No sign-up. Nothing uploaded.</div>
      </div>
    ),
    OG_SIZE
  );
}
