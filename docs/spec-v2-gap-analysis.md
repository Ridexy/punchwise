# Owner specs vs the build: gap analysis (2026-11-25)

Sources: *Punchwise Master Build Specification* (11 pp.) and *Punchwise Viral Growth Engine* (6 pp.),
compared with the MVP already built. ✅ = already there, ➕ = added in this round, ⏸ = deferred, ✋ = changed or declined (reason given).

## Master Build Specification
| Spec item | Status | Notes |
|---|---|---|
| Stack (React, TS, Vite, Tailwind, Router, IndexedDB, Pages, Vitest, Playwright) | ✅ | |
| No backend, no paid APIs, no registration | ✅ | |
| Weekly grid **Monday to Sunday** | ➕ | The default week start changed from Sunday to Monday. It is still configurable. |
| Clock-in/out, unpaid break, 2nd and more shifts, blank days | ✅ | |
| **Typed time input**: 9, 930, 9:30, 5p, 1730, 12h/24h, with the interpreted time shown | ➕ | Replaced the native time pickers with a typed field. Bare hours in 12-hour mode are *flagged* ambiguous: the AM/PM chip turns amber and one tap flips it. The guess uses the other end of the shift (9 → 5 reads as 5 PM; 10 PM → 6 reads as 6 AM). Invalid input is rejected with a message and never counted. |
| Multiple breaks; paid breaks not deducted | ✅/✋ | Only unpaid breaks are entered, as one total per day. The page says to add several breaks together and not to enter paid ones. A per-break editor was judged not worth the extra typing on a phone; it can be added if users ask. |
| Overnight shifts, with the interpretation visible | ➕ | Shows "🌙 Ends the next day (date). Counted on <day>. Wrong? Check AM/PM." |
| Live totals: daily, weekly, **total break time**, h:mm, decimal, regular, OT, pay | ➕ | Total break time added. Everything else was already there. |
| Weekly/daily overtime, multiplier, week start, no double counting | ✅ | |
| **Different regular and overtime rates** | ➕ | Optional "Overtime rate" field that replaces rate × multiplier. |
| Currency choice; no tax / take-home pay | ✅ | |
| Calculation engine separate, integer minutes, unit tested | ✅ | The functions are named differently from the spec's list (`parseTimeInput`, `pairMinutes`, `dayMinutes`, `splitWeek`, `computePeriod`, `formatHM`, `formatDecimal`), but each listed responsibility is covered and tested. |
| H1 "Free Time Card Calculator" | ➕ | |
| Header: logo, Calculator, Tools, Help | ➕ | Tools jumps to the tool list and Help to the instructions. "My timesheets" was kept. |
| **Desktop: table with results panel beside it** | ➕ | Two columns from 1024 px up, with a sticky results and actions panel. Phones keep stacked day cards. |
| **Clear all + undo; Print; Copy totals**; CSV; PDF | ➕ | Clear all has an Undo toast (6 s). Print, and Ctrl+P, show only a clean timesheet. |
| Keyboard and screen-reader access | ✅ | Labels on every input, skip link, Escape closes dialogs, `aria-invalid` and live hints on time fields. |
| Additional tools | ➕/✋ | **Added:** `/time-duration-calculator/` (135k US searches/month, KD 17) and `/biweekly-time-card-calculator/`, which is calculator-backed with its own biweekly overtime explanation. **Already built:** hours worked (`/hours-calculator/`), overtime, decimal (`/time-to-decimal/`). **Declined as near-duplicates of the home page**, which the spec itself forbids ("Do not create duplicate pages…"): `/time-card-calculator/`, `/free-time-card-calculator/`, `/two-week-time-card-calculator/` (same as biweekly), `/time-card-calculator-with-lunch/`, `/time-card-calculator-with-overtime/`, `/time-card-calculator-decimal/`. The home page already covers those intents ("with lunch", "with overtime", "decimal") in one stronger page. |
| Route names | ✋ | Kept `/hours-calculator/` (301k searches) over `/hours-worked-calculator/` (135k, same Google group as "work hours calculator"), and `/time-to-decimal/` (18.1k) over `/decimal-hours-calculator/` (2.9k). Nothing is launched yet, so either is free to change. |
| SEO: titles, descriptions, H1, examples, FAQ, internal links, canonical, OG, sitemap, robots, breadcrumbs, structured data | ✅ | Worked examples are on every tool page. |
| Core Web Vitals | ➕ measured | Emulated Moto G4, 4× CPU throttle, slow 4G against the local server: LCP about 0.52–0.54 s, CLS ≤ 0.02. A full Lighthouse run wasn't possible here (see test report). |
| Monetisation tiers, privacy, i18n | ✅ | No payments. Analytics never see entries. Currency, 12/24 h and week start are configurable. |
| Deploy on Cloudflare Pages | ⏸ | Needs the owner's Cloudflare account. Steps are in `README.md`. |

## Viral Growth Engine
| Spec item | Status | Notes |
|---|---|---|
| **Privacy defaults**: no name, employer, pay or rate in shared content unless the user opts in | ➕ (was a conflict) | The first build put name, company and pay into "Send timesheet" links by default. Now the share sheet has two unticked boxes ("My name and company", "My pay rate and gross pay"). The link, message text and shared PDF all follow them. A drawn signature is only included when identity is ticked. |
| 1. Share results card: branding, totals, regular, OT, period, attribution, CTA | ➕ | A 1080×1080 PNG drawn in the browser, with "Calculate your own hours for free" and the site URL. It **never** shows names, employer or pay. |
| Native share, copy link, **copy summary text**, download PNG, print | ➕ | "Copy message text" in every share sheet; "Copy summary" on the card; Print in the actions panel. |
| 2. Shareable report, zero-backend | ✅ | Data travels in the URL fragment, which never reaches a server, and `/view/` is `noindex`. Server-hosted links with revocation and expiry are ⏸, as the spec says. |
| 3. **Invite a coworker**: WhatsApp, SMS, email, copy; editable message; no account | ➕ | The spec's suggested message is prefilled and editable, with a `?ref=invite` link. The spec's example used `punchwise.com`; the build uses the configured site URL, because no domain has been bought. |
| 4. Share with manager: print-ready, only selected info, disclaimer "not official payroll approval" | ➕ | The disclaimer is in the share sheet, on `/view/`, in the PDF and in the print view. |
| 5. Card templates: weekly / overtime / biweekly; exact hours vs a general message | ➕ | The headline adapts ("My week", "My two-week total", "I calculated my overtime"). There is a "Show my hours" / "General message" toggle. |
| 6. Embeddable calculator | ⏸ | Listed as "Next phase" in the spec's own priority order. |
| 7. Team invitation architecture | ✅ (lightweight) / ⏸ (accounts) | The team setup link already does employer → link → employees → submit to manager, without accounts. The data model (sheet + manager + employer) can grow into real teams without touching the calculation engine. |
| 8. Attribution analytics: 8 events, 5 attribution categories, no sensitive values | ➕ | `src/lib/track.ts`: event name + attribution category only, no cookies or IDs. Every outgoing link is tagged `?ref=` (the tag is removed from the address bar on arrival). **Collector built** (owner approved): `functions/api/e.ts` → Workers Analytics Engine, one batch per visit, strict allow-list, no IP or user agent stored. See [`growth-metrics.md`](growth-metrics.md). |
| 9. Natural placement, no interstitials | ➕ | "Need to send these hours to your manager? Share your report." above the send button. "Know someone who needs to calculate their hours? Share Punchwise." below the results. No pop-ups. |
| 10. Quality tests | ➕ | See the test report. The Web Share API can't run in headless browsers, so its fallbacks are tested instead. |
| 11. Success metrics spec | ➕ | [`growth-metrics.md`](growth-metrics.md) |
| No gamification or referral rewards | ✅ | |
