"use client";
import { Check, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hsnByCode, searchHsn, type HsnEntry } from "@/lib/countries/hsn";

/**
 * Pick what you sell and the HSN or SAC code fills itself in. Typing a code works too, for people
 * who already know theirs. The suggested GST rate is offered, never forced.
 */
export default function HsnPicker({ value, description, onPick }: { value?: string; description?: string; onPick: (entry: HsnEntry) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const results = searchHsn(query || description || "", 6);
  const chosen = value ? hsnByCode(value) : undefined;

  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const choose = (entry: HsnEntry) => { onPick(entry); setQuery(""); setOpen(false); };

  return (
    <div ref={box} className="relative">
      <label className="label" htmlFor={`hsn-${value ?? "new"}`}>HSN or SAC code</label>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 focus-within:border-forest">
        <Search size={15} className="shrink-0 text-ink-faint" aria-hidden="true" />
        <input
          id={`hsn-${value ?? "new"}`}
          className="w-full bg-transparent py-2 text-sm outline-none"
          value={query || (value ?? "")}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter" && open && results[active]) { e.preventDefault(); choose(results[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Type what you sell, such as website or rice"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="hsn-results"
          autoComplete="off"
        />
      </div>
      {chosen && !query ? <p className="help mt-1 text-xs text-ink-faint">{chosen.label}, usually {chosen.rate}% GST</p> : null}

      {open && results.length > 0 ? (
        <ul id="hsn-results" role="listbox" className="absolute z-30 mt-1 max-h-72 w-full min-w-[20rem] overflow-auto rounded-lg border border-line bg-white shadow-card">
          {results.map((e, i) => (
            <li key={e.code} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => choose(e)} className={`flex w-full items-start gap-2 px-3 py-2 text-left ${i === active ? "bg-forest-pale" : ""}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{e.label}</span>
                  <span className="block text-xs text-ink-faint">{e.kind === "service" ? "SAC" : "HSN"} {e.code}, usually {e.rate}% GST</span>
                </span>
                {value === e.code ? <Check size={15} className="mt-1 text-forest" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
          <li className="border-t border-line px-3 py-2 text-xs text-ink-faint">Rates are the usual ones after the September 2025 change. Check yours if the product is unusual.</li>
        </ul>
      ) : null}
    </div>
  );
}
