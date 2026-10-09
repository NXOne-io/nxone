/**
 * Standalone demo build. It imports the real engine (country packs, totals, PDF) so what you try
 * here behaves exactly like the app, and renders a plain DOM UI around it.
 */
import { PACKS, packFor } from "../lib/countries/packs";
import { hsnByCode, rateFor, ruleIdForRate, searchHsn } from "../lib/countries/hsn";
import { rulesOn } from "../lib/countries/types";
import { calculate, counterpartRuleId, defaultTaxRuleId } from "../lib/documents/totals";
import { buildPdf, documentFileName } from "../lib/documents/pdf";
import type { DocumentData, DocumentKind, LineItem } from "../lib/documents/types";
import { formatMoney, numberToWords, toMajor } from "../lib/money";
import { kindConfig } from "../lib/documents/kinds";
import { TEMPLATES, templateConfig } from "../lib/documents/templates";
import { PALETTES } from "../lib/documents/palettes";
import { addDays, formatDate, todayIso } from "../lib/format";

const PREFIX: Record<string, string> = { invoice: "INV-", quote: "QUO-", "purchase-order": "PO-", receipt: "RCP-" };

const line = (country: string, date: string, inter = false): LineItem =>
  ({ id: Math.random().toString(36).slice(2, 9), description: "", quantity: 1, rate: 0, taxRuleId: defaultTaxRuleId(country, date, inter) });

function blank(kind: DocumentKind, country: string): DocumentData {
  const issueDate = todayIso();
  const pack = packFor(country);
  return {
    kind, country, currency: pack.currency, issueDate,
    dueDate: kindConfig(kind).secondDateLabel ? addDays(issueDate, kindConfig(kind).secondDateDays ?? 0) : undefined,
    number: `${PREFIX[kind]}0001`,
    template: "classic",
    seller: { name: "", address: "", email: "", taxId: "", region: "" },
    buyer: { name: "", address: "", taxId: "" },
    placeOfSupply: "",
    items: [line(country, issueDate)],
    taxInclusive: false, roundOff: country === "IN",
    accentColor: "#0B3D2E",
    notes: kindConfig(kind).defaultNotes ?? "",
    terms: kindConfig(kind).defaultTerms ?? ""
  };
}

const DEMO: Partial<DocumentData> = {
  seller: { name: "Acme Consulting LLP", address: "221 Linking Road\nBandra West\nMumbai 400050", email: "billing@acme.example", taxId: "27AAPFU0939F1ZV", region: "MH" },
  buyer: { name: "Globex Private Limited", address: "4th Floor, Prestige Tech Park\nBengaluru 560103", taxId: "29AACCG1234M1ZP" },
  placeOfSupply: "KA",
  paymentDetails: "HDFC Bank, A/c 50200012345678, IFSC HDFC0000123\nUPI: acme@hdfcbank"
};

let doc: DocumentData = blank("invoice", "IN");
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

/** Code plus price decides the rate: apparel at 2,400 a piece is 5%, the same shirt at 2,600 is 18%. */
function autoTax(code: string | undefined, unitRate: number) {
  if (doc.country !== "IN" || !code) return {};
  const entry = hsnByCode(code);
  if (!entry) return {};
  const mode = doc.supplyType ?? "auto";
  const inter = mode === "auto" ? Boolean(doc.placeOfSupply && doc.seller.region && doc.placeOfSupply !== doc.seller.region) : mode === "inter";
  const { rate } = rateFor(entry, unitRate, doc.issueDate);
  const ruleId = ruleIdForRate(rate, inter);
  return ruleId ? { taxRuleId: ruleId } : {};
}
function rateNote(code: string | undefined, unitRate: number) {
  if (doc.country !== "IN" || !code) return "";
  const entry = hsnByCode(code);
  return entry ? rateFor(entry, unitRate, doc.issueDate).reason ?? "" : "";
}
const esc = (s: string) => (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function set(patch: Partial<DocumentData>) {
  const regionChanged = ("placeOfSupply" in patch && patch.placeOfSupply !== doc.placeOfSupply)
    || ("seller" in patch && patch.seller?.region !== doc.seller.region)
    || ("supplyType" in patch && patch.supplyType !== doc.supplyType);
  doc = { ...doc, ...patch };
  const mode = doc.supplyType ?? "auto";
  if (regionChanged && (mode !== "auto" || (doc.placeOfSupply && doc.seller.region))) {
    const inter = mode === "auto" ? doc.placeOfSupply !== doc.seller.region : mode === "inter";
    doc.items = doc.items.map((i) => ({ ...i, taxRuleId: counterpartRuleId(doc.country, doc.issueDate, i.taxRuleId, inter) }));
  }
  render();
}
const setItem = (id: string, patch: Partial<LineItem>) => { doc.items = doc.items.map((i) => (i.id === id ? { ...i, ...patch } : i)); render(); };

function setKind(kind: DocumentKind) {
  const keep = { seller: doc.seller, buyer: doc.buyer, placeOfSupply: doc.placeOfSupply, paymentDetails: doc.paymentDetails, items: doc.items, country: doc.country };
  doc = { ...blank(kind, doc.country), ...keep, kind, number: `${PREFIX[kind]}0001` };
  render();
}

function setCountry(code: string) {
  const pack = packFor(code);
  doc = { ...doc, country: code, currency: pack.currency, roundOff: code === "IN", placeOfSupply: "", seller: { ...doc.seller, region: "" },
    items: doc.items.map((i) => ({ ...i, taxRuleId: defaultTaxRuleId(code, doc.issueDate), taxRateOverride: undefined })) };
  render();
}

function form() {
  const pack = packFor(doc.country);
  const supply = calculate(doc).supply;
  const inter = supply.interRegion;
  const rules = rulesOn(pack, doc.issueDate).filter((r) => !r.appliesWhen || r.appliesWhen === "always" || (inter ? r.appliesWhen === "inter-region" : r.appliesWhen === "intra-region"));
  const regions = pack.regions ?? [];
  return `
  <div class="card">
    <div class="row"><h2>Layout</h2><span class="tagline">${templateConfig(doc.template).description}</span></div>
    <span class="tplpick">${TEMPLATES.map((x) => `<button class="${templateConfig(doc.template).id === x.id ? "primary" : "ghost"}" data-tpl="${x.id}">${x.name}</button>`).join("")}</span>
    <div class="row" style="justify-content:flex-start;gap:.4rem;margin-top:.7rem">
      <span class="hint" style="margin:0">Colour</span>
      ${PALETTES.map((x) => `<button class="swatch ${(doc.accentColor || "").toLowerCase() === x.accent.toLowerCase() ? "on" : ""}" data-colour="${x.accent}" title="${x.name}" aria-label="${x.name}" style="background:${x.accent}"></button>`).join("")}
      <input type="color" data-set="accentColor" value="${doc.accentColor || "#0B3D2E"}" style="width:2.4rem;height:1.6rem;padding:0" aria-label="Custom colour">
      ${!templateConfig(doc.template).useAccent ? `<span class="hint" style="margin:0">This layout prints without colour</span>` : ""}
    </div>
  </div>

  <div class="card">
    <h2>Where you trade</h2>
    <div class="grid two">
      <label>Country<select data-set="country">${PACKS.map((p) => `<option value="${p.code}" ${p.code === doc.country ? "selected" : ""}>${p.name}</option>`).join("")}</select></label>
      <label>Currency<input data-set="currency" value="${esc(doc.currency)}" maxlength="3"></label>
      ${regions.length ? `<label>Your state<select data-set="sellerRegion"><option value="">Select</option>${regions.map((r) => `<option value="${r.code}" ${r.code === doc.seller.region ? "selected" : ""}>${r.name}</option>`).join("")}</select></label>
      <label>Place of supply<select data-set="placeOfSupply"><option value="">Select</option>${regions.map((r) => `<option value="${r.code}" ${r.code === doc.placeOfSupply ? "selected" : ""}>${r.name}</option>`).join("")}</select>
      ${doc.placeOfSupply && doc.seller.region ? `<small>${inter ? "Different state, so IGST applies." : "Same state, so CGST and SGST apply."}</small>` : ""}</label>` : ""}
    </div>
    ${pack.support !== "supported" ? `<p class="warn">${pack.notes ?? "Tax rules for this country are not fully configured."}</p>` : ""}
  </div>

  ${doc.country === "IN" ? `
  <div class="card">
    <div class="row"><h2>Which taxes apply</h2><span class="tagline">${supply.automatic ? "Set from the place of supply" : "Set by you"}</span></div>
    <p class="hint">${doc.seller.region && doc.placeOfSupply
      ? supply.automatic
        ? supply.interRegion
          ? "Your state and the place of supply are different, so this is an inter-state supply and carries IGST."
          : `Your state and the place of supply are the same, so this carries CGST and ${supply.stateTaxLabel}.`
        : "You have set this by hand. Tick the other box to go back to matching the place of supply."
      : "Choose your state and the place of supply above and these tick themselves."}</p>
    <div class="row" style="gap:.6rem;flex-wrap:nowrap">
      <label class="pick ${!supply.interRegion ? "on" : ""}"><input type="checkbox" data-supply="intra" ${!supply.interRegion ? "checked" : ""}><span><b>CGST + ${supply.stateTaxLabel}</b><i>Same state or union territory</i></span></label>
      <label class="pick ${supply.interRegion ? "on" : ""}"><input type="checkbox" data-supply="inter" ${supply.interRegion ? "checked" : ""}><span><b>IGST</b><i>Different states, exports, imports, SEZ</i></span></label>
    </div>
    ${!supply.automatic ? `<button class="link" data-supply="auto">Go back to deciding this automatically</button>` : ""}
  </div>` : ""}

  <div class="card">
    <h2>Your details</h2>
    <p class="hint">This is what your customer uses to pay you and to chase you if something is wrong.</p>
    <div class="grid two">
      <label>Business name<input data-seller="name" value="${esc(doc.seller.name)}" placeholder="Acme Consulting LLP"></label>
      <label>${pack.taxIdLabel}<input data-seller="taxId" value="${esc(doc.seller.taxId || "")}"></label>
      <label class="span">Address<textarea data-seller="address" rows="3">${esc(doc.seller.address || "")}</textarea></label>
      <label>Email<input data-seller="email" value="${esc(doc.seller.email || "")}" placeholder="billing@yourbusiness.com"></label>
      <label>Phone<input data-seller="phone" value="${esc(doc.seller.phone || "")}" placeholder="+91 98200 00000"></label>
      <label>Website<input data-seller="website" value="${esc(doc.seller.website || "")}" placeholder="yourbusiness.com"></label>
      <label>Logo<span class="filerow"><input type="file" id="logo" accept="image/png,image/jpeg">${doc.logoDataUrl ? '<button class="link" id="logo-clear">Remove</button>' : ""}</span></label>
    </div>
  </div>

  <div class="card">
    <h2>${doc.kind === "purchase-order" ? "Supplier" : "Customer"}</h2>
    <div class="grid two">
      <label>Name<input data-buyer="name" value="${esc(doc.buyer.name)}" placeholder="Globex Private Limited"></label>
      <label>${pack.taxIdLabel}<input data-buyer="taxId" value="${esc(doc.buyer.taxId || "")}"></label>
      <label class="span">Address<textarea data-buyer="address" rows="3">${esc(doc.buyer.address || "")}</textarea></label>
      <label>Email<input data-buyer="email" value="${esc(doc.buyer.email || "")}"></label>
      <label>Phone<input data-buyer="phone" value="${esc(doc.buyer.phone || "")}"></label>
    </div>
  </div>

  <div class="card">
    <h2>Document</h2>
    <div class="grid three">
      <label>Number<input data-set="number" value="${esc(doc.number)}"></label>
      <label>Date<input type="date" data-set="issueDate" value="${doc.issueDate}"></label>
      ${kindConfig(doc.kind).secondDateLabel ? `<label>${kindConfig(doc.kind).secondDateLabel}<input type="date" data-set="dueDate" value="${doc.dueDate || ""}"></label>` : ""}
    </div>
  </div>

  <div class="card">
    <div class="row"><h2>Items</h2><label class="inline"><input type="checkbox" data-set="taxInclusive" ${doc.taxInclusive ? "checked" : ""}> Prices include ${pack.taxLabel.toLowerCase()}</label></div>
    ${doc.items.map((item, i) => `
      <div class="item">
        <label class="span">Description<input data-item="${item.id}" data-field="description" value="${esc(item.description)}" placeholder="What are you charging for?"></label>
        <div class="grid four">
          <label>Qty<input type="number" step="any" data-item="${item.id}" data-field="quantity" value="${item.quantity}"></label>
          <label>Rate (${doc.currency})<input type="number" step="any" data-item="${item.id}" data-field="rate" value="${item.rate}"></label>
          <label>Disc %<input type="number" step="any" data-item="${item.id}" data-field="discountPct" value="${item.discountPct ?? 0}"></label>
          <label>${pack.taxLabel}<select data-item="${item.id}" data-field="taxRuleId"><option value="">None</option>${rules.map((r) => `<option value="${r.id}" ${r.id === item.taxRuleId ? "selected" : ""}>${r.label}</option>`).join("")}</select></label>
        </div>
        ${rateNote(item.code, item.rate) ? `<p class="hint" style="margin:.4rem 0 0">${esc(rateNote(item.code, item.rate))}</p>` : ""}
        ${doc.country === "IN" ? `
        <label class="span">HSN or SAC code
          <input data-hsn="${item.id}" value="${esc(item.code || "")}" placeholder="Type what you sell, such as website or rice" autocomplete="off">
          <span class="hsn-results" data-hsn-results="${item.id}"></span>
        </label>` : ""}
        ${doc.items.length > 1 ? `<button class="link" data-remove="${item.id}">Remove item ${i + 1}</button>` : ""}
      </div>`).join("")}
    <button class="ghost" id="add-item">Add item</button>
  </div>

  ${kindConfig(doc.kind).showDelivery ? `
  <div class="card">
    <h2>Delivery</h2>
    <p class="hint">Where the goods should arrive and by when.</p>
    <div class="grid two">
      <label class="span">Deliver to<textarea data-set="shipTo" rows="2">${esc(doc.shipTo || "")}</textarea></label>
      <label>Required by<input type="date" data-set="deliveryDate" value="${doc.deliveryDate || ""}"></label>
    </div>
  </div>` : ""}
  ${kindConfig(doc.kind).showPaymentReceived ? `
  <div class="card">
    <h2>How you were paid</h2>
    <div class="grid two">
      <label>Method<select data-set="paymentMethod">${["", "Bank transfer", "UPI", "Cash", "Cheque", "Card", "Wallet", "Other"].map((x) => `<option value="${x}" ${doc.paymentMethod === x ? "selected" : ""}>${x || "Select"}</option>`).join("")}</select></label>
      <label>Reference<input data-set="paymentReference" value="${esc(doc.paymentReference || "")}" placeholder="UTR, cheque number or UPI reference"></label>
    </div>
  </div>` : ""}

  <div class="card">
    <h2>Signature</h2>
    <p class="hint">Sign it if you want to. If you skip it, the document says so in the accepted wording.</p>
    <div class="row" style="justify-content:flex-start;gap:.4rem">
      ${[["none", "No signature"], ["image", "Sign it"], ["line", "Blank line"]].map(([v, l]) => `<button class="${(doc.signMode ?? "none") === v ? "primary" : "ghost"}" data-sign="${v}">${l}</button>`).join("")}
    </div>
    ${(doc.signMode ?? "none") === "none" ? `<p class="hint" style="margin-top:.6rem">The document will read: This is an electronically generated invoice and does not require a signature.</p>` : ""}
    ${doc.signMode === "image" ? `
      <div style="margin-top:.7rem">
        <canvas id="sigpad" width="520" height="130" style="width:100%;max-width:22rem;height:8rem;border:1px dashed var(--line);border-radius:10px;background:#fff;cursor:crosshair;touch-action:none"></canvas>
        <div class="filerow" style="margin-top:.5rem">
          <label style="margin:0">Or upload a picture<input type="file" id="sigfile" accept="image/png,image/jpeg"></label>
          <button class="link" id="sig-clear">Clear</button>
        </div>
      </div>` : ""}
    ${(doc.signMode ?? "none") !== "none" ? `<label style="margin-top:.7rem">Name under the signature<input data-set="signatoryName" value="${esc(doc.signatoryName || "")}" placeholder="Asha Verma, Partner"></label>` : ""}
  </div>

  <div class="card">
    <h2>Totals and notes</h2>
    <div class="grid three">
      <label>Discount on total %<input type="number" step="any" data-set="discountPct" value="${doc.discountPct ?? 0}"></label>
      <label>Shipping<input type="number" step="any" data-set="shipping" value="${doc.shipping ?? 0}"></label>
      ${kindConfig(doc.kind).showPaidAndBalance ? `<label>Amount already paid<input type="number" step="any" data-set="amountPaid" value="${doc.amountPaid ?? 0}"></label>` : ""}
      ${kindConfig(doc.kind).showPaymentDetails ? `<label class="span">Payment details<textarea data-set="paymentDetails" rows="2">${esc(doc.paymentDetails || "")}</textarea></label>` : ""}
      <label class="span">Notes<textarea data-set="notes" rows="2">${esc(doc.notes || "")}</textarea></label>
    </div>
    <label class="inline"><input type="checkbox" data-set="roundOff" ${doc.roundOff ? "checked" : ""}> Round the total to a whole ${doc.currency}</label>
  </div>`;
}

function preview() {
  const pack = packFor(doc.country);
  const kind = kindConfig(doc.kind);
  const tpl = templateConfig(doc.template);
  const t = calculate(doc);
  const m = (v: { minor: number; currency: string }) => formatMoney(v, pack.locale);
  const accent = tpl.useAccent ? doc.accentColor || "#0B3D2E" : "#121712";
  const title = doc.kind === "invoice" ? pack.invoiceTitle : kind.title;
  const hasTax = t.taxRows.length > 0;
  const cap = (x: string) => (tpl.caps ? x.toUpperCase() : x);
  const face = tpl.font === "serif" ? "Fraunces, Georgia, serif" : "Inter, system-ui, sans-serif";
  const centred = tpl.header === "stack";
  const rows = t.taxRows.flatMap((r) => r.components?.length
    ? r.components.map((c) => [`${c.label} ${r.rate / (r.components?.length ?? 1)}%`, m(c.amount)])
    : [[r.label, m(r.tax)]]);

  const partyBlock = `<div><p class="cap">${cap(kind.partyLabel)}</p><p class="strong">${esc(doc.buyer.name) || "Customer name"}</p><p class="muted">${esc(doc.buyer.address || "").replace(/\n/g, "<br>")}</p>${[doc.buyer.email, doc.buyer.phone].filter(Boolean).map((x) => `<p class="muted">${esc(String(x))}</p>`).join("")}${doc.buyer.taxId ? `<p class="muted">${pack.taxIdLabel}: ${esc(doc.buyer.taxId)}</p>` : ""}</div>`;
  const deliveryBlock = kind.showDelivery && (doc.shipTo || doc.deliveryDate)
    ? `<div><p class="cap">${cap("Deliver to")}</p><p class="muted">${esc(doc.shipTo || "").replace(/\n/g, "<br>")}</p>${doc.deliveryDate ? `<p class="muted">By ${formatDate(doc.deliveryDate, doc.country)}</p>` : ""}</div>` : "";
  const posBlock = doc.placeOfSupply ? `<div class="right"><p class="cap">${cap("Place of supply")}</p><p>${esc(pack.regions?.find((r) => r.code === doc.placeOfSupply)?.name ?? doc.placeOfSupply)}</p></div>` : "";

  const idBlock = `<div class="idblock">${doc.logoDataUrl ? `<img class="logo" src="${doc.logoDataUrl}" alt="">` : ""}<div>
      <p class="biz">${esc(doc.seller.name) || "Your business name"}</p>
      <p class="muted">${esc(doc.seller.address || "").replace(/\n/g, "<br>")}</p>
      ${[doc.seller.email, doc.seller.phone, doc.seller.website].filter(Boolean).map((x) => `<p class="muted">${esc(String(x))}</p>`).join("")}
      ${doc.seller.taxId ? `<p class="muted">${pack.taxIdLabel}: ${esc(doc.seller.taxId)}</p>` : ""}
    </div></div>`;
  const metaBlock = `<div class="${tpl.titleSide === "left" ? "" : "right"}">
      <p class="doctitle" style="font-size:${20 * tpl.scale * tpl.titleScale}px;letter-spacing:${tpl.titleTracking}em${centred ? ";text-transform:uppercase" : ""}">${title}</p>
      <p class="muted">${esc(doc.number)}</p>
      <p class="muted">Date: ${formatDate(doc.issueDate, doc.country)}</p>
      ${doc.dueDate && kind.secondDateLabel ? `<p class="muted">${kind.secondDateLabel}: ${formatDate(doc.dueDate, doc.country)}</p>` : ""}
      ${doc.buyerOrderRef ? `<p class="muted">Your order: ${esc(doc.buyerOrderRef)}</p>` : ""}
      ${kind.showPaidStamp ? `<p class="paidstamp">PAID</p>` : ""}
    </div>`;

  return `
  <div class="sheet tpl-${tpl.id} ${centred ? "centred" : ""} ${tpl.zebra ? "zebra" : ""}" style="--accent:${accent};--air:${tpl.air};font-size:${13 * tpl.scale}px;font-family:${face}">
    ${tpl.header === "band" ? `<div class="band"></div>` : ""}
    <div class="sheet-head ${tpl.header === "rule" ? "ruled" : ""} ${centred ? "stacked" : ""}">
      ${centred ? idBlock + metaBlock : tpl.titleSide === "left" ? metaBlock + idBlock : idBlock + metaBlock}
    </div>
    <div class="sheet-parties">${partyBlock}${deliveryBlock}${posBlock}</div>
    <table class="${tpl.table}">
      <thead><tr><th>${cap("Description")}</th><th class="num">${cap("Qty")}</th><th class="num">${cap("Rate")}</th>${hasTax ? `<th class="num">${cap(pack.taxLabel)}</th>` : ""}<th class="num">${cap("Amount")}</th></tr></thead>
      <tbody>${doc.items.map((item, i) => {
        const l = t.lines.find((x) => x.id === item.id);
        return `<tr><td>${esc(item.description) || `<span class="muted">Item ${i + 1}</span>`}${item.code ? `<span class="code">${esc(item.code)}</span>` : ""}</td><td class="num">${item.quantity}</td><td class="num">${m({ minor: Math.round(item.rate * 100), currency: doc.currency })}</td>${hasTax ? `<td class="num">${l?.rate ? `${l.rate}%` : "-"}</td>` : ""}<td class="num">${l ? m(l.net) : ""}</td></tr>`;
      }).join("")}</tbody>
    </table>
    <div class="sheet-foot">
      <div class="notes">
        ${t.total.minor > 0 ? `<p class="cap">${cap("Amount in words")}</p><p class="muted">${numberToWords(Math.floor(toMajor(t.total)), pack.numberSystem)} ${doc.currency} only</p>` : ""}
        ${kind.showPaymentReceived && (doc.paymentMethod || doc.paymentReference) ? `<p class="cap">${cap("Payment received")}</p><p class="muted">${doc.paymentMethod ? `By ${esc(doc.paymentMethod)}` : ""}${doc.paymentReference ? `<br>Reference ${esc(doc.paymentReference)}` : ""}</p>` : ""}
        ${kind.showPaymentDetails && doc.paymentDetails ? `<p class="cap">${cap("Payment details")}</p><p class="muted">${esc(doc.paymentDetails).replace(/\n/g, "<br>")}</p>` : ""}
        ${doc.notes ? `<p class="cap">${cap("Notes")}</p><p class="muted">${esc(doc.notes).replace(/\n/g, "<br>")}</p>` : ""}
        ${doc.terms ? `<p class="cap">${cap("Terms")}</p><p class="muted">${esc(doc.terms).replace(/\n/g, "<br>")}</p>` : ""}
      </div>
      <div class="sums">
        <div><span>Subtotal</span><span>${m(t.subtotal)}</span></div>
        ${t.lineDiscounts.minor || t.documentDiscount.minor ? `<div><span>Discounts</span><span>- ${m({ minor: t.lineDiscounts.minor + t.documentDiscount.minor, currency: t.currency })}</span></div><div><span>Taxable value</span><span>${m(t.taxableTotal)}</span></div>` : ""}
        ${rows.map(([l, v]) => `<div><span>${l}</span><span>${v}</span></div>`).join("")}
        ${t.shipping.minor ? `<div><span>Shipping</span><span>${m(t.shipping)}</span></div>` : ""}
        ${t.roundOff.minor ? `<div><span>Round off</span><span>${m(t.roundOff)}</span></div>` : ""}
        <div class="total"><span>${kind.showPaidStamp ? "Amount received" : "Total"}</span><span>${m(t.total)}</span></div>
        ${kind.showPaidAndBalance && t.paid.minor ? `<div><span>Paid</span><span>- ${m(t.paid)}</span></div><div class="total"><span>Balance due</span><span>${m(t.balanceDue)}</span></div>` : ""}
      </div>
    </div>
    ${doc.country === "IN" && t.hsnSummary.length ? `
    <div class="hsnsum">
      <p class="cap">${cap("GST summary by HSN or SAC")}</p>
      <table class="mini"><thead><tr><th>Code</th><th class="num">Taxable value</th><th class="num">Rate</th><th class="num">CGST</th><th class="num">${t.supply.stateTaxLabel}</th><th class="num">IGST</th></tr></thead>
      <tbody>${t.hsnSummary.map((r) => `<tr><td>${esc(r.code)}</td><td class="num">${m(r.taxable)}</td><td class="num">${r.rate}%</td><td class="num">${m(r.cgst)}</td><td class="num">${m(r.sgst)}</td><td class="num">${m(r.igst)}</td></tr>`).join("")}</tbody></table>
    </div>` : ""}
    <div class="sheet-sign">
      ${kind.showAcceptance ? `<div class="accept"><p class="cap">${cap(`Accepted for ${doc.buyer.name || "the customer"}`)}</p><span class="sigline">Signature and date</span></div>` : "<span></span>"}
      ${(doc.signMode ?? "none") === "none"
        ? `<p class="esign">This is an electronically generated ${title.toLowerCase()} and does not require a signature.</p>`
        : `<div class="signblock">${doc.signMode === "image" && doc.signatureDataUrl ? `<img src="${doc.signatureDataUrl}" alt="Signature">` : `<span class="sigspace"></span>`}<span class="sigline">${esc(doc.signatoryName || `For ${doc.seller.name || "your business"}`)}</span></div>`}
    </div>
  </div>
  ${t.warnings.length ? `<ul class="warnings">${t.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}`;
}

/** Small drawing pad for the signature: press, drag, release. */
function bindPad() {
  const c = document.getElementById("sigpad") as HTMLCanvasElement | null;
  if (!c || c.dataset.bound) return;
  c.dataset.bound = "1";
  const ctx = c.getContext("2d")!;
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 2.6; ctx.strokeStyle = "#121712";
  let drawing = false; let last: [number, number] | null = null;
  const at = (e: PointerEvent): [number, number] => {
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };
  c.addEventListener("pointerdown", (e) => { c.setPointerCapture(e.pointerId); drawing = true; last = at(e); });
  c.addEventListener("pointermove", (e) => { if (!drawing || !last) return; const p = at(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; });
  const end = () => { if (!drawing) return; drawing = false; last = null; doc = { ...doc, signatureDataUrl: c.toDataURL("image/png") }; render(); setTimeout(bindPad, 0); };
  c.addEventListener("pointerup", end);
  c.addEventListener("pointerleave", end);
}

function render() {
  $("#form").innerHTML = form();
  $("#preview").innerHTML = preview();
  document.querySelectorAll<HTMLElement>("[data-kind]").forEach((b) => b.classList.toggle("on", b.dataset.kind === doc.kind));
  bindPad();
}

function showHsn(id: string, query: string) {
  const box = document.querySelector<HTMLElement>(`[data-hsn-results="${id}"]`);
  if (!box) return;
  const results = searchHsn(query, 6);
  box.innerHTML = results.length && query
    ? results.map((r) => `<button type="button" class="hsn-hit" data-pick="${id}" data-code="${r.code}" data-rate="${r.rate}"><b>${r.label}</b><span>${r.kind === "service" ? "SAC" : "HSN"} ${r.code}, usually ${r.rate}% GST</span></button>`).join("")
    : "";
}

document.addEventListener("input", (e) => {
  const el = e.target as HTMLInputElement;
  if (el.id === "logo") {
    const file = el.files?.[0];
    if (file) { const r = new FileReader(); r.onload = () => set({ logoDataUrl: String(r.result) }); r.readAsDataURL(file); }
    return;
  }
  if (el.id === "sigfile") {
    const f = el.files?.[0];
    if (f) { const r = new FileReader(); r.onload = () => set({ signatureDataUrl: String(r.result) }); r.readAsDataURL(f); }
    return;
  }
  if (el.dataset.hsn) { setItem(el.dataset.hsn, { code: el.value }); showHsn(el.dataset.hsn, el.value); return; }
  const num = (v: string) => (v === "" ? 0 : Number(v));
  if (el.dataset.item) {
    const f = el.dataset.field!;
    const item = doc.items.find((i) => i.id === el.dataset.item);
    const patch = { [f]: ["quantity", "rate", "discountPct"].includes(f) ? num(el.value) : el.value } as Partial<LineItem>;
    setItem(el.dataset.item, f === "rate" ? { ...patch, ...autoTax(item?.code, num(el.value)) } : patch);
  } else if (el.dataset.seller) doc = { ...doc, seller: { ...doc.seller, [el.dataset.seller]: el.value } }, render();
  else if (el.dataset.buyer) doc = { ...doc, buyer: { ...doc.buyer, [el.dataset.buyer]: el.value } }, render();
  else if (el.dataset.set) {
    const k = el.dataset.set;
    if (k === "country") setCountry(el.value);
    else if (k === "sellerRegion") set({ seller: { ...doc.seller, region: el.value } });
    else if (["discountPct", "shipping", "amountPaid"].includes(k)) set({ [k]: num(el.value) || undefined } as Partial<DocumentData>);
    else if (el.type === "checkbox") set({ [k]: el.checked } as Partial<DocumentData>);
    else set({ [k]: el.value } as Partial<DocumentData>);
  }
});

document.addEventListener("click", async (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-kind],[data-remove],[data-pick],[data-sign],[data-supply],[data-tpl],[data-colour],#add-item,#download,#demo,#reset,#logo-clear,#sig-clear");
  if (!el) return;
  if (el.dataset.colour) { set({ accentColor: el.dataset.colour }); return; }
  if (el.dataset.tpl) { set({ template: el.dataset.tpl as DocumentData["template"] }); return; }
  if (el.dataset.supply) {
    const want = el.dataset.supply as "intra" | "inter" | "auto";
    const current = calculate(doc).supply;
    if (want === "auto") set({ supplyType: "auto" });
    else if (!current.automatic && current.interRegion === (want === "inter")) set({ supplyType: "auto" });
    else set({ supplyType: want });
    return;
  }
  if (el.dataset.sign) { set({ signMode: el.dataset.sign as "none" | "image" | "line" }); setTimeout(bindPad, 0); return; }
  if (el.id === "sig-clear") { const c = document.getElementById("sigpad") as HTMLCanvasElement | null; if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height); set({ signatureDataUrl: undefined }); setTimeout(bindPad, 0); return; }
  if (el.dataset.pick) {
    const inter = Boolean(doc.placeOfSupply && doc.seller.region && doc.placeOfSupply !== doc.seller.region);
    const item = doc.items.find((i) => i.id === el.dataset.pick);
    setItem(el.dataset.pick, { code: el.dataset.code, ...autoTax(el.dataset.code, item?.rate ?? 0), taxRuleId: autoTax(el.dataset.code, item?.rate ?? 0).taxRuleId ?? ruleIdForRate(Number(el.dataset.rate), inter) });
    return;
  }
  if (el.id === "logo-clear") { set({ logoDataUrl: undefined }); return; }
  if (el.dataset.kind) setKind(el.dataset.kind as DocumentKind);
  else if (el.dataset.remove) { if (doc.items.length > 1) { doc.items = doc.items.filter((i) => i.id !== el.dataset.remove); render(); } }
  else if (el.id === "add-item") { doc.items = [...doc.items, line(doc.country, doc.issueDate, Boolean(doc.placeOfSupply && doc.seller.region && doc.placeOfSupply !== doc.seller.region))]; render(); }
  else if (el.id === "reset") { doc = blank(doc.kind, doc.country); render(); }
  else if (el.id === "demo") {
    doc = { ...blank(doc.kind, "IN"), ...DEMO, kind: doc.kind, number: `${PREFIX[doc.kind]}0042`,
      items: [
        { id: "a", description: "Website design and build, including three rounds of revisions", quantity: 1, rate: 125000, taxRuleId: "in-igst-18" },
        { id: "b", description: "Monthly support retainer", unit: "months", quantity: 3, rate: 15000, taxRuleId: "in-igst-18" }
      ] } as DocumentData;
    render();
  } else if (el.id === "download") {
    const btn = el as HTMLButtonElement;
    btn.disabled = true; btn.textContent = "Preparing...";
    try {
      const blob = await buildPdf(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = documentFileName(doc); a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally { btn.disabled = false; btn.textContent = "Download PDF"; }
  }
});

render();
