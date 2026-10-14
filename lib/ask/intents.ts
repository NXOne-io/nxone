/**
 * Understanding the question.
 *
 * No model is involved. People ask about their money in a small number of ways, and matching those
 * patterns gives an exact answer from the ledger every time, for nothing, without sending anybody's
 * accounts to a third party. When nothing matches we say so and offer what we can answer, rather
 * than inventing a confident reply, which is the failure mode that makes finance tools untrusted.
 */

export type IntentName =
  | "profit" | "revenue" | "expenses" | "biggest-expenses" | "cash" | "runway"
  | "owed" | "who-owes" | "overdue" | "late-payers" | "owe-suppliers"
  | "tax" | "filings" | "best-customers" | "compare" | "afford" | "unknown";

export interface Period {
  kind: "this-month" | "last-month" | "this-quarter" | "this-year" | "last-year" | "all-time" | "last-30" | "last-90";
  label: string;
}

export interface Intent {
  name: IntentName;
  period: Period;
  /** A number mentioned in the question, such as a salary in "can I afford 50,000 a month". */
  amount?: number;
  /** What we matched on, so the answer can say why it understood the question that way. */
  matched: string[];
}

const PERIODS: Array<[RegExp, Period]> = [
  [/\b(this month|current month)\b/i, { kind: "this-month", label: "this month" }],
  [/\b(last month|previous month)\b/i, { kind: "last-month", label: "last month" }],
  [/\b(this quarter|current quarter)\b/i, { kind: "this-quarter", label: "this quarter" }],
  [/\b(this year|this financial year|this fy|ytd|year to date)\b/i, { kind: "this-year", label: "this year" }],
  [/\b(last year|previous year|last financial year)\b/i, { kind: "last-year", label: "last year" }],
  [/\b(last 30 days|past 30 days|last thirty days)\b/i, { kind: "last-30", label: "the last 30 days" }],
  [/\b(last 90 days|past 90 days|last quarter)\b/i, { kind: "last-90", label: "the last 90 days" }],
  [/\b(ever|all time|overall|total|so far)\b/i, { kind: "all-time", label: "all time" }]
];

const INTENTS: Array<[IntentName, RegExp[]]> = [
  ["compare", [/\bcompared? (with|to)\b/i, /\bversus\b|\bvs\b/i, /\bchanged? (since|from|compared)\b/i, /\bbetter or worse\b/i]],
  ["afford", [/\bcan (i|we) afford\b/i, /\bafford to (hire|pay|buy|take on)\b/i, /\bcan (i|we) (hire|take on)\b/i]],
  ["biggest-expenses", [/\bbiggest (expense|cost|spend)/i, /\bwhere (is|does) (the |my |our )?money go/i, /\bspending most\b/i, /\btop (expenses|costs)\b/i]],
  ["late-payers", [/\b(consistently|always|usually) late\b/i, /\bwho pays late\b/i, /\blate payers?\b/i, /\bslow(est)? (to pay|payers?)\b/i]],
  ["who-owes", [/\bwho owes\b/i, /\bwhich customers? owes?\b/i, /\bowes? (me|us) the most\b/i]],
  ["overdue", [/\boverdue\b/i, /\bpast due\b/i, /\blate invoices?\b/i]],
  ["owed", [/\b(how much|what) (am i|are we|is) owed\b/i, /\breceivables?\b/i, /\boutstanding\b/i, /\bowed to (me|us)\b/i]],
  ["owe-suppliers", [/\b(what|how much) do (i|we) owe\b/i, /\bpayables?\b/i, /\bsupplier (bills?|payments?)\b/i, /\bbills? (due|to pay)\b/i]],
  ["runway", [/\brunway\b/i, /\bhow long (will|can) (the |my |our )?(cash|money) last\b/i, /\brun out of (cash|money)\b/i]],
  ["cash", [/\bcash\b/i, /\bbank balance\b/i, /\bhow much (money )?(do (i|we) have|is (in the bank|available))\b/i]],
  ["tax", [/\btax (owed|due|liability|bill)\b/i, /\bhow much (gst|vat|tax)\b/i, /\bgst (owed|due|collected)\b/i]],
  ["filings", [/\b(filing|return|deadline)s?\b/i, /\bwhen (is|are) .*(due|filing)\b/i, /\bgstr\b/i]],
  ["best-customers", [/\b(best|biggest|top) customers?\b/i, /\bwho (pays|brings in) the most\b/i, /\bcustomer (concentration|split)\b/i]],
  // people ask "how much did we make" far more often than they say "profit", and rarely with a
  // question mark, so match the verb itself rather than the punctuation around it
  ["profit", [/\bprofit(able|ability)?\b/i, /\b(make|made|making)\b/i, /\bbottom line\b/i, /\bmargins?\b/i, /\bearn(ed|ing|ings)?\b/i, /\bleft over\b/i]],
  ["revenue", [/\brevenue\b/i, /\bsales\b/i, /\bturnover\b/i, /\binvoiced\b/i, /\bbilled\b/i]],
  ["expenses", [/\bexpenses?\b/i, /\bcosts?\b/i, /\bspen[dt]\b/i, /\boutgoings?\b/i]]
];

export function parseQuestion(question: string): Intent {
  const text = question.trim();
  const matched: string[] = [];

  let period: Period = { kind: "this-month", label: "this month" };
  for (const [pattern, value] of PERIODS) {
    if (pattern.test(text)) { period = value; matched.push(value.label); break; }
  }

  let name: IntentName = "unknown";
  for (const [intent, patterns] of INTENTS) {
    const hit = patterns.find((p) => p.test(text));
    if (hit) { name = intent; matched.push(intent); break; }
  }

  // "how much did we make" with no period usually means this month, but "profit last year" is clear
  const amountMatch = text.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakh|lakhs|crore|million)?\b/i);
  let amount: number | undefined;
  if (amountMatch) {
    const base = Number(amountMatch[1].replace(/,/g, ""));
    const unit = amountMatch[2]?.toLowerCase();
    const multiplier = unit === "k" || unit === "thousand" ? 1_000
      : unit === "lakh" || unit === "lakhs" ? 100_000
      : unit === "crore" ? 10_000_000
      : unit === "million" ? 1_000_000 : 1;
    if (Number.isFinite(base)) amount = base * multiplier;
  }

  return { name, period, amount, matched };
}

/** What we can answer, shown when a question is not understood. */
export const EXAMPLE_QUESTIONS = [
  "How much did we make last month?",
  "Who owes us the most?",
  "What are our biggest expenses this year?",
  "How much is overdue?",
  "How long will our cash last?",
  "Which customers are consistently late?",
  "What do we owe suppliers?",
  "How much tax have we collected this quarter?",
  "When is my next filing due?",
  "Can we afford to hire someone at 60,000 a month?",
  "How does this month compare with last month?"
];
