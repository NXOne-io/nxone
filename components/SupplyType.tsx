"use client";
import type { DocumentData, DocumentTotals } from "@/lib/documents/types";

/**
 * Which taxes apply. Inside one state a supply carries CGST plus SGST, or UTGST in a union
 * territory without its own legislature. Between states, or for exports and SEZ supplies, it is
 * IGST alone. The boxes tick themselves from the place of supply, and you can overrule them.
 */
export default function SupplyType({ doc, totals, update }: { doc: DocumentData; totals: DocumentTotals; update: (patch: Partial<DocumentData>) => void }) {
  const { interRegion, automatic, stateTaxLabel } = totals.supply;
  const ready = Boolean(doc.seller.region && doc.placeOfSupply);

  const choose = (mode: "intra" | "inter") => update({ supplyType: interRegion === (mode === "inter") && !automatic ? "auto" : mode });

  const Box = ({ label, checked, onToggle, hint }: { label: string; checked: boolean; onToggle: () => void; hint: string }) => (
    <label className={`flex flex-1 cursor-pointer items-start gap-2 rounded-lg border p-3 ${checked ? "border-forest bg-forest-pale" : "border-line bg-white"}`}>
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={onToggle} />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-ink-faint">{hint}</span>
      </span>
    </label>
  );

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg">Which taxes apply</h2>
        <span className="chip">{automatic ? "Set from the place of supply" : "Set by you"}</span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {ready
          ? automatic
            ? interRegion
              ? `Your state and the place of supply are different, so this is treated as an inter-state supply and carries IGST.`
              : `Your state and the place of supply are the same, so this carries CGST and ${stateTaxLabel}.`
            : "You have set this by hand. Tick the other box to go back to matching the place of supply."
          : "Choose your state and the place of supply above, and these tick themselves."}
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Box
          label={`CGST + ${stateTaxLabel}`}
          checked={!interRegion}
          onToggle={() => choose("intra")}
          hint="Supplier and customer in the same state or union territory"
        />
        <Box
          label="IGST"
          checked={interRegion}
          onToggle={() => choose("inter")}
          hint="Different states, or exports, imports and SEZ supplies"
        />
      </div>

      {!automatic ? (
        <button type="button" className="btn-quiet mt-2" onClick={() => update({ supplyType: "auto" })}>Go back to deciding this automatically</button>
      ) : null}
    </section>
  );
}
