"use client";
import { AlertTriangle, Check, Download, FilePlus2, FolderOpen, Printer, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { DocumentKind } from "@/lib/documents/types";
import { buildPdf, documentFileName } from "@/lib/documents/pdf";
import Editor from "./Editor";
import Preview from "./Preview";
import StylePicker from "./StylePicker";
import TotalsBar from "./TotalsBar";
import { useDocument } from "./state";

export default function Builder({ kind }: { kind: DocumentKind }) {
  const s = useDocument(kind);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  /**
   * Downloading is the moment a document stops being a draft, so it saves itself and is marked
   * sent. That is what makes the documents list and the dashboard useful without extra clicks.
   */
  const download = async () => {
    setBusy(true); setError("");
    try {
      const blob = await buildPdf(s.doc);
      s.save("sent");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = documentFileName(s.doc);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The PDF could not be created.");
    } finally { setBusy(false); }
  };

  if (!s.loaded) return <div className="h-96 animate-pulse rounded-xl border border-line bg-white/60" aria-hidden="true" />;

  return (
    <div>
      <div className="no-print sticky top-0 z-20 -mx-4 mb-4 space-y-3 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-white p-0.5 lg:hidden" role="tablist" aria-label="Edit or preview">
          {(["edit", "preview"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-forest text-white" : "text-ink-soft"}`}>{t}</button>
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={download} disabled={busy}><Download size={16} />{busy ? "Making your PDF" : "Download PDF"}</button>
        <button type="button" className="btn-ghost" onClick={() => { s.save(); setJustSaved(true); setTimeout(() => setJustSaved(false), 2500); }}>
          {justSaved ? <><Check size={16} className="text-ok" />Saved</> : <><Save size={16} />{s.savedId ? "Update saved copy" : "Save"}</>}
        </button>
        <button type="button" className="btn-ghost" onClick={() => window.print()}><Printer size={16} />Print</button>
        <Link href="/documents" className="btn-quiet"><FolderOpen size={15} />Your documents</Link>
        <div className="order-last w-full lg:order-none lg:ml-4 lg:w-auto"><StylePicker doc={s.doc} update={s.update} /></div>
        <button type="button" className="btn-quiet ml-auto" onClick={() => {
          if (s.savedId || confirm("Start a new one? Anything unsaved here will be cleared.")) s.reset();
        }}><FilePlus2 size={15} />New</button>
      </div>
      <TotalsBar doc={s.doc} totals={s.totals} />
      </div>

      {error ? <p role="alert" className="mb-4 rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm text-bad">{error}</p> : null}

      {s.totals.warnings.length > 0 ? (
        <ul className="no-print mb-6 space-y-1 rounded-lg border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
          {s.totals.warnings.map((w) => <li key={w} className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{w}</li>)}
        </ul>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className={tab === "edit" ? "" : "hidden lg:block"}>
          <Editor doc={s.doc} totals={s.totals} update={s.update} updateItem={s.updateItem} addItem={s.addItem} removeItem={s.removeItem} moveItem={s.moveItem} setCountry={s.setCountry} />
        </div>
        <div className={`lg:sticky lg:top-24 lg:self-start ${tab === "preview" ? "" : "hidden lg:block"}`}>
          <div className="overflow-auto rounded-xl bg-line/40 p-2 sm:p-4">
            <Preview doc={s.doc} totals={s.totals} />
          </div>
          <p className="no-print mt-3 text-center text-xs text-ink-faint">
            Downloading also saves this to <Link href="/documents" className="underline">your documents</Link>, so you can mark it paid later.
          </p>
        </div>
      </div>
    </div>
  );
}
