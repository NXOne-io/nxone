"use client";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, todayIso } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { documentsCsv, financialYear, monthPeriod, quarterPeriod, reportFor, type Period } from "@/lib/store/reports";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

type Choice = "month" | "quarter" | "year" | "custom";

/** What you invoiced in a period, and the tax you charged, in the shape a return asks for. */
export default function Reports() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const [choice, setChoice] = useState<Choice>("month");
  const [anchor, setAnchor] = useState(todayIso());
  const [custom, setCustom] = useState<{ from: string; to: string }>({ from: todayIso().slice(0, 8) + "01", to: todayIso() });

  const period: Period = useMemo(() => {
    if (choice === "month") return monthPeriod(anchor);
    if (choice === "quarter") return quarterPeriod(anchor);
    if (choice === "year") return financialYear(anchor);
    return { from: custom.from, to: custom.to, label: `${formatDate(custom.from, "IN")} to ${formatDate(custom.to, "IN")}` };
  }, [choice, anchor, custom]);

  const currency = ws.profile?.currency ?? db.documents()[0]?.currency ?? "INR";
  // recalculated on every render on purpose: it must follow any document you edit or mark paid
  const r = reportFor(db.documents(), period, currency);
  const m = (v: { minor: number; currency: string }) => formatMoney(v, "en-IN");

  const downloadCsv = () => {
    const csv = documentsCsv(db.documents(), period);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nxone-${period.label.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Reports</h1>
          <p className="mt-1 text-ink-soft">{period.label}, from {formatDate(period.from, "IN")} to {formatDate(period.to, "IN")}</p>
        </div>
        <button type="button" className="btn-ghost" onClick={downloadCsv} disabled={r.count === 0}><Download size={16} />Download CSV</button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1.5">
          {([["month", "Month"], ["quarter", "Quarter"], ["year", "Financial year"], ["custom", "Custom"]] as Array<[Choice, string]>).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setChoice(v)} aria-pressed={choice === v}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${choice === v ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{l}</button>
          ))}
        </div>
        {choice === "custom" ? (
          <>
            <div><label className="label" htmlFor="from">From</label><input id="from" type="date" className="field" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} /></div>
            <div><label className="label" htmlFor="to">To</label><input id="to" type="date" className="field" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} /></div>
          </>
        ) : (
          <div><label className="label" htmlFor="anchor">Any date in the period</label><input id="anchor" type="date" className="field" value={anchor} onChange={(e) => setAnchor(e.target.value)} /></div>
        )}
      </div>

      {r.count === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-display text-lg">Nothing invoiced in {period.label}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Documents appear here once they are saved and not left as drafts. Try another period, or download a PDF from the invoice generator, which saves it for you.</p>
        </div>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Invoiced" value={m(r.grossTotal)} sub={`${r.count} documents`} strong />
            <Stat label="Taxable value" value={m(r.taxableTotal)} sub="Before tax" />
            <Stat label="Tax charged" value={m(r.taxTotal)} sub="What you collected for the government" />
            <Stat label="Still outstanding" value={m(r.outstanding)} sub={`${m(r.received)} received`} />
          </dl>

          <section className="card overflow-hidden">
            <h2 className="px-5 pt-5 font-display text-lg">Tax by rate</h2>
            <p className="px-5 pb-3 text-sm text-ink-soft">The split a return asks for. Supplies inside your state carry CGST and SGST, those outside carry IGST.</p>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-canvas text-left">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Rate</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Taxable value</th>
                  <th className="px-5 py-2.5 text-right font-semibold">CGST</th>
                  <th className="px-5 py-2.5 text-right font-semibold">SGST</th>
                  <th className="px-5 py-2.5 text-right font-semibold">IGST</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Total tax</th>
                </tr>
              </thead>
              <tbody>
                {r.byRate.map((row) => (
                  <tr key={row.rate} className="border-t border-line">
                    <td className="px-5 py-2.5 font-medium">{row.label}</td>
                    <td className="px-5 py-2.5 text-right tabular">{m(row.taxable)}</td>
                    <td className="px-5 py-2.5 text-right tabular">{m(row.cgst)}</td>
                    <td className="px-5 py-2.5 text-right tabular">{m(row.sgst)}</td>
                    <td className="px-5 py-2.5 text-right tabular">{m(row.igst)}</td>
                    <td className="px-5 py-2.5 text-right tabular font-semibold">{m(row.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-display text-lg">Where your supplies went</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Line label="Inside your state" value={m(r.intraStateTaxable)} />
                <Line label="Other states" value={m(r.interStateTaxable)} />
                <Line label="Exports and SEZ" value={m(r.exportTaxable)} />
              </dl>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg">By HSN or SAC</h2>
              <table className="mt-3 w-full border-collapse text-sm">
                <thead><tr className="border-b border-line text-left text-ink-soft"><th className="py-2 font-semibold">Code</th><th className="py-2 text-right font-semibold">Rate</th><th className="py-2 text-right font-semibold">Taxable</th><th className="py-2 text-right font-semibold">Tax</th></tr></thead>
                <tbody>
                  {r.byHsn.slice(0, 8).map((h) => (
                    <tr key={`${h.code}-${h.rate}`} className="border-b border-line">
                      <td className="py-2 tabular">{h.code}</td>
                      <td className="py-2 text-right tabular">{h.rate}%</td>
                      <td className="py-2 text-right tabular">{m(h.taxable)}</td>
                      <td className="py-2 text-right tabular">{m(h.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="card overflow-hidden">
            <h2 className="px-5 pt-5 font-display text-lg">By customer</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead className="bg-canvas text-left">
                <tr><th className="px-5 py-2.5 font-semibold">Customer</th><th className="px-5 py-2.5 text-right font-semibold">Documents</th><th className="px-5 py-2.5 text-right font-semibold">Invoiced</th><th className="px-5 py-2.5 text-right font-semibold">Tax</th><th className="px-5 py-2.5 text-right font-semibold">Still owed</th></tr>
              </thead>
              <tbody>
                {r.byClient.map((c) => (
                  <tr key={c.name} className="border-t border-line">
                    <td className="px-5 py-2.5">{c.name}</td>
                    <td className="px-5 py-2.5 text-right tabular">{c.count}</td>
                    <td className="px-5 py-2.5 text-right tabular">{m(c.invoiced)}</td>
                    <td className="px-5 py-2.5 text-right tabular">{m(c.tax)}</td>
                    <td className="px-5 py-2.5 text-right tabular">{m({ minor: c.outstandingMinor, currency })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-sm text-ink-faint">
            These figures come from the documents saved on this device, which may not be everything you invoiced. Check them against your own records before filing.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? "border-forest bg-forest-pale" : "border-line bg-white"}`}>
      <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className={`tabular font-display font-semibold ${strong ? "text-3xl" : "text-2xl"}`}>{value}</dd>
      {sub ? <dd className="mt-1 text-sm text-ink-soft">{sub}</dd> : null}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink-soft">{label}</dt><dd className="tabular font-medium">{value}</dd></div>;
}
