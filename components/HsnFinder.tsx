"use client";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { HSN, searchHsn } from "@/lib/countries/hsn";

/** The whole list, searchable, with the value based rates spelled out where they exist. */
export default function HsnFinder() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "goods" | "service">("all");

  const rows = useMemo(() => {
    const base = q.trim() ? searchHsn(q, 100) : [...HSN].sort((a, b) => a.label.localeCompare(b.label));
    return base.filter((e) => kind === "all" || e.kind === kind);
  }, [q, kind]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 focus-within:border-forest">
          <Search size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full bg-transparent py-2.5 text-base outline-none" placeholder="Type what you sell, such as website, shirts, rice or 998314" aria-label="Search HSN and SAC codes" />
        </div>
        <div className="flex gap-1.5">
          {([["all", "Everything"], ["service", "Services"], ["goods", "Goods"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setKind(v)} aria-pressed={kind === v}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${kind === v ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{l}</button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-sm text-ink-faint">{rows.length} of {HSN.length} codes</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-canvas text-left">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Code</th>
              <th className="px-4 py-2.5 font-semibold">What it covers</th>
              <th className="px-4 py-2.5 text-right font-semibold">Usual GST</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.code} className="border-t border-line align-top">
                <td className="px-4 py-2.5 tabular font-medium">{e.code}<span className="ml-2 rounded bg-canvas px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase text-ink-faint">{e.kind === "service" ? "SAC" : "HSN"}</span></td>
                <td className="px-4 py-2.5">{e.label}</td>
                <td className="px-4 py-2.5 text-right tabular">
                  {e.bands?.length ? (
                    <span className="text-ink-soft">
                      {[...new Set(e.bands.filter((b) => !b.effectiveUntil).map((b) => `${b.rate}%`))].join(" or ")}
                      <span className="block text-xs text-ink-faint">by price per {e.bands[0].unit}</span>
                    </span>
                  ) : `${e.rate}%`}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={3} className="px-4 py-6 text-center text-ink-faint">Nothing matches that. Try a plainer word, such as shirt rather than apparel.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
