/**
 * Money is held as an integer number of minor units (paise, cents) so that adding a hundred
 * invoice lines can never drift the way floating point does. Every currency carries its own
 * number of decimal places, because JPY has none and KWD has three.
 */
export interface Money { minor: number; currency: string }

export const DECIMALS: Record<string, number> = { JPY: 0, KRW: 0, VND: 0, CLP: 0, ISK: 0, KWD: 3, BHD: 3, OMR: 3, TND: 3, JOD: 3 };
export const decimalsFor = (currency: string) => DECIMALS[currency.toUpperCase()] ?? 2;
const factor = (currency: string) => 10 ** decimalsFor(currency);

export const money = (major: number, currency: string): Money => ({ minor: Math.round(major * factor(currency)), currency });
export const fromMinor = (minor: number, currency: string): Money => ({ minor: Math.round(minor), currency });
export const toMajor = (m: Money): number => m.minor / factor(m.currency);
export const zero = (currency: string): Money => ({ minor: 0, currency });

function sameCurrency(a: Money, b: Money) {
  if (a.currency !== b.currency) throw new Error(`Cannot combine ${a.currency} with ${b.currency}. Convert first.`);
}
export const add = (a: Money, b: Money): Money => { sameCurrency(a, b); return { minor: a.minor + b.minor, currency: a.currency }; };
export const subtract = (a: Money, b: Money): Money => { sameCurrency(a, b); return { minor: a.minor - b.minor, currency: a.currency }; };
export const sum = (list: Money[], currency: string): Money => list.reduce(add, zero(currency));
export const isZero = (m: Money) => m.minor === 0;
export const isNegative = (m: Money) => m.minor < 0;

/** Half-up rounding, which is what invoices and tax authorities expect. */
export const multiply = (m: Money, by: number): Money => ({ minor: Math.sign(m.minor * by) * Math.round(Math.abs(m.minor * by)), currency: m.currency });
export const percentOf = (m: Money, pct: number): Money => multiply(m, pct / 100);

/**
 * Split an amount across n shares without losing or inventing a single minor unit:
 * the remainder is handed out one unit at a time to the earliest shares.
 */
export function allocate(m: Money, weights: number[]): Money[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return weights.map(() => zero(m.currency));
  const raw = weights.map((w) => Math.floor((m.minor * w) / total));
  const remainder = m.minor - raw.reduce((a, b) => a + b, 0);
  return raw.map((r, i) => fromMinor(r + (i < remainder ? 1 : 0), m.currency)).map((x, i) => (i === 0 && remainder < 0 ? fromMinor(x.minor + remainder, m.currency) : x));
}

export function formatMoney(m: Money, locale = "en-US", opts: { showCode?: boolean } = {}): string {
  const d = decimalsFor(m.currency);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: m.currency, minimumFractionDigits: d, maximumFractionDigits: d, currencyDisplay: opts.showCode ? "code" : "symbol" }).format(toMajor(m));
  } catch {
    return `${m.currency} ${toMajor(m).toFixed(d)}`;
  }
}

/** Words for invoice footers: "One thousand two hundred and thirty rupees only". */
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function under1000(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${under1000(n % 100)}` : ""}`;
}
/** Indian numbering (lakh, crore) where the country pack asks for it, otherwise international. */
export function numberToWords(n: number, system: "international" | "indian" = "international"): string {
  if (n === 0) return "zero";
  if (n < 0) return `minus ${numberToWords(-n, system)}`;
  const groups: Array<[number, string]> = system === "indian"
    ? [[10_000_000, "crore"], [100_000, "lakh"], [1000, "thousand"]]
    : [[1_000_000_000, "billion"], [1_000_000, "million"], [1000, "thousand"]];
  const parts: string[] = [];
  let rest = Math.floor(n);
  for (const [value, label] of groups) {
    if (rest >= value) {
      const count = Math.floor(rest / value);
      parts.push(`${numberToWords(count, system)} ${label}`);
      rest %= value;
    }
  }
  if (rest > 0) parts.push(under1000(rest));
  return parts.join(" ").trim();
}
