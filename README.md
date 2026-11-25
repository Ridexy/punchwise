# Punchwise: free time card calculator

A privacy-first, mobile-first time card calculator. Users enter clock-in and clock-out times, breaks
and overtime rules, then get weekly hours and pay and send or print a signed timesheet PDF.
Everything runs in the browser. There is no backend, no account, and nothing is uploaded.

- Product brief: [`docs/product-brief.md`](docs/product-brief.md)
- Keyword research: [`docs/research/round-1-keyword-scan.md`](docs/research/round-1-keyword-scan.md)
- Test report: [`docs/test-report.md`](docs/test-report.md)
- Spec gap analysis: [`docs/spec-v2-gap-analysis.md`](docs/spec-v2-gap-analysis.md) · Growth metrics: [`docs/growth-metrics.md`](docs/growth-metrics.md)

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
worker/index.ts        Worker entry: /api/* -> collector, everything else -> static assets
worker/collector.ts    growth-event collector (-> Workers Analytics Engine)
worker/admin/          /admin dashboard: page, token check, stats from Cloudflare APIs
wrangler.toml          Worker + static assets config, Analytics Engine binding
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

End-to-end browser QA. It needs Playwright and Chromium, and writes `docs/test-report-e2e.json`.
Run it against Cloudflare's local runtime, which also serves the `/api/e` Worker route, in two terminals:

```bash
npm run cf:dev
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
| `VITE_EVENTS_URL` | Where growth batches are sent. Empty means the built-in `/api/e` collector; `off` disables sending. See `docs/growth-metrics.md`. | `/api/e` |

## Deploying to Cloudflare (Workers free tier, connected to Git)
The site deploys as a **Cloudflare Worker with static assets**. Every page and file in `dist/` is served directly by Cloudflare
(static asset requests are free and don't run any code). The small Worker in `worker/` only runs for `/api/*`, which today is
just the growth-event collector `POST /api/e`. All of this is configured in `wrangler.toml`.

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository**, then pick **Ridexy/punchwise**.
2. Settings:
   - Project name: `punchwise` (must match `name` in `wrangler.toml`)
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`

   The Node version comes from `.nvmrc` (22). `wrangler.toml` connects the Analytics Engine dataset `punchwise_events`
   (binding `EVENTS`); it is created automatically on the first event.
3. After the first successful deploy, open the Worker's **Overview** or **Domains** tab and copy its address, which looks like
   `https://punchwise.<your-subdomain>.workers.dev`. Put it in `VITE_SITE_URL` in `.env.production` and push.
   It's used for canonical links, the sitemap, PDF footers, share cards and invites.
4. **Web Analytics** (page views): go to **Analytics & Logs → Web Analytics → Add a site**, choose the manual JS snippet,
   paste the token into `VITE_CF_BEACON_TOKEN` in `.env.production`, then push.
5. Check it: use the calculator, switch tabs, then confirm `POST /api/e 204` under the Worker's **Observability → Logs**.
6. Add the site to Google Search Console and submit `/sitemap.xml` (after the custom domain is connected is best).

**Later, with punchwise.com:** in the Worker's **Domains** tab, add `punchwise.com` as a custom domain, set
`VITE_SITE_URL=https://punchwise.com` and push.

**Free-tier note.** Only `/api/e` runs Worker code: one request per visit that triggers an event, sent when the visitor
leaves or switches away. It counts toward the Workers free daily request allowance. If that allowance runs out, only event
collection stops; the static site keeps working. Verified limits (Cloudflare docs, 2026-11-25): static assets free and
unlimited; Worker requests 100,000/day; Analytics Engine 100,000 data points/day (about 25k–50k calculator visits). See
`docs/growth-metrics.md`.

**Local check that matches production:**

```bash
npm run cf:dev
```

That builds and serves the site and the Worker on http://127.0.0.1:8788. To see exactly what Cloudflare would deploy:

```bash
npx wrangler deploy --dry-run
```

## Admin dashboard (`/admin`)
A private dashboard at **`/admin`** shows traffic (Cloudflare Web Analytics) and the growth loop (Analytics Engine events)
in one place: page views, visits, calculations, share rate, referral and invite conversion, top pages, referrers,
countries, and events by source, for the last 7, 30 or 90 days.

How it's protected: the page itself contains no data. Data comes from `/api/admin/stats`, which requires
`Authorization: Bearer <ADMIN_TOKEN>` (checked in constant time). Every response is `no-store` and `noindex`, the page
has a strict Content-Security-Policy, and it loads no third-party scripts. The Cloudflare API token never leaves the Worker.

**One-time setup** (Cloudflare dashboard → **Workers & Pages → punchwise → Settings → Variables and Secrets → Add**, type **Secret**):

| Secret | Value |
|---|---|
| `ADMIN_TOKEN` | Your dashboard password: 24+ random characters from a password manager. Don't reuse a password. |
| `CF_API_TOKEN` | A Cloudflare API token: **My Profile → API Tokens → Create Token → Create Custom Token**, permission **Account → Account Analytics → Read**, account resources = your account. |

`CF_ACCOUNT_ID` and `WA_SITE_TAG` are plain settings in `wrangler.toml`. Secrets survive redeploys, so you only set them once.
Then open `https://<your site>/admin` and enter the admin token. Tick "Remember on this device" only on your own computer.

If the traffic section shows "Web Analytics unavailable", the Web Analytics site tag may differ from the beacon token. Open
Cloudflare **Web Analytics**, click the site, copy the ID from the page address (`…/web-analytics/sites/<site tag>`), put it in
`WA_SITE_TAG` in `wrangler.toml` and push. The growth section works independently of this.

To rotate the admin token, change the `ADMIN_TOKEN` secret. Every saved login stops working at once.

## Search engine submission
- **Google:** add the site in Google Search Console and submit `/sitemap.xml`. Google does not use IndexNow.
- **Bing, Yandex, Seznam, Naver, Yep (IndexNow):** the key file `public/f5aee7761deb4bd0ac23fa26be528f70.txt` proves ownership.
  Keep it deployed and don't change its contents. Submit **only new or changed pages**, not the whole site on every deploy.
  Submissions so far were made through the OpenSEO "Punchwise" project. Anyone can also submit directly:

  ```bash
  curl -X POST https://api.indexnow.org/indexnow -H 'content-type: application/json' \
    -d '{"host":"punchwise.alriol92-ar.workers.dev","key":"f5aee7761deb4bd0ac23fa26be528f70","urlList":["https://punchwise.alriol92-ar.workers.dev/"]}'
  ```

- **After moving to punchwise.com:** the key file deploys with the site, so it works on the new host too. Submit the new URLs,
  and the old workers.dev URLs if they now redirect.

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
