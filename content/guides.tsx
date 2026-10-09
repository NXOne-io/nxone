import Link from "next/link";

export interface Guide {
  slug: string;
  title: string;
  h1: string;
  description: string;
  updated: string;
  readMins: number;
  Body: () => React.JSX.Element;
}

export const GUIDES: Guide[] = [
  {
    slug: "invoice-format-for-gst",
    title: "GST Invoice Format: What an Indian Tax Invoice Must Show",
    h1: "GST invoice format",
    description: "Every field a GST tax invoice needs, when CGST and SGST apply instead of IGST, and the rate changes from 22 September 2025.",
    updated: "29 September 2026",
    readMins: 7,
    Body: () => (
      <>
        <p>A GST invoice is a legal document, not a letter about money. If it is missing fields, your customer can be refused the input credit they were counting on, which is how a billing mistake turns into an argument about payment.</p>

        <h2>What has to be on it</h2>
        <p>A tax invoice raised by a registered business carries all of the following:</p>
        <ul>
          <li>Your name, address and GSTIN</li>
            <li>A serial number, unique within the financial year, using only letters, numbers, slashes and hyphens</li>
          <li>The date it was issued</li>
          <li>The customer's name and address, plus their GSTIN if they are registered</li>
          <li>For unregistered customers above fifty thousand rupees, their address and the state</li>
          <li>The place of supply, and the state code, which decides which taxes apply</li>
          <li>A description of each item, its HSN or SAC code, quantity, unit and value</li>
          <li>The taxable value after any discount</li>
          <li>The rate and amount of tax, split into CGST and SGST, or shown as IGST</li>
          <li>Whether tax is payable on reverse charge</li>
          <li>A signature or digital signature, or a statement that the invoice is electronically generated</li>
        </ul>

        <h2>CGST and SGST, or IGST</h2>
        <p>This is the field people get wrong. It does not depend on where your customer's office is, but on the place of supply.</p>
        <p>When the place of supply is in your own state, the tax splits in two: half as Central GST and half as State GST. Eighteen percent becomes nine plus nine. When the place of supply is another state, the whole amount is charged as Integrated GST instead, as a single eighteen percent line.</p>
        <p>In a union territory without its own legislature, such as Chandigarh or Lakshadweep, the state half is charged as UTGST rather than SGST. Delhi, Puducherry and Jammu and Kashmir have legislatures, so they use SGST.</p>
        <p>Exports and supplies to a special economic zone are treated as inter-state and carry IGST, or go out zero rated under a letter of undertaking.</p>

        <h2>The rates changed in September 2025</h2>
        <p>The 56th GST Council removed the 12 and 28 percent slabs with effect from 22 September 2025. Most things now sit at 5 or 18 percent, with 40 percent reserved for luxury and sin goods such as tobacco and aerated drinks. Gold and jewellery remain at 3 percent.</p>
        <p>This matters for old invoices. A credit note or a revision against an invoice dated before the change still works on the old slabs, because the rate that applies is the one in force on the date of supply. Any software that hard-codes today's rate will get that wrong. <Link href="/invoice-generator">Our invoice generator</Link> keeps both, and picks by date.</p>

        <h2>Rates that depend on the price</h2>
        <p>A handful of categories change rate at a price threshold, per piece rather than per invoice. Apparel and footwear are 5 percent up to 2,500 rupees a piece and 18 percent above, a threshold raised from 1,000 rupees in the same reform. Hotel rooms are 5 percent up to 7,500 rupees a night and 18 percent above.</p>

        <h2>Numbering</h2>
        <p>Your invoice numbers must be unique within the financial year and should run in an unbroken series. Many businesses restart at one each April with a prefix that carries the year, such as 26-27/001. Do not leave gaps, and do not reuse a number after cancelling an invoice: issue a credit note instead.</p>

        <h2>When you are not registered</h2>
        <p>If you are below the registration threshold you must not charge GST or issue a tax invoice. You issue a bill of supply instead: the same document without any tax lines, and without a GSTIN. Charging tax you are not registered to collect is a serious problem, not a technicality.</p>

        <h2>Copies and delivery</h2>
        <p>For goods, the rules speak of three copies: original for the recipient, duplicate for the transporter, triplicate for you. For services, two are enough. In practice a PDF sent by email is normal, and a printed copy travels with the goods.</p>

        <p className="mt-6"><Link href="/invoice-generator" className="font-semibold underline">Make a GST invoice now</Link>, with the split worked out from your place of supply and the HSN code filled in by typing what you sell.</p>
      </>
    )
  },
  {
    slug: "quotation-format",
    title: "Quotation Format: What to Put in a Quote That Gets Accepted",
    h1: "Quotation format",
    description: "What belongs on a quotation, how it differs from a proforma invoice, and the clauses that stop a price following you around for a year.",
    updated: "29 September 2026",
    readMins: 6,
    Body: () => (
      <>
        <p>A quotation is an offer. Once your customer accepts it, you have agreed a price and a scope, so it is worth writing as though it will be read back to you later, because occasionally it is.</p>

        <h2>What belongs on it</h2>
        <ul>
          <li>Your business name, address and contact details</li>
          <li>The customer's name, and the person you are quoting to</li>
          <li>A quotation number and the date</li>
          <li>A validity date, after which the price expires</li>
          <li>Line by line: what you will do or supply, quantity, unit price</li>
          <li>Tax, shown separately, or a clear statement that prices exclude tax</li>
          <li>Payment terms, such as fifty percent to start and the balance on delivery</li>
          <li>Delivery or completion time, ideally counted from acceptance rather than from a calendar date</li>
          <li>What is not included, which prevents most later disputes</li>
          <li>A place for the customer to accept, sign and date</li>
        </ul>

        <h2>The validity date earns its keep</h2>
        <p>Without one, a quote you sent in March can be accepted in November, after your costs have risen. Thirty days is the usual figure, and fifteen is reasonable when materials are volatile. Say what happens after it lapses: that the price may be revised, not that the offer vanishes, since the latter can read as unhelpful.</p>

        <h2>Quotation, estimate, proforma invoice</h2>
        <p>A quotation is a fixed price for a defined scope. An estimate is an informed guess that is expected to move, which is why builders use it. A proforma invoice looks like an invoice and often exists so the customer can raise a purchase order or arrange payment, but it is not a tax invoice and does not create a tax liability.</p>
        <p>Because of that last point, a proforma should carry a line saying it is not a demand for payment, and you still have to raise a proper tax invoice when the supply happens.</p>

        <h2>GST on a quotation</h2>
        <p>No tax is due when you quote, since nothing has been supplied. Show the tax anyway so the customer sees the real cost, and state the rate you expect to apply. If a rate changes between quotation and invoice, the invoice governs, so a line to that effect protects you.</p>

        <h2>Scope, which is where money is lost</h2>
        <p>List exclusions explicitly. Three rounds of revisions rather than revisions. Travel within the city rather than travel. Content supplied by the client rather than silence about content. Most disputes about a final invoice are disputes about what the quotation covered.</p>

        <p className="mt-6"><Link href="/quotation-generator" className="font-semibold underline">Write a quotation</Link> with a validity date and an acceptance block, then turn it into an invoice when they agree.</p>
      </>
    )
  },
  {
    slug: "purchase-order-format",
    title: "Purchase Order Format: What to Send a Supplier",
    h1: "Purchase order format",
    description: "What a purchase order must contain, how it differs from an invoice, and why the PO number is the most useful thing on it.",
    updated: "29 September 2026",
    readMins: 5,
    Body: () => (
      <>
        <p>A purchase order is an instruction from a buyer to a supplier: send me this, at this price, by this date. When the supplier accepts it, the two of you have a contract, which is why it is worth more than an email saying please send ten of those.</p>

        <h2>What belongs on it</h2>
        <ul>
          <li>Your details as the buyer, including your GSTIN if you are registered</li>
          <li>The supplier's name and address</li>
          <li>A purchase order number and the date</li>
          <li>What you are ordering, with quantity, unit and agreed price per line</li>
          <li>Tax, where it applies, so the total matches the invoice you expect</li>
          <li>The delivery address, which is often not your billing address</li>
          <li>The date you need it by</li>
          <li>Payment terms agreed in advance, such as thirty days from invoice</li>
          <li>Who authorised it on your side</li>
        </ul>

        <h2>The PO number is the point</h2>
        <p>Ask the supplier to quote it on their invoice and on the delivery note. It is what lets your accounts team match three documents, and it is the reason a purchase order system reduces argument: an invoice without a purchase order behind it gets questioned before it gets paid.</p>

        <h2>Delivery address versus billing address</h2>
        <p>Goods go to a warehouse, a site or a shop. Invoices go to accounts. Put both on the order, and include a contact name and phone number for the delivery, because the driver will ring someone and it should not be you.</p>

        <h2>Purchase order and GST</h2>
        <p>Raising an order creates no tax liability: the tax event is the supply. But the place of supply matters here too, since it decides whether the supplier charges you CGST and SGST or IGST, and that in turn affects the credit you can claim. If you are ordering for delivery in another state, expect IGST.</p>

        <h2>Changes after the order</h2>
        <p>If quantity or price changes, issue a revised order with the same number and a revision mark, or cancel and reissue. Agreeing a change by phone and leaving the paperwork alone is how invoices arrive that nobody can approve.</p>

        <p className="mt-6"><Link href="/purchase-order-generator" className="font-semibold underline">Create a purchase order</Link> with a delivery address and a required-by date.</p>
      </>
    )
  },
  {
    slug: "proforma-invoice-vs-invoice",
    title: "Proforma Invoice vs Tax Invoice: Which One to Send",
    h1: "Proforma invoice or tax invoice",
    description: "What a proforma invoice is for, why it creates no tax liability, and the moment you must switch to a real tax invoice.",
    updated: "30 September 2026",
    readMins: 5,
    Body: () => (
      <>
        <p>A proforma invoice looks like an invoice and behaves like a quotation. It exists so a customer can see exactly what they will be billed, raise a purchase order, arrange a transfer or clear a payment internally, before anything has actually been supplied.</p>

        <h2>The difference that matters</h2>
        <p>A tax invoice records a supply that has happened. It creates a tax liability for you and an input credit for your customer. A proforma records nothing: no supply, no liability, no credit. Which is precisely why it is useful before the work, and useless after it.</p>
        <p>The practical consequence is that your customer cannot claim input tax on a proforma, and their accounts team knows it. Sending one when they expected a tax invoice delays payment rather than speeding it up.</p>

        <h2>What a proforma should say</h2>
        <ul>
          <li>The words Proforma Invoice at the top, not Invoice</li>
          <li>A line stating that it is not a demand for payment and not a tax invoice</li>
          <li>Its own numbering series, kept separate from your tax invoices</li>
          <li>A validity date, as a quotation would have</li>
          <li>The tax that will apply, shown so the customer sees the real figure, described as indicative</li>
        </ul>

        <h2>When to switch</h2>
        <p>Raise the tax invoice when the supply happens, which for goods is usually removal or delivery and for services is completion, or as your contract defines it. If you took an advance, the advance has its own treatment and often its own receipt.</p>
        <p>Do not simply relabel the proforma. Issue a fresh document with a tax invoice number, and keep the proforma in its own series so your records stay clean.</p>

        <h2>Common uses</h2>
        <p>Exporters use proformas so a buyer can open a letter of credit or arrange import paperwork. Agencies use them so a client can get a purchase order approved. Anyone taking an advance uses them to ask for money without claiming a supply has occurred.</p>

        <p className="mt-6"><Link href="/quotation-generator" className="font-semibold underline">Start with a quotation</Link>, or go straight to <Link href="/invoice-generator">a tax invoice</Link> when the work is done.</p>
      </>
    )
  },
  {
    slug: "get-invoices-paid-on-time",
    title: "How to Get Invoices Paid on Time",
    h1: "Getting invoices paid on time",
    description: "Practical ways to shorten the gap between sending an invoice and being paid, from terms and wording to when to chase and what to say.",
    updated: "30 September 2026",
    readMins: 6,
    Body: () => (
      <>
        <p>Late payment is rarely about an unwilling customer. It is usually about friction: an invoice that reached the wrong person, is missing a purchase order number, or sat in an inbox until it was no longer anyone&apos;s problem. Most of that is fixable by you.</p>

        <h2>Before the work starts</h2>
        <ul>
          <li>Agree payment terms in writing, in the quotation, and have the customer accept it</li>
          <li>Ask who invoices should go to, by name, and whether a purchase order is required</li>
          <li>For larger work, take a deposit. A client unwilling to pay anything in advance is telling you something</li>
          <li>State your late payment interest rate then, not after the invoice is overdue</li>
        </ul>

        <h2>On the invoice itself</h2>
        <p>Make it easy to pay and hard to misfile. Put the due date as a date, not as terms: 9 February 2026 rather than net 30, which saves a mental calculation nobody wants to do. Quote their purchase order number. Include bank details and a UPI id or payment link on the document itself, not in the covering email.</p>
        <p>Send it the day the work finishes. An invoice sent two weeks late signals that the money is not urgent to you either.</p>

        <h2>Chasing, in a way that works</h2>
        <p>A simple schedule beats sporadic indignation. Three days before the due date, a short note confirming it is in the payment run. The day after, a polite reminder with the invoice attached again. A week later, a direct message to your contact rather than to accounts. After that, a formal notice referring to the interest clause.</p>
        <p>Keep the tone neutral throughout. Nothing delays payment like an email the recipient has to think about how to answer.</p>

        <h2>When it is really late</h2>
        <p>Stop work rather than continuing to build an unpaid balance. Put your position in writing, including the interest accrued. In India, registered micro and small enterprises have recourse under the MSMED Act, with interest set by reference to the Reserve Bank rate and a formal mechanism behind it, which is worth knowing about before you need it.</p>

        <p className="mt-6">Work out what you are owed with the <Link href="/calculators/late-payment-interest" className="font-semibold underline">late payment interest calculator</Link>, or check a due date with the <Link href="/calculators/invoice-due-date">due date calculator</Link>.</p>
      </>
    )
  },
  {
    slug: "payment-receipt-format",
    title: "Payment Receipt Format: What to Send After You Are Paid",
    h1: "Payment receipt format",
    description: "What a receipt should show, how it differs from an invoice, and when an advance receipt matters for GST.",
    updated: "29 September 2026",
    readMins: 4,
    Body: () => (
      <>
        <p>An invoice asks for money. A receipt confirms it arrived. Sending one closes the loop, and your customer's accounts team needs it to clear the entry on their side.</p>

        <h2>What belongs on it</h2>
        <ul>
          <li>Your business name and details</li>
          <li>Who paid, and against which invoice</li>
          <li>The amount received and the date it was received</li>
          <li>How it arrived: bank transfer, UPI, cash, cheque or card</li>
          <li>A reference: the UTR, cheque number or transaction id</li>
          <li>Whether this settles the invoice or leaves a balance</li>
          <li>A receipt number, kept in its own series</li>
        </ul>

        <h2>Part payments</h2>
        <p>If the payment does not clear the invoice, say what remains and when it is due. A receipt that shows only the amount received invites the reading that the account is settled.</p>

        <h2>Advances and GST</h2>
        <p>An advance received against a future supply of services has its own treatment: a receipt voucher is expected, and tax may be payable when the advance is received rather than when the work is done. This is one of the few places where a receipt carries a tax consequence rather than being a courtesy, so check the position before taking large advances.</p>

        <h2>Cash</h2>
        <p>Cash receipts deserve more care, not less, because there is no bank record behind them. Note who handed it over, and keep the counterfoil. There are also limits in Indian law on accepting large sums in cash, and the penalties fall on the receiver.</p>

        <p className="mt-6"><Link href="/receipt-generator" className="font-semibold underline">Make a receipt</Link>, with the payment method and reference on it.</p>
      </>
    )
  }
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
