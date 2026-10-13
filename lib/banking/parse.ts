/**
 * Reading a bank statement.
 *
 * Every bank exports a different CSV, so rather than ask people to reformat theirs, we work out
 * which column is which by looking at the data. Dates are the hard part: 03/04/2026 is March in
 * America and April almost everywhere else, so we decide from the file as a whole rather than
 * guessing row by row, and tell the person what we concluded.
 */

export interface RawRow { cells: string[]; line: number }

export interface BankRow {
  line: number;
  date: string;
  description: string;
  /** Positive for money in, negative for money out, in minor units. */
  amountMinor: number;
  reference?: string;
  balanceMinor?: number;
}

export interface ParseResult {
  rows: BankRow[];
  /** Rows we could not read, with the reason, rather than dropped silently. */
  rejected: Array<{ line: number; reason: string; text: string }>;
  columns: { date: number; description: number; amount?: number; debit?: number; credit?: number; reference?: number; balance?: number };
  /** Which way round we read ambiguous dates, so the person can correct it. */
  dateOrder: "dmy" | "mdy" | "ymd";
  /** Headers as found, for showing what we matched. */
  header: string[];
}

export function splitCsv(text: string): RawRow[] {
  const rows: RawRow[] = [];
  let cell = "";
  let cells: string[] = [];
  let quoted = false;
  let line = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === "," || ch === "\t" || ch === ";") { cells.push(cell.trim()); cell = ""; continue; }
    if (ch === "\n") {
      cells.push(cell.trim());
      if (cells.some((c) => c !== "")) rows.push({ cells, line });
      cells = []; cell = ""; line++;
      continue;
    }
    if (ch !== "\r") cell += ch;
  }
  cells.push(cell.trim());
  if (cells.some((c) => c !== "")) rows.push({ cells, line });
  return rows;
}

const HEADER_HINTS = {
  date: ["date", "txn date", "transaction date", "value date", "posting date", "booked"],
  description: ["description", "narration", "particulars", "details", "remarks", "transaction", "payee", "memo"],
  amount: ["amount", "value"],
  debit: ["debit", "withdrawal", "withdrawals", "paid out", "money out", "dr"],
  credit: ["credit", "deposit", "deposits", "paid in", "money in", "cr"],
  reference: ["reference", "ref", "cheque", "chq", "utr", "transaction id"],
  balance: ["balance", "closing balance", "running balance"]
};

const looksLikeDate = (v: string) => /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(v.trim());
const parseAmount = (v: string): number | null => {
  const cleaned = v.replace(/[^\d.,()-]/g, "").trim();
  if (!cleaned) return null;
  const negative = /^\(.*\)$/.test(cleaned) || cleaned.includes("-");
  // 1,234.56 and 1.234,56 both occur; the last separator is the decimal one
  const stripped = cleaned.replace(/[()\-]/g, "");
  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  let normalised = stripped;
  if (lastComma > lastDot) normalised = stripped.replace(/\./g, "").replace(",", ".");
  else normalised = stripped.replace(/,/g, "");
  const value = Number(normalised);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) * (negative ? -1 : 1);
};

/** Works out which column is which, from the header where there is one and the data where not. */
export function detectColumns(rows: RawRow[]): { header: string[]; start: number; columns: ParseResult["columns"] } {
  const first = rows[0]?.cells ?? [];
  const headerish = first.some((c) => Object.values(HEADER_HINTS).flat().some((h) => c.toLowerCase().includes(h)));
  const header = headerish ? first : [];
  const start = headerish ? 1 : 0;

  const find = (keys: string[]) => header.findIndex((c) => keys.some((k) => c.toLowerCase().replace(/[^a-z ]/g, "").includes(k)));

  const columns: ParseResult["columns"] = { date: -1, description: -1 };
  if (headerish) {
    columns.date = find(HEADER_HINTS.date);
    columns.description = find(HEADER_HINTS.description);
    const debit = find(HEADER_HINTS.debit);
    const credit = find(HEADER_HINTS.credit);
    if (debit >= 0 && credit >= 0) { columns.debit = debit; columns.credit = credit; }
    else {
      const amount = find(HEADER_HINTS.amount);
      if (amount >= 0) columns.amount = amount;
    }
    const reference = find(HEADER_HINTS.reference);
    if (reference >= 0) columns.reference = reference;
    const balance = find(HEADER_HINTS.balance);
    if (balance >= 0) columns.balance = balance;
  }

  // anything the header did not give us, work out from the data
  const sample = rows.slice(start, start + 20);
  if (columns.date < 0) {
    columns.date = sample[0]?.cells.findIndex((_, i) => sample.filter((r) => looksLikeDate(r.cells[i] ?? "")).length > sample.length / 2) ?? -1;
  }
  if (columns.amount === undefined && columns.debit === undefined) {
    const numeric = (sample[0]?.cells ?? []).map((_, i) => sample.filter((r) => parseAmount(r.cells[i] ?? "") !== null).length);
    const best = numeric.reduce((bestIndex, count, i) => (i !== columns.date && count > (numeric[bestIndex] ?? 0) ? i : bestIndex), -1);
    if (best >= 0) columns.amount = best;
  }
  if (columns.description < 0) {
    const taken = new Set([columns.date, columns.amount, columns.debit, columns.credit, columns.balance]);
    const longest = (sample[0]?.cells ?? []).map((_, i) => (taken.has(i) ? -1 : sample.reduce((a, r) => a + (r.cells[i]?.length ?? 0), 0)));
    columns.description = longest.indexOf(Math.max(...longest));
  }

  return { header, start, columns };
}

/** Decides how to read ambiguous dates by looking at every row, not one. */
export function detectDateOrder(values: string[]): ParseResult["dateOrder"] {
  let firstOver12 = false;
  let secondOver12 = false;
  let isoLike = false;

  for (const v of values) {
    const parts = v.trim().split(/[-/.]/).map((x) => Number(x));
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) continue;
    if (String(parts[0]).length === 4) { isoLike = true; continue; }
    if (parts[0] > 12) firstOver12 = true;
    if (parts[1] > 12) secondOver12 = true;
  }

  if (isoLike && !firstOver12 && !secondOver12) return "ymd";
  if (secondOver12 && !firstOver12) return "mdy";
  // where nothing settles it, the rest of the world writes day first
  return "dmy";
}

function toIso(value: string, order: ParseResult["dateOrder"]): string | null {
  const text = value.trim();
  const parts = text.split(/[-/.]/);
  if (parts.length < 3) {
    const parsed = Date.parse(text);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
  }
  let [a, b, c] = parts.map((x) => x.replace(/\D/g, ""));
  if (!a || !b || !c) return null;

  let year: string, month: string, day: string;
  if (order === "ymd" || a.length === 4) { year = a; month = b; day = c; }
  else if (order === "mdy") { month = a; day = b; year = c; }
  else { day = a; month = b; year = c; }

  if (year.length === 2) year = `20${year}`;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

export function parseStatement(text: string): ParseResult {
  const raw = splitCsv(text);
  const { header, start, columns } = detectColumns(raw);
  const body = raw.slice(start);

  const dateOrder = detectDateOrder(body.map((r) => r.cells[columns.date] ?? "").filter(Boolean));
  const rows: BankRow[] = [];
  const rejected: ParseResult["rejected"] = [];

  for (const r of body) {
    // a row with more columns than the header usually means an unquoted comma inside a number,
    // which would otherwise be read as a much smaller amount. Refusing is safer than guessing.
    if (header.length > 0 && r.cells.length > header.length) {
      rejected.push({ line: r.line, reason: "More columns than the header, so an amount may contain an unquoted comma", text: r.cells.join(", ").slice(0, 80) });
      continue;
    }

    const dateText = r.cells[columns.date] ?? "";
    const date = toIso(dateText, dateOrder);
    if (!date) { rejected.push({ line: r.line, reason: "No date we could read", text: r.cells.join(", ").slice(0, 80) }); continue; }

    let amountMinor: number | null = null;
    if (columns.debit !== undefined && columns.credit !== undefined) {
      const debit = parseAmount(r.cells[columns.debit] ?? "") ?? 0;
      const credit = parseAmount(r.cells[columns.credit] ?? "") ?? 0;
      amountMinor = credit - Math.abs(debit);
    } else if (columns.amount !== undefined) {
      amountMinor = parseAmount(r.cells[columns.amount] ?? "");
    }

    if (amountMinor === null || amountMinor === 0) {
      rejected.push({ line: r.line, reason: "No amount we could read", text: r.cells.join(", ").slice(0, 80) });
      continue;
    }

    rows.push({
      line: r.line,
      date,
      description: (r.cells[columns.description] ?? "").slice(0, 200) || "No description",
      amountMinor,
      reference: columns.reference !== undefined ? r.cells[columns.reference] || undefined : undefined,
      balanceMinor: columns.balance !== undefined ? parseAmount(r.cells[columns.balance] ?? "") ?? undefined : undefined
    });
  }

  return { rows, rejected, columns, dateOrder, header };
}
