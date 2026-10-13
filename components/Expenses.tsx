"use client";
import { Camera, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { receiptReader } from "@/lib/receipts/reader";
import { shrinkImage } from "@/lib/receipts/types";
import { EXPENSE_CATEGORIES, cashAccounts } from "@/lib/ledger/accounts";
import { formatDate, todayIso } from "@/lib/format";
import { formatMoney, fromMinor } from "@/lib/money";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

const toMinor = (v: number) => Math.round((Number.isFinite(v) ? v : 0) * 100);

/** Money out. Each one posts to the ledger, so profit and cash follow without extra work. */
export default function Expenses() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const currency = ws.profile?.currency ?? "INR";

  const [form, setForm] = useState({ date: todayIso(), supplier: "", description: "", category: "6900", net: 0, tax: 0, paidFrom: "1020", reference: "" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const [receipt, setReceipt] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  /**
   * Attaching the bill always works and keeps the paperwork with the money. Reading it needs a
   * service, so when there is not one we say so rather than leaving the fields mysteriously empty.
   */
  const attach = async (file: File | undefined) => {
    if (!file) return;
    setReadNote("");
    try {
      const dataUrl = await shrinkImage(file);
      setReceipt({ dataUrl, fileName: file.name });
      setReading(true);
      const result = await receiptReader().read({ dataUrl, fileName: file.name });
      setReading(false);

      if (result.status === "extracted") {
        const r = result.receipt;
        set({
          supplier: r.supplier ?? form.supplier,
          date: r.date ?? form.date,
          net: r.totalMinor ? (r.totalMinor - (r.taxMinor ?? 0)) / 100 : form.net,
          tax: r.taxMinor ? r.taxMinor / 100 : form.tax,
          reference: r.invoiceNumber ?? form.reference
        });
        setReadNote(r.confidence > 0.6
          ? "Read from the photo. Check the figures before you save."
          : "Only some of it could be read. Fill in the rest yourself.");
      } else {
        setReadNote(result.message);
      }
    } catch (error) {
      setReading(false);
      setReadNote(error instanceof Error ? error.message : "That file could not be used.");
    }
  };

  const add = () => {
    if (!form.supplier.trim() || !form.net) return;
    db.saveExpense({
      date: form.date, supplier: form.supplier.trim(), description: form.description.trim() || undefined,
      category: form.category, currency, netMinor: toMinor(form.net), taxMinor: toMinor(form.tax),
      paidFrom: form.paidFrom || undefined, reference: form.reference.trim() || undefined,
      receiptDataUrl: receipt?.dataUrl, receiptFileName: receipt?.fileName
    });
    setForm({ ...form, supplier: "", description: "", net: 0, tax: 0, reference: "" });
    setReceipt(null);
    setReadNote("");
  };

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const rows = db.expenses();
  const m = (minor: number) => formatMoney(fromMinor(minor, currency), "en-IN");
  const total = rows.reduce((a, e) => a + e.netMinor + e.taxMinor, 0);
  const reclaimable = rows.reduce((a, e) => a + e.taxMinor, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Money out</h1>
        <p className="mt-1 text-ink-soft">What the business spent. Each one goes into the books as you add it, so profit and cash stay right.</p>
      </div>

      <section className="card p-5">
        <h2 className="font-display text-lg">Add an expense</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><label className="label" htmlFor="ex-date">Date</label><input id="ex-date" type="date" className="field" value={form.date} onChange={(e) => set({ date: e.target.value })} /></div>
          <div><label className="label" htmlFor="ex-supplier">Paid to</label><input id="ex-supplier" className="field" value={form.supplier} onChange={(e) => set({ supplier: e.target.value })} placeholder="WeWork, Amazon, your landlord" /></div>
          <div>
            <label className="label" htmlFor="ex-category">What for</label>
            <select id="ex-category" className="field" value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label" htmlFor="ex-net">Amount before tax</label><input id="ex-net" type="number" step="any" className="field tabular" value={form.net || ""} onChange={(e) => set({ net: Number(e.target.value) })} /></div>
          <div><label className="label" htmlFor="ex-tax">Tax you can reclaim</label><input id="ex-tax" type="number" step="any" className="field tabular" value={form.tax || ""} onChange={(e) => set({ tax: Number(e.target.value) })} /></div>
          <div>
            <label className="label" htmlFor="ex-paid">Paid from</label>
            <select id="ex-paid" className="field" value={form.paidFrom} onChange={(e) => set({ paidFrom: e.target.value })}>
              {cashAccounts().map((a) => <option key={a.code} value={a.code}>{a.plain ?? a.name}</option>)}
              <option value="">Not paid yet, still owed</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label" htmlFor="ex-desc">Note</label><input id="ex-desc" className="field" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Office rent for May" /></div>
          <div><label className="label" htmlFor="ex-ref">Bill number</label><input id="ex-ref" className="field" value={form.reference} onChange={(e) => set({ reference: e.target.value })} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={add} disabled={!form.supplier.trim() || !form.net}><Plus size={16} />Add expense</button>

          {receipt ? (
            <span className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={receipt.dataUrl} alt="" className="h-8 w-8 rounded object-cover" />
              <span className="max-w-[12rem] truncate">{receipt.fileName}</span>
              <button type="button" onClick={() => { setReceipt(null); setReadNote(""); }} className="text-ink-faint hover:text-bad" aria-label="Remove the receipt"><X size={14} /></button>
            </span>
          ) : (
            <label className="btn-ghost cursor-pointer">
              <Camera size={16} />Attach a bill
              <input ref={fileInput} type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(e) => void attach(e.target.files?.[0])} />
            </label>
          )}

          {reading ? <span className="flex items-center gap-1.5 text-sm text-ink-soft"><Loader2 size={15} className="animate-spin" />Reading it</span> : null}
        </div>

        {readNote ? <p className="mt-3 max-w-2xl text-sm text-ink-soft">{readNote}</p> : null}
      </section>

      {rows.length > 0 ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4"><dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Total spent</dt><dd className="tabular font-display text-2xl font-semibold">{m(total)}</dd></div>
            <div className="card p-4"><dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Tax you can reclaim</dt><dd className="tabular font-display text-2xl font-semibold">{m(reclaimable)}</dd></div>
            <div className="card p-4"><dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Still owed to suppliers</dt><dd className="tabular font-display text-2xl font-semibold">{m(rows.filter((e) => !e.paidFrom).reduce((a, e) => a + e.netMinor + e.taxMinor, 0))}</dd></div>
          </dl>

          <section className="card overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-canvas text-left">
                <tr><th className="px-4 py-2.5 font-semibold">Date</th><th className="px-4 py-2.5 font-semibold">Paid to</th><th className="px-4 py-2.5 font-semibold">What for</th><th className="px-4 py-2.5 text-right font-semibold">Amount</th><th className="px-4 py-2.5 font-semibold">Paid from</th><th className="px-4 py-2.5"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-4 py-2.5 tabular text-ink-soft">{formatDate(e.date, ws.profile?.country ?? "IN")}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5">
                        {e.supplier}
                        {e.receiptDataUrl ? (
                          <a href={e.receiptDataUrl} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-ink" aria-label={`Bill for ${e.supplier}`} title="See the bill"><Paperclip size={13} /></a>
                        ) : null}
                      </span>
                      {e.description ? <span className="block text-xs text-ink-faint">{e.description}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{EXPENSE_CATEGORIES.find((c) => c.code === e.category)?.name}</td>
                    <td className="px-4 py-2.5 text-right tabular">{m(e.netMinor + e.taxMinor)}{e.taxMinor ? <span className="block text-xs text-ink-faint">{m(e.taxMinor)} tax</span> : null}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{e.paidFrom ? cashAccounts().find((a) => a.code === e.paidFrom)?.plain : <span className="text-warn">Still owed</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => { if (confirm(`Delete the ${e.supplier} expense?`)) db.deleteExpense(e.id); }} className="rounded p-1.5 text-ink-faint hover:bg-canvas hover:text-bad" aria-label={`Delete ${e.supplier}`}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
