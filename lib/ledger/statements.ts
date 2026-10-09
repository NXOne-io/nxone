import { add, fromMinor, subtract, type Money } from "../money";
import { accountByCode } from "./accounts";
import { balances, type AccountBalance, type JournalEntry } from "./journal";

/** The three statements, derived from the journals rather than kept as separate numbers. */

export interface ProfitAndLoss {
  income: AccountBalance[];
  expenses: AccountBalance[];
  totalIncome: Money;
  totalExpenses: Money;
  grossProfit: Money;
  netProfit: Money;
  /** Net profit as a share of income. */
  marginPct: number;
}

export function profitAndLoss(entries: JournalEntry[], currency: string, from: string, to: string): ProfitAndLoss {
  const rows = balances(entries, currency, from, to);
  const income = rows.filter((r) => r.type === "income");
  const expenses = rows.filter((r) => r.type === "expense");
  const totalIncome = income.reduce((a, r) => add(a, r.balance), fromMinor(0, currency));
  const totalExpenses = expenses.reduce((a, r) => add(a, r.balance), fromMinor(0, currency));
  const costOfSales = expenses.filter((r) => r.code === "5000").reduce((a, r) => add(a, r.balance), fromMinor(0, currency));
  const netProfit = subtract(totalIncome, totalExpenses);

  return {
    income, expenses, totalIncome, totalExpenses,
    grossProfit: subtract(totalIncome, costOfSales),
    netProfit,
    marginPct: totalIncome.minor ? Math.round((netProfit.minor / totalIncome.minor) * 1000) / 10 : 0
  };
}

export interface BalanceSheet {
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalAssets: Money;
  totalLiabilities: Money;
  /** Profit so far, which is what makes the sheet balance before any year end. */
  retained: Money;
  totalEquity: Money;
  balanced: boolean;
}

export function balanceSheet(entries: JournalEntry[], currency: string, asAt: string): BalanceSheet {
  const rows = balances(entries, currency, undefined, asAt);
  const pick = (t: string) => rows.filter((r) => r.type === t);
  const sum = (list: AccountBalance[]) => list.reduce((a, r) => add(a, r.balance), fromMinor(0, currency));

  const assets = pick("asset");
  const liabilities = pick("liability");
  const equity = pick("equity");
  const retained = subtract(sum(pick("income")), sum(pick("expense")));
  const totalEquity = add(sum(equity), retained);
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);

  return {
    assets, liabilities, equity,
    totalAssets, totalLiabilities, retained, totalEquity,
    balanced: totalAssets.minor === totalLiabilities.minor + totalEquity.minor
  };
}

export interface CashFlow {
  opening: Money;
  received: Money;
  spent: Money;
  closing: Money;
  /** Movement per cash account, so you can see which pot moved. */
  byAccount: Array<{ code: string; name: string; movement: Money; closing: Money }>;
}

export function cashFlow(entries: JournalEntry[], currency: string, from: string, to: string): CashFlow {
  const cashCodes = new Set(["1010", "1020", "1030"]);
  const isCash = (r: AccountBalance) => cashCodes.has(r.code);

  // opening is everything that happened strictly before the period, which is the balance up to
  // the end of the period minus what moved inside it
  const during = balances(entries, currency, from, to).filter(isCash);
  const closingRows = balances(entries, currency, undefined, to).filter(isCash);

  const received = during.reduce((a, r) => a + r.debit.minor, 0);
  const spent = during.reduce((a, r) => a + r.credit.minor, 0);
  const closingMinor = closingRows.reduce((a, r) => a + r.balance.minor, 0);
  const openingMinor = closingMinor - (received - spent);

  return {
    opening: fromMinor(openingMinor, currency),
    received: fromMinor(received, currency),
    spent: fromMinor(spent, currency),
    closing: fromMinor(closingMinor, currency),
    byAccount: closingRows.map((r) => ({
      code: r.code,
      name: accountByCode(r.code)?.plain ?? r.name,
      movement: during.find((d) => d.code === r.code)?.balance ?? fromMinor(0, currency),
      closing: r.balance
    }))
  };
}
