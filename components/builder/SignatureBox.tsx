"use client";
import { Eraser, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DocumentData } from "@/lib/documents/types";

/** Trim the blank edges so the signature sits tight on the invoice. */
function trim(c: HTMLCanvasElement): string {
  const ctx = c.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return "";
  const pad = 6;
  const out = document.createElement("canvas");
  out.width = x1 - x0 + pad * 2; out.height = y1 - y0 + pad * 2;
  out.getContext("2d")!.drawImage(c, x0 - pad, y0 - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

export default function SignatureBox({ doc, update }: { doc: DocumentData; update: (patch: Partial<DocumentData>) => void }) {
  const mode = doc.signMode ?? "none";
  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<[number, number] | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c || mode !== "image") return;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#121712"; ctx.lineWidth = 2.2;
  }, [mode, tab]);

  const at = (e: React.PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const onUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ signatureDataUrl: String(reader.result), signMode: "image" });
    reader.readAsDataURL(file);
  };

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg">Signature</h2>
      <p className="mt-1 text-sm text-ink-soft">Sign it if you want to. If you skip it, the invoice says so in the accepted wording.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {([["none", "No signature"], ["image", "Sign it"], ["line", "Leave a blank line"]] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => update({ signMode: value })}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${mode === value ? "border-forest bg-forest text-white" : "border-line bg-white text-ink-soft hover:border-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === "none" ? (
        <p className="mt-3 rounded-lg bg-forest-pale p-3 text-sm text-ink-soft">The document will carry the line: This is an electronically generated invoice and does not require a signature.</p>
      ) : null}

      {mode === "line" ? (
        <p className="mt-3 text-sm text-ink-soft">A ruled line and the words Authorised signature will be printed, for signing by hand after you print it.</p>
      ) : null}

      {mode === "image" ? (
        <div className="mt-3">
          <div className="mb-2 flex gap-1" role="tablist" aria-label="How to sign">
            {(["draw", "upload"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-ink text-white" : "text-ink-soft hover:bg-canvas"}`}>{t}</button>
            ))}
          </div>

          {tab === "draw" ? (
            <canvas
              ref={canvas}
              className="h-32 w-full max-w-sm cursor-crosshair touch-none rounded-lg border border-dashed border-line bg-white"
              aria-label="Draw your signature here"
              role="img"
              onPointerDown={(e) => { canvas.current!.setPointerCapture(e.pointerId); drawing.current = true; last.current = at(e); }}
              onPointerMove={(e) => {
                if (!drawing.current || !last.current) return;
                const ctx = canvas.current!.getContext("2d")!;
                const p = at(e);
                ctx.beginPath(); ctx.moveTo(...last.current); ctx.lineTo(...p); ctx.stroke();
                last.current = p;
              }}
              onPointerUp={() => { if (!drawing.current) return; drawing.current = false; last.current = null; update({ signatureDataUrl: trim(canvas.current!) }); }}
              onPointerLeave={() => { if (!drawing.current) return; drawing.current = false; last.current = null; update({ signatureDataUrl: trim(canvas.current!) }); }}
            />
          ) : (
            <label className="btn-ghost inline-flex cursor-pointer">
              <Upload size={16} />Choose a picture of your signature
              <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => onUpload(e.target.files?.[0])} />
            </label>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-quiet" onClick={() => { const c = canvas.current; if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height); update({ signatureDataUrl: undefined }); }}>
              <Eraser size={15} />Clear
            </button>
            {doc.signatureDataUrl ? <span className="text-sm text-ok">Signature ready</span> : <span className="text-sm text-ink-faint">Nothing signed yet</span>}
          </div>
        </div>
      ) : null}

      {mode !== "none" ? (
        <div className="mt-4 max-w-sm">
          <label className="label" htmlFor="signatory">Name under the signature</label>
          <input id="signatory" className="field" value={doc.signatoryName || ""} onChange={(e) => update({ signatoryName: e.target.value })} placeholder="Asha Verma, Partner" />
        </div>
      ) : null}
    </section>
  );
}
