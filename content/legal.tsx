import Link from "next/link";
import { BRAND } from "@/lib/config";

export interface LegalPage { slug: string; title: string; description: string; updated: string; Body: () => React.JSX.Element }

const UPDATED = "29 September 2026";

export const LEGAL: LegalPage[] = [
  {
    slug: "privacy-policy",
    title: "Privacy policy",
    description: `How ${BRAND.name} handles your information. The short version: your documents and customer details never leave your device.`,
    updated: UPDATED,
    Body: () => (
      <>
        <h2>The short version</h2>
        <p>Your invoices, customers, prices and logo stay in your browser. There is no upload, no account and no database holding your business data. We could not show you your own invoice if you asked us to, because we never had it.</p>

        <h2>What stays on your device</h2>
        <p>Everything you type into a document, along with your logo and signature, is held in your browser&apos;s local storage so that closing the tab does not lose your work. It sits on your computer or phone and is readable only by this site in that browser. Clearing your browser data removes it. Pressing Start over removes it too.</p>

        <h2>What we do collect</h2>
        <p>Like most websites we use analytics to understand which pages are visited and roughly where visitors come from. That covers pages viewed, approximate location by country or city, device type and browser. It does not include anything you type into a document.</p>
        <p>If advertising is enabled on the site, advertising partners may set cookies to choose which advertisements to show. Where the law requires it, you will be asked before any non-essential cookie is set, and you can change your mind later.</p>

        <h2>What we never do</h2>
        <ul>
          <li>Send your document contents anywhere</li>
          <li>Sell or share your information with data brokers</li>
          <li>Ask you to create an account to use the tools</li>
          <li>Keep copies of anything you download</li>
        </ul>

        <h2>Fonts and files loaded from elsewhere</h2>
        <p>The site loads its typefaces and code from a content delivery network, which by its nature sees the address of the page requesting them. This is ordinary web infrastructure and involves nothing you have typed.</p>

        <h2>Children</h2>
        <p>This is a tool for businesses and is not directed at children.</p>

        <h2>Your rights</h2>
        <p>Because we do not hold your business data, most data requests have nothing to act on. For analytics information, or any question at all, write to <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.</p>

        <h2>Changes</h2>
        <p>If this policy changes in a way that matters, the date at the top will change with it.</p>
      </>
    )
  },
  {
    slug: "terms",
    title: "Terms of use",
    description: `The terms on which you may use ${BRAND.name}, in plain language.`,
    updated: UPDATED,
    Body: () => (
      <>
        <h2>Using the tools</h2>
        <p>{BRAND.name} is free to use for your own business documents. You may use the documents you create here for any lawful purpose, commercial or otherwise. You own what you create; we claim nothing in it.</p>

        <h2>What we do not promise</h2>
        <p>The tools are offered as they are. We work hard on the arithmetic and test it, but we cannot promise the site is free of errors or available at all times.</p>

        <h2>Tax information is a starting point, not advice</h2>
        <p>The tax rates and formats here are the commonly published ones, each carrying its source and the date it took effect. They are a convenience, not a ruling. Classification and rates depend on the detail of what you sell, and they change. Check anything that matters against your own tax authority or your accountant before you file or rely on it. See the <Link href="/disclaimer">disclaimer</Link> for more.</p>

        <h2>Your responsibility</h2>
        <p>You are responsible for what your documents say: the figures, the tax treatment, the terms and whether the invoice is correct. You are also responsible for keeping your own records, since we do not keep them for you.</p>

        <h2>Fair use</h2>
        <p>Do not use the site to break the law, to create documents intended to deceive, or to attack the service itself.</p>

        <h2>Liability</h2>
        <p>To the extent the law allows, we are not liable for loss arising from use of the site, including lost profit, rejected filings or penalties. Since the service is free and holds none of your data, this is a statement of what is practical as much as a legal position.</p>

        <h2>Contact</h2>
        <p>Questions about these terms: <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.</p>
      </>
    )
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    description: "Why the tax rates here are a starting point rather than authoritative, and how to check them.",
    updated: UPDATED,
    Body: () => (
      <>
        <h2>We are not your accountant</h2>
        <p>Nothing on this site is tax, legal or financial advice. It is software that does arithmetic and lays out documents.</p>

        <h2>Where the rates come from</h2>
        <p>Every tax rate in the system carries three things: the dates it applies between, the authority it came from, and how far it has been verified. You can see all of it in the document, and rates marked as unverified say so plainly rather than pretending otherwise.</p>
        <p>They are drawn from published schedules such as the GST Council rate schedules in India, HMRC guidance in the United Kingdom, the Federal Tax Authority in the UAE and the equivalent bodies elsewhere. Those bodies are the authority; we are not.</p>

        <h2>Why your rate may differ</h2>
        <ul>
          <li>Classification turns on the detail of the product, its packaging, its composition or its end use</li>
          <li>Some rates change with the price of a single unit, such as apparel and hotel rooms in India</li>
          <li>Exemptions, reverse charge, composition schemes and special zones all change the treatment</li>
          <li>Rates change, sometimes with little notice. India moved to 5, 18 and 40 percent on 22 September 2025</li>
          <li>Local taxes, such as sales tax in the United States, differ street by street, which is why we ask you to enter the rate</li>
        </ul>

        <h2>What to do about it</h2>
        <p>Use the tool to produce the document, then check the rate against the schedule for your goods or services, or ask an accountant. If the figures matter, which for tax they always do, a five minute check is cheap.</p>
      </>
    )
  },
  {
    slug: "about",
    title: `About ${BRAND.name}`,
    description: `Why ${BRAND.name} exists, how it works, and what it will become.`,
    updated: UPDATED,
    Body: () => (
      <>
        <h2>Why this exists</h2>
        <p>Most free invoice tools want your email before they will give you a PDF, and most of them upload your customer list to a server you know nothing about. For a document that contains your prices, your margins and your clients, that is a strange trade.</p>
        <p>{BRAND.name} does the work in your browser instead. There is no upload, no account, and nowhere for your data to go.</p>

        <h2>How it works</h2>
        <p>Everything, including the PDF, is built by code running on your own device. Tax rules live in country packs: structured data carrying rates, formats and the dates each rule applies between. Nothing is hard-coded, which is why an invoice dated before a rate change still calculates on the old rate.</p>
        <p>Amounts are held as whole paise and cents rather than decimals, so a hundred line items never drift by a rupee. The arithmetic is covered by tests, including the awkward cases: rates that change with the price of one unit, tax splitting between CGST, SGST, UTGST and IGST, and discounts spread across lines without losing a unit.</p>

        <h2>Where it is going</h2>
        <p>Documents are the start. The intention is a place to run the money side of a small business: what you are owed, what you owe, what the tax will be, and what the next few weeks look like. The same rules engine underneath, the same refusal to hold your data where it does not need to be held.</p>

        <h2>Who made it</h2>
        <p>A small team that got tired of the alternatives. Write to us at <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>: feature requests, bugs and disagreements about tax treatment are all welcome.</p>
      </>
    )
  },
  {
    slug: "contact",
    title: "Contact",
    description: `How to reach ${BRAND.name} about a bug, a feature or a tax rule that looks wrong.`,
    updated: UPDATED,
    Body: () => (
      <>
        <p>One address for everything: <a href={`mailto:${BRAND.email}`} className="font-semibold">{BRAND.email}</a></p>

        <h2>Reporting a bug</h2>
        <p>Tell us what you were doing, what you expected and what happened instead. Your country, the document type and the browser help. Do not send the document itself: it may contain your customer&apos;s details, and we do not need it.</p>

        <h2>A rate or a rule that looks wrong</h2>
        <p>These are the messages we most want. Tell us the country, the rate you expected, and the notification or schedule that supports it. Every rule here carries a source, and correcting one is a small change.</p>

        <h2>Feature requests</h2>
        <p>Say what you are trying to do rather than the feature you have in mind. The underlying problem is usually more useful than the proposed solution.</p>

        <h2>Press and coverage</h2>
        <p>Same address. Happy to explain how the browser-based approach works, including the parts that are awkward.</p>
      </>
    )
  }
];

export const legalBySlug = (slug: string) => LEGAL.find((p) => p.slug === slug);
