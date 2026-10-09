import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { packFor } from "../countries/packs";
import { formatDate } from "../format";
import { decimalsFor, numberToWords, toMajor, type Money } from "../money";
import { exportDeclaration } from "./export";
import { kindConfig } from "./kinds";
import { looksLikeUpiId, qrDataUrl, upiUri } from "./payment";
import { templateConfig } from "./templates";
import { calculate } from "./totals";
import type { DocumentData } from "./types";

const A4 = { w: 595.28, h: 841.89 };
const M = 42;

const hex = (h: string) => {
  const s = h.replace("#", "");
  const n = parseInt(s.length === 3 ? s.split("").map((c) => c + c).join("") : s, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** Standard PDF fonts cover Latin only, so currency symbols such as the rupee sign are written as codes. */
const amount = (m: Money) => `${m.currency} ${toMajor(m).toLocaleString("en-US", { minimumFractionDigits: decimalsFor(m.currency), maximumFractionDigits: decimalsFor(m.currency) })}`;
const safe = (s: string) => (s || "").replace(/[^\x20-\x7E\n]/g, (c) => ({ "₹": "Rs.", "€": "EUR ", "£": "GBP ", "–": "-", "—": "-", "’": "'", "‘": "'", "“": '"', "”": '"', "•": "-" }[c] ?? " "));

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of safe(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

export async function buildPdf(doc: DocumentData): Promise<Blob> {
  const pack = packFor(doc.country);
  const kind = kindConfig(doc.kind);
  const tpl = templateConfig(doc.template);
  const totals = calculate(doc);
  const title = doc.kind === "invoice" ? pack.invoiceTitle : kind.title;
  const S = (n: number) => n * tpl.scale;
  const pdf = await PDFDocument.create();
  const serif = tpl.pdfFont === "times";
  const font = await pdf.embedFont(serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const bold = await pdf.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
  const accent = tpl.useAccent ? hex(doc.accentColor || "#0B3D2E") : rgb(0.07, 0.09, 0.07);
  const grey = rgb(0.42, 0.46, 0.41);
  const lineCol = rgb(0.88, 0.9, 0.87);

  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  // a colour band across the very top, for the modern template
  if (tpl.header === "band") {
    page.drawRectangle({ x: 0, y: A4.h - 14, width: A4.w, height: 14, color: accent });
    y -= 8;
  }

  const text = (s: string, x: number, size = 9, f: PDFFont = font, color = rgb(0.07, 0.09, 0.07), yy = y) => page.drawText(safe(s), { x, y: yy, size, font: f, color });
  const right = (s: string, xRight: number, size = 9, f: PDFFont = font, color = rgb(0.07, 0.09, 0.07), yy = y) => page.drawText(safe(s), { x: xRight - f.widthOfTextAtSize(safe(s), size), y: yy, size, font: f, color });

  const newPage = () => { page = pdf.addPage([A4.w, A4.h]); y = A4.h - M; };
  const space = (n: number) => { y -= n; if (y < M + 90) newPage(); };
  const gap = (n: number) => space(n * tpl.air);

  // header
  if (doc.logoDataUrl) {
    try {
      const bytes = Uint8Array.from(atob(doc.logoDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      const img = doc.logoDataUrl.includes("image/png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      // logo sits above the business name, never on top of it
      const h = 42, w = Math.min((img.width / img.height) * h, 150);
      page.drawImage(img, { x: M, y: y - h, width: w, height: h });
      y -= h + 10;
    } catch { /* unreadable logo: carry on without it */ }
  }
  // the title block is pinned to the top of the page, whether or not there is a logo
  const titleY = A4.h - M - (tpl.header === "band" ? 14 : 6);
  const titleLeft = tpl.titleSide === "left";
  const centred = tpl.titleSide === "center";
  const titleSize = S(14) * tpl.titleScale;
  const titleText = centred ? title.toUpperCase().split("").join(" ") : title;
  if (centred) {
    const name = doc.seller.name || "Your business name";
    page.drawText(safe(name), { x: (A4.w - bold.widthOfTextAtSize(safe(name), S(16))) / 2, y: titleY - 4, size: S(16), font: bold, color: rgb(0.07, 0.09, 0.07) });
    page.drawText(safe(titleText), { x: (A4.w - font.widthOfTextAtSize(safe(titleText), S(11))) / 2, y: titleY - 26, size: S(11), font, color: grey });
    y = titleY - 44;
  } else {
    if (titleLeft) text(titleText, M, titleSize, bold, accent, titleY);
    else right(titleText, A4.w - M, titleSize, bold, accent, titleY);
    if (titleLeft) y -= 24;
    text(doc.seller.name || "Your business name", M, S(15), bold);
  }
  space(16);
  const sellerLines = wrap([doc.seller.address, doc.seller.email, doc.seller.phone, doc.seller.website, doc.seller.taxId ? `${pack.taxIdLabel}: ${doc.seller.taxId}` : ""].filter(Boolean).join("\n"), font, S(9), centred ? 420 : 240);
  for (const l of sellerLines) {
    if (centred) page.drawText(safe(l), { x: (A4.w - font.widthOfTextAtSize(safe(l), S(9))) / 2, y, size: S(9), font, color: grey });
    else text(l, M, S(9), font, grey);
    space(12);
  }

  // when the title sits on the left, the reference block goes to the right so the two never collide
  let metaY = centred ? y - 6 : titleY - (titleLeft ? 8 : 28);
  const meta = [
    doc.number,
    `Date: ${formatDate(doc.issueDate, doc.country)}`,
    doc.dueDate && kind.secondDateLabel ? `${kind.secondDateLabel}: ${formatDate(doc.dueDate, doc.country)}` : "",
    doc.reference ? `Ref: ${doc.reference}` : "",
    doc.buyerOrderRef ? `Your order: ${doc.buyerOrderRef}` : "",
    kind.showPaidStamp ? "PAID" : ""
  ].filter(Boolean);
  for (const line of meta) {
    const f = line === "PAID" ? bold : font;
    const col = line === "PAID" ? accent : grey;
    if (centred) page.drawText(safe(line), { x: (A4.w - f.widthOfTextAtSize(safe(line), S(9))) / 2, y: metaY, size: S(9), font: f, color: col });
    else right(line, A4.w - M, S(9), f, col, metaY);
    metaY -= 13;
  }

  y = Math.min(y, metaY) - 8;
  if (tpl.header === "rule") page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 1.5, color: accent });
  if (centred) page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.5, color: lineCol });
  gap(20);

  // parties
  text(tpl.caps ? kind.partyLabel.toUpperCase() : kind.partyLabel, M, 7.5, bold, grey);
  const exp = doc.export?.enabled ? doc.export : undefined;
  if (exp?.buyerCountry) right(tpl.caps ? "COUNTRY OF SUPPLY" : "Country of supply", A4.w - M, 7.5, bold, grey);
  else if (doc.placeOfSupply) right(tpl.caps ? "PLACE OF SUPPLY" : "Place of supply", A4.w - M, 7.5, bold, grey);
  space(13);
  text(doc.buyer.name || "Customer name", M, 10, bold);
  if (exp?.buyerCountry) right(exp.buyerCountry, A4.w - M, 9);
  else if (doc.placeOfSupply) right(pack.regions?.find((r) => r.code === doc.placeOfSupply)?.name ?? doc.placeOfSupply, A4.w - M, 9);
  space(12);
  for (const l of wrap([doc.buyer.address, doc.buyer.email, doc.buyer.phone, doc.buyer.taxId ? `${pack.taxIdLabel}: ${doc.buyer.taxId}` : ""].filter(Boolean).join("\n"), font, 9, 260)) { text(l, M, 9, font, grey); space(12); }
  if (kind.showDelivery && (doc.shipTo || doc.deliveryDate)) {
    space(4);
    text(tpl.caps ? "DELIVER TO" : "Deliver to", M, 7.5, bold, grey);
    space(12);
    for (const l of wrap([doc.shipTo, doc.deliveryDate ? `By ${formatDate(doc.deliveryDate, doc.country)}` : ""].filter(Boolean).join("\n"), font, 9, 260)) { text(l, M, 9, font, grey); space(12); }
  }
  space(10);

  // table
  const showTax = totals.taxRows.length > 0;
  // right-hand edge of each column, spaced so a long amount can never run into the column beside it
  const cols = { desc: M + 6, descWidth: 250, qty: 330, rate: 420, tax: 462, amount: A4.w - M - 6 };
  const headRow = () => {
    const filled = tpl.table === "filled";
    if (filled) page.drawRectangle({ x: M, y: y - 4, width: A4.w - M * 2, height: 20, color: accent });
    else page.drawLine({ start: { x: M, y: y - 4 }, end: { x: A4.w - M, y: y - 4 }, thickness: 1.2, color: accent });
    const headCol = filled ? rgb(1, 1, 1) : rgb(0.07, 0.09, 0.07);
    const label = (t: string) => (tpl.caps ? t.toUpperCase() : t);
    text(label("Description"), M + 6, S(8), bold, headCol, y + 2);
    right(label("Qty"), cols.qty, S(8), bold, headCol, y + 2);
    right(label("Rate"), cols.rate, S(8), bold, headCol, y + 2);
    if (showTax) right(label(pack.taxLabel), cols.tax, S(8), bold, headCol, y + 2);
    right(label("Amount"), cols.amount, S(8), bold, headCol, y + 2);
    space(24);
  };
  headRow();

  for (const item of doc.items) {
    const line = totals.lines.find((l) => l.id === item.id);
    const descLines = wrap(item.description || "Item", font, 9, cols.descWidth);
    if (y - descLines.length * 12 < M + 120) { newPage(); headRow(); }
    if (tpl.zebra && doc.items.indexOf(item) % 2 === 1) {
      page.drawRectangle({ x: M, y: y - 4, width: A4.w - M * 2, height: Math.max(S(16), descLines.length * S(11) + 6), color: rgb(0.97, 0.975, 0.96) });
    }
    descLines.forEach((l, i) => { text(l, M + 6, S(9), font, rgb(0.07, 0.09, 0.07), y - i * S(11)); });
    if (item.code) text(item.code, M + 6, S(7.5), font, grey, y - descLines.length * S(11));
    right(String(item.quantity), cols.qty, S(9));
    right(amount({ minor: Math.round(item.rate * 10 ** decimalsFor(doc.currency)), currency: doc.currency }), cols.rate, S(9));
    if (showTax) right(line?.rate ? `${line.rate}%` : "-", cols.tax, S(9));
    right(line ? amount(line.net) : "", cols.amount, S(9));
    space(Math.max(S(18), descLines.length * S(11) + 8 + (item.code ? 8 : 0)));
    if (!(tpl.table === "clean")) page.drawLine({ start: { x: M, y: y + 8 }, end: { x: A4.w - M, y: y + 8 }, thickness: 0.5, color: lineCol });
  }

  // totals
  if (y < M + 190) newPage();
  space(22);
  const totalsTop = y;
  const labelX = A4.w - M - 150;
  const row = (label: string, value: string, strong = false) => {
    text(label, labelX, strong ? 10 : 9, strong ? bold : font, strong ? rgb(0.07, 0.09, 0.07) : grey);
    right(value, A4.w - M, strong ? 10 : 9, strong ? bold : font);
    space(14);
  };
  row("Subtotal", amount(totals.subtotal));
  if (totals.lineDiscounts.minor) row("Line discounts", `- ${amount(totals.lineDiscounts)}`);
  if (totals.documentDiscount.minor) row(`Discount ${doc.discountPct}%`, `- ${amount(totals.documentDiscount)}`);
  if (totals.lineDiscounts.minor || totals.documentDiscount.minor) row("Taxable value", amount(totals.taxableTotal));
  for (const r of totals.taxRows) {
    if (r.components?.length) for (const c of r.components) row(`${c.label} ${r.rate / r.components.length}%`, amount(c.amount));
    else row(r.label, amount(r.tax));
  }
  if (totals.shipping.minor) row("Shipping", amount(totals.shipping));
  if (totals.roundOff.minor) row("Round off", amount(totals.roundOff));
  page.drawLine({ start: { x: labelX, y: y + 8 }, end: { x: A4.w - M, y: y + 8 }, thickness: 1, color: accent });
  space(6);
  row(kind.showPaidStamp ? "Amount received" : "Total", amount(totals.total), true);
  if (kind.showPaidAndBalance && totals.paid.minor) { row("Paid", `- ${amount(totals.paid)}`); row("Balance due", amount(totals.balanceDue), true); }

  // words and notes sit to the left of the totals block
  let leftY = totalsTop;
  const leftWidth = 230;
  if (totals.total.minor > 0) {
    text("AMOUNT IN WORDS", M, 7.5, bold, grey, leftY); leftY -= 12;
    for (const l of wrap(`${numberToWords(Math.floor(toMajor(totals.total)), pack.numberSystem)} ${doc.currency} only`, font, 8.5, leftWidth)) { text(l, M, 8.5, font, grey, leftY); leftY -= 11; }
    leftY -= 6;
  }
  const blocks: Array<[string, string | undefined]> = [
    ...(kind.showPaymentReceived ? [["PAYMENT RECEIVED", [doc.paymentMethod ? `By ${doc.paymentMethod}` : "", doc.paymentReference ? `Reference ${doc.paymentReference}` : ""].filter(Boolean).join("\n")] as [string, string]] : []),
    ...(kind.showPaymentDetails ? [["PAYMENT DETAILS", doc.paymentDetails] as [string, string | undefined]] : []),
    ...(exp ? [["DECLARATION", [
      exportDeclaration(exp.kind, exp.taxMode, exp.lutNumber),
      exp.shippingBillNumber ? `Shipping bill ${exp.shippingBillNumber}${exp.shippingBillDate ? ` dated ${formatDate(exp.shippingBillDate, doc.country)}` : ""}${exp.portCode ? `, port ${exp.portCode}` : ""}` : "",
      exp.conversionRate ? `Exchange rate used: 1 ${doc.currency} = ${exp.conversionRate} INR` : ""
    ].filter(Boolean).join("\n")] as [string, string]] : []),
    ["NOTES", doc.notes], ["TERMS", doc.terms]
  ];
  for (const [label, value] of blocks) {
    if (!value) continue;
    if (leftY < M + 40) break;
    text(label, M, 7.5, bold, grey, leftY); leftY -= 12;
    for (const l of wrap(value, font, 8.5, leftWidth)) { if (leftY < M + 20) break; text(l, M, 8.5, font, grey, leftY); leftY -= 11; }
    leftY -= 6;
  }

  y = Math.min(y, leftY) - 18;

  // HSN summary, which is what an Indian tax invoice is expected to carry
  if (pack.code === "IN" && totals.hsnSummary.length > 0) {
    if (y < M + 110) newPage();
    text("GST SUMMARY BY HSN OR SAC", M, 7.5, bold, grey);
    space(14);
    const cw = [90, 110, 50, 80, 80, 80];
    const xs = cw.reduce<number[]>((acc, w, i) => [...acc, (acc[i - 1] ?? M) + (i === 0 ? 0 : cw[i - 1])], []);
    const headers = ["Code", "Taxable value", "Rate", "CGST", totals.supply.stateTaxLabel, "IGST"];
    headers.forEach((h, i) => (i === 0 ? text(h, xs[i], 7.5, bold, grey) : right(h, xs[i] + cw[i], 7.5, bold, grey)));
    space(12);
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: A4.w - M, y: y + 8 }, thickness: 0.5, color: lineCol });
    for (const r of totals.hsnSummary) {
      if (y < M + 60) { newPage(); }
      const cells = [r.code, amount(r.taxable), `${r.rate}%`, amount(r.cgst), amount(r.sgst), amount(r.igst)];
      cells.forEach((c, i) => (i === 0 ? text(c, xs[i], 8) : right(c, xs[i] + cw[i], 8)));
      space(13);
      page.drawLine({ start: { x: M, y: y + 8 }, end: { x: A4.w - M, y: y + 8 }, thickness: 0.3, color: lineCol });
    }
    space(8);
  }

  // a place for the customer to accept a quotation
  if (kind.showAcceptance) {
    if (y < M + 80) newPage();
    space(10);
    text(tpl.caps ? `ACCEPTED FOR ${(doc.buyer.name || "the customer").toUpperCase()}` : `Accepted for ${doc.buyer.name || "the customer"}`, M, 7.5, bold, grey);
    space(40);
    page.drawLine({ start: { x: M, y: y + 8 }, end: { x: M + 180, y: y + 8 }, thickness: 0.5, color: lineCol });
    text("Signature and date", M, 8, font, grey);
    space(6);
  }

  // a scannable code to pay by UPI, placed beside the notes column
  const upi = doc.payment?.upiId;
  if (kind.showPaymentDetails && upi && looksLikeUpiId(upi) && doc.country === "IN") {
    try {
      const amount = doc.payment?.includeAmount !== false ? totals.balanceDue : undefined;
      const uri = upiUri({ upiId: upi, name: doc.seller.name || "Payment", amount: amount && amount.minor > 0 ? amount : undefined, note: doc.number });
      const png = await qrDataUrl(uri, 320);
      const img = await pdf.embedPng(Uint8Array.from(atob(png.split(",")[1]), (c) => c.charCodeAt(0)));
      const box = 76;
      const qrY = Math.max(M + 30, Math.min(y, leftY) - box + 10);
      page.drawImage(img, { x: M, y: qrY, width: box, height: box });
      text("SCAN TO PAY BY UPI", M + box + 10, 7.5, bold, grey, qrY + box - 10);
      const lines = [upi, doc.payment?.includeAmount !== false ? "Amount already in the code" : "Enter the amount in your app"];
      lines.forEach((line, i) => text(line, M + box + 10, 8, font, grey, qrY + box - 24 - i * 11));
      y = Math.min(y, qrY - 12);
    } catch { /* a QR that will not draw should never stop the invoice */ }
  }
  if (kind.showPaymentDetails && doc.payment?.paymentLink) {
    if (y < M + 60) newPage();
    text(`Pay online: ${doc.payment.paymentLink}`, M, 8, font, grey);
    space(14);
  }

  // signature, or the note that says why there is not one
  if (y < M + 70) newPage();
  const mode = doc.signMode ?? "none";
  if (mode === "none") {
    const note = `This is an electronically generated ${title.toLowerCase()} and does not require a signature.`;
    page.drawText(safe(note), { x: (A4.w - font.widthOfTextAtSize(safe(note), 8.5)) / 2, y: Math.max(M + 20, y - 24), size: 8.5, font, color: grey });
  } else {
    let sigY = Math.max(M + 46, y - 20);
    if (mode === "image" && doc.signatureDataUrl) {
      try {
        const bytes = Uint8Array.from(atob(doc.signatureDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
        const img = doc.signatureDataUrl.includes("image/png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const h = Math.min(46, (img.height / img.width) * 150);
        const w = (img.width / img.height) * h;
        page.drawImage(img, { x: A4.w - M - Math.min(w, 150), y: sigY, width: Math.min(w, 150), height: h });
      } catch { /* unreadable signature: fall through to the ruled line */ }
    }
    sigY -= 6;
    page.drawLine({ start: { x: A4.w - M - 150, y: sigY }, end: { x: A4.w - M, y: sigY }, thickness: 0.5, color: lineCol });
    right(doc.signatoryName || `For ${doc.seller.name || "your business"}`, A4.w - M, 8, font, grey, sigY - 12);
  }

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer], { type: "application/pdf" });
}

export function documentFileName(doc: DocumentData): string {
  const who = (doc.buyer.name || "document").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  return `${doc.number || doc.kind}-${who}.pdf`.replace(/-+/g, "-");
}
