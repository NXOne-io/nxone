# NXOne API

The server side: accounts, and syncing a person's data between their devices.

It does deliberately little. Tax rules, totals, documents and PDFs stay on the device, where they
already work offline. This holds a copy so a second device can catch up, and keeps the things that
genuinely need a server: identity, membership of an organisation, an audit trail and billing.

## Running it locally

```bash
npm install
npx wrangler d1 migrations apply nxone --local
npm run dev           # http://localhost:8787
npm test              # 17 tests
```

With `EMAIL_PROVIDER=console`, sign-in links are printed to the terminal instead of emailed, so you
can click them during development.

## Setting it up for real

```bash
npx wrangler d1 create nxone                  # put the id in wrangler.jsonc
npx wrangler kv namespace create SESSIONS     # put the id in wrangler.jsonc
npx wrangler d1 migrations apply nxone --remote
npx wrangler secret put RESEND_API_KEY        # then set EMAIL_PROVIDER=resend
npm run deploy
```

## The endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/auth/request` | Emails a one-time sign-in link |
| POST | `/auth/verify` | Exchanges the link for a session |
| GET | `/auth/me` | Who is signed in, and which organisations they belong to |
| POST | `/auth/sign-out` | Ends the session |
| GET | `/sync/pull?since=` | Records changed since a cursor |
| POST | `/sync/push` | Sends records up, with conflicts resolved |
| GET | `/account/export` | Everything held for the organisation |

## How sync decides

Records are matched on the id the device gave them. The higher version wins; a tie goes to the
later timestamp, and then to the server. A delete beats an edit at the same version, because an
invoice someone deleted reappearing is worse than losing one edit. Anything rejected comes back in
the response with the server's copy, so the device can tell the person rather than losing work
silently.

## What is deliberately not here

- No passwords: there is nothing to leak and no reset flow to get wrong.
- No business logic: the server stores records and never calculates tax.
- No payment provider yet: the subscription table names a provider as a string, so Razorpay or
  Stripe can be added without touching anything else.
