"use client";
import { BookmarkPlus, Check, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { store } from "@/lib/store/db";
import type { CatalogueItem } from "@/lib/store/types";
import type { LineItem } from "@/lib/documents/types";

/** Your usual services and products, with their rate, unit and code attached. */
export default function ItemPicker({ item, onPick }: { item: LineItem; onPick: (patch: Partial<LineItem>) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const results = store.findItems(query || item.description, 6);
  const known = store.items().some((i) => i.description.trim().toLowerCase() === item.description.trim().toLowerCase());

  useEffect(() => {
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const choose = (c: CatalogueItem) => {
    onPick({ description: c.description, rate: c.rate, unit: c.unit, code: c.code, taxRuleId: c.taxRuleId ?? item.taxRuleId });
    setQuery(""); setOpen(false); setSaved(false);
  };

  const save = () => {
    if (!item.description.trim()) return;
    store.saveItem({ description: item.description, rate: item.rate, unit: item.unit, code: item.code, taxRuleId: item.taxRuleId });
    setSaved(true);
  };

  return (
    <div ref={box} className="relative">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink">
          <Search size={14} />{results.length ? "Use a saved item" : "Nothing saved yet"}
        </button>
        {item.description.trim() && !known ? (
          <button type="button" onClick={save} className="inline-flex items-center gap-1.5 text-xs font-medium text-forest hover:underline">
            {saved ? <><Check size={14} />Saved</> : <><BookmarkPlus size={14} />Save this item</>}
          </button>
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <>
          <div className="mt-1 rounded-lg border border-line bg-white p-1 shadow-card">
            <input
              className="w-full rounded px-2 py-1.5 text-sm outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your saved items"
              aria-label="Search your saved items"
              autoFocus
            />
            <ul role="listbox" className="max-h-56 overflow-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => choose(c)} className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-forest-pale">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{c.description}</span>
                      {c.code ? <span className="text-xs text-ink-faint">{c.code}</span> : null}
                    </span>
                    <span className="shrink-0 text-sm tabular text-ink-soft">{c.rate.toLocaleString("en-IN")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
