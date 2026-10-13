"use client";
import { openingOf } from "@/lib/ledger/opening";
import { Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { payables } from "@/lib/analysis/payables";
import { forecast } from "@/lib/analysis/cashflow";
import { EXPENSE_CATEGORIES, cashAccounts } from "@/lib/ledger/accounts";
import { formatDate, todayIso } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { store } from "@/lib/store/db";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

/** What you owe, in the order worth paying, measured against the cash you actually have. */
export default function Payables() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const currency = ws.profile?.currency ?? "INR";
  const country = ws.profile?.country ?? "IN";
  const today = todayIso();
  const cash = forecast(db.documents(), db.expenses(), today, currency, 1, 0, openingOf(ws.profile)).openingCash;
  const view = payables(db.expenses(), today, currency, cash.minor);
  const m = (v: { minor: number; currency: string }) => formatMoney(v, "en-IN");

  const markPaid = (id: string, account: string) => {
    const expense = db.expenses().find((e) => e.id === id);
    if (expense) db.saveExpense({ ...expense, paidFrom: account });
  };

  const rows = [...view.affordable, ...view.beyondCash];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">What you owe</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">Bills recorded but not yet paid, in the order worth settling, measured against the cash you have.</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-forest bg-forest-pale p-4">
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Owed to suppliers</dt>
          <dd className="tabular font-display text-3xl font-semibold">{m(view.total)}</dd>
        </div>
        <div className="card p-4">
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Cash available</dt>
          <dd className="tabular font-display text-2xl font-semibold">{m(cash)}</dd>
        </div>
        <div className={`rounded-xl border p-4 ${view.shortfall.minor > 0 ? "border-bad/40 bg-bad/5" : "border-line bg-white"}`}>
          <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Short by</dt>
          <dd className={`tabular font-display text-2xl font-semibold ${view.shortfall.minor > 0 ? "text-bad" : ""}`}>{m(view.shortfall)}</dd>
          <dd className="mt-1 text-sm text-ink-soft">{view.shortfall.minor > 0 ? "Paying everything today would overdraw you" : "Your cash covers everything owed"}</dd>
        </div>
      </dl>

      {view.shortfall.minor > 0 ? (
        <p className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-warn">
          <TriangleAlert size={15} className="mr-1 inline" aria-hidden="true" />
          The first {view.affordable.length} bill{view.affordable.length === 1 ? "" : "s"} below fit within your cash. The rest need money in first, which usually means chasing{" "}
          <Link href="/receivables/" className="underline">what you are owed</Link>.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="font-display text-lg">Nothing outstanding</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Bills appear here when you record an expense and leave it as not yet paid.</p>
          <Link href="/expenses/" className="btn-primary mt-4">Record an expense</Link>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-canvas text-left">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Supplier</th>
                <th className="px-5 py-2.5 font-semibold">What for</th>
                <th className="px-5 py-2.5 font-semibold">Age</th>
                <th className="px-5 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-5 py-2.5 text-right font-semibold">Mark as paid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => {
                const beyond = index >= view.affordable.length;
                return (
                  <tr key={item.expense.id} className={`border-t border-line ${beyond ? "bg-canvas/60" : ""}`}>
                    <td className="px-5 py-2.5">
                      {item.expense.supplier}
                      {item.expense.reference ? <span className="block text-xs text-ink-faint">{item.expense.reference}</span> : null}
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">
                      {EXPENSE_CATEGORIES.find((c) => c.code === item.expense.category)?.name}
                      <span className="block text-xs text-ink-faint">{formatDate(item.expense.date, country)}</span>
                    </td>
                    <td className={`px-5 py-2.5 ${item.ageDays > 45 ? "text-warn" : "text-ink-soft"}`}>{item.reason}</td>
                    <td className="px-5 py-2.5 text-right tabular">{m(item.owed)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <select
                        className="rounded border border-line bg-white px-2 py-1 text-sm"
                        value=""
                        onChange={(e) => e.target.value && markPaid(item.expense.id, e.target.value)}
                        aria-label={`Mark the ${item.expense.supplier} bill as paid`}
                      >
                        <option value="">Not yet</option>
                        {cashAccounts().map((a) => <option key={a.code} value={a.code}>Paid from {a.plain ?? a.name}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {view.bySupplier.length > 1 ? (
        <section className="card p-5">
          <h2 className="font-display text-lg">By supplier</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {view.bySupplier.map((s) => (
              <li key={s.supplier} className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
                <span>{s.supplier}<span className="text-ink-faint"> · {s.bills} bill{s.bills === 1 ? "" : "s"}, oldest {s.oldestDays} days</span></span>
                <span className="tabular font-medium">{m(s.owed)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rows.length > 0 && view.shortfall.minor === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft"><Check size={15} className="text-ok" aria-hidden="true" />Everything here is within the cash you have.</p>
      ) : null}
    </div>
  );
}
