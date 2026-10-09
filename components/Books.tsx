"use client";
import { useState } from "react";
import { formatDate, todayIso } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { trialBalance } from "@/lib/ledger/journal";
import { ledgerFor } from "@/lib/ledger/posting";
import { balanceSheet, cashFlow, profitAndLoss } from "@/lib/ledger/statements";
import { financialYear, monthPeriod, quarterPeriod, type Period } from "@/lib/store/reports";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

type Choice = "month" | "quarter" | "year";
type View = "profit" | "position" | "cash" | "journals";

/**
 * The accounts, kept in plain language, with the journal view for anyone who wants it.
 * Everything here is derived from the same double-entry ledger, so the three statements agree.
 */
export default function Books() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const [choice, setChoice] = useState<Choice>("year");
  const [anchor, setAnchor] = useState(todayIso());
  const [view, setView] = useState<View>("profit");

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const currency = ws.profile?.currency ?? "INR";
  const period: Period = choice === "month" ? monthPeriod(anchor) : choice === "quarter" ? quarterPeriod(anchor) : financialYear(anchor);
  const ledger = ledgerFor(db.documents(), db.expenses(), currency);
  const pl = profitAndLoss(ledger, currency, period.from, period.to);
  const bs = balanceSheet(ledger, currency, period.to);
  const cf = cashFlow(ledger, currency, period.from, period.to);
  const tb = trialBalance(ledger, currency, period.to);
  const m = (v: { minor: number; currency: string }) => formatMoney(v, "en-IN");

  const entriesInPeriod = ledger.filter((e) => e.date >= period.from && e.date <= period.to);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Accounts</h1>
          <p className="mt-1 text-ink-soft">{period.label}. Built from your invoices and expenses, nothing typed twice.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex gap-1.5">
            {([["month", "Month"], ["quarter", "Quarter"], ["year", "Year"]] as Array<[Choice, string]>).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setChoice(v)} aria-pressed={choice === v}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${choice === v ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{l}</button>
            ))}
          </div>
          <input type="date" className="field w-auto" value={anchor} onChange={(e) => setAnchor(e.target.value)} aria-label="Any date in the period" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line pb-3" role="tablist" aria-label="Which statement">
        {([["profit", "Did we make money"], ["position", "What we own and owe"], ["cash", "Where the cash went"], ["journals", "Accountant mode"]] as Array<[View, string]>).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={view === v} type="button" onClick={() => setView(v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === v ? "bg-forest text-white" : "text-ink-soft hover:bg-white"}`}>{l}</button>
        ))}
      </div>

      {view === "profit" ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="card overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <tbody>
                <tr className="bg-canvas"><th colSpan={2} className="px-5 py-2 text-left font-semibold">What you earned</th></tr>
                {pl.income.map((r) => <tr key={r.code} className="border-t border-line"><td className="px-5 py-2">{r.name}</td><td className="px-5 py-2 text-right tabular">{m(r.balance)}</td></tr>)}
                <tr className="border-t border-line font-semibold"><td className="px-5 py-2">Total income</td><td className="px-5 py-2 text-right tabular">{m(pl.totalIncome)}</td></tr>

                <tr className="bg-canvas"><th colSpan={2} className="px-5 py-2 text-left font-semibold">What it cost</th></tr>
                {pl.expenses.map((r) => <tr key={r.code} className="border-t border-line"><td className="px-5 py-2">{r.name}</td><td className="px-5 py-2 text-right tabular">{m(r.balance)}</td></tr>)}
                <tr className="border-t border-line font-semibold"><td className="px-5 py-2">Total costs</td><td className="px-5 py-2 text-right tabular">{m(pl.totalExpenses)}</td></tr>
              </tbody>
            </table>
          </section>
          <div className="space-y-3">
            <div className="rounded-xl border border-forest bg-forest-pale p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">Profit for {period.label}</p>
              <p className="tabular font-display text-3xl font-semibold">{m(pl.netProfit)}</p>
              <p className="mt-1 text-sm text-ink-soft">{pl.marginPct}% of what you earned</p>
            </div>
            <p className="text-sm text-ink-soft">
              Tax you charged customers is not income: you are holding it for the government, so it never appears here. Tax you paid on purchases is not a cost either, where you can reclaim it.
            </p>
          </div>
        </div>
      ) : null}

      {view === "position" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card overflow-hidden">
            <h2 className="px-5 pt-5 font-display text-lg">What you own</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <tbody>
                {bs.assets.map((r) => <tr key={r.code} className="border-t border-line"><td className="px-5 py-2">{r.name}</td><td className="px-5 py-2 text-right tabular">{m(r.balance)}</td></tr>)}
                <tr className="border-t border-line font-semibold"><td className="px-5 py-2">Total</td><td className="px-5 py-2 text-right tabular">{m(bs.totalAssets)}</td></tr>
              </tbody>
            </table>
          </section>
          <section className="card overflow-hidden">
            <h2 className="px-5 pt-5 font-display text-lg">What you owe, and what is left</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <tbody>
                {bs.liabilities.map((r) => <tr key={r.code} className="border-t border-line"><td className="px-5 py-2">{r.name}</td><td className="px-5 py-2 text-right tabular">{m(r.balance)}</td></tr>)}
                <tr className="border-t border-line font-semibold"><td className="px-5 py-2">Total owed</td><td className="px-5 py-2 text-right tabular">{m(bs.totalLiabilities)}</td></tr>
                <tr className="border-t border-line"><td className="px-5 py-2">Profit kept in the business</td><td className="px-5 py-2 text-right tabular">{m(bs.retained)}</td></tr>
                <tr className="border-t border-line font-semibold"><td className="px-5 py-2">Yours</td><td className="px-5 py-2 text-right tabular">{m(bs.totalEquity)}</td></tr>
              </tbody>
            </table>
            <p className={`px-5 pb-5 pt-3 text-sm ${bs.balanced ? "text-ink-faint" : "text-bad"}`}>
              {bs.balanced ? "What you own matches what you owe plus what is yours, as it must." : "These do not balance, which means something is wrong. Please tell us what you did before this appeared."}
            </p>
          </section>
        </div>
      ) : null}

      {view === "cash" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="card p-5">
            <h2 className="font-display text-lg">Cash in {period.label}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink-soft">Started with</dt><dd className="tabular">{m(cf.opening)}</dd></div>
              <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink-soft">Came in</dt><dd className="tabular text-ok">{m(cf.received)}</dd></div>
              <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink-soft">Went out</dt><dd className="tabular text-bad">{m(cf.spent)}</dd></div>
              <div className="flex justify-between pt-1 font-semibold"><dt>Left at the end</dt><dd className="tabular">{m(cf.closing)}</dd></div>
            </dl>
          </section>
          <section className="card p-5">
            <h2 className="font-display text-lg">By account</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead><tr className="border-b border-line text-left text-ink-soft"><th className="py-2 font-semibold">Account</th><th className="py-2 text-right font-semibold">Moved</th><th className="py-2 text-right font-semibold">Balance</th></tr></thead>
              <tbody>
                {cf.byAccount.map((a) => (
                  <tr key={a.code} className="border-b border-line"><td className="py-2">{a.name}</td><td className="py-2 text-right tabular">{m(a.movement)}</td><td className="py-2 text-right tabular">{m(a.closing)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {view === "journals" ? (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 text-sm ${tb.balanced ? "border-line bg-white text-ink-soft" : "border-bad bg-bad/5 text-bad"}`}>
            Trial balance to {formatDate(period.to, ws.profile?.country ?? "IN")}: debits {m(tb.debit)}, credits {m(tb.credit)}. {tb.balanced ? "In balance." : "Out of balance, which should never happen."}
          </div>
          <section className="card overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-canvas text-left">
                <tr><th className="px-4 py-2.5 font-semibold">Date</th><th className="px-4 py-2.5 font-semibold">Narration</th><th className="px-4 py-2.5 font-semibold">Account</th><th className="px-4 py-2.5 text-right font-semibold">Debit</th><th className="px-4 py-2.5 text-right font-semibold">Credit</th></tr>
              </thead>
              <tbody>
                {entriesInPeriod.flatMap((e) => e.lines.map((l, i) => (
                  <tr key={`${e.id}-${i}`} className={i === 0 ? "border-t border-line" : ""}>
                    <td className="px-4 py-1.5 tabular text-ink-soft">{i === 0 ? formatDate(e.date, ws.profile?.country ?? "IN") : ""}</td>
                    <td className="px-4 py-1.5">{i === 0 ? e.narration : ""}</td>
                    <td className="px-4 py-1.5 tabular text-ink-soft">{l.account}</td>
                    <td className="px-4 py-1.5 text-right tabular">{l.debit ? m({ minor: l.debit, currency }) : ""}</td>
                    <td className="px-4 py-1.5 text-right tabular">{l.credit ? m({ minor: l.credit, currency }) : ""}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </section>
          <p className="text-sm text-ink-faint">Entries are derived from your documents and expenses. Nothing here is edited in place: a correction posts a reversal, so the history survives.</p>
        </div>
      ) : null}
    </div>
  );
}
