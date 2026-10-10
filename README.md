# NXOne

Invoices, quotations, purchase orders and receipts with the tax worked out for the country you sell
from, plus the books behind them: expenses, a double-entry ledger, receivables, cash flow and
reports. Everything runs in the browser, so a person can use the whole thing without an account.

The repository holds two separate projects.

```
/            the website and the app        (package.json: "nxone")
/server      the API: accounts and syncing  (package.json: "nxone-api")
```

They are deliberately separate. The website never needs the API's dependencies, and the API never
needs Next.js. Each has its own package.json, its own lock file and its own deployment.

## The website

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 122 tests
npm run build   # writes out/, which is what gets deployed
```

`npm run build` produces a fully static site in `out/`: every page is pre-rendered and everything
else happens in the visitor's browser.

### Deploying it

Cloudflare Workers, from this repository.

| Setting | Value |
|---|---|
| Root directory | **empty** |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Environment variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://nxone.io` |
| `NODE_VERSION` | `22` |
| `NEXT_PUBLIC_API_URL` | the API's address, once it is deployed. Leave unset and the app simply works on one device |

If a build ever fails with `While resolving: nxone-api`, the root directory setting is pointing at
`server`. Nothing in the repository can fix that; the setting has to be cleared.

## The API

Accounts and syncing. It stores records; it never calculates tax or totals, which stay on the
device.

```bash
cd server
npm install
npx wrangler d1 migrations apply nxone --local
npm run dev     # http://localhost:8787
npm test        # 28 tests
```

See `server/README.md` for setting it up properly, including the database, sessions and email.

## How it is put together

```
lib/money.ts              amounts as whole paise and cents, with remainder-safe allocation
lib/countries/            country packs: versioned tax rules with dates, sources and status
lib/countries/hsn.ts      HSN and SAC lookup, including rates that change with price per unit
lib/documents/            what belongs on each document, four layouts, the PDF, the totals engine
lib/ledger/               chart of accounts, double-entry journals, profit, position, cash
lib/analysis/             receivables, chasing, the cash forecast
lib/store/                the local workspace, reports and backup
lib/sync/                 pushing and pulling records when someone signs in
lib/calc/                 the calculators
content/                  guides, country pages, legal pages
app/(site)/               public pages
app/(app)/                the tool, behind the sidebar
server/                   the API
```

## The rule that matters most

No tax rate is ever written into a component. Every rule lives in a country pack with the dates it
applies between, where it came from and how far it has been verified, so an invoice dated before a
rate change still calculates on the old rate. India moved to 5%, 18% and 40% on 22 September 2025,
and documents from before that date still use the old slabs.

Before relying on any rate for filing, check it against the authority named in its `source` field.
