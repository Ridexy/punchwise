# HourTally: free time card calculator

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
src/components/        calculator, share sheet, signature pad, UI kit
src/pages/             one file per route
scripts/prerender.mjs  static HTML for every route + sitemap.xml + robots.txt + 404.html
scripts/sw.mjs         offline service worker (runs after prerender)
scripts/e2e.mjs        browser QA suite (Playwright)
scripts/icons.mjs      regenerates PNG icons and og.jpg
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

End-to-end browser QA. Run it against a running `npm run preview`. It needs Playwright and Chromium,
and writes `../docs/timecard/test-report-e2e.json`.

```bash
npm run e2e
```

## Environment configuration
Copy `.env.example` to `.env` locally, or set these as Cloudflare Pages environment variables.
Both are read **at build time**.

| Variable | Purpose | Default |
|---|---|---|
| `VITE_SITE_URL` | Public URL with no trailing slash. Used for canonical tags, sitemap, Open Graph tags and the PDF footer link. | `https://hourtally.pages.dev` |
| `VITE_CF_BEACON_TOKEN` | Cloudflare Web Analytics token. Empty turns analytics off. The token is public by design. | empty |

## Deploying to Cloudflare Pages (free tier)
1. Push this repository to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**, then pick the repo.
3. Build settings:
   - Framework preset: **None**
   - Root directory: **`timecard`**
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**
   - Environment variable: `NODE_VERSION` = `22`
4. Add `VITE_SITE_URL` = your Pages URL (for example `https://hourtally.pages.dev`), or your custom domain once you have one.
5. **Analytics:** go to **Analytics & Logs → Web Analytics → Add a site**, choose the manual JS snippet,
   copy the token from the snippet, and set it as `VITE_CF_BEACON_TOKEN`. Redeploy.
   (Cloudflare can also inject the beacon automatically for Pages sites. Use one method only.)
6. Deploy. Pages serves `dist/404.html` for unknown URLs, and the `_headers` file sets caching and security headers.
7. After the first deploy: add the site to Google Search Console and submit `/sitemap.xml`.

Every push to the production branch redeploys. Pull requests get preview URLs automatically.

**Custom domain:** if you buy one, set it under **Custom domains** in the Pages project, then update
`VITE_SITE_URL` and redeploy so canonical URLs, the sitemap and PDF links use it.

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
