"use client";
import { useId } from "react";

export function Num({ label, value, onChange, unit, hint, step = "any", min }: { label: string; value: number; onChange: (n: number) => void; unit?: string; hint?: string; step?: string; min?: number }) {
  const id = useId();
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input id={id} type="number" inputMode="decimal" step={step} min={min} className="field tabular text-base" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))} />
        {unit ? <span className="shrink-0 text-sm text-ink-faint">{unit}</span> : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return <div><label className="label" htmlFor={id}>{label}</label><input id={id} type="date" className="field text-base" value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

export function Choice<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: Array<[T, string]> }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={v === value}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${v === value ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export function Result({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? "border-forest bg-forest-pale" : "border-line bg-white"}`}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
      <p className={`tabular ${strong ? "font-display text-3xl font-semibold" : "text-xl font-medium"}`}>{value}</p>
      {sub ? <p className="mt-1 text-sm text-ink-soft">{sub}</p> : null}
    </div>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  return <div className="card p-5 sm:p-6">{children}</div>;
}
