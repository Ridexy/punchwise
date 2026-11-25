# Punchwise MVP: test report

Date: 2026-11-25 · Build: originally `idea-to-content/timecard/` (branch `claude/trusting-meitner-xkxyiv`), now this repo

**Result (round 3, growth-event collector added): 65/65 unit tests and 78/78 browser tests pass. The browser suite was run against
Cloudflare's local Pages runtime (`wrangler pages dev`, workerd), so Pages routing (404 page, trailing-slash redirects) and the `/api/e` function were exercised too.**

### Round 3: growth-event collector (`/api/e`)
| Check | Result |
|---|---|
| Unit: strict allow-list (unknown events/sources, non-integer, zero, arrays, junk, >1 KB rejected; counts capped at 50) | Pass |
| Unit: one data point per event, `blobs [event, attribution]`, `doubles [count]`, `indexes [event]` | Pass |
| Unit: IP and user-agent headers never stored; cross-site → 403; GET → 405; no binding → 204; failing write → 204 | Pass |
| Runtime: `wrangler pages dev` recognised `env.EVENTS (punchwise_events) Analytics Engine Dataset`; curl checks 204/405/403 | Pass |
| Browser: one beacon per visit when the page is hidden, containing only `a` and `e`; name and times absent; attribution `coworker_invitation` from `?ref=invite` | Pass |
| Not verified: real writes landing in Cloudflare's hosted Analytics Engine and the SQL read API (needs your account); current free-tier limits (Cloudflare's docs couldn't be reached from here) | Pending deploy |

Earlier round-2 result: 56/56 unit and 77/77 browser tests.
Not yet tested on real phones, or on Safari/WebKit (see §3). What changed in round 2: [`spec-v2-gap-analysis.md`](spec-v2-gap-analysis.md).

### Round 2 additions, all tested
| Feature | Tests |
|---|---|
| Typed time input (9, 930, 9:30, 9.30, 5p, 1730, 12a…), ambiguity flag, AM/PM guess and toggle, invalid input rejected | 17 unit + 4 browser |
| Monday-first week | 1 unit + 1 browser |
| Separate overtime rate | 2 unit + 1 browser ($35/h OT → $1,106.25) |
| Total break time | 1 unit + 1 browser |
| "Ends next day" overnight note | 2 browser |
| Clear all + Undo, Copy totals, Print view (print media emulated) | 3 browser |
| **Share privacy defaults**: the link carries hours only until the user ticks name/company or pay; opening it in another browser shows no name, company or pay | 2 unit + 2 browser |
| PNG share card 1080×1080, general-message mode, summary contains no `$`, name or company | 1 browser |
| Invite a coworker: editable message reaches the WhatsApp link; no hours included | 1 browser |
| Attribution classification + `?ref` tagging, tag removed from the address bar on arrival | 2 unit + 2 browser |
| Desktop results panel beside the timesheet; header Tools/Help | 2 browser |
| `/biweekly-time-card-calculator/` (week-by-week OT: 50 h → 10 h OT) and `/time-duration-calculator/` (Mon 8:00 → Wed 17:30 = 57:30; 20:00 + 7:45 = 3:45 AM +1 day) | 2 browser + layout checks on 3 viewports |

Bugs found by the round-2 tests and fixed: the `?ref` tag was only removed on calculator pages (now removed site-wide);
the invite message box could show empty for its first frame (it now starts from the message immediately).
Test-only mistakes fixed: a wrong expected time (3:45 not 4:45 AM), a checkbox selector that ticked the wrong box, and stale labels and indexes after the Monday-first change.

### Performance (Core Web Vitals, measured)
Playwright with the Moto G4 profile, 4× CPU throttle and slow-4G network emulation, against the local preview server:
`/` LCP 536 ms, CLS 0.019 · `/overtime-calculator/` LCP 532 ms, CLS 0.000 · `/time-to-decimal/` LCP 516 ms, CLS 0.000.
Lighthouse itself could not be run: downloading it on the fly was blocked by this environment's permission policy. Run it
against the deployed Cloudflare URL (PageSpeed Insights) after launch.

---
*Round 1 results follow.*

## 1. Unit tests: `npm test` (Vitest), 41 passed, 0 failed
| Area | What is covered |
|---|---|
| Time parsing | Valid and invalid `HH:MM`, 12h ("7:30 PM", "12am", "7p"), military ("1930", "730"), durations ("7:45", "7h 45m", "7.75") |
| Shifts | Normal, overnight (22:00 → 06:00), ending at midnight, identical times, incomplete pairs |
| Rounding | Nearest 5/6/10/15 min per punch, halves round up |
| Days | Split shifts with a break, break longer than the shift (never negative), empty days |
| Overtime | Weekly 40, daily 8 / double 12, daily+weekly without double counting, none, custom 37.5 h |
| Periods | Biweekly applies the weekly threshold **per week** (50 h + 30 h → 10 h OT, not 0), pay rounding to cents, warnings |
| Dates | Week start, month/year rollover, leap day |
| Share links | Biweekly round trip, custom rules, link length < 1,000 chars, garbage rejected, signatures excluded |
| Team links | Round trip |
| PDF | Weekly Letter = 1 page; biweekly A4 with 6 shifts/day breaks across pages; empty sheet; non-Latin names do not crash; signatures embed; blank weekly/biweekly × Letter/A4 each fit 1 page |
| CSV | Header, one row per day, totals, spreadsheet-formula injection neutralised |

## 2. Browser tests: `npm run e2e` (Playwright/Chromium against the production build), 55 passed, 0 failed
Raw results: [`test-report-e2e.json`](test-report-e2e.json)

| Brief QA item | Test(s) | Result |
|---|---|---|
| Mobile responsiveness | Every page at iPhone SE (375 px), Pixel 7 and desktop 1280 px: no horizontal scroll, no console or hydration errors (27 checks) | Pass |
| Offline | Service worker installed; offline, the tool pages load, the calculator works and a PDF still downloads | Pass |
| Local data persistence / browser refresh recovery | Entries and name survive a reload (IndexedDB) | Pass |
| Project export and import | Backup download → delete → restore → same count | Pass |
| PDF page breaks / long text / empty fields | Covered by the unit tests above; a downloaded PDF is valid with the correct filename | Pass |
| PDF quality | Inspected visually (rendered with pdftoppm): table, totals, signature, disclaimer, clickable footer link | Pass (manual) |
| Multiple shifts / overnight | Split shift 8:30, overnight 8:00, "Same as Wednesday" copy | Pass |
| Overtime | Weekly: 48:45 → $1,062.50 at $20. Daily+weekly: a 13 h day → 1 h double time → $1,102.50 | Pass |
| Signature drawing | Mouse-drawn signature captured; supervisor signature on the shared view | Pass |
| Keyboard accessibility | Skip link first, calculator inputs reachable by Tab, Escape closes dialogs | Pass |
| Image compression | Not applicable: this product has no photos (HandoverProof requirement) | n/a |
| **Sharing loop 1** (worker → manager) | `/view/#d=` link generated, WhatsApp and email links present; opened in a separate browser it shows identical totals and pay; supervisor signs and downloads the PDF; broken link shows a helpful message | Pass |
| **Sharing loop 2** (manager → team) | Team link created; employee opens it in a fresh browser → company prefilled, "Send to Sam" button, fragment cleared | Pass |
| **Sharing loop 3** (branded artefacts) | PDF footer link plus "Made with Punchwise" on the shared view (visual check) | Pass (manual) |
| **Sharing loop 4** (result links) | Hours and decimal tool pages restore their inputs from the link | Pass |
| Tool pages | Hours 9:00–17:30 − 30 = 8:00; overtime $20 × 46 h = $980; 8:20 = 8.33; 7:30 PM = 1930, 0005 = 12:05 AM; blank biweekly A4 PDF | Pass |
| SEO rendering | With JavaScript **disabled**, pages show their H1, body content and canonical link | Pass |

Failures found and fixed along the way. All were test mistakes; no app bugs were found by these tests:
1. The daily-overtime test assumed different pay, but the chosen week really does give equal pay under both rules. It now uses a 13 h day.
2. Two tests clicked paragraph text instead of buttons, because Playwright `text=` matches substrings. They now target buttons by role.
3. The backup test counted the footer's link list as saved timesheets. Saved items now have a test id.
4. Changing only the `#fragment` of an already-open tool page didn't update it. Real recipients open a fresh page, but tool pages now also listen for `hashchange`.

## 3. Not tested / remaining limitations
- **Real devices and Safari (iOS WebKit) have not been tested.** Only Chromium device emulation was used. The brief says the MVP is not complete until report generation works reliably on mobile, so **this must be checked on a real iPhone and Android phone before launch**. iOS Safari is the biggest risk for the native time picker, file downloads and the share sheet.
- **Native share sheet / sharing PDF files** (Web Share API) can't be exercised in headless browsers. The fallbacks (copy, WhatsApp, email, SMS, download) are tested.
- **PDF characters:** the built-in PDF fonts only cover Latin characters. Names in other scripts (for example 李, عربى) appear as "?" in the PDF but display correctly on screen. The fix is to embed a Unicode font (about 300 KB+, loaded only when needed).
- **Not deployed yet:** this needs your Cloudflare account (see `README.md`). The analytics token comes from the Cloudflare dashboard.
- **Name:** domain and trademark availability for "Punchwise" could not be checked from this environment.
- **Rules out of scope:** take-home pay after tax, California's 7th-consecutive-day rule, meal-penalty pay, shift differentials, and holiday rates.
- Shifts that cross midnight count on the day they started.
- Switching biweekly → weekly drops week 2's entries from that sheet.
- Drawn signatures travel only in PDFs, never in links (to keep links short and private).
- Bundle size: the app shell is about 96 KB gzipped. The PDF library (about 180 KB gzipped) loads only when a PDF is made.

## 4. Recommended next steps (to validate with real usage, not assumptions)
The brief asks for next features "based on actual user feedback", and there is none yet. These are the first things to measure after launch:
1. **Does the loop work?** Compare `/view/` visits with home-page visits in Cloudflare Web Analytics. Count team links opened (`/` visits with a referrer from a messaging app).
2. **Search Console:** which of the 6 pages get impressions? Expand the winners, for example state-specific overtime pages, but only where the intent really differs.
3. **Likely early requests** to watch for: a Unicode PDF font, a multi-employee view for managers (a candidate paid tier), reminders to clock out, and take-home pay.
