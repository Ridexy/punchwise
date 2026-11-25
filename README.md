# Punchwise: free time card calculator

A privacy-first, mobile-first time card calculator. Users enter clock-in and clock-out times, breaks
and overtime rules, then get weekly hours and pay and send or print a signed timesheet PDF.
Everything runs in the browser. There is no backend, no account, and nothing is uploaded.

- Product brief: [`../docs/timecard/product-brief.md`](../docs/timecard/product-brief.md)
- Keyword research: [`../docs/idea-search/round-1-keyword-scan.md`](../docs/idea-search/round-1-keyword-scan.md)
- Test report: [`../docs/timecard/test-report.md`](../docs/timecard/test-report.md)

## Stack
React 19 + TypeScript + Vite 6 + Tailwind 3 + React Router 6, with every route pre-rendered to static HTML
at build time. IndexedDB (`idb`) for local projects, `pdf-lib` for PDFs, Workbox for the offline service
worker, and `lz-string` to compress share links. Hosted on Cloudflare Pages (free tier).

## Project layout
```
src/site.ts            brand name, site URL, analytics token  ← rename the product here
src/meta.ts            routes: titles, descriptions, indexability
src/lib/time.ts        all time/overtime arithmetic (pure, unit tested)
src/lib/model.ts       timesheet data model
src/lib/share.ts       share-link + team-link encoding (URL fragment)
src/lib/pdf.ts         filled + blank timesheet PDFs
src/lib/db.ts          IndexedDB storage, backup/restore
src/lib/card.ts        PNG share card (drawn in the browser, no personal data)
src/lib/track.ts       privacy-safe events + ?ref attribution
src/components/        calculator, share sheet, signature pad, UI kit
src/pages/             one file per route
scripts/prerender.mjs  static HTML for every route + sitemap.xml + robots.txt + 404.html
scripts/sw.mjs         offline service worker (runs after prerender)
scripts/e2e.mjs        browser QA suite (Playwright)
scripts/icons.mjs      regenerates PNG icons and og.jpg
functions/api/e.ts     growth-event collector (Pages Function -> Workers Analytics Engine)
wrangler.toml          Pages config: output dir + Analytics Engine binding
.env.production        public build settings (site URL, analytics token)
```

## Local development
Requires Node 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. The dev server renders on the client only. To check the real output
(pre-rendered HTML, offline mode), build and preview it:

```bash
npm run build
```

```bash
npm run preview
```

## Tests
Unit tests (time arithmetic, overtime, share links, PDF and CSV):

```bash
npm test
```

End-to-end browser QA. It needs Playwright and Chromium, and writes `../docs/timecard/test-report-e2e.json`.
Run it against Cloudflare's local runtime, which also serves the `/api/e` function, in two terminals:

```bash
npm run pages:dev
```

```bash
BASE_URL=http://127.0.0.1:8788 npm run e2e
```

(`npm run preview` also works for everything except the collector test.)

## Environment configuration
Public build settings live in **`.env.production`**, which is committed: everything in it ends up in the public page anyway.
Edit that file rather than the Cloudflare dashboard. All values are read **at build time**.

| Variable | Purpose | Default |
|---|---|---|
| `VITE_SITE_URL` | Public URL with no trailing slash. Used for canonical tags, sitemap, Open Graph tags and the PDF footer link. | `https://punchwise.com` |
| `VITE_CF_BEACON_TOKEN` | Cloudflare Web Analytics token. Empty turns analytics off. The token is public by design. | empty |
| `VITE_EVENTS_URL` | Where growth batches are sent. Empty means the built-in `/api/e` collector; `off` disables sending. See `docs/timecard/growth-metrics.md`. | `/api/e` |

## Deploying to Cloudflare Pages (free tier)
1. Push this repository to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**, then pick the repo.
3. Build settings:
   - Framework preset: **None**
   - Root directory: **`timecard`**
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**

   The Node version comes from `timecard/.nvmrc` (22). `timecard/wrangler.toml` sets the output directory and
   connects the **Analytics Engine** dataset `punchwise_events` to the `/api/e` function as the binding `EVENTS`. Cloudflare reads
   that file on deploy, so there is no dashboard step for the binding. The dataset is created on the first write.
4. **Domain.** The site URL in `timecard/.env.production` is `https://punchwise.com`, and it's used for canonical links, the sitemap, PDF footers, share cards and invites.
   After buying the domain, add it in the Pages project under **Custom domains** *before* the first public launch. If you launch
   before the domain is connected, temporarily set `VITE_SITE_URL=https://punchwise.pages.dev` (or whatever Pages URL you're given) and push.
5. **Web Analytics** (page views): go to **Analytics & Logs → Web Analytics → Add a site**, choose the manual JS snippet,
   copy the token, paste it into `VITE_CF_BEACON_TOKEN` in `.env.production`, then commit and push.
   (Cloudflare can also inject the beacon automatically for Pages sites. Use one method only.)
6. Deploy. Pages serves `dist/404.html` for unknown URLs, and `_headers` sets caching and security headers.
7. Check it: open the site, use the calculator, switch tabs, then go to **Workers & Pages → punchwise → Functions**
   and confirm `/api/e` requests returning 204.
8. Add the site to Google Search Console and submit `/sitemap.xml`.

**Free-tier note.** `/api/e` is the only route that runs server code. Every page and file is served as a static asset.
Each visit that triggers an event sends **one** request when the visitor leaves or switches away, and that counts toward
the Workers free daily request allowance. If the allowance runs out, only `/api/e` is affected and the site keeps working.
Check Cloudflare's current limits for Functions requests and Analytics Engine writes before you rely on high volume. They couldn't be
looked up from the build environment.

**Custom domain:** add it under **Custom domains** in the Pages project, update `VITE_SITE_URL`, and push.

## Database migrations
There is no server database. If cloud sync is added later (see the "Pro" ideas in the brief):
- **Local data:** IndexedDB schema changes go through `openDB(DB_NAME, VERSION, { upgrade })` in
  `src/lib/db.ts`. Bump `VERSION` and migrate stores in `upgrade()`. Never delete user data in a migration.
- **Share links** carry a format version (`v` in `src/lib/share.ts`). Keep decoding old versions.
- **Server database (future):** the free choice on Cloudflare would be D1. Keep migrations as numbered
  SQL files (`migrations/0001_init.sql`, …) applied with `wrangler d1 migrations apply`, and keep the
  local-first data model as the source of truth for syncing.

## Renaming the product
Change `SITE_NAME` in `src/site.ts`, the manifest names in `public/manifest.webmanifest`, the logo text in
`src/components/Layout.tsx`, and the `og.jpg` text in `scripts/icons.mjs` (then run `npm run icons`).
