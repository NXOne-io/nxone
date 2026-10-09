import type { CountryPack } from "@/lib/countries/types";

/**
 * Country landing pages. The rates and required fields come from the country pack, so these pages
 * cannot drift from what the generator actually does. The prose is written per country.
 */
export interface CountryGuide {
  code: string;
  /** Used in the address: /invoice-format/united-kingdom */
  slug: string;
  title: string;
  h1: string;
  description: string;
  /** What this country calls the document, used in headings. */
  docName: string;
  intro: string;
  sections: Array<{ h: string; p: string[] }>;
  faq: Array<{ q: string; a: string }>;
}

export const COUNTRY_GUIDES: CountryGuide[] = [
  {
    code: "GB", slug: "united-kingdom", docName: "VAT invoice",
    title: "UK VAT Invoice Format: What a Valid Invoice Must Show",
    h1: "UK VAT invoice format",
    description: "Every field a UK VAT invoice needs, when to use a simplified invoice, what to do below the registration threshold, and the current VAT rates.",
    intro: "A VAT invoice is what lets your customer reclaim the VAT you charged. Leave a required field off and their claim can be refused, which turns your paperwork into their problem and then back into yours.",
    sections: [
      {
        h: "What a full VAT invoice must show",
        p: [
          "A unique sequential number, your name and address, and your VAT registration number. The customer's name and address. The date of issue, and the time of supply, known as the tax point, when it differs.",
          "For each line: a description, the quantity, the VAT rate applied and the amount excluding VAT. Then the total excluding VAT, the VAT charged, and the total payable. Any cash discount offered must also be stated.",
          "The tax point matters more than people expect. It is usually the date of supply, but issuing an invoice or taking payment earlier can move it, and it decides which VAT return the sale falls into."
        ]
      },
      {
        h: "Simplified invoices",
        p: [
          "For retail sales up to a modest value, a simplified invoice is allowed: your name, address and VAT number, the date, a description, the rate applied and the total including VAT. No customer details are required, which is why a shop receipt looks the way it does.",
          "Above that limit, or for business customers who will reclaim, issue a full invoice."
        ]
      },
      {
        h: "If you are not VAT registered",
        p: [
          "Below the registration threshold you must not charge VAT or issue a VAT invoice. Send an ordinary invoice without a VAT line and without a VAT number. Charging VAT you are not registered to collect is a serious matter rather than an administrative slip.",
          "Watch the rolling twelve month test rather than the financial year, since registration is triggered by turnover in any twelve months, not just the last complete year."
        ]
      },
      {
        h: "Zero rated, exempt and outside the scope",
        p: [
          "These three are not the same thing and the difference affects what you can reclaim. Zero rated supplies, such as most food and children's clothing, are taxable at nought percent, and you can still reclaim input VAT. Exempt supplies, such as insurance and most financial services, are not taxable and generally block reclaim. Supplies outside the scope, including many services to overseas business customers, follow different rules again.",
          "If most of your sales are exempt, speak to an accountant before assuming you can reclaim what you spend."
        ]
      }
    ],
    faq: [
      { q: "How long must I keep VAT invoices?", a: "Six years is the general rule for VAT records in the UK, and longer in some circumstances. Keep them in a form you can actually produce on request." },
      { q: "Can I issue an invoice in a foreign currency?", a: "Yes, but the VAT amount must also be shown in sterling, converted using an acceptable rate." },
      { q: "What is the difference between an invoice date and a tax point?", a: "The invoice date is when you wrote it. The tax point is when the supply is treated as happening for VAT, and it decides which return the sale belongs in. They often match, but payment in advance or a delayed invoice can separate them." }
    ]
  },
  {
    code: "AE", slug: "united-arab-emirates", docName: "tax invoice",
    title: "UAE Tax Invoice Format: What the FTA Requires",
    h1: "UAE tax invoice format",
    description: "The fields a UAE tax invoice must carry, when a simplified invoice is allowed, the 5 percent VAT rate and zero rated supplies.",
    intro: "VAT arrived in the UAE in 2018 at five percent, and the Federal Tax Authority is specific about what a tax invoice contains. The requirements are close to the European pattern, with a few local additions.",
    sections: [
      {
        h: "What a tax invoice must show",
        p: [
          "The words Tax Invoice clearly displayed. Your name, address and Tax Registration Number, known as the TRN. The customer's name and address, and their TRN when they are registered.",
          "A sequential invoice number, the date of issue, and the date of supply when it differs. For each line: a description, quantity, unit price, the rate of VAT and the amount payable in dirhams.",
          "The total excluding VAT, the VAT charged in dirhams, and the gross total. Where the invoice is in another currency, the exchange rate used and the VAT amount in dirhams must both appear."
        ]
      },
      {
        h: "Simplified tax invoices",
        p: [
          "A simplified tax invoice may be issued for retail supplies and for supplies below the prescribed threshold where the customer is not registered. It needs the words Tax Invoice, your details and TRN, the date, a description, the total including VAT and the VAT amount.",
          "Registered business customers should receive a full tax invoice so they can recover the VAT."
        ]
      },
      {
        h: "Zero rated and exempt",
        p: [
          "Exports outside the GCC implementing states, international transport, certain healthcare and education, and some investment metals are zero rated. Local passenger transport, bare land and some financial services are exempt.",
          "The distinction matters for recovery: zero rated supplies allow input VAT recovery, exempt ones generally do not."
        ]
      }
    ],
    faq: [
      { q: "How long do I keep records?", a: "Five years is the general requirement for VAT records in the UAE, longer for real estate. Keep them available for inspection." },
      { q: "Must the invoice be in Arabic?", a: "Invoices are commonly issued in English, and the FTA may request an Arabic version. Check the current position if you are issuing at scale." },
      { q: "What if I invoice in US dollars?", a: "You can, but the VAT amount has to be shown in dirhams using the Central Bank rate on the date of supply, and the rate used should appear on the invoice." }
    ]
  },
  {
    code: "SG", slug: "singapore", docName: "tax invoice",
    title: "Singapore Tax Invoice Format and GST Rates",
    h1: "Singapore tax invoice format",
    description: "What a Singapore tax invoice must contain, the GST rate changes from 7 to 8 to 9 percent, and when a simplified invoice is enough.",
    intro: "Singapore GST reached nine percent on 1 January 2024, having moved from seven to eight percent the year before. Invoices dated in each period use that period's rate, which matters whenever you are correcting old paperwork.",
    sections: [
      {
        h: "What a tax invoice must show",
        p: [
          "The words Tax Invoice, your business name, address and GST registration number, and an identifying number. The date of issue and the customer's name and address.",
          "A description of the goods or services, the quantity, and the amount payable excluding GST. Then the total excluding GST, the GST charged, and the total including GST. Amounts must be in Singapore dollars, with the exchange rate shown when the invoice is in another currency."
        ]
      },
      {
        h: "Simplified tax invoices",
        p: [
          "For smaller sales, a simplified tax invoice is allowed: your name, address and GST number, the date, a description, the total payable including GST and a statement that it includes GST.",
          "Customers who want to claim input tax on larger amounts will need a full tax invoice."
        ]
      },
      {
        h: "The rate changes",
        p: [
          "Seven percent applied until the end of 2022, eight percent through 2023, and nine percent from 1 January 2024. Invoices spanning a change have transitional rules based on when payment was made and when the supply happened.",
          "Any system that stores a single current rate will get historical documents wrong. Ours keeps all three with their dates, so an invoice dated in 2023 still calculates at eight percent."
        ]
      }
    ],
    faq: [
      { q: "Do I have to register for GST?", a: "Registration is compulsory above the published annual turnover threshold, and voluntary below it. Voluntary registration lets you reclaim input tax but commits you to filing." },
      { q: "What about exports?", a: "Exports of goods and international services are generally zero rated, with documentary evidence required to support the treatment." }
    ]
  },
  {
    code: "AU", slug: "australia", docName: "tax invoice",
    title: "Australian Tax Invoice Format: ABN, GST and the 82.50 Rule",
    h1: "Australian tax invoice format",
    description: "What an Australian tax invoice must show, why your ABN matters, when a customer needs one to claim GST credits, and what to do if you are not registered.",
    intro: "Australian GST is ten percent, and a tax invoice is the document that lets a business claim the credit back. The Australian Taxation Office sets out exactly what one contains, and the rules differ slightly above and below a thousand dollars.",
    sections: [
      {
        h: "What a tax invoice must show",
        p: [
          "That the document is intended to be a tax invoice, your identity and your Australian Business Number, the date of issue, and a brief description of what was sold including quantity.",
          "The GST amount, which can be shown as a separate line or as a statement that the total price includes GST. For sales of a thousand dollars or more, the buyer's identity or ABN is also required.",
          "Where only part of the sale is taxable, the invoice must make clear which items include GST."
        ]
      },
      {
        h: "No ABN, and withholding",
        p: [
          "If you supply a business and do not quote an ABN, the payer may be required to withhold tax from the payment at the top rate. That is a strong practical reason to have your ABN on every invoice, whether or not you are registered for GST.",
          "Being registered for GST and having an ABN are separate things. Below the registration threshold you keep the ABN but do not charge GST, and your document is an invoice rather than a tax invoice."
        ]
      },
      {
        h: "Rounding and cents",
        p: [
          "GST amounts can be rounded, and the ATO sets out how. In practice, charging a round price and letting the GST fall where it falls is easier to reconcile than trying to produce tidy tax amounts."
        ]
      }
    ],
    faq: [
      { q: "What if I am not registered for GST?", a: "Do not charge GST and do not call the document a tax invoice. Issue a plain invoice showing your ABN, so the payer does not have to withhold." },
      { q: "How long do I keep invoices?", a: "Five years is the general record keeping period in Australia." }
    ]
  },
  {
    code: "US", slug: "united-states", docName: "invoice",
    title: "US Invoice Format: What to Include, and How Sales Tax Works",
    h1: "US invoice format",
    description: "What belongs on an American invoice, why sales tax is not VAT, how nexus decides whether you charge it, and when a W-9 is wanted.",
    intro: "There is no federal invoice format in the United States, and no VAT. Sales tax is set by states, counties and cities, which is why two addresses a mile apart can carry different rates.",
    sections: [
      {
        h: "What belongs on an invoice",
        p: [
          "No law prescribes the fields, but the ones that get an invoice paid are: your business name and address, an invoice number, the date, the client's name and billing address, a description of what was delivered, the amount, the payment terms and how to pay.",
          "Net 30 is the common default. Say it explicitly rather than assuming it, and state the late fee if you intend to charge one."
        ]
      },
      {
        h: "Sales tax is nothing like VAT",
        p: [
          "Sales tax applies at the final sale to a consumer, is set locally, and is not reclaimable by businesses the way VAT is. A combined rate adds state, county, city and sometimes special district components, which is why a single national figure does not exist.",
          "Whether you must collect at all depends on nexus: a physical presence, or economic activity above a state's threshold. Services are often not taxable where goods are, but the exceptions are many and they vary by state.",
          "Because the rate depends on the exact delivery address, our generator asks you for the rate rather than inventing one, and says so on the page."
        ]
      },
      {
        h: "W-9 and 1099",
        p: [
          "A business paying a contractor often asks for a Form W-9 before the first payment, and may report payments on a 1099. Supplying it promptly tends to speed up the first invoice considerably."
        ]
      }
    ],
    faq: [
      { q: "Do I need to put a tax number on my invoice?", a: "Not usually. An EIN is often requested through a W-9 rather than printed on the invoice, and sole proprietors may use a social security number, which should not go on a document you email." },
      { q: "Should I charge sales tax on services?", a: "It depends on the state and the service. Many states tax some services and not others. Check the state where the customer receives the service." }
    ]
  }
];

export const countryGuideBySlug = (slug: string) => COUNTRY_GUIDES.find((c) => c.slug === slug);

/** Rates in force today for a pack, for the table on each page. */
export function liveRates(pack: CountryPack, isoDate: string) {
  return pack.taxRules
    .filter((r) => r.effectiveFrom <= isoDate && (!r.effectiveUntil || r.effectiveUntil > isoDate))
    .filter((r, i, all) => all.findIndex((x) => x.label === r.label) === i);
}
