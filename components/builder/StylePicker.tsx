"use client";
import { PALETTES } from "@/lib/documents/palettes";
import { TEMPLATES, templateConfig } from "@/lib/documents/templates";
import type { DocumentData, TemplateId } from "@/lib/documents/types";

/** Layout and colour, the two choices that change how the document looks. */
export default function StylePicker({ doc, update }: { doc: DocumentData; update: (patch: Partial<DocumentData>) => void }) {
  const current = templateConfig(doc.template);
  const accent = doc.accentColor || "#0B3D2E";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-ink-faint">Layout</span>
        {TEMPLATES.map((t) => {
          const on = t.id === current.id;
          const colour = t.useAccent ? accent : "#98A2B3";
          return (
            <button key={t.id} type="button" onClick={() => update({ template: t.id as TemplateId })} aria-pressed={on} title={t.description}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm font-medium ${on ? "border-forest bg-forest-pale text-ink" : "border-line bg-white text-ink-soft hover:border-ink"}`}>
              <svg width="18" height="24" viewBox="0 0 18 24" aria-hidden="true" className="shrink-0">
                <rect x="0.5" y="0.5" width="17" height="23" rx="2" fill="#fff" stroke="#E1E5DE" />
                {t.header === "band" ? <rect x="1" y="1" width="16" height="3.5" fill={colour} /> : null}
                {t.header === "rule" ? <rect x="3" y="7" width="12" height="1" fill={colour} /> : null}
                {t.header === "stack" ? <rect x="6" y="3" width="6" height="1.6" rx="0.8" fill="#98A2B3" /> : null}
                {t.header !== "stack" ? <rect x={t.titleSide === "left" ? 3 : 10} y="3" width="5" height="1.8" rx="0.9" fill={colour} opacity={t.header === "band" ? 0 : 1} /> : null}
                <rect x="3" y={t.header === "rule" ? 10 : 9} width="12" height={t.table === "filled" ? 2.4 : 1} fill={t.table === "filled" ? colour : "#C7CEC5"} />
                {[0, 1, 2, 3].map((i) => <rect key={i} x="3" y={(t.header === "rule" ? 14 : 12.5) + i * (t.scale < 0.95 ? 2 : 2.6)} width="12" height="0.9" fill={t.zebra && i % 2 === 1 ? "#C7CEC5" : "#DCE1DA"} />)}
              </svg>
              {t.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-ink-faint">Colour</span>
        {PALETTES.map((p) => (
          <button key={p.id} type="button" onClick={() => update({ accentColor: p.accent })} title={p.name}
            aria-label={`${p.name} colour`} aria-pressed={accent.toLowerCase() === p.accent.toLowerCase()}
            className={`h-6 w-6 rounded-full border-2 ${accent.toLowerCase() === p.accent.toLowerCase() ? "border-ink" : "border-white"}`}
            style={{ background: p.accent }} />
        ))}
        <label className="ml-1 flex items-center gap-1 text-xs text-ink-faint">
          <span className="sr-only">Custom colour</span>
          <input type="color" value={accent} onChange={(e) => update({ accentColor: e.target.value })} className="h-6 w-8 cursor-pointer rounded border border-line bg-white" aria-label="Custom colour" />
        </label>
        {!current.useAccent ? <span className="text-xs text-ink-faint">This layout prints without colour</span> : null}
      </div>
    </div>
  );
}
