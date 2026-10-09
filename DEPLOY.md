# Getting NXOne live on nxone.io

The whole site is static: every page is pre-rendered and everything else happens in the visitor's
browser. There is no server to run, which keeps hosting free and makes the deploy boring, which is
what you want on launch day.

Build output: `out/`, 33 pages, about 3.6 MB.

---

## 1. Put the code on GitHub

Create a new private repository, then from the project folder:

```bash
git init
git add .
git commit -m "NXOne: documents, tax engine, calculators, guides"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/nxone.git
git push -u origin main
```

Use the command line or GitHub Desktop. The web uploader silently drops files on large folders.

## 2. Connect Cloudflare Pages

dash.cloudflare.com, then Workers and Pages, then Create, then Pages, then Connect to Git.
Pick the repository and use these settings exactly:

| Setting | Value |
|---|---|
| Framework preset | None (do not pick Next.js) |
| Build command | `npm run build:static` |
| Output directory | `out` |
| Node version | set the variable below |

Environment variables, under Settings:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://nxone.io` |
| `NODE_VERSION` | `22` |
| `NEXT_PUBLIC_GA_ID` | your Analytics measurement id, once you have one |

`NEXT_PUBLIC_SITE_URL` matters: canonical links, the sitemap and the social image all use it.

Deploy. You get an address like `nxone.pages.dev`. Test that thoroughly before touching the domain:
make an invoice, download the PDF, open a calculator, try the HSN search.

## 3. Point the domain at it

In Cloudflare Pages, open Custom domains and add both:

- `nxone.io`
- `www.nxone.io`

If the domain uses Cloudflare nameservers, the DNS records are created for you. Otherwise Cloudflare
tells you which records to add at your registrar. The `www` to apex redirect is already handled by
`out/_redirects`, which the build writes.

HTTPS is automatic. Give certificates a few minutes before judging anything.

## 4. Check it

- `https://nxone.io` loads and the sidebar works
- `https://www.nxone.io` redirects to the apex
- `https://nxone.io/invoice-generator` makes a PDF
- `https://nxone.io/sitemap.xml` lists 32 pages
- `https://nxone.io/robots.txt` names the AI crawlers
- Paste `https://nxone.io` into any chat app and check the social preview shows the green card

## 5. Tell the search engines

1. Google Search Console: add `nxone.io` as a domain property, verify by DNS, submit
   `https://nxone.io/sitemap.xml`.
2. Request indexing on the pages that matter most: the home page, the invoice generator, the GST
   invoice format guide and the HSN finder.
3. Bing Webmaster Tools: add the site, import from Search Console, then set up IndexNow. Bing feeds
   DuckDuckGo and ChatGPT search, so it is worth the ten minutes.

## 6. Analytics

Create a Google Analytics property for nxone.io, take the measurement id, add it as
`NEXT_PUBLIC_GA_ID` in Cloudflare, and redeploy. The value is read at build time, so without a
redeploy nothing changes.

---

## Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 48 tests
npm run build:static # produces out/
```

## If something breaks

**Build fails on Cloudflare but works locally.** Check `NODE_VERSION` is set to 22.

**Pages load but the styling is missing.** The output directory is wrong. It must be `out`.

**Social preview is blank.** The `_headers` file sets the content type for the social image. Confirm
the build wrote `out/_headers`.

**A tax rate looks wrong.** Every rule in `lib/countries/` carries its source and effective dates.
Change it there, add a test, redeploy. Never hard-code a rate in a component.
