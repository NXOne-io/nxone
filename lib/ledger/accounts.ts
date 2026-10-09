/**
 * The chart of accounts. Codes follow the usual ranges so an accountant recognises them at a
 * glance: 1000s assets, 2000s liabilities, 3000s equity, 4000s income, 5000s and 6000s costs.
 *
 * A business owner never sees any of this. It exists so that profit, cash and tax are derived
 * from one consistent record rather than assembled from whatever happens to be lying around.
 */

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  /** Where a positive balance sits. Assets and expenses are debit-normal; the rest are credit-normal. */
  normal: "debit" | "credit";
  /** Shown in simple language on the owner's screens. */
  plain?: string;
  /** Marks the accounts that make up cash, for the cash-flow view. */
  isCash?: boolean;
  /** Tax accounts carry the amounts a return reports. */
  taxRole?: "output" | "input";
}

const asset = (code: string, name: string, extra: Partial<Account> = {}): Account => ({ code, name, type: "asset", normal: "debit", ...extra });
const liability = (code: string, name: string, extra: Partial<Account> = {}): Account => ({ code, name, type: "liability", normal: "credit", ...extra });
const income = (code: string, name: string, extra: Partial<Account> = {}): Account => ({ code, name, type: "income", normal: "credit", ...extra });
const expense = (code: string, name: string, extra: Partial<Account> = {}): Account => ({ code, name, type: "expense", normal: "debit", ...extra });

export const CHART: Account[] = [
  asset("1010", "Cash in hand", { isCash: true, plain: "Cash" }),
  asset("1020", "Bank account", { isCash: true, plain: "Bank" }),
  asset("1030", "Payment gateway balance", { isCash: true, plain: "Money in transit" }),
  asset("1200", "Accounts receivable", { plain: "Owed to you" }),
  asset("1400", "Input tax credit", { taxRole: "input", plain: "Tax you can reclaim" }),
  asset("1500", "Prepayments", { plain: "Paid in advance" }),
  asset("1700", "Equipment", { plain: "Equipment you own" }),

  liability("2010", "Accounts payable", { plain: "You owe suppliers" }),
  liability("2100", "Tax collected on sales", { taxRole: "output", plain: "Tax you owe the government" }),
  liability("2200", "Customer advances", { plain: "Paid to you in advance" }),
  liability("2300", "Loans", { plain: "Borrowings" }),

  { code: "3000", name: "Owner's capital", type: "equity", normal: "credit", plain: "What the owner put in" },
  { code: "3900", name: "Retained earnings", type: "equity", normal: "credit", plain: "Profit kept in the business" },

  income("4000", "Sales", { plain: "What you earned" }),
  income("4100", "Other income", { plain: "Other income" }),
  income("4900", "Discounts given", { normal: "debit", plain: "Discounts you gave" }),

  expense("5000", "Cost of sales", { plain: "What your sales cost you" }),
  expense("6010", "Rent"),
  expense("6020", "Salaries and wages"),
  expense("6030", "Utilities"),
  expense("6040", "Software and subscriptions"),
  expense("6050", "Advertising and marketing"),
  expense("6060", "Travel"),
  expense("6070", "Professional fees"),
  expense("6080", "Repairs and maintenance"),
  expense("6090", "Bank and payment charges"),
  expense("6100", "Office supplies"),
  expense("6900", "Other expenses")
];

export const accountByCode = (code: string) => CHART.find((a) => a.code === code);
export const accountsOfType = (type: AccountType) => CHART.filter((a) => a.type === type);
export const cashAccounts = () => CHART.filter((a) => a.isCash);

/** The expense accounts a user picks from, in the order they are likely to need them. */
export const EXPENSE_CATEGORIES = CHART.filter((a) => a.type === "expense").map((a) => ({ code: a.code, name: a.name }));
