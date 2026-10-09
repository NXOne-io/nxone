"use client";
import { useEffect, useState } from "react";
import { packFor } from "@/lib/countries/packs";
import { kindConfig } from "@/lib/documents/kinds";
import { templateConfig } from "@/lib/documents/templates";
import type { DocumentData, DocumentTotals } from "@/lib/documents/types";
import { formatDate } from "@/lib/format";
import { formatMoney, numberToWords, toMajor } from "@/lib/money";
import { exportDeclaration } from "@/lib/documents/export";
import { looksLikeUpiId, qrDataUrl, upiUri } from "@/lib/documents/payment";

/** What the finished document looks like. The PDF is drawn from the same data and the same template. */
export default function Preview({ doc, totals }: { doc: DocumentData; totals: DocumentTotals }) {
  const qr = usePaymentQr(doc, totals);
  const pack = packFor(doc.country);
  const kind = kindConfig(doc.kind);
  const tpl = templateConfig(doc.template);
  const accent = tpl.useAccent ? doc.accentColor || "#0B3D2E" : "#121712";
  const title = doc.kind === "invoice" ? pack.invoiceTitle : kind.title;
  const m = (v: { minor: number; currency: string }) => formatMoney(v, pack.locale);
  const hasTax = totals.taxRows.length > 0;
  const cap = tpl.caps ? "uppercase tracking-wide" : "";
  const sz = (n: number) => ({ fontSize: `${n * tpl.scale}px` });
  const face = tpl.font === "serif" ? "font-display" : "font-sans";
  const air = (n: number) => ({ marginTop: `${n * tpl.air}rem` });
  const centred = tpl.header === "stack";

  const Small = ({ children }: { children: React.ReactNode }) => (
    <p className={`text-[0.68rem] font-semibold text-ink-faint ${cap}`}>{children}</p>
  );

  return (
    <div className={`mx-auto w-full max-w-[52rem] overflow-hidden bg-white text-ink shadow-card ${face}`} id="document-preview" style={sz(13)}>
      {tpl.header === "band" ? <div className="h-3 w-full" style={{ background: accent }} /> : null}

      <div className="p-8 sm:p-12" style={{ paddingTop: tpl.header === "band" ? "2rem" : undefined }}>
        <div className={centred
          ? "flex flex-col items-center gap-3 border-b border-line pb-6 text-center"
          : `flex flex-wrap items-start justify-between gap-6 pb-6 ${tpl.header === "rule" ? "border-b-2" : ""} ${tpl.titleSide === "left" ? "flex-row-reverse" : ""}`}
          style={tpl.header === "rule" ? { borderColor: accent } : undefined}>
          <div className={centred ? "flex flex-col items-center gap-2" : "flex items-start gap-4"}>
            {doc.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.logoDataUrl} alt="" className="max-h-16 max-w-[9rem] object-contain" />
            ) : null}
            <div className={centred ? "text-center" : ""}>
              <p className={`${face} font-semibold`} style={{ ...sz(centred ? 22 : 20), letterSpacing: centred ? "0.04em" : undefined }}>{doc.seller.name || "Your business name"}</p>
              {doc.seller.address ? <p className="mt-1 whitespace-pre-line text-ink-soft">{doc.seller.address}</p> : null}
              {[doc.seller.email, doc.seller.phone, doc.seller.website].filter(Boolean).map((x) => <p key={x} className="text-ink-soft">{x}</p>)}
              {doc.seller.taxId ? <p className="mt-1 text-ink-soft">{pack.taxIdLabel}: {doc.seller.taxId}</p> : null}
            </div>
          </div>
          <div className={centred ? "text-center" : tpl.titleSide === "left" ? "text-left" : "text-right"}>
            <p className={`${face} font-semibold`} style={{ color: accent, fontSize: `${20 * tpl.scale * tpl.titleScale}px`, letterSpacing: `${tpl.titleTracking}em`, textTransform: centred ? "uppercase" : undefined }}>{title}</p>
            <p className="mt-1 tabular text-ink-soft">{doc.number}</p>
            <p className="tabular text-ink-soft">Date: {formatDate(doc.issueDate, doc.country)}</p>
            {doc.dueDate && kind.secondDateLabel ? <p className="tabular text-ink-soft">{kind.secondDateLabel}: {formatDate(doc.dueDate, doc.country)}</p> : null}
            {doc.reference ? <p className="text-ink-soft">Ref: {doc.reference}</p> : null}
            {doc.buyerOrderRef ? <p className="text-ink-soft">Your order: {doc.buyerOrderRef}</p> : null}
            {kind.showPaidStamp ? <p className="mt-2 inline-block rounded border px-2 py-0.5 font-semibold" style={{ borderColor: accent, color: accent, ...sz(11) }}>PAID</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-6" style={air(1.5)}>
          <div>
            <Small>{kind.partyLabel}</Small>
            <p className="mt-1 font-semibold">{doc.buyer.name || "Customer name"}</p>
            {doc.buyer.address ? <p className="whitespace-pre-line text-ink-soft">{doc.buyer.address}</p> : null}
            {[doc.buyer.email, doc.buyer.phone].filter(Boolean).map((x) => <p key={x} className="text-ink-soft">{x}</p>)}
            {doc.buyer.taxId ? <p className="text-ink-soft">{pack.taxIdLabel}: {doc.buyer.taxId}</p> : null}
          </div>
          {kind.showDelivery && (doc.shipTo || doc.deliveryDate) ? (
            <div>
              <Small>Deliver to</Small>
              {doc.shipTo ? <p className="mt-1 whitespace-pre-line text-ink-soft">{doc.shipTo}</p> : null}
              {doc.deliveryDate ? <p className="text-ink-soft">By {formatDate(doc.deliveryDate, doc.country)}</p> : null}
            </div>
          ) : null}
          {doc.export?.enabled && doc.export.buyerCountry ? (
            <div className="text-right">
              <Small>Country of supply</Small>
              <p className="mt-1">{doc.export.buyerCountry}</p>
            </div>
          ) : doc.placeOfSupply ? (
            <div className="text-right">
              <Small>Place of supply</Small>
              <p className="mt-1">{pack.regions?.find((r) => r.code === doc.placeOfSupply)?.name ?? doc.placeOfSupply}</p>
            </div>
          ) : null}
        </div>

        <table className="w-full border-collapse" style={air(2)}>
          <thead>
            <tr style={tpl.table === "filled" ? { backgroundColor: accent, color: "#fff" } : { borderBottom: `1.5px solid ${accent}` }}>
              <th className="px-3 py-2 text-left font-semibold">Description</th>
              {doc.items.some((i) => i.code) ? <th className="px-3 py-2 text-left font-semibold">Code</th> : null}
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-3 py-2 text-right font-semibold">Rate</th>
              {doc.items.some((i) => i.discountPct) ? <th className="px-3 py-2 text-right font-semibold">Disc</th> : null}
              {hasTax ? <th className="px-3 py-2 text-right font-semibold">{pack.taxLabel}</th> : null}
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, idx) => {
              const line = totals.lines.find((l) => l.id === item.id);
              return (
                <tr key={item.id} className={`align-top ${tpl.table === "clean" ? "" : "border-b border-line"} ${tpl.zebra && idx % 2 === 1 ? "bg-canvas" : ""}`}>
                  <td className="px-3 py-2">{item.description || <span className="text-ink-faint">Item {idx + 1}</span>}{item.unit ? <span className="text-ink-faint"> ({item.unit})</span> : null}</td>
                  {doc.items.some((i) => i.code) ? <td className="px-3 py-2 tabular text-ink-soft">{item.code}</td> : null}
                  <td className="px-3 py-2 text-right tabular">{item.quantity}</td>
                  <td className="px-3 py-2 text-right tabular">{formatMoney({ minor: Math.round(item.rate * 100), currency: doc.currency }, pack.locale)}</td>
                  {doc.items.some((i) => i.discountPct) ? <td className="px-3 py-2 text-right tabular">{item.discountPct ? `${item.discountPct}%` : ""}</td> : null}
                  {hasTax ? <td className="px-3 py-2 text-right tabular">{line?.rate ? `${line.rate}%` : "-"}</td> : null}
                  <td className="px-3 py-2 text-right tabular">{line ? m(line.net) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex flex-wrap justify-between gap-8" style={air(1.5)}>
          <div className="min-w-[14rem] max-w-sm text-ink-soft">
            {totals.total.minor > 0 ? (
              <p className="text-xs"><span className="font-semibold text-ink">Amount in words: </span>
                {numberToWords(Math.floor(toMajor(totals.total)), pack.numberSystem)} {doc.currency} only</p>
            ) : null}
            {kind.showPaymentReceived && (doc.paymentMethod || doc.paymentReference) ? (
              <div className="mt-4"><Small>Payment received</Small>
                {doc.paymentMethod ? <p className="text-xs">By {doc.paymentMethod}</p> : null}
                {doc.paymentReference ? <p className="text-xs">Reference {doc.paymentReference}</p> : null}
              </div>
            ) : null}
            {kind.showPaymentDetails && doc.paymentDetails ? <div className="mt-4"><Small>Payment details</Small><p className="whitespace-pre-line text-xs">{doc.paymentDetails}</p></div> : null}
            {kind.showPaymentDetails && (qr || doc.payment?.paymentLink) ? (
              <div className="mt-4 flex items-start gap-3">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="Scan to pay by UPI" className="h-24 w-24 shrink-0 rounded border border-line bg-white p-1" />
                ) : null}
                <div>
                  {qr ? <><Small>Scan to pay</Small><p className="text-xs">Any UPI app. {doc.payment?.includeAmount !== false ? "The amount is already in the code." : ""}</p></> : null}
                  {doc.payment?.paymentLink ? <p className="mt-1 break-all text-xs">Pay online: {doc.payment.paymentLink}</p> : null}
                </div>
              </div>
            ) : null}
            {doc.export?.enabled ? (
              <div className="mt-4">
                <Small>Declaration</Small>
                <p className="text-xs">{exportDeclaration(doc.export.kind, doc.export.taxMode, doc.export.lutNumber)}</p>
                {doc.export.shippingBillNumber ? <p className="text-xs">Shipping bill {doc.export.shippingBillNumber}{doc.export.shippingBillDate ? ` dated ${formatDate(doc.export.shippingBillDate, doc.country)}` : ""}{doc.export.portCode ? `, port ${doc.export.portCode}` : ""}</p> : null}
                {doc.export.conversionRate ? <p className="text-xs">Exchange rate used: 1 {doc.currency} = {doc.export.conversionRate} INR</p> : null}
              </div>
            ) : null}
            {doc.notes ? <div className="mt-4"><Small>Notes</Small><p className="whitespace-pre-line text-xs">{doc.notes}</p></div> : null}
            {doc.terms ? <div className="mt-4"><Small>Terms</Small><p className="whitespace-pre-line text-xs">{doc.terms}</p></div> : null}
          </div>

          <div className="ml-auto w-full max-w-xs space-y-1.5">
            <Row label="Subtotal" value={m(totals.subtotal)} />
            {totals.lineDiscounts.minor > 0 ? <Row label="Line discounts" value={`- ${m(totals.lineDiscounts)}`} /> : null}
            {totals.documentDiscount.minor > 0 ? <Row label={`Discount ${doc.discountPct}%`} value={`- ${m(totals.documentDiscount)}`} /> : null}
            {(totals.lineDiscounts.minor > 0 || totals.documentDiscount.minor > 0) ? <Row label="Taxable value" value={m(totals.taxableTotal)} /> : null}
            {totals.taxRows.map((row) => (
              row.components?.length
                ? row.components.map((c) => <Row key={`${row.label}-${c.label}`} label={`${c.label} ${row.rate / (row.components?.length ?? 1)}%`} value={m(c.amount)} />)
                : <Row key={row.label} label={row.label} value={m(row.tax)} />
            ))}
            {totals.shipping.minor > 0 ? <Row label="Shipping" value={m(totals.shipping)} /> : null}
            {totals.roundOff.minor !== 0 ? <Row label="Round off" value={m(totals.roundOff)} /> : null}
            <div className="flex justify-between border-t-2 pt-2 font-semibold" style={{ borderColor: accent, ...sz(16) }}>
              <span>{kind.showPaidStamp ? "Amount received" : "Total"}</span><span className="tabular">{m(totals.total)}</span>
            </div>
            {kind.showPaidAndBalance && totals.paid.minor > 0 ? (
              <>
                <Row label="Paid" value={`- ${m(totals.paid)}`} />
                <div className="flex justify-between font-semibold"><span>Balance due</span><span className="tabular">{m(totals.balanceDue)}</span></div>
              </>
            ) : null}
          </div>
        </div>

        {pack.code === "IN" && totals.hsnSummary.length > 0 ? (
          <div className="mt-8">
            <Small>GST summary by HSN or SAC</Small>
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="border-y border-line text-ink-soft">
                  {["Code", "Taxable value", "Rate", "CGST", totals.supply.stateTaxLabel, "IGST"].map((h, i) => (
                    <th key={h} className={`px-2 py-1 font-semibold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {totals.hsnSummary.map((r) => (
                  <tr key={`${r.code}-${r.rate}`} className="border-b border-line">
                    <td className="px-2 py-1">{r.code}</td>
                    <td className="px-2 py-1 text-right tabular">{m(r.taxable)}</td>
                    <td className="px-2 py-1 text-right tabular">{r.rate}%</td>
                    <td className="px-2 py-1 text-right tabular">{m(r.cgst)}</td>
                    <td className="px-2 py-1 text-right tabular">{m(r.sgst)}</td>
                    <td className="px-2 py-1 text-right tabular">{m(r.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-8" style={air(2.5)}>
          {kind.showAcceptance ? (
            <div className="w-56">
              <Small>Accepted for {doc.buyer.name || "the customer"}</Small>
              <div className="mt-10 border-t border-line pt-2 text-xs text-ink-faint">Signature and date</div>
            </div>
          ) : <span />}

          {(doc.signMode ?? "none") === "none" ? (
            <p className="w-full text-center text-xs italic text-ink-faint">This is an electronically generated {title.toLowerCase()} and does not require a signature.</p>
          ) : (
            <div className="ml-auto w-52 text-center">
              {doc.signMode === "image" && doc.signatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.signatureDataUrl} alt="Signature" className="mx-auto mb-1 max-h-16" />
              ) : <div className="h-16" />}
              <div className="border-t border-line pt-2 text-xs text-ink-faint">{doc.signatoryName || `For ${doc.seller.name || "your business"}`}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-ink-soft"><span>{label}</span><span className="tabular">{value}</span></div>;
}


/** Draws the UPI code when there is one, and keeps it in step with the amount. */
function usePaymentQr(doc: DocumentData, totals: DocumentTotals): string | undefined {
  const [qr, setQr] = useState<string>();
  const id = doc.payment?.upiId;
  const amount = doc.payment?.includeAmount !== false ? totals.balanceDue.minor : 0;

  useEffect(() => {
    let live = true;
    if (!id || !looksLikeUpiId(id) || doc.country !== "IN") { setQr(undefined); return; }
    const uri = upiUri({
      upiId: id,
      name: doc.seller.name || "Payment",
      amount: amount > 0 ? { minor: amount, currency: doc.currency } : undefined,
      note: doc.number
    });
    qrDataUrl(uri, 280).then((url) => { if (live) setQr(url); }).catch(() => { if (live) setQr(undefined); });
    return () => { live = false; };
  }, [id, amount, doc.country, doc.currency, doc.number, doc.seller.name]);

  return qr;
}