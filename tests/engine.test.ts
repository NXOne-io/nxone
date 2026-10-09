import { describe, expect, it } from "vitest";
import { allocate, formatMoney, money, numberToWords, toMajor } from "@/lib/money";
import { calculate, defaultTaxRuleId } from "@/lib/documents/totals";
import { packFor } from "@/lib/countries/packs";
import { rulesOn, standardRuleOn } from "@/lib/countries/types";
import type { DocumentData } from "@/lib/documents/types";

const doc = (over: Partial<DocumentData> = {}): DocumentData => ({
  kind: "invoice", country: "IN", currency: "INR", issueDate: "2026-09-01", number: "INV-1",
  seller: { name: "Seller", region: "MH" }, buyer: { name: "Buyer", region: "MH" }, placeOfSupply: "MH",
  items: [{ id: "1", description: "Consulting", quantity: 10, rate: 1000, taxRuleId: "in-gst-18" }],
  taxInclusive: false, ...over
});

describe("money", () => {
  it("keeps cents exact across many lines", () => {
    const cents = Array.from({ length: 100 }, () => money(0.1, "USD").minor).reduce((a, b) => a + b, 0);
    expect(cents).toBe(1000);
  });
  it("allocates without losing or inventing units", () => {
    const parts = allocate(money(10, "USD"), [1, 1, 1]);
    expect(parts.map((p) => p.minor)).toEqual([334, 333, 333]);
    expect(parts.reduce((a, p) => a + p.minor, 0)).toBe(1000);
  });
  it("formats by locale and currency decimals", () => {
    expect(formatMoney(money(1234.5, "INR"), "en-IN")).toContain("1,234.50");
    expect(formatMoney(money(1234, "JPY"), "ja-JP")).not.toContain(".");
  });
  it("writes amounts in words, Indian and international", () => {
    expect(numberToWords(125000, "indian")).toBe("one lakh twenty-five thousand");
    expect(numberToWords(125000)).toBe("one hundred and twenty-five thousand");
  });
});

describe("tax rules over time", () => {
  it("uses the rate in force on the document date, not today's", () => {
    const sg = packFor("SG");
    expect(standardRuleOn(sg, "2022-06-01")?.rate).toBe(7);
    expect(standardRuleOn(sg, "2023-06-01")?.rate).toBe(8);
    expect(standardRuleOn(sg, "2026-01-01")?.rate).toBe(9);
  });
  it("excludes retired rules", () => {
    expect(rulesOn(packFor("SG"), "2026-01-01").some((r) => r.id === "sg-gst-7")).toBe(false);
  });
});

describe("document totals", () => {
  it("adds tax to an exclusive invoice", () => {
    const t = calculate(doc());
    expect(toMajor(t.taxableTotal)).toBe(10000);
    expect(toMajor(t.taxTotal)).toBe(1800);
    expect(toMajor(t.total)).toBe(11800);
  });
  it("splits Indian GST into CGST and SGST", () => {
    const rows = calculate(doc()).taxRows;
    expect(rows[0].components?.map((c) => [c.label, toMajor(c.amount)])).toEqual([["CGST", 900], ["SGST", 900]]);
  });
  it("extracts tax from an inclusive invoice", () => {
    const t = calculate(doc({ taxInclusive: true, items: [{ id: "1", description: "x", quantity: 1, rate: 1180, taxRuleId: "in-gst-18" }] }));
    expect(toMajor(t.taxableTotal)).toBe(1000);
    expect(toMajor(t.taxTotal)).toBe(180);
    expect(toMajor(t.total)).toBe(1180);
  });
  it("applies line and document discounts before tax", () => {
    const t = calculate(doc({ discountPct: 10, items: [{ id: "1", description: "x", quantity: 1, rate: 1000, discountPct: 50, taxRuleId: "in-gst-18" }] }));
    expect(toMajor(t.taxableTotal)).toBe(450);
    expect(toMajor(t.taxTotal)).toBe(81);
  });
  it("groups mixed rates into separate tax rows", () => {
    const t = calculate(doc({ items: [
      { id: "1", description: "a", quantity: 1, rate: 1000, taxRuleId: "in-gst-18" },
      { id: "2", description: "b", quantity: 1, rate: 1000, taxRuleId: "in-gst-5" },
      { id: "3", description: "c", quantity: 1, rate: 1000, taxRuleId: "in-gst-18" }
    ] }));
    expect(t.taxRows.length).toBe(2);
    expect(toMajor(t.taxTotal)).toBe(410);
  });
  it("warns when the place of supply contradicts the tax chosen", () => {
    const t = calculate(doc({ placeOfSupply: "KA" }));
    expect(t.warnings.join(" ")).toMatch(/IGST/);
  });
  it("warns when a rate is not verified", () => {
    const t = calculate(doc({ country: "US", currency: "USD", seller: { name: "s" }, buyer: { name: "b" }, placeOfSupply: undefined, items: [{ id: "1", description: "x", quantity: 1, rate: 100, taxRuleId: "us-custom", taxRateOverride: 8.25 }] }));
    expect(toMajor(t.taxTotal)).toBe(8.25);
    expect(t.warnings.join(" ")).toMatch(/not a verified rate/);
  });
  it("rounds off and shows the balance due", () => {
    const t = calculate(doc({ roundOff: true, amountPaid: 5000, items: [{ id: "1", description: "x", quantity: 1, rate: 1000.4, taxRuleId: "in-gst-18" }] }));
    expect(toMajor(t.total) % 1).toBe(0);
    expect(toMajor(t.balanceDue)).toBe(toMajor(t.total) - 5000);
  });
  it("suggests the right default rule for intra and inter state supply", () => {
    expect(defaultTaxRuleId("IN", "2026-09-01", false)).toBe("in-gst-18");
    expect(defaultTaxRuleId("IN", "2026-09-01", true)).toBe("in-igst-18");
    expect(defaultTaxRuleId("GB", "2026-09-01")).toBe("gb-vat-20");
  });
});

describe("place of supply", () => {
  it("swaps a rate between its intra-state and inter-state versions", async () => {
    const { counterpartRuleId } = await import("@/lib/documents/totals");
    expect(counterpartRuleId("IN", "2026-09-01", "in-gst-18", true)).toBe("in-igst-18");
    expect(counterpartRuleId("IN", "2026-09-01", "in-igst-18", false)).toBe("in-gst-18");
    expect(counterpartRuleId("IN", "2026-09-01", "in-gst-5", true)).toBe("in-igst-5");
    expect(counterpartRuleId("GB", "2026-09-01", "gb-vat-20", true)).toBe("gb-vat-20");
  });
});

describe("value based rates", () => {
  it("picks the rate from the price of one piece, on the date of the invoice", async () => {
    const { hsnByCode, rateFor } = await import("@/lib/countries/hsn");
    const shirt = hsnByCode("6203")!;
    expect(rateFor(shirt, 2400, "2026-09-28").rate).toBe(5);
    expect(rateFor(shirt, 2600, "2026-09-28").rate).toBe(18);
    // before the September 2025 reform the threshold was 1,000 and the upper rate 12%
    expect(rateFor(shirt, 900, "2025-06-01").rate).toBe(5);
    expect(rateFor(shirt, 1500, "2025-06-01").rate).toBe(12);
  });
  it("explains why a rate was chosen", async () => {
    const { hsnByCode, rateFor } = await import("@/lib/countries/hsn");
    expect(rateFor(hsnByCode("996311")!, 9000, "2026-09-28").reason).toMatch(/above 7,500/);
  });
  it("leaves flat rated codes alone", async () => {
    const { hsnByCode, rateFor } = await import("@/lib/countries/hsn");
    expect(rateFor(hsnByCode("998314")!, 999999, "2026-09-28").rate).toBe(18);
  });
});

describe("HSN summary", () => {
  const withCodes = (interState: boolean) => calculate(doc({
    placeOfSupply: interState ? "KA" : "MH",
    items: [
      { id: "1", description: "Shirts", quantity: 10, rate: 2000, code: "6203", taxRuleId: interState ? "in-igst-5" : "in-gst-5" },
      { id: "2", description: "Consulting", quantity: 1, rate: 50000, code: "998311", taxRuleId: interState ? "in-igst-18" : "in-gst-18" }
    ]
  }));
  it("splits tax into CGST and SGST within a state", () => {
    const rows = withCodes(false).hsnSummary;
    const shirts = rows.find((r) => r.code === "6203")!;
    expect(toMajor(shirts.cgst)).toBe(500);
    expect(toMajor(shirts.sgst)).toBe(500);
    expect(toMajor(shirts.igst)).toBe(0);
  });
  it("puts everything in IGST between states", () => {
    const rows = withCodes(true).hsnSummary;
    const consulting = rows.find((r) => r.code === "998311")!;
    expect(toMajor(consulting.igst)).toBe(9000);
    expect(toMajor(consulting.cgst)).toBe(0);
  });
  it("adds up to the tax total", () => {
    const t = withCodes(false);
    const summed = t.hsnSummary.reduce((a, r) => a + r.total.minor, 0);
    expect(summed).toBe(t.taxTotal.minor);
  });
});

describe("which taxes apply", () => {
  it("decides from the place of supply on its own", () => {
    expect(calculate(doc({ placeOfSupply: "MH" })).supply).toMatchObject({ interRegion: false, automatic: true, stateTaxLabel: "SGST" });
    expect(calculate(doc({ placeOfSupply: "KA" })).supply.interRegion).toBe(true);
  });
  it("lets the user overrule it, for exports and SEZ supplies", () => {
    const forced = calculate(doc({ placeOfSupply: "MH", supplyType: "inter" }));
    expect(forced.supply).toMatchObject({ interRegion: true, automatic: false });
    expect(forced.warnings.join(" ")).toMatch(/exports, SEZ/);
  });
  it("calls it UTGST in a union territory without a legislature", () => {
    const ut = calculate(doc({ seller: { name: "s", region: "CH" }, placeOfSupply: "CH", items: [{ id: "1", description: "x", quantity: 1, rate: 1000, code: "998311", taxRuleId: "in-gst-18" }] }));
    expect(ut.supply.stateTaxLabel).toBe("UTGST");
    expect(ut.taxRows[0].components?.map((c) => c.label)).toEqual(["CGST", "UTGST"]);
  });
  it("still says SGST in Delhi, which has its own legislature", () => {
    expect(calculate(doc({ seller: { name: "s", region: "DL" }, placeOfSupply: "DL" })).supply.stateTaxLabel).toBe("SGST");
  });
});

describe("exports", () => {
  const exportDoc = (over: Partial<import("@/lib/documents/types").ExportDetails> = {}, items?: DocumentData["items"]) =>
    calculate(doc({
      placeOfSupply: "MH",
      export: { enabled: true, kind: "services", taxMode: "lut", buyerCountry: "United States", lutNumber: "AD270324", ...over },
      items: items ?? [{ id: "1", description: "Design", quantity: 1, rate: 100000, taxRuleId: "in-gst-0" }]
    }));

  it("treats an export as inter-state even when the states match", () => {
    expect(exportDoc().supply.interRegion).toBe(true);
  });
  it("expects no tax under a letter of undertaking", () => {
    const t = exportDoc({}, [{ id: "1", description: "Design", quantity: 1, rate: 100000, taxRuleId: "in-igst-18" }]);
    expect(t.warnings.join(" ")).toMatch(/zero rated/);
  });
  it("expects IGST when exporting with payment of tax", () => {
    expect(exportDoc({ taxMode: "with-igst" }).warnings.join(" ")).toMatch(/should carry IGST/);
  });
  it("asks for the LUT reference when there is not one", () => {
    expect(exportDoc({ lutNumber: undefined }).warnings.join(" ")).toMatch(/letter of undertaking reference/);
  });
  it("writes the right declaration for each case", async () => {
    const { exportDeclaration, missingExportFields } = await import("@/lib/documents/export");
    expect(exportDeclaration("services", "lut", "AD270324")).toMatch(/without payment of integrated tax under LUT AD270324/);
    expect(exportDeclaration("goods", "with-igst")).toMatch(/with payment of integrated tax/);
    expect(exportDeclaration("sez", "lut")).toMatch(/special economic zone/);
    expect(missingExportFields(doc({ export: { enabled: true, kind: "goods", taxMode: "lut" } }))).toContain("the shipping bill number");
  });
});

describe("payment details", () => {
  it("builds a UPI link with the amount filled in", async () => {
    const { upiUri } = await import("@/lib/documents/payment");
    const uri = upiUri({ upiId: "acme@hdfcbank", name: "Acme Consulting LLP", amount: money(147500, "INR"), note: "INV-0007" });
    expect(uri).toContain("pa=acme%40hdfcbank");
    expect(uri).toContain("am=147500.00");
    expect(uri).toContain("cu=INR");
    expect(uri).toContain("tn=INV-0007");
  });
  it("leaves the amount out for other currencies, since UPI is rupees only", async () => {
    const { upiUri } = await import("@/lib/documents/payment");
    expect(upiUri({ upiId: "acme@hdfcbank", name: "Acme", amount: money(100, "USD") })).not.toContain("am=");
  });
  it("spots an id that is not a UPI id", async () => {
    const { looksLikeUpiId } = await import("@/lib/documents/payment");
    expect(looksLikeUpiId("acme@hdfcbank")).toBe(true);
    expect(looksLikeUpiId("acme@")).toBe(false);
    expect(looksLikeUpiId("9876543210")).toBe(false);
  });
  it("makes a scannable QR", async () => {
    const { qrDataUrl } = await import("@/lib/documents/payment");
    const url = await qrDataUrl("upi://pay?pa=acme@hdfcbank");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    expect(url.length).toBeGreaterThan(500);
  });
});

describe("a document missing its country", () => {
  it("still calculates, using the generic pack rather than throwing", () => {
    const t = calculate({ ...doc(), country: undefined as unknown as string });
    expect(t.total.minor).toBeGreaterThan(0);
    expect(t.supply.stateTaxLabel).toBe("SGST");
  });
});
