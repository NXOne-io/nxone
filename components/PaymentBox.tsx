"use client";
import { looksLikeUpiId } from "@/lib/documents/payment";
import type { DocumentData } from "@/lib/documents/types";

/** How the customer pays, printed on the document so they do not have to ask. */
export default function PaymentBox({ doc, update }: { doc: DocumentData; update: (patch: Partial<DocumentData>) => void }) {
  const pay = doc.payment ?? {};
  const set = (patch: Partial<NonNullable<DocumentData["payment"]>>) => update({ payment: { ...pay, ...patch } });
  const upiOk = !pay.upiId || looksLikeUpiId(pay.upiId);

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg">Getting paid</h2>
      <p className="mt-1 text-sm text-ink-soft">A code they can scan beats bank details they have to retype.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {doc.country === "IN" ? (
          <div>
            <label className="label" htmlFor="upi">UPI id</label>
            <input id="upi" className="field" value={pay.upiId || ""} onChange={(e) => set({ upiId: e.target.value })} placeholder="acme@hdfcbank" />
            {!upiOk ? <p className="mt-1 text-xs text-warn">That does not look like a UPI id. They look like name@bank.</p> : null}
          </div>
        ) : null}
        <div>
          <label className="label" htmlFor="paylink">Payment link</label>
          <input id="paylink" className="field" value={pay.paymentLink || ""} onChange={(e) => set({ paymentLink: e.target.value })} placeholder="https://rzp.io/l/your-page" />
        </div>
      </div>

      {doc.country === "IN" && pay.upiId && upiOk ? (
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={pay.includeAmount !== false} onChange={(e) => set({ includeAmount: e.target.checked })} />
          Put the amount in the code, so they cannot pay the wrong figure
        </label>
      ) : null}
    </section>
  );
}
