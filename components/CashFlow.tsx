"use client";
import { useState } from "react";
import { forecast, windowOf } from "@/lib/analysis/cashflow";
import { formatDate, todayIso } from "@/lib/format";
import { formatMoney, fromMinor } from "@/lib/money";
import { useHydrated, useWorkspace } from "@/lib/store/useStore";

/** What the next few weeks look like, with the guesswork labelled as guesswork. */
export default function CashFlow() {
  const [ws, db] = useWorkspace();
  const ready = useHydrated();
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [minimum, setMinimum] = useState(0);

  if (!ready) return <div className="h-72 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  const currency = ws.profile?.currency ?? "INR";
  const today = todayIso();
  const f = forecast(db.documents(), db.expenses(), today, currency, 90, minimum * 100);
  const view = windowOf(f, days);
  const m = (v: { minor: number; currency: string }) => formatMoney(v, "en-IN");

  const points = f.points.slice(0, days);
  const values = [f.openingCash.minor, ...points.map((p) => p.balance.minor)];
  const high = Math.max(...values, 1);
  const low = Math.min(...values, 0);
  const span = high - low || 1;
  const path = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - low) / span) * 100}`).join(" ");
  const zeroLine = 100 - ((0 - low) / span) * 100;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Cash</h1>
          <p className="mt-1 text-ink-soft">Where the money is likely to be, from the invoices and bills you have recorded.</p>
        </div>
        <div className="flex gap-1.5">
          {([30, 60, 90] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${days === d ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{d} days</button>
          ))}
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cash now" value={m(f.openingCash)} sub="In the books today" strong />
        <Stat label={`Expected in, ${days} days`} value={m(view.inflow)} sub={f.atRisk.minor > 0 ? `${m(f.atRisk)} of it already overdue` : "From invoices due"} />
        <Stat label={`Expected out, ${days} days`} value={m(view.outflow)} sub={`About ${m(f.monthlyBurn)} a month`} />
        <Stat label={`Left after ${days} days`} value={m(view.closing)} sub={view.closing.minor < 0 ? "This does not cover it" : "If everything lands as assumed"} tone={view.closing.minor < 0 ? "bad" : undefined} />
      </dl>

      {f.runwayDays !== null ? (
        <p className="rounded-xl border border-bad/30 bg-bad/5 p-4 text-sm text-bad">
          At this rate the balance goes below zero in {f.runwayDays} days, around {formatDate(f.points[f.runwayDays - 1].date, ws.profile?.country ?? "IN")}. That assumes every unpaid invoice arrives when it is due, which is the optimistic case.
        </p>
      ) : null}

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg">Projected balance</h2>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Warn me below
            <input type="number" className="field w-32 tabular" value={minimum || ""} onChange={(e) => setMinimum(Number(e.target.value) || 0)} placeholder="0" />
          </label>
        </div>

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mt-4 h-48 w-full" role="img" aria-label={`Projected cash balance over ${days} days`}>
          {low < 0 ? <line x1="0" y1={zeroLine} x2="100" y2={zeroLine} stroke="#B42318" strokeWidth="0.4" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" /> : null}
          <polyline points={path} fill="none" stroke="#0B3D2E" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between text-xs text-ink-faint">
          <span>{formatDate(today, ws.profile?.country ?? "IN")}: {m(f.openingCash)}</span>
          <span>{formatDate(points[points.length - 1].date, ws.profile?.country ?? "IN")}: {m(view.closing)}</span>
        </div>

        {f.dipsBelowOn ? (
          <p className="mt-3 text-sm text-warn">Projected to fall below your {m(fromMinor(minimum * 100, currency))} threshold on {formatDate(f.dipsBelowOn, ws.profile?.country ?? "IN")}.</p>
        ) : null}
      </section>

      <section className="card overflow-hidden">
        <h2 className="px-5 pt-5 font-display text-lg">What is expected, and when</h2>
        <p className="px-5 pb-3 text-sm text-ink-soft">Only days with something dated are listed. The rest carries the running cost.</p>
        <table className="w-full border-collapse text-sm">
          <thead className="bg-canvas text-left">
            <tr><th className="px-5 py-2.5 font-semibold">Date</th><th className="px-5 py-2.5 text-right font-semibold">In</th><th className="px-5 py-2.5 text-right font-semibold">Out</th><th className="px-5 py-2.5 text-right font-semibold">Balance</th><th className="px-5 py-2.5 font-semibold">Basis</th></tr>
          </thead>
          <tbody>
            {points.filter((p) => p.basis === "known").slice(0, 15).map((p) => (
              <tr key={p.date} className="border-t border-line">
                <td className="px-5 py-2.5 tabular">{formatDate(p.date, ws.profile?.country ?? "IN")}</td>
                <td className="px-5 py-2.5 text-right tabular text-ok">{p.inflow.minor ? m(p.inflow) : ""}</td>
                <td className="px-5 py-2.5 text-right tabular text-bad">{p.outflow.minor ? m(p.outflow) : ""}</td>
                <td className="px-5 py-2.5 text-right tabular">{m(p.balance)}</td>
                <td className="px-5 py-2.5 text-xs text-ink-faint">Dated invoice or bill</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-sm text-ink-faint">
        This is a projection, not a fact. It assumes unpaid invoices arrive on their due date, that anything already overdue turns up within a week, and that you keep spending at the rate of the last three months.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, strong, tone }: { label: string; value: string; sub?: string; strong?: boolean; tone?: "bad" }) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? "border-forest bg-forest-pale" : "border-line bg-white"}`}>
      <dt className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd className={`tabular font-display font-semibold ${strong ? "text-3xl" : "text-2xl"} ${tone === "bad" ? "text-bad" : ""}`}>{value}</dd>
      {sub ? <dd className="mt-1 text-sm text-ink-soft">{sub}</dd> : null}
    </div>
  );
}
