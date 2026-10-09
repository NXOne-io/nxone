import type { ComponentType } from "react";
import { BreakEven, Discount, DueDate, HourlyRate, LateFee, Markup, ProfitMargin, TaxCalculator } from "@/components/calc/Calculators";

/** One place that knows every calculator: its page, its words and its questions. */
export interface CalcDef {
  slug: string;
  name: string;
  title: string;
  description: string;
  blurb: string;
  Component: ComponentType;
  about: string[];
  faq: Array<{ q: string; a: string }>;
  related: string[];
}

export const CALCULATORS: CalcDef[] = [
  {
    slug: "profit-margin",
    name: "Profit margin",
    title: "Profit Margin Calculator - Margin and Markup from Price and Cost",
    description: "Work out profit, margin and markup from a selling price and a cost. Free, instant, and nothing you type leaves your browser.",
    blurb: "Profit, margin and markup from a price and a cost.",
    Component: ProfitMargin,
    about: [
      "Margin and markup describe the same profit from two different angles, and confusing them is the most expensive arithmetic mistake small businesses make. Margin is profit as a share of the price you charge. Markup is profit as a share of what the thing cost you.",
      "Sell for 100 what cost you 60 and your margin is 40 percent while your markup is 66.7 percent. Neither number is wrong, but a supplier quoting markup and a buyer hearing margin will disagree about the price by a lot.",
      "Use margin when you are looking at a profit and loss statement, since revenue is the denominator there. Use markup when you are setting a price from a known cost."
    ],
    faq: [
      { q: "What is a good profit margin?", a: "It depends entirely on the trade. Grocery retail runs on single digits and moves volume. Consulting and software often clear 40 to 70 percent. Compare yourself with your own industry rather than an average across all of them." },
      { q: "Should I include my rent and salaries in the cost?", a: "Not for this calculation. Use only the costs that exist because you made the sale, such as materials and delivery. Rent and salaries are fixed costs, and the break-even calculator is where they belong." },
      { q: "Why is my markup higher than my margin?", a: "Markup divides profit by the smaller number, the cost, so it always looks larger. A 50 percent margin is a 100 percent markup." }
    ],
    related: ["markup", "break-even", "hourly-rate"]
  },
  {
    slug: "markup",
    name: "Markup and price",
    title: "Markup Calculator - Set a Selling Price from Your Cost",
    description: "Find the selling price for a target markup or margin, and see what the other one works out to. Free and instant in your browser.",
    blurb: "The price that gives you the markup or margin you want.",
    Component: Markup,
    about: [
      "Pricing from cost is the most common way small businesses set a price, and the arithmetic differs depending on which number you have in mind. Adding 40 percent to a cost of 600 gives 840. Wanting to keep 40 percent of the price means charging 1,000.",
      "Whichever you use, check the answer against what the market will actually pay. Cost-plus pricing tells you the floor, not the ceiling."
    ],
    faq: [
      { q: "Can I have a margin of 100 percent?", a: "No. Margin is a share of the price, so 100 percent would mean the item cost you nothing. Markup has no ceiling: selling for four times cost is a 300 percent markup and a 75 percent margin." },
      { q: "Does this include GST or VAT?", a: "No, work with figures excluding tax. Tax is collected on behalf of the government rather than earned, so including it flatters your margin." }
    ],
    related: ["profit-margin", "break-even", "discount"]
  },
  {
    slug: "break-even",
    name: "Break even",
    title: "Break Even Calculator - Units and Revenue to Cover Your Costs",
    description: "Find how many units you must sell to cover fixed costs, and how far sales can fall before you lose money. Free and private.",
    blurb: "How much you must sell before you stop losing money.",
    Component: BreakEven,
    about: [
      "Break even is the point where the money left over from each sale has finally paid for the costs you carry anyway. The money left over is called contribution: price minus the costs that only exist because of that sale.",
      "Divide your fixed costs by the contribution per unit and you have the number of units. The useful part is what the number does when you change things: raising the price lifts contribution and lowers the target quickly, while cutting a fixed cost moves it in a straight line.",
      "If the contribution is zero or negative, no volume saves you. Selling more simply loses money faster, which is a trap that growing businesses fall into regularly."
    ],
    faq: [
      { q: "What counts as a fixed cost?", a: "Anything you pay whether or not you sell: rent, salaries, software, insurance, loan repayments. Variable costs move with each sale: materials, packaging, shipping, payment gateway fees, sales commission." },
      { q: "What is the margin of safety?", a: "How far sales can fall from where they are now before you hit break even. Thirty percent means you could lose almost a third of your sales and still not be losing money." },
      { q: "Should I include my own salary?", a: "Yes, if you take one regularly. A business that only breaks even because the owner works unpaid is not breaking even." }
    ],
    related: ["profit-margin", "markup", "hourly-rate"]
  },
  {
    slug: "late-payment-interest",
    name: "Late payment interest",
    title: "Late Payment Interest Calculator - Overdue Invoice Charges",
    description: "Work out interest on an overdue invoice from the due date, the rate in your terms and the date of payment. Free and instant.",
    blurb: "Interest on an invoice that has been paid late, or not paid at all.",
    Component: LateFee,
    about: [
      "Most invoice terms allow interest on late payment, commonly 1.5 percent a month in India or a fixed annual rate elsewhere. This works out the interest as simple interest for the days past the due date, which is how such clauses normally operate.",
      "Two things decide whether you can actually charge it. Your invoice or contract has to say so, ideally before the work starts rather than after the payment is late. And it has to be a rate a court would consider reasonable rather than punitive.",
      "In India, the MSMED Act gives registered micro and small enterprises a stronger position against buyers who pay late, with interest set by reference to the Reserve Bank rate. If you are registered, look that up rather than relying on your own terms."
    ],
    faq: [
      { q: "Can I charge interest if my invoice does not mention it?", a: "It is much harder. Without a term in the contract or on the invoice, you would have to rely on statute or negotiate. Add a line to your invoice template now, so the next one is covered." },
      { q: "Is 1.5 percent a month normal?", a: "It is the most common figure on Indian invoices, which is 18 percent a year. Whether it is enforceable depends on your contract and the circumstances." },
      { q: "Simple or compound interest?", a: "This uses simple interest, which is what a standard late payment clause means. Compounding needs to be stated explicitly and is less likely to be enforced." }
    ],
    related: ["profit-margin", "discount", "hourly-rate"]
  },
  {
    slug: "discount",
    name: "Discount",
    title: "Discount Calculator - Sale Price and Stacked Discounts",
    description: "Find the final price after a discount, including an extra percentage off, and see what the real discount comes to. Free and instant.",
    blurb: "Sale price, savings and what stacked discounts really come to.",
    Component: Discount,
    about: [
      "Stacked discounts do not add up. Twenty percent off followed by another ten percent is not thirty percent off, because the second discount applies to an already reduced price. It comes to 28 percent.",
      "That gap is worth knowing on both sides of a deal. As a buyer it means the headline is better than the reality. As a seller it means you have room to advertise two offers while giving away less than the sum suggests."
    ],
    faq: [
      { q: "Why is 20 percent and then 10 percent not 30 percent?", a: "The second discount is taken off the reduced price, not the original. On 1,000 you pay 800 after the first, then 720 after the second, which is 28 percent off in total." },
      { q: "Does it work the other way round?", a: "Yes. Applying the larger discount first or second gives exactly the same final price." }
    ],
    related: ["markup", "profit-margin", "break-even"]
  },
  {
    slug: "hourly-rate",
    name: "Freelance hourly rate",
    title: "Freelance Hourly Rate Calculator - What to Charge an Hour",
    description: "Work out an hourly and day rate from what you want to earn, your costs and the hours you can actually bill. Free and private.",
    blurb: "What to charge an hour to take home what you want.",
    Component: HourlyRate,
    about: [
      "The mistake that keeps freelancers underpaid is dividing a target salary by 2,080 hours. Nobody bills every working hour. Selling, invoicing, email, learning and admin take a third of the week before you start, and holidays and illness take weeks off the year.",
      "Work instead from the hours you can genuinely bill, which for most people is 25 to 30 a week across perhaps 46 weeks. Add your real business costs, because equipment, software and an accountant come out of the same money.",
      "The result is a floor, not a price. What a client will pay depends on the value of the work, not on your cost of living."
    ],
    faq: [
      { q: "How many billable hours are realistic?", a: "Twenty five to thirty a week is normal for an established freelancer. Under thirty percent of your week goes on work nobody pays for directly, and that proportion rises when you are looking for the next client." },
      { q: "Should I include tax?", a: "Enter what you want to earn before income tax, and treat GST separately, since GST is collected from the client rather than earned by you." }
    ],
    related: ["profit-margin", "break-even", "late-payment-interest"]
  }
];

CALCULATORS.push(
  {
    slug: "gst-vat",
    name: "GST and VAT",
    title: "GST and VAT Calculator - Add or Remove Tax from a Price",
    description: "Add tax to a price or pull it out of an inclusive one, for India, the UK, UAE, Singapore and more, with the CGST and SGST split.",
    blurb: "Add or remove GST, VAT or sales tax, with the split where it applies.",
    Component: TaxCalculator,
    about: [
      "Adding tax is easy arithmetic. Removing it is where mistakes happen, because people subtract the rate from the inclusive price. Take 18 percent off 1,180 and you get 967.60, when the taxable value is actually 1,000. Divide by 1.18 instead.",
      "In India the same tax splits in two within a state, as CGST and SGST at half the rate each, and becomes IGST between states. The total is identical either way, but the invoice has to show the right one, and so does your return.",
      "Rates here come from the same versioned rules as the invoice generator, so what you see is what is in force today, with the source recorded behind it."
    ],
    faq: [
      { q: "How do I remove GST from a total?", a: "Divide by one plus the rate. At 18 percent, divide the inclusive amount by 1.18. Choosing Remove here does it for you." },
      { q: "Why is my tax shown as two lines?", a: "Within a state, GST is collected half by the centre and half by the state, so an 18 percent invoice shows CGST 9 percent and SGST 9 percent. Between states it is a single IGST line." },
      { q: "Can I use this for US sales tax?", a: "Enter your own combined rate. Sales tax varies by state, county and city, so there is no single rate to offer." }
    ],
    related: ["profit-margin", "markup", "invoice-due-date"]
  },
  {
    slug: "invoice-due-date",
    name: "Invoice due date",
    title: "Invoice Due Date Calculator - Net 30, End of Month Terms",
    description: "Work out when an invoice falls due under net terms or end of month terms, and how many days away that is.",
    blurb: "When payment falls due under net or end of month terms.",
    Component: DueDate,
    about: [
      "Net 30 counts thirty days from the invoice date. End of month terms count from the last day of the month the invoice falls in, which is why the same words produce very different dates for an invoice raised on the 1st and one raised on the 28th.",
      "That difference is worth a sentence on your invoice. Writing 30 days from invoice date removes an argument that otherwise arrives a month later.",
      "Shorter terms get paid sooner, but only if you chase. Terms are a statement of intent until there is a follow-up behind them."
    ],
    faq: [
      { q: "What does net 30 actually mean?", a: "Payment is due thirty days after the invoice date, not thirty working days and not thirty days after the work finished." },
      { q: "What is 30 days EOM?", a: "Thirty days from the end of the month in which the invoice was issued. An invoice dated 10 January is due around 2 March, which is 51 days later." },
      { q: "Can I charge interest after the due date?", a: "If your invoice or contract says so. The late payment interest calculator works out how much." }
    ],
    related: ["late-payment-interest", "gst-vat", "profit-margin"]
  }
);

export const calcBySlug = (slug: string) => CALCULATORS.find((c) => c.slug === slug);
