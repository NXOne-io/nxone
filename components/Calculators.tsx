"use client";
import { useMemo, useState } from "react";
import { breakEven, discount, dueDate, hourlyRate, lateFee, margin, marginToMarkup, markupToMargin, priceForMargin, priceForMarkup, round2, taxOnPrice } from "@/lib/calc";
import { PACKS, packFor } from "@/lib/countries/packs";
import { rulesOn } from "@/lib/countries/types";
import { Choice, DateField, Num, Panel, Result } from "./Fields";

const money = (n: number, currency = "INR") =>
  Number.isFinite(n) ? new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(n) : "not set";
const pct = (n: number) => (Number.isFinite(n) ? `${round2(n)}%` : "not set");
const today = () => new Date().toISOString().slice(0, 10);

export function ProfitMargin() {
  const [revenue, setRevenue] = useState(100000);
  const [cost, setCost] = useState(62000);
  const r = useMemo(() => margin(revenue || 0, cost || 0), [revenue, cost]);
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="Selling price or revenue" value={revenue} onChange={setRevenue} unit="₹" />
        <Num label="Cost of what you sold" value={cost} onChange={setCost} unit="₹" hint="Materials, labour and anything that only exists because you made the sale." />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Result label="Profit" value={money(r.profit)} strong />
        <Result label="Margin" value={pct(r.marginPct)} sub="Share of the price you keep" />
        <Result label="Markup" value={pct(r.markupPct)} sub="What you added on top of cost" />
      </div>
      {r.profit < 0 ? <p className="mt-3 text-sm text-bad">You are selling below cost. Every sale at this price loses money.</p> : null}
    </Panel>
  );
}

export function Markup() {
  const [cost, setCost] = useState(600);
  const [mode, setMode] = useState<"markup" | "margin">("markup");
  const [rate, setRate] = useState(40);
  const price = mode === "markup" ? priceForMarkup(cost || 0, rate || 0) : priceForMargin(cost || 0, rate || 0);
  const other = mode === "markup" ? markupToMargin(rate || 0) : marginToMarkup(rate || 0);
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-3">
        <Num label="Cost" value={cost} onChange={setCost} unit="₹" />
        <Choice label="Work from" value={mode} onChange={setMode} options={[["markup", "Markup on cost"], ["margin", "Margin on price"]]} />
        <Num label={mode === "markup" ? "Markup" : "Margin"} value={rate} onChange={setRate} unit="%" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Result label="Selling price" value={Number.isFinite(price) ? money(price) : "Not possible"} strong />
        <Result label="Profit per unit" value={Number.isFinite(price) ? money(price - (cost || 0)) : "not set"} />
        <Result label={mode === "markup" ? "That is a margin of" : "That is a markup of"} value={Number.isFinite(other) ? pct(other) : "not set"} />
      </div>
      {mode === "margin" && rate >= 100 ? <p className="mt-3 text-sm text-bad">A margin of 100% or more is impossible: the price would have to be infinite.</p> : null}
    </Panel>
  );
}

export function BreakEven() {
  const [fixed, setFixed] = useState(250000);
  const [price, setPrice] = useState(1500);
  const [variable, setVariable] = useState(900);
  const [current, setCurrent] = useState(500);
  const r = useMemo(() => breakEven(fixed || 0, price || 0, variable || 0, current || undefined), [fixed, price, variable, current]);
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="Fixed costs a month" value={fixed} onChange={setFixed} unit="₹" hint="Rent, salaries, software: what you pay whether or not you sell anything." />
        <Num label="Price per unit" value={price} onChange={setPrice} unit="₹" />
        <Num label="Variable cost per unit" value={variable} onChange={setVariable} unit="₹" hint="Materials, packaging, payment fees: what each sale costs you." />
        <Num label="Units you sell now" value={current} onChange={setCurrent} hint="Optional, for the cushion below." />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Result label="Break even" value={r.impossible ? "Never" : `${r.units.toLocaleString("en-IN")} units`} sub={r.impossible ? undefined : `${money(r.revenue)} of sales`} strong />
        <Result label="Contribution per unit" value={money(r.contributionPerUnit)} sub={`${pct(r.contributionMarginPct)} of the price`} />
        <Result label={r.profitAtVolume !== undefined ? "Profit at that volume" : "Margin of safety"} value={r.profitAtVolume !== undefined ? money(r.profitAtVolume) : "not set"} sub={r.marginOfSafetyPct !== undefined ? `Sales can fall ${pct(r.marginOfSafetyPct)} before you lose money` : undefined} />
      </div>
      {r.impossible ? <p className="mt-3 text-sm text-bad">Each unit costs more to make than it sells for, so no volume gets you to break even. Raise the price or cut the variable cost.</p> : null}
    </Panel>
  );
}

export function LateFee() {
  const [amount, setAmount] = useState(100000);
  const [due, setDue] = useState("2026-01-01");
  const [asOf, setAsOf] = useState(today());
  const [rate, setRate] = useState(1.5);
  const [basis, setBasis] = useState<"monthly" | "annual">("monthly");
  const [grace, setGrace] = useState(0);
  const r = useMemo(() => lateFee(amount || 0, due, asOf, rate || 0, basis, grace || 0), [amount, due, asOf, rate, basis, grace]);
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="Invoice amount" value={amount} onChange={setAmount} unit="₹" />
        <Num label="Interest rate" value={rate} onChange={setRate} unit="%" hint="Whatever your invoice or contract says. 1.5% a month is common in India." />
        <DateField label="Due date" value={due} onChange={setDue} />
        <DateField label="Paid on, or today" value={asOf} onChange={setAsOf} />
        <Choice label="Rate is" value={basis} onChange={setBasis} options={[["monthly", "Per month"], ["annual", "Per year"]]} />
        <Num label="Grace period" value={grace} onChange={setGrace} unit="days" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Result label="Days late" value={r.daysLate.toLocaleString("en-IN")} />
        <Result label="Interest" value={money(r.interest)} sub={`Simple interest at ${r.dailyRatePct}% a day`} />
        <Result label="Total now owed" value={money(r.total)} strong />
      </div>
      <p className="mt-3 text-sm text-ink-faint">Interest is simple, not compounded, which is how a late payment clause normally works. You can only charge it if your invoice or contract says so.</p>
    </Panel>
  );
}

export function Discount() {
  const [price, setPrice] = useState(2499);
  const [first, setFirst] = useState(20);
  const [second, setSecond] = useState(0);
  const r = discount(price || 0, first || 0, second || 0);
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-3">
        <Num label="List price" value={price} onChange={setPrice} unit="₹" />
        <Num label="Discount" value={first} onChange={setFirst} unit="%" />
        <Num label="Extra discount" value={second} onChange={setSecond} unit="%" hint="For offers such as an extra 10% at checkout." />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Result label="You pay" value={money(r.final)} strong />
        <Result label="You save" value={money(r.saved)} />
        <Result label="Real discount" value={pct(r.effectivePct)} sub={second ? `${first}% and ${second}% is not ${first + second}%` : undefined} />
      </div>
    </Panel>
  );
}

export function HourlyRate() {
  const [income, setIncome] = useState(1200000);
  const [costs, setCosts] = useState(200000);
  const [hours, setHours] = useState(25);
  const [weeks, setWeeks] = useState(46);
  const r = hourlyRate(income || 0, costs || 0, hours || 0, weeks || 0);
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="What you want to earn a year" value={income} onChange={setIncome} unit="₹" />
        <Num label="Business costs a year" value={costs} onChange={setCosts} unit="₹" hint="Software, equipment, travel, insurance, an accountant." />
        <Num label="Billable hours a week" value={hours} onChange={setHours} hint="Rarely more than 25 to 30. Admin, sales and email are not billable." />
        <Num label="Working weeks a year" value={weeks} hint="52 minus holidays and illness." onChange={setWeeks} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Result label="Charge per hour" value={money(r.rate)} strong />
        <Result label="Day rate" value={money(r.dayRate)} sub="Eight billable hours" />
        <Result label="Billable hours a year" value={r.billableHours.toLocaleString("en-IN")} />
      </div>
    </Panel>
  );
}

export function TaxCalculator() {
  const [country, setCountry] = useState("IN");
  const [amount, setAmount] = useState(10000);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [rate, setRate] = useState(18);
  const [interState, setInterState] = useState(false);

  const pack = packFor(country);
  const today = new Date().toISOString().slice(0, 10);
  const rates = useMemo(() => {
    const seen = new Set<number>();
    return rulesOn(pack, today).filter((r) => (seen.has(r.rate) ? false : seen.add(r.rate))).map((r) => r.rate).sort((a, b) => a - b);
  }, [pack, today]);

  const split = pack.code === "IN" ? (interState ? "igst" : "cgst-sgst") : "none";
  const r = taxOnPrice(amount || 0, rate || 0, mode, split as "cgst-sgst" | "igst" | "none");
  const cur = (n: number) => new Intl.NumberFormat(pack.locale, { style: "currency", currency: pack.currency, maximumFractionDigits: 2 }).format(n);

  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="taxcountry">Country</label>
          <select id="taxcountry" className="field text-base" value={country} onChange={(e) => { setCountry(e.target.value); const next = rulesOn(packFor(e.target.value), today).find((x) => x.category === "standard"); if (next) setRate(next.rate); }}>
            {PACKS.filter((p) => p.taxSystem !== "NONE").map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        <Num label={`Amount ${mode === "add" ? `before ${pack.taxLabel}` : `including ${pack.taxLabel}`}`} value={amount} onChange={setAmount} />
        <Choice label="What do you want" value={mode} onChange={setMode} options={[["add", `Add ${pack.taxLabel}`], ["remove", `Remove ${pack.taxLabel}`]]} />
        <div>
          <span className="label">{pack.taxLabel} rate</span>
          <div className="flex flex-wrap gap-1.5">
            {rates.map((x) => (
              <button key={x} type="button" onClick={() => setRate(x)} aria-pressed={rate === x}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${rate === x ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{x}%</button>
            ))}
          </div>
        </div>
      </div>

      {pack.code === "IN" ? (
        <label className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={interState} onChange={(e) => setInterState(e.target.checked)} />
          Supply to another state, so IGST rather than CGST and SGST
        </label>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Result label={`Before ${pack.taxLabel}`} value={cur(r.taxable)} />
        <Result label={`${pack.taxLabel} at ${rate}%`} value={cur(r.tax)} sub={r.parts.map((p) => `${p.label}: ${cur(p.amount)}`).join("  ")} />
        <Result label={`Including ${pack.taxLabel}`} value={cur(r.gross)} strong />
      </div>
    </Panel>
  );
}

export function DueDate() {
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [days, setDays] = useState(30);
  const [basis, setBasis] = useState<"net" | "eom" | "on-receipt">("net");
  const r = dueDate(invoiceDate, days || 0, basis);
  const daysAway = Math.round((Date.parse(`${r.due}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000);

  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-3">
        <DateField label="Invoice date" value={invoiceDate} onChange={setInvoiceDate} />
        <Choice label="Terms" value={basis} onChange={setBasis} options={[["net", "Net days"], ["eom", "End of month"], ["on-receipt", "On receipt"]]} />
        {basis !== "on-receipt" ? <Num label="Days" value={days} onChange={setDays} /> : <div />}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Result label="Payment due" value={new Date(`${r.due}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} strong />
        <Result label="Days from the invoice" value={String(r.days)} sub={r.explanation} />
        <Result label="From today" value={daysAway >= 0 ? `${daysAway} days away` : `${Math.abs(daysAway)} days overdue`} />
      </div>
    </Panel>
  );
}
