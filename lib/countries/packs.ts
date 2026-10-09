import type { CountryPack } from "./types";

/**
 * Seed country packs. Rates below are the widely published headline rates and each carries its
 * source and the date it took effect. Before any of this is treated as authoritative for filing,
 * it should be checked against the regulator named in the source field.
 */

const commonFields = [
  { key: "sellerName", label: "Your business name", required: true },
  { key: "sellerAddress", label: "Your address", required: true },
  { key: "buyerName", label: "Customer name", required: true },
  { key: "number", label: "Invoice number", required: true },
  { key: "issueDate", label: "Invoice date", required: true }
];

export const INDIA: CountryPack = {
  code: "IN",
  name: "India",
  currency: "INR",
  locale: "en-IN",
  numberSystem: "indian",
  dateFormat: "dd/mm/yyyy",
  taxSystem: "GST",
  taxLabel: "GST",
  taxIdLabel: "GSTIN",
  taxIdPattern: "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",
  invoiceTitle: "Tax Invoice",
  support: "supported",
  notes: "GST splits into CGST and SGST within a state and becomes IGST between states. Since 22 September 2025 the usual rates are 5% and 18%, with 40% on luxury and sin goods. The old 12% and 28% rates stay available for invoices dated before that change.",
  regions: [
    { code: "AN", name: "Andaman and Nicobar Islands", kind: "ut" }, { code: "AP", name: "Andhra Pradesh" }, { code: "AR", name: "Arunachal Pradesh" },
    { code: "AS", name: "Assam" }, { code: "BR", name: "Bihar" }, { code: "CH", name: "Chandigarh", kind: "ut" }, { code: "CT", name: "Chhattisgarh" },
    { code: "DL", name: "Delhi" }, { code: "GA", name: "Goa" }, { code: "GJ", name: "Gujarat" }, { code: "HR", name: "Haryana" },
    { code: "HP", name: "Himachal Pradesh" }, { code: "JK", name: "Jammu and Kashmir" }, { code: "JH", name: "Jharkhand" },
    { code: "KA", name: "Karnataka" }, { code: "KL", name: "Kerala" }, { code: "LA", name: "Ladakh", kind: "ut" }, { code: "MP", name: "Madhya Pradesh" },
    { code: "MH", name: "Maharashtra" }, { code: "MN", name: "Manipur" }, { code: "ML", name: "Meghalaya" }, { code: "MZ", name: "Mizoram" },
    { code: "NL", name: "Nagaland" }, { code: "OR", name: "Odisha" }, { code: "PY", name: "Puducherry" }, { code: "PB", name: "Punjab" },
    { code: "RJ", name: "Rajasthan" }, { code: "SK", name: "Sikkim" }, { code: "TN", name: "Tamil Nadu" }, { code: "TG", name: "Telangana" },
    { code: "TR", name: "Tripura" }, { code: "UP", name: "Uttar Pradesh" }, { code: "UT", name: "Uttarakhand" }, { code: "WB", name: "West Bengal" },
    { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu", kind: "ut" }, { code: "LD", name: "Lakshadweep", kind: "ut" }
  ],
  requiredFields: [
    ...commonFields,
    { key: "sellerTaxId", label: "Your GSTIN", required: false, help: "Required if you are registered under GST." },
    { key: "buyerTaxId", label: "Customer GSTIN", required: false, help: "Required for business customers claiming input credit." },
    { key: "placeOfSupply", label: "Place of supply", required: true, help: "Decides whether CGST and SGST or IGST applies." },
    { key: "hsn", label: "HSN or SAC code", required: false, help: "Required above prescribed turnover limits." }
  ],
  taxRules: [
    { id: "in-gst-0", jurisdiction: "IN", label: "GST 0% (nil rated or exempt)", rate: 0, category: "zero", effectiveFrom: "2017-07-01", source: "GST Council rate schedules", version: 1, status: "published" },
    { id: "in-gst-5", jurisdiction: "IN", label: "GST 5%", rate: 5, category: "reduced", effectiveFrom: "2017-07-01", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "CGST", share: 0.5 }, { label: "SGST", share: 0.5 }], appliesWhen: "intra-region" },
    { id: "in-gst-18", jurisdiction: "IN", label: "GST 18%", rate: 18, category: "standard", effectiveFrom: "2017-07-01", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "CGST", share: 0.5 }, { label: "SGST", share: 0.5 }], appliesWhen: "intra-region" },
    { id: "in-gst-3", jurisdiction: "IN", label: "GST 3% (gold, silver, jewellery)", rate: 3, category: "special", effectiveFrom: "2017-07-01", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "CGST", share: 0.5 }, { label: "SGST", share: 0.5 }], appliesWhen: "intra-region" },
    // withdrawn by the 56th GST Council, effective 22 September 2025. Kept so older invoices still calculate correctly.
    { id: "in-gst-12", jurisdiction: "IN", label: "GST 12%", rate: 12, category: "reduced-old", effectiveFrom: "2017-07-01", effectiveUntil: "2025-09-22", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "CGST", share: 0.5 }, { label: "SGST", share: 0.5 }], appliesWhen: "intra-region" },
    { id: "in-gst-28", jurisdiction: "IN", label: "GST 28%", rate: 28, category: "higher-old", effectiveFrom: "2017-07-01", effectiveUntil: "2025-09-22", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "CGST", share: 0.5 }, { label: "SGST", share: 0.5 }], appliesWhen: "intra-region" },
    // introduced by the same reform for luxury and de-merit goods
    { id: "in-gst-40", jurisdiction: "IN", label: "GST 40% (luxury and sin goods)", rate: 40, category: "higher", effectiveFrom: "2025-09-22", source: "56th GST Council, effective 22 September 2025", version: 2, status: "published", components: [{ label: "CGST", share: 0.5 }, { label: "SGST", share: 0.5 }], appliesWhen: "intra-region" },
    { id: "in-igst-5", jurisdiction: "IN", label: "IGST 5%", rate: 5, category: "reduced-inter", effectiveFrom: "2017-07-01", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "IGST", share: 1 }], appliesWhen: "inter-region" },
    { id: "in-igst-18", jurisdiction: "IN", label: "IGST 18%", rate: 18, category: "standard-inter", effectiveFrom: "2017-07-01", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "IGST", share: 1 }], appliesWhen: "inter-region" },
    { id: "in-igst-3", jurisdiction: "IN", label: "IGST 3% (gold, silver, jewellery)", rate: 3, category: "special-inter", effectiveFrom: "2017-07-01", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "IGST", share: 1 }], appliesWhen: "inter-region" },
    { id: "in-igst-12", jurisdiction: "IN", label: "IGST 12%", rate: 12, category: "reduced-inter-old", effectiveFrom: "2017-07-01", effectiveUntil: "2025-09-22", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "IGST", share: 1 }], appliesWhen: "inter-region" },
    { id: "in-igst-28", jurisdiction: "IN", label: "IGST 28%", rate: 28, category: "higher-inter-old", effectiveFrom: "2017-07-01", effectiveUntil: "2025-09-22", source: "GST Council rate schedules", version: 1, status: "published", components: [{ label: "IGST", share: 1 }], appliesWhen: "inter-region" },
    { id: "in-igst-40", jurisdiction: "IN", label: "IGST 40% (luxury and sin goods)", rate: 40, category: "higher-inter", effectiveFrom: "2025-09-22", source: "56th GST Council, effective 22 September 2025", version: 2, status: "published", components: [{ label: "IGST", share: 1 }], appliesWhen: "inter-region" }
  ]
};

export const UNITED_KINGDOM: CountryPack = {
  code: "GB",
  name: "United Kingdom",
  currency: "GBP",
  locale: "en-GB",
  numberSystem: "international",
  dateFormat: "dd/mm/yyyy",
  taxSystem: "VAT",
  taxLabel: "VAT",
  taxIdLabel: "VAT number",
  taxIdPattern: "^(GB)?[0-9]{9}([0-9]{3})?$",
  invoiceTitle: "VAT Invoice",
  support: "supported",
  notes: "VAT registration is required above the published turnover threshold. Below it, invoices should not show VAT.",
  requiredFields: [
    ...commonFields,
    { key: "sellerTaxId", label: "Your VAT number", required: false, help: "Required if you are VAT registered." },
    { key: "buyerAddress", label: "Customer address", required: true },
    { key: "supplyDate", label: "Date of supply (tax point)", required: false }
  ],
  taxRules: [
    { id: "gb-vat-20", jurisdiction: "GB", label: "VAT standard 20%", rate: 20, category: "standard", effectiveFrom: "2011-01-04", source: "HMRC VAT rates", version: 1, status: "published" },
    { id: "gb-vat-5", jurisdiction: "GB", label: "VAT reduced 5%", rate: 5, category: "reduced", effectiveFrom: "2011-01-04", source: "HMRC VAT rates", version: 1, status: "published" },
    { id: "gb-vat-0", jurisdiction: "GB", label: "VAT zero rated 0%", rate: 0, category: "zero", effectiveFrom: "2011-01-04", source: "HMRC VAT rates", version: 1, status: "published" },
    { id: "gb-vat-exempt", jurisdiction: "GB", label: "VAT exempt", rate: 0, category: "exempt", effectiveFrom: "2011-01-04", source: "HMRC VAT notice 701", version: 1, status: "published" }
  ]
};

export const UNITED_STATES: CountryPack = {
  code: "US",
  name: "United States",
  currency: "USD",
  locale: "en-US",
  numberSystem: "international",
  dateFormat: "mm/dd/yyyy",
  taxSystem: "SALES_TAX",
  taxLabel: "Sales tax",
  taxIdLabel: "EIN",
  invoiceTitle: "Invoice",
  support: "partial",
  notes: "Sales tax in the United States is set by states, counties and cities, and combined rates differ street by street. Enter the rate that applies to you rather than relying on a default.",
  requiredFields: [
    ...commonFields,
    { key: "sellerTaxId", label: "EIN (optional)", required: false },
    { key: "buyerAddress", label: "Customer address", required: false }
  ],
  taxRules: [
    { id: "us-none", jurisdiction: "US", label: "No sales tax", rate: 0, category: "zero", effectiveFrom: "2000-01-01", source: "n/a", version: 1, status: "published" },
    { id: "us-custom", jurisdiction: "US", label: "Sales tax (enter your rate)", rate: 0, category: "standard", effectiveFrom: "2000-01-01", source: "State and local tax authority", version: 1, status: "draft" }
  ]
};

export const UAE: CountryPack = {
  code: "AE",
  name: "United Arab Emirates",
  currency: "AED",
  locale: "en-AE",
  numberSystem: "international",
  dateFormat: "dd/mm/yyyy",
  taxSystem: "VAT",
  taxLabel: "VAT",
  taxIdLabel: "TRN",
  taxIdPattern: "^[0-9]{15}$",
  invoiceTitle: "Tax Invoice",
  support: "supported",
  requiredFields: [...commonFields, { key: "sellerTaxId", label: "Your TRN", required: false, help: "Required if registered for VAT." }, { key: "buyerAddress", label: "Customer address", required: true }],
  taxRules: [
    { id: "ae-vat-5", jurisdiction: "AE", label: "VAT 5%", rate: 5, category: "standard", effectiveFrom: "2018-01-01", source: "Federal Tax Authority", version: 1, status: "published" },
    { id: "ae-vat-0", jurisdiction: "AE", label: "VAT zero rated 0%", rate: 0, category: "zero", effectiveFrom: "2018-01-01", source: "Federal Tax Authority", version: 1, status: "published" },
    { id: "ae-vat-exempt", jurisdiction: "AE", label: "VAT exempt", rate: 0, category: "exempt", effectiveFrom: "2018-01-01", source: "Federal Tax Authority", version: 1, status: "published" }
  ]
};

export const SINGAPORE: CountryPack = {
  code: "SG",
  name: "Singapore",
  currency: "SGD",
  locale: "en-SG",
  numberSystem: "international",
  dateFormat: "dd/mm/yyyy",
  taxSystem: "GST",
  taxLabel: "GST",
  taxIdLabel: "GST registration number",
  invoiceTitle: "Tax Invoice",
  support: "supported",
  requiredFields: [...commonFields, { key: "sellerTaxId", label: "Your GST registration number", required: false }, { key: "buyerAddress", label: "Customer address", required: true }],
  taxRules: [
    { id: "sg-gst-7", jurisdiction: "SG", label: "GST 7%", rate: 7, category: "standard", effectiveFrom: "2007-07-01", effectiveUntil: "2023-01-01", source: "IRAS", version: 1, status: "published" },
    { id: "sg-gst-8", jurisdiction: "SG", label: "GST 8%", rate: 8, category: "standard", effectiveFrom: "2023-01-01", effectiveUntil: "2024-01-01", source: "IRAS", version: 2, status: "published" },
    { id: "sg-gst-9", jurisdiction: "SG", label: "GST 9%", rate: 9, category: "standard", effectiveFrom: "2024-01-01", source: "IRAS", version: 3, status: "published" },
    { id: "sg-gst-0", jurisdiction: "SG", label: "GST zero rated 0%", rate: 0, category: "zero", effectiveFrom: "2007-07-01", source: "IRAS", version: 1, status: "published" }
  ]
};

export const AUSTRALIA: CountryPack = {
  code: "AU",
  name: "Australia",
  currency: "AUD",
  locale: "en-AU",
  numberSystem: "international",
  dateFormat: "dd/mm/yyyy",
  taxSystem: "GST",
  taxLabel: "GST",
  taxIdLabel: "ABN",
  taxIdPattern: "^[0-9]{11}$",
  invoiceTitle: "Tax Invoice",
  support: "supported",
  requiredFields: [...commonFields, { key: "sellerTaxId", label: "Your ABN", required: true, help: "An Australian tax invoice must show the supplier's ABN." }],
  taxRules: [
    { id: "au-gst-10", jurisdiction: "AU", label: "GST 10%", rate: 10, category: "standard", effectiveFrom: "2000-07-01", source: "Australian Taxation Office", version: 1, status: "published" },
    { id: "au-gst-0", jurisdiction: "AU", label: "GST free 0%", rate: 0, category: "zero", effectiveFrom: "2000-07-01", source: "Australian Taxation Office", version: 1, status: "published" }
  ]
};

export const CANADA: CountryPack = {
  code: "CA",
  name: "Canada",
  currency: "CAD",
  locale: "en-CA",
  numberSystem: "international",
  dateFormat: "yyyy-mm-dd",
  taxSystem: "GST",
  taxLabel: "GST/HST",
  taxIdLabel: "GST/HST number",
  invoiceTitle: "Invoice",
  support: "partial",
  notes: "Federal GST applies everywhere. Several provinces combine it into HST, and others add a separate provincial tax. Pick the rate for the province where the supply takes place.",
  requiredFields: [...commonFields, { key: "sellerTaxId", label: "Your GST/HST number", required: false }, { key: "placeOfSupply", label: "Province of supply", required: false }],
  taxRules: [
    { id: "ca-gst-5", jurisdiction: "CA", label: "GST 5%", rate: 5, category: "standard", effectiveFrom: "2008-01-01", source: "Canada Revenue Agency", version: 1, status: "published" },
    { id: "ca-hst-13", jurisdiction: "CA-ON", label: "HST 13% (Ontario)", rate: 13, category: "standard-region", effectiveFrom: "2010-07-01", source: "Canada Revenue Agency", version: 1, status: "published" },
    { id: "ca-hst-15", jurisdiction: "CA-NS", label: "HST 15% (Atlantic provinces)", rate: 15, category: "standard-region", effectiveFrom: "2016-07-01", source: "Canada Revenue Agency", version: 1, status: "published" },
    { id: "ca-gst-0", jurisdiction: "CA", label: "Zero rated 0%", rate: 0, category: "zero", effectiveFrom: "2008-01-01", source: "Canada Revenue Agency", version: 1, status: "published" }
  ]
};

/** A last-resort pack for countries without their own: no tax assumptions, user enters a rate. */
export const GENERIC: CountryPack = {
  code: "XX",
  name: "Other country",
  currency: "USD",
  locale: "en-US",
  numberSystem: "international",
  dateFormat: "yyyy-mm-dd",
  taxSystem: "NONE",
  taxLabel: "Tax",
  taxIdLabel: "Tax number",
  invoiceTitle: "Invoice",
  support: "configuration-only",
  notes: "No tax rules are configured for this country yet. Enter the rate that applies to you, and check it against your own tax authority.",
  requiredFields: commonFields,
  taxRules: [
    { id: "xx-none", jurisdiction: "XX", label: "No tax", rate: 0, category: "zero", effectiveFrom: "2000-01-01", source: "n/a", version: 1, status: "published" },
    { id: "xx-custom", jurisdiction: "XX", label: "Tax (enter your rate)", rate: 0, category: "standard", effectiveFrom: "2000-01-01", source: "Your tax authority", version: 1, status: "draft" }
  ]
};

export const PACKS: CountryPack[] = [INDIA, UNITED_STATES, UNITED_KINGDOM, UAE, SINGAPORE, AUSTRALIA, CANADA, GENERIC];
/** Falls back rather than throwing: a document with a missing country should still calculate. */
export const packFor = (code: string | undefined | null): CountryPack =>
  (code ? PACKS.find((p) => p.code === String(code).toUpperCase()) : undefined) ?? GENERIC;
