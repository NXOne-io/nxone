import { packFor } from "./countries/packs";

/** Dates are formatted the way the document's country writes them, not the way the browser does. */
export function formatDate(iso: string, country: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  switch (packFor(country).dateFormat) {
    case "mm/dd/yyyy": return `${m}/${d}/${y}`;
    case "yyyy-mm-dd": return `${y}-${m}-${d}`;
    default: return `${d}/${m}/${y}`;
  }
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Best guess at the visitor's country from their browser, used only as a starting point. */
export function guessCountry(): string {
  if (typeof navigator === "undefined") return "IN";
  const fromLocale = (navigator.languages?.[0] || navigator.language || "").split("-")[1];
  const supported = ["IN", "US", "GB", "AE", "SG", "AU", "CA"];
  if (fromLocale && supported.includes(fromLocale.toUpperCase())) return fromLocale.toUpperCase();
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const byZone: Record<string, string> = { "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Dubai": "AE", "Asia/Singapore": "SG", "Europe/London": "GB" };
    if (byZone[tz]) return byZone[tz];
    if (tz.startsWith("America/")) return "US";
    if (tz.startsWith("Australia/")) return "AU";
  } catch { /* ignore */ }
  return "IN";
}

/** Next number in a series: INV-0007 becomes INV-0008. */
export function nextNumber(current: string): string {
  const m = /^(.*?)(\d+)(\D*)$/.exec(current);
  if (!m) return current;
  const width = m[2].length;
  return `${m[1]}${String(Number(m[2]) + 1).padStart(width, "0")}${m[3]}`;
}
