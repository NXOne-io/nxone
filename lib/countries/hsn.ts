/**
 * A short, practical list of HSN codes (goods) and SAC codes (services) for Indian invoices,
 * so a user picks what they sell instead of hunting through the full schedule.
 *
 * Rates are the commonly applied ones after the GST 2.0 rationalisation of 22 September 2025.
 * They are a starting point, not a ruling: rate depends on the exact product, packaging and
 * conditions, so the picker suggests and the user confirms.
 */

/**
 * Some rates depend on the price of a single piece rather than the invoice total: a shirt at
 * Rs 2,400 is taxed at 5% and the same shirt at Rs 2,600 at 18%. A band says where that line sits.
 */
export interface ValueBand {
  /** Applies while the value of one unit is at or below this. Leave out for the top band. */
  upTo?: number;
  rate: number;
  /** What one unit means here: a piece, a pair, a night. */
  unit: string;
  /** When this threshold started applying, so older invoices can use the older one. */
  effectiveFrom: string;
  effectiveUntil?: string;
  source: string;
}

export interface HsnEntry {
  code: string;
  label: string;
  kind: "goods" | "service";
  /** Commonly applied GST rate in percent, used when there are no value bands. */
  rate: number;
  /** Rates that change with the price of one unit. */
  bands?: ValueBand[];
  /** Extra words people actually type when searching for this. */
  also?: string;
}

const APPAREL = (from = "2025-09-22"): ValueBand[] => [
  { upTo: 1000, rate: 5, unit: "piece", effectiveFrom: "2017-07-01", effectiveUntil: from, source: "GST rate schedule before 22 September 2025" },
  { rate: 12, unit: "piece", effectiveFrom: "2017-07-01", effectiveUntil: from, source: "GST rate schedule before 22 September 2025" },
  { upTo: 2500, rate: 5, unit: "piece", effectiveFrom: from, source: "56th GST Council, effective 22 September 2025" },
  { rate: 18, unit: "piece", effectiveFrom: from, source: "56th GST Council, effective 22 September 2025" }
];

const FOOTWEAR = (): ValueBand[] => [
  { upTo: 1000, rate: 5, unit: "pair", effectiveFrom: "2017-07-01", effectiveUntil: "2025-09-22", source: "GST rate schedule before 22 September 2025" },
  { rate: 18, unit: "pair", effectiveFrom: "2017-07-01", effectiveUntil: "2025-09-22", source: "GST rate schedule before 22 September 2025" },
  { upTo: 2500, rate: 5, unit: "pair", effectiveFrom: "2025-09-22", source: "56th GST Council, effective 22 September 2025" },
  { rate: 18, unit: "pair", effectiveFrom: "2025-09-22", source: "56th GST Council, effective 22 September 2025" }
];

const HOTEL = (): ValueBand[] => [
  { upTo: 7500, rate: 5, unit: "night", effectiveFrom: "2025-09-22", source: "56th GST Council, effective 22 September 2025" },
  { rate: 18, unit: "night", effectiveFrom: "2025-09-22", source: "56th GST Council, effective 22 September 2025" }
];

export const HSN: HsnEntry[] = [
  // ---- services (SAC) ----
  { code: "998311", label: "Management consulting services", kind: "service", rate: 18, also: "consultant strategy advisory" },
  { code: "998312", label: "Business consulting services", kind: "service", rate: 18, also: "business advisory" },
  { code: "998313", label: "IT consulting and support services", kind: "service", rate: 18, also: "software support amc technical" },
  { code: "998314", label: "IT design and development services", kind: "service", rate: 18, also: "software development app website coding programming" },
  { code: "998315", label: "Hosting and IT infrastructure services", kind: "service", rate: 18, also: "cloud server hosting domain" },
  { code: "998316", label: "IT infrastructure and network management", kind: "service", rate: 18, also: "network it management" },
  { code: "998319", label: "Other information technology services", kind: "service", rate: 18, also: "saas subscription software" },
  { code: "998361", label: "Advertising services", kind: "service", rate: 18, also: "ads marketing campaign media buying" },
  { code: "998362", label: "Purchase or sale of advertising space", kind: "service", rate: 18, also: "hoarding banner ad space" },
  { code: "998371", label: "Market research services", kind: "service", rate: 18, also: "survey research" },
  { code: "998391", label: "Graphic design and specialty design services", kind: "service", rate: 18, also: "logo branding ui ux design creative" },
  { code: "998393", label: "Scientific and technical consulting", kind: "service", rate: 18, also: "engineering technical" },
  { code: "998397", label: "Translation and interpretation services", kind: "service", rate: 18, also: "translation content writing" },
  { code: "998399", label: "Other professional and technical services", kind: "service", rate: 18, also: "freelance professional misc" },
  { code: "998221", label: "Accounting and bookkeeping services", kind: "service", rate: 18, also: "accountant ca audit tax filing" },
  { code: "998231", label: "Corporate tax consulting and preparation", kind: "service", rate: 18, also: "tax consultant gst filing" },
  { code: "998211", label: "Legal advisory and representation services", kind: "service", rate: 18, also: "lawyer advocate legal" },
  { code: "997212", label: "Rental or leasing of own or leased property", kind: "service", rate: 18, also: "rent office shop commercial lease" },
  { code: "996511", label: "Road transport of goods", kind: "service", rate: 5, also: "transport freight lorry truck delivery courier" },
  { code: "996812", label: "Courier services", kind: "service", rate: 18, also: "courier parcel shipping" },
  { code: "996601", label: "Rental of road vehicles with operator", kind: "service", rate: 18, also: "cab taxi car rental" },
  { code: "997331", label: "Licensing services for software", kind: "service", rate: 18, also: "software licence subscription" },
  { code: "998512", label: "Staffing and manpower supply services", kind: "service", rate: 18, also: "recruitment hiring staffing hr" },
  { code: "999293", label: "Commercial training and coaching services", kind: "service", rate: 18, also: "training coaching classes workshop tuition" },
  { code: "998596", label: "Events, exhibitions and convention services", kind: "service", rate: 18, also: "event management wedding conference" },
  { code: "998341", label: "Photography and videography services", kind: "service", rate: 18, also: "photographer video shoot" },
  { code: "996331", label: "Restaurant and catering services", kind: "service", rate: 5, also: "restaurant food catering cafe" },
  { code: "996311", label: "Hotel and accommodation services", kind: "service", rate: 5, bands: HOTEL(), also: "hotel room stay lodging" },
  { code: "999721", label: "Beauty, salon and personal care services", kind: "service", rate: 18, also: "salon spa parlour grooming" },
  { code: "998729", label: "Maintenance and repair of goods", kind: "service", rate: 18, also: "repair servicing maintenance amc" },
  { code: "995461", label: "Electrical installation services", kind: "service", rate: 18, also: "electrical wiring installation" },
  { code: "995473", label: "Painting services", kind: "service", rate: 18, also: "painting contractor" },
  { code: "995411", label: "Construction of residential buildings", kind: "service", rate: 18, also: "construction builder civil work" },
  { code: "996111", label: "Commission agent services", kind: "service", rate: 18, also: "commission brokerage agent" },
  { code: "997132", label: "Life and health insurance services", kind: "service", rate: 0, also: "insurance premium life health" },
  { code: "998113", label: "Research and development in engineering", kind: "service", rate: 18, also: "r&d research development" },
  { code: "998439", label: "Online content and streaming services", kind: "service", rate: 18, also: "streaming digital content ott" },
  { code: "998873", label: "Job work and manufacturing services", kind: "service", rate: 18, also: "job work fabrication manufacturing" },

  // ---- goods (HSN) ----
  { code: "8471", label: "Computers, laptops and data processing units", kind: "goods", rate: 18, also: "laptop desktop computer server" },
  { code: "8473", label: "Computer parts and accessories", kind: "goods", rate: 18, also: "keyboard mouse ram ssd parts" },
  { code: "8517", label: "Mobile phones and communication equipment", kind: "goods", rate: 18, also: "phone smartphone router modem" },
  { code: "8443", label: "Printers, copiers and printing machinery", kind: "goods", rate: 18, also: "printer scanner copier" },
  { code: "8528", label: "Monitors, televisions and projectors", kind: "goods", rate: 18, also: "monitor tv display projector" },
  { code: "8544", label: "Wires, cables and connectors", kind: "goods", rate: 18, also: "cable wire charger connector" },
  { code: "8507", label: "Batteries and accumulators", kind: "goods", rate: 18, also: "battery inverter power backup" },
  { code: "9405", label: "Lamps, lighting and LED fittings", kind: "goods", rate: 18, also: "led light bulb lamp fitting" },
  { code: "9403", label: "Furniture, office and household", kind: "goods", rate: 18, also: "furniture table chair desk sofa" },
  { code: "4820", label: "Registers, notebooks and office stationery", kind: "goods", rate: 18, also: "stationery notebook register diary" },
  { code: "4901", label: "Printed books and brochures", kind: "goods", rate: 0, also: "book printed publication" },
  { code: "4911", label: "Printed material, flyers and posters", kind: "goods", rate: 5, also: "printing flyer poster brochure visiting card" },
  { code: "3926", label: "Plastic articles and packaging", kind: "goods", rate: 18, also: "plastic packaging container" },
  { code: "4819", label: "Cartons, boxes and paper packaging", kind: "goods", rate: 5, also: "carton box packaging paper" },
  { code: "6109", label: "T-shirts and knitted apparel", kind: "goods", rate: 5, bands: APPAREL(), also: "tshirt clothing apparel garment" },
  { code: "6204", label: "Women's suits, dresses and trousers", kind: "goods", rate: 5, bands: APPAREL(), also: "dress kurta womens clothing" },
  { code: "6203", label: "Men's suits, shirts and trousers", kind: "goods", rate: 5, bands: APPAREL(), also: "shirt trouser mens clothing" },
  { code: "6403", label: "Footwear with leather uppers", kind: "goods", rate: 5, bands: FOOTWEAR(), also: "shoes footwear sandals" },
  { code: "4202", label: "Bags, cases and luggage", kind: "goods", rate: 18, also: "bag backpack luggage wallet" },
  { code: "7113", label: "Jewellery of precious metal", kind: "goods", rate: 3, also: "gold silver jewellery ornaments" },
  { code: "7108", label: "Gold, unwrought or semi-manufactured", kind: "goods", rate: 3, also: "gold bullion" },
  { code: "3304", label: "Cosmetics and beauty preparations", kind: "goods", rate: 18, also: "cosmetics makeup cream beauty" },
  { code: "3401", label: "Soap and washing preparations", kind: "goods", rate: 5, also: "soap detergent washing" },
  { code: "3306", label: "Oral and dental hygiene products", kind: "goods", rate: 5, also: "toothpaste brush dental" },
  { code: "3004", label: "Medicaments and formulations", kind: "goods", rate: 5, also: "medicine pharma tablet drug" },
  { code: "9018", label: "Medical and surgical instruments", kind: "goods", rate: 5, also: "medical equipment surgical instrument" },
  { code: "0401", label: "Milk and cream, not concentrated", kind: "goods", rate: 0, also: "milk dairy" },
  { code: "0406", label: "Cheese and curd", kind: "goods", rate: 5, also: "cheese paneer curd" },
  { code: "1006", label: "Rice", kind: "goods", rate: 5, also: "rice basmati grain" },
  { code: "1101", label: "Wheat or meslin flour", kind: "goods", rate: 5, also: "atta flour wheat" },
  { code: "1701", label: "Sugar", kind: "goods", rate: 5, also: "sugar" },
  { code: "0901", label: "Coffee", kind: "goods", rate: 5, also: "coffee beans" },
  { code: "0902", label: "Tea", kind: "goods", rate: 5, also: "tea leaves chai" },
  { code: "1905", label: "Bread, biscuits and baked goods", kind: "goods", rate: 5, also: "bakery biscuit bread cake" },
  { code: "2106", label: "Food preparations not elsewhere specified", kind: "goods", rate: 5, also: "food preparation snacks namkeen" },
  { code: "2201", label: "Packaged drinking water", kind: "goods", rate: 5, also: "water bottle packaged" },
  { code: "2202", label: "Aerated and caffeinated beverages", kind: "goods", rate: 40, also: "cold drink soda energy drink" },
  { code: "2403", label: "Tobacco and tobacco products", kind: "goods", rate: 40, also: "tobacco pan masala cigarette" },
  { code: "8703", label: "Motor cars and passenger vehicles", kind: "goods", rate: 18, also: "car vehicle automobile" },
  { code: "8711", label: "Motorcycles and scooters", kind: "goods", rate: 18, also: "bike motorcycle scooter two wheeler" },
  { code: "8708", label: "Parts and accessories for motor vehicles", kind: "goods", rate: 18, also: "auto parts spare car parts" },
  { code: "8714", label: "Parts of cycles and motorcycles", kind: "goods", rate: 18, also: "cycle parts bike spares" },
  { code: "7308", label: "Structures of iron or steel", kind: "goods", rate: 18, also: "steel structure fabrication iron" },
  { code: "6802", label: "Worked stone, marble and granite", kind: "goods", rate: 18, also: "marble granite stone tiles" },
  { code: "6907", label: "Ceramic tiles and flags", kind: "goods", rate: 18, also: "tiles ceramic flooring" },
  { code: "3208", label: "Paints and varnishes", kind: "goods", rate: 18, also: "paint varnish coating" },
  { code: "2523", label: "Cement", kind: "goods", rate: 18, also: "cement construction material" },
  { code: "8418", label: "Refrigerators and freezers", kind: "goods", rate: 18, also: "fridge refrigerator freezer" },
  { code: "8450", label: "Washing machines", kind: "goods", rate: 18, also: "washing machine" },
  { code: "8415", label: "Air conditioning machines", kind: "goods", rate: 18, also: "ac air conditioner" },
  { code: "9503", label: "Toys and games", kind: "goods", rate: 5, also: "toy game kids" },
  { code: "9506", label: "Sports goods and fitness equipment", kind: "goods", rate: 5, also: "sports fitness gym equipment" },
  { code: "1211", label: "Plants and parts used in perfumery or pharmacy", kind: "goods", rate: 5, also: "herbs ayurveda medicinal plants" },
  { code: "3307", label: "Perfumes and personal deodorants", kind: "goods", rate: 18, also: "perfume deodorant fragrance" },
  { code: "9101", label: "Wrist watches", kind: "goods", rate: 18, also: "watch timepiece" },
  { code: "9004", label: "Spectacles and goggles", kind: "goods", rate: 5, also: "spectacles glasses eyewear" }
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ");

/** Search by what people type: a code, a product name, or the words around it. */
export function searchHsn(query: string, limit = 8): HsnEntry[] {
  const q = norm(query).trim();
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored = HSN.map((e) => {
    const hay = norm(`${e.code} ${e.label} ${e.also ?? ""}`);
    let score = 0;
    for (const w of words) {
      if (e.code.startsWith(w)) score += 12;
      else if (hay.includes(` ${w}`) || hay.startsWith(w)) score += 6;
      else if (hay.includes(w)) score += 3;
      else return { e, score: 0 };
    }
    if (norm(e.label).startsWith(q)) score += 5;
    return { e, score };
  }).filter((x) => x.score > 0);
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.e);
}

/**
 * The rate for one line: a band if this code has them, otherwise the flat rate. Bands are matched
 * on the value of a single unit and on the date of the document, so history stays correct.
 */
export function rateFor(entry: HsnEntry, unitValue: number, isoDate: string): { rate: number; reason?: string; source?: string } {
  if (!entry.bands?.length) return { rate: entry.rate };
  const live = entry.bands.filter((b) => b.effectiveFrom <= isoDate && (!b.effectiveUntil || b.effectiveUntil > isoDate));
  if (!live.length) return { rate: entry.rate };
  const sorted = [...live].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  const band = sorted.find((b) => b.upTo === undefined || unitValue <= b.upTo) ?? sorted[sorted.length - 1];
  const threshold = sorted.find((b) => b.upTo !== undefined)?.upTo;
  const reason = threshold
    ? band.upTo !== undefined
      ? `${band.rate}% because this is ${unitValue.toLocaleString("en-IN")} per ${band.unit}, at or below ${threshold.toLocaleString("en-IN")}`
      : `${band.rate}% because this is ${unitValue.toLocaleString("en-IN")} per ${band.unit}, above ${threshold.toLocaleString("en-IN")}`
    : undefined;
  return { rate: band.rate, reason, source: band.source };
}

export const hsnByCode = (code: string) => HSN.find((e) => e.code === code);

/** The tax rule that matches a suggested rate, respecting intra or inter state supply. */
export function ruleIdForRate(rate: number, interRegion: boolean): string | undefined {
  const table: Record<number, [string, string]> = {
    0: ["in-gst-0", "in-gst-0"], 3: ["in-gst-3", "in-igst-3"], 5: ["in-gst-5", "in-igst-5"],
    12: ["in-gst-12", "in-igst-12"], 18: ["in-gst-18", "in-igst-18"], 28: ["in-gst-28", "in-igst-28"], 40: ["in-gst-40", "in-igst-40"]
  };
  const pair = table[rate];
  return pair ? pair[interRegion ? 1 : 0] : undefined;
}
