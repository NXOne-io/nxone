"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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

  const add = () => {
    if (!form.supplier.trim() || !form.net) return;
    db.saveExpense({
      date: form.date, supplier: form.supplier.trim(), description: form.description.trim() || undefined,
      category: form.category, currency, netMinor: toMinor(form.net), taxMinor: toMinor(form.tax),
      paidFrom: form.paidFrom || undefined, reference: form.reference.trim() || undefined
    });
    setForm({ ...form, supplier: "", description: "", net: 0, tax: 0, reference: "" });
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
        <button type="button" className="btn-primary mt-4" onClick={add} disabled={!form.supplier.trim() || !form.net}><Plus size={16} />Add expense</button>
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
                    <td className="px-4 py-2.5">{e.supplier}{e.description ? <span className="block text-xs text-ink-faint">{e.description}</span> : null}</td>
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
