"use client";
import { COMMON_BUYER_COUNTRIES, exportDeclaration, missingExportFields } from "@/lib/documents/export";
import type { DocumentData, ExportKind, ExportTaxMode } from "@/lib/documents/types";

/** Selling outside India: zero rated under an LUT, or with IGST that you reclaim. */
export default function ExportBox({ doc, update }: { doc: DocumentData; update: (patch: Partial<DocumentData>) => void }) {
  const e = doc.export;
  const on = Boolean(e?.enabled);
  const set = (patch: Partial<NonNullable<DocumentData["export"]>>) =>
    update({ export: { enabled: true, kind: "services", taxMode: "lut", ...e, ...patch } });
  const missing = missingExportFields(doc);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg">Selling outside India</h2>
        <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <input type="checkbox" checked={on} onChange={(ev) => update({ export: { enabled: ev.target.checked, kind: e?.kind ?? "services", taxMode: e?.taxMode ?? "lut", buyerCountry: e?.buyerCountry, lutNumber: e?.lutNumber } })} />
          This is an export or SEZ supply
        </label>
      </div>

      {!on ? (
        <p className="mt-1 text-sm text-ink-soft">Exports and supplies to a special economic zone are zero rated, and are treated as inter-state whatever the addresses say.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label">What you are supplying</span>
              <div className="flex flex-wrap gap-1.5">
                {([["services", "Services"], ["goods", "Goods"], ["sez", "To an SEZ"]] as Array<[ExportKind, string]>).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set({ kind: v })} aria-pressed={e?.kind === v}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${e?.kind === v ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Tax treatment</span>
              <div className="flex flex-wrap gap-1.5">
                {([["lut", "Under LUT, no tax"], ["with-igst", "With IGST, reclaim later"]] as Array<[ExportTaxMode, string]>).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set({ taxMode: v })} aria-pressed={e?.taxMode === v}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${e?.taxMode === v ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="buyerCountry">Buyer&apos;s country</label>
              <select id="buyerCountry" className="field" value={e?.buyerCountry || ""} onChange={(ev) => set({ buyerCountry: ev.target.value })}>
                <option value="">Select</option>
                {COMMON_BUYER_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {e?.taxMode === "lut" ? (
              <div>
                <label className="label" htmlFor="lut">LUT reference</label>
                <input id="lut" className="field" value={e?.lutNumber || ""} onChange={(ev) => set({ lutNumber: ev.target.value })} placeholder="AD2703240000123" />
              </div>
            ) : null}
            {e?.kind === "goods" ? (
              <>
                <div>
                  <label className="label" htmlFor="sb">Shipping bill number</label>
                  <input id="sb" className="field" value={e?.shippingBillNumber || ""} onChange={(ev) => set({ shippingBillNumber: ev.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="sbd">Shipping bill date</label>
                  <input id="sbd" type="date" className="field" value={e?.shippingBillDate || ""} onChange={(ev) => set({ shippingBillDate: ev.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="port">Port code</label>
                  <input id="port" className="field" value={e?.portCode || ""} onChange={(ev) => set({ portCode: ev.target.value })} placeholder="INNSA1" />
                </div>
              </>
            ) : null}
            <div>
              <label className="label" htmlFor="fx">Exchange rate to INR</label>
              <input id="fx" type="number" step="any" className="field tabular" value={e?.conversionRate ?? ""} onChange={(ev) => set({ conversionRate: ev.target.value === "" ? undefined : Number(ev.target.value) })} placeholder="Optional, printed as a note" />
            </div>
          </div>

          <p className="rounded-lg bg-forest-pale p-3 text-sm text-ink-soft">
            The invoice will carry: {exportDeclaration(e?.kind ?? "services", e?.taxMode ?? "lut", e?.lutNumber)}
          </p>
          {missing.length ? <p className="text-sm text-warn">Still to add: {missing.join(", ")}.</p> : null}
        </div>
      )}
    </section>
  );
}
