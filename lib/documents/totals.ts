import { packFor } from "../countries/packs";
import { ruleById, rulesOn, type TaxRule } from "../countries/types";
import { add, allocate, fromMinor, money, percentOf, subtract, sum, zero } from "../money";
import type { DocumentData, DocumentTotals, HsnSummaryRow, TaxBreakdownRow } from "./types";

/**
 * Calculates a document, in this order: line amount, line discount, document discount spread
 * across lines, then tax per line using the rules in force on the issue date. Tax is worked out
 * per line and grouped for display, which is what tax authorities expect and what makes a
 * mixed-rate invoice add up.
 */
export function calculate(doc: DocumentData): DocumentTotals {
  const cur = doc.currency;
  const pack = packFor(doc.country);
  const warnings: string[] = [];
  const available = rulesOn(pack, doc.issueDate);

  // an export or SEZ supply is always treated as inter-state, whatever the states say
  const isExport = Boolean(doc.export?.enabled);
  const automatic = !isExport && (doc.supplyType ?? "auto") === "auto";
  const derived = Boolean(doc.placeOfSupply && doc.seller.region && doc.placeOfSupply !== doc.seller.region);
  const interRegion = isExport ? true : automatic ? derived : doc.supplyType === "inter";
  // a union territory without its own legislature charges UTGST where a state charges SGST
  const placeKind = pack.regions?.find((r) => r.code === (doc.placeOfSupply || doc.seller.region))?.kind;
  const stateTaxLabel: "SGST" | "UTGST" = placeKind === "ut" ? "UTGST" : "SGST";

  // line gross and line-level discount
  const base = doc.items.map((item) => {
    const gross = money(item.quantity * item.rate, cur);
    const discount = item.discountPct ? percentOf(gross, item.discountPct) : zero(cur);
    return { item, gross, discount, net: subtract(gross, discount) };
  });

  const subtotal = sum(base.map((b) => b.gross), cur);
  const lineDiscounts = sum(base.map((b) => b.discount), cur);
  const afterLineDiscount = subtract(subtotal, lineDiscounts);

  // document discount, spread across lines by value so the tax per line stays correct
  const documentDiscount = doc.discountPct ? percentOf(afterLineDiscount, doc.discountPct) : zero(cur);
  const shares = allocate(documentDiscount, base.map((b) => Math.max(0, b.net.minor)));

  const lines = base.map((b, i) => {
    const netAfterDoc = subtract(b.net, shares[i] ?? zero(cur));
    const rule = b.item.taxRuleId ? ruleById(pack, b.item.taxRuleId) : undefined;
    const rate = b.item.taxRateOverride ?? rule?.rate ?? 0;

    if (rule && (rule.effectiveFrom > doc.issueDate || (rule.effectiveUntil && rule.effectiveUntil <= doc.issueDate))) {
      warnings.push(`"${rule.label}" was not in force on ${doc.issueDate}. Check the rate for this date.`);
    }

    // On a tax-inclusive document the typed rate already contains the tax, so strip it back out.
    const taxable = doc.taxInclusive && rate > 0 ? fromMinor(Math.round(netAfterDoc.minor / (1 + rate / 100)), cur) : netAfterDoc;
    const tax = doc.taxInclusive && rate > 0 ? subtract(netAfterDoc, taxable) : percentOf(taxable, rate);

    return {
      id: b.item.id,
      gross: b.gross,
      discount: add(b.discount, shares[i] ?? zero(cur)),
      net: taxable,
      tax,
      total: add(taxable, tax),
      rate,
      label: rule?.label ?? (rate > 0 ? `${pack.taxLabel} ${rate}%` : "No tax"),
      rule
    };
  });

  // group tax by rule so the document shows "GST 18%" once, not once per line
  const groups = new Map<string, TaxBreakdownRow & { rule?: TaxRule }>();
  for (const l of lines) {
    if (l.rate === 0 && !l.rule) continue;
    const key = `${l.label}|${l.rate}`;
    const existing = groups.get(key);
    if (existing) {
      existing.taxable = add(existing.taxable, l.net);
      existing.tax = add(existing.tax, l.tax);
    } else {
      groups.set(key, { label: l.label, rate: l.rate, taxable: l.net, tax: l.tax, ruleId: l.rule?.id, source: l.rule?.source, effectiveFrom: l.rule?.effectiveFrom, rule: l.rule });
    }
  }

  const taxRows: TaxBreakdownRow[] = [...groups.values()].map((row) => {
    const comps = row.rule?.components;
    if (!comps?.length) return { ...row, rule: undefined };
    const parts = allocate(row.tax, comps.map((c) => c.share * 1000));
    return { ...row, rule: undefined, components: comps.map((c, i) => ({ label: c.label === "SGST" ? stateTaxLabel : c.label, amount: parts[i] ?? zero(cur) })) };
  });

  /**
   * HSN-wise summary. Tax is split the way the law requires: half CGST and half SGST for a supply
   * inside the state, all of it IGST when the place of supply is another state.
   */
  const hsnMap = new Map<string, HsnSummaryRow>();
  for (const l of lines) {
    const item = doc.items.find((i) => i.id === l.id);
    const code = item?.code || "";
    if (!code && l.rate === 0) continue;
    const key = `${code}|${l.rate}`;
    const comps = l.rule?.components;
    const isIgst = comps?.some((c) => c.label === "IGST") ?? interRegion;
    const half = fromMinor(Math.round(l.tax.minor / 2), cur);
    const row = hsnMap.get(key) ?? { code: code || "Not set", rate: l.rate, taxable: zero(cur), cgst: zero(cur), sgst: zero(cur), igst: zero(cur), total: zero(cur) };
    row.taxable = add(row.taxable, l.net);
    if (isIgst) row.igst = add(row.igst, l.tax);
    else { row.cgst = add(row.cgst, half); row.sgst = add(row.sgst, subtract(l.tax, half)); }
    row.total = add(row.total, l.tax);
    hsnMap.set(key, row);
  }
  const hsnSummary = [...hsnMap.values()].sort((a, b) => a.code.localeCompare(b.code) || a.rate - b.rate);

  const taxableTotal = sum(lines.map((l) => l.net), cur);
  const taxTotal = sum(lines.map((l) => l.tax), cur);
  const shipping = doc.shipping ? money(doc.shipping, cur) : zero(cur);

  const beforeRounding = add(add(taxableTotal, taxTotal), shipping);
  const roundOff = doc.roundOff ? fromMinor(Math.round(beforeRounding.minor / 100) * 100 - beforeRounding.minor, cur) : zero(cur);
  const total = add(beforeRounding, roundOff);
  const paid = doc.amountPaid ? money(doc.amountPaid, cur) : zero(cur);

  // honest notices about the rules themselves
  for (const row of taxRows) {
    const rule = row.ruleId ? ruleById(pack, row.ruleId) : undefined;
    if (rule?.status === "draft") warnings.push(`${rule.label} is not a verified rate. Confirm it with ${rule.source}.`);
  }
  if (pack.taxSystem !== "NONE" && available.length === 0) warnings.push(`No ${pack.taxLabel} rules are configured for ${pack.name} on ${doc.issueDate}.`);
  if (isExport && pack.code === "IN") {
    const mode = doc.export?.taxMode ?? "lut";
    const taxed = lines.some((l) => l.rate > 0);
    if (mode === "lut" && taxed) warnings.push("Under a letter of undertaking an export is zero rated, so the lines should carry no tax. Set each line to GST 0% or switch to charging IGST.");
    if (mode === "with-igst" && !taxed) warnings.push("You have chosen to export with payment of IGST, so the lines should carry IGST and you reclaim it later.");
    if (mode === "lut" && !doc.export?.lutNumber) warnings.push("Add your letter of undertaking reference. It belongs on the declaration.");
  }
  if (pack.code === "IN" && !isExport) {
    const mismatch = lines.some((l) => l.rule?.appliesWhen && ((interRegion && l.rule.appliesWhen === "intra-region") || (!interRegion && l.rule.appliesWhen === "inter-region")));
    if (mismatch) warnings.push(interRegion ? `This document is set to IGST, but some lines still carry CGST and ${stateTaxLabel}.` : `This document is set to CGST and ${stateTaxLabel}, but some lines still carry IGST.`);
    if (!automatic && derived !== interRegion) {
      warnings.push(derived
        ? "You have chosen CGST and " + stateTaxLabel + " even though the place of supply is another state. Keep this only if you know why, for example a supply that is not treated as inter-state."
        : "You have chosen IGST even though the place of supply is your own state. Keep this only for exports, SEZ supplies or similar.");
    }
  }

  return {
    // the rule object is internal, so it is dropped from the returned lines
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lines: lines.map(({ rule: _rule, ...l }) => l),
    subtotal, lineDiscounts, documentDiscount, taxableTotal, taxTotal, taxRows, hsnSummary, shipping, roundOff, total, paid,
    supply: { interRegion, automatic, stateTaxLabel },
    balanceDue: subtract(total, paid),
    currency: cur,
    warnings: [...new Set(warnings)]
  };
}

/**
 * The same rate expressed for the other kind of supply: GST 18% within a state becomes IGST 18%
 * between states, and back again. Used when the place of supply changes after lines were added.
 */
export function counterpartRuleId(country: string, isoDate: string, ruleId: string | undefined, interRegion: boolean): string | undefined {
  if (!ruleId) return undefined;
  const pack = packFor(country);
  const current = ruleById(pack, ruleId);
  if (!current?.appliesWhen || current.appliesWhen === "always") return ruleId;
  const wanted = interRegion ? "inter-region" : "intra-region";
  if (current.appliesWhen === wanted) return ruleId;
  const match = rulesOn(pack, isoDate).find((r) => r.rate === current.rate && r.appliesWhen === wanted);
  return match?.id ?? ruleId;
}

/** Suggested tax rule for a new line: the country's standard rate, matched to intra or inter region. */
export function defaultTaxRuleId(country: string, isoDate: string, interRegion = false): string | undefined {
  const pack = packFor(country);
  const rules = rulesOn(pack, isoDate);
  const wanted = interRegion ? "standard-inter" : "standard";
  return (rules.find((r) => r.category === wanted) ?? rules.find((r) => r.category === "standard") ?? rules[0])?.id;
}
