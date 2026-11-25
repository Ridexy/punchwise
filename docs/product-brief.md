# Time card tool: product brief (v1, for approval)

Date: 2026-11-25
Status: **APPROVED by the owner on 2026-11-25, with one addition: a built-in sharing loop (§3a). MVP built; see [`test-report.md`](test-report.md).**
Code lives in this repository (moved from `idea-to-content/timecard/` with its history on 2026-11-25). Cloudflare Web Analytics: on at launch (owner approved).
Name: **Punchwise** (renamed from the working name HourTally, whose .com turned out to be registered). punchwise.com is available; the owner will buy it later. Launching on the free Cloudflare subdomain punchwise.pages.dev for now. Claude buys nothing.

The research behind this choice is in [`research/round-1-keyword-scan.md`](research/round-1-keyword-scan.md).
The engineering rules carry over from the HandoverProof brief: browser-only, privacy-first,
no backend, no paid APIs, no payments in the MVP, and no claim that a feature works until it has been tested.

## 1. Demand map (US, OpenSEO, 2026-11-25)

Google Ads gives some spelling variants exactly the same figure. "time card" and
"timecard" are both 201k, for example. Those are **one** demand counted twice, so they are listed together.

| Search intent | Keywords (US/month, KD) | Page that serves it |
|---|---|---|
| Weekly time card with clock-in/out | time card / timecard calculator 201k (32), time clock calculator 135k (33), time sheet / timesheet calculator 74k (33), clock in calculator 22.2k (32), payroll hours calculator 8.1k (33), time card calculator with lunch 6.6k (11), biweekly time card calculator 1.3k (6) | `/` (home) |
| Hours between two times, one shift | hours calculator 301k (32), work hours / hours worked calculator 135k (0–22), how many hours did i work 4.4k (0), shift calculator 3.6k (30) | `/hours-calculator/` |
| Overtime pay | overtime calculator 18.1k (0), time and a half calculator 14.8k (0), overtime pay calculator 5.4k (4), double time calculator 390 | `/overtime-calculator/` |
| Converting minutes to decimal hours for payroll | minutes to decimal / time to decimal calculator 18.1k (0), hours to decimal 6.6k (0), decimal hours 2.9k (2) | `/time-to-decimal/` |
| Military (24-hour) time | military time converter 135k (24), military time calculator 2.4k (0) | `/military-time-converter/` |
| Printable / PDF timesheet | time sheet 14.8k (33), timesheet template 6.6k (5), weekly timesheet template 1.3k, time card template 1k, free printable time sheets 880, time sheet pdf 590, biweekly timesheet template 210 | `/printable-timesheet/` |

These six pages target roughly 1M US searches a month. That is an upper bound, because Google Ads groups close variants.

**Deliberately not targeted in the MVP:**
- **time calculator (673k), time duration calculator (135k).** Generic time arithmetic owned by timeanddate and calculator.net. `/hours-calculator/` covers the overlap.
- **hourly paycheck calculator (40.5k).** Searchers expect take-home pay after tax. That means federal and 50 state tax tables, which are a maintenance and accuracy risk. The MVP shows gross pay only.
- **time card (27.1k, transactional).** Probably physical punch cards and time clocks.

## 2. Product

**Promise:** "Enter your hours, get your total and pay, then print a signed timesheet. Free, no sign-up, and nothing leaves your device."

**Users:** hourly workers checking their pay, small-business owners and
supervisors totalling staff hours for payroll, freelancers and contractors billing by the hour.

**Where it beats the many clone sites already ranking** (most of them stop at a total on screen):
1. **Printable, signable timesheet PDF.** A4 and US Letter, with employee and supervisor signature lines and an optional drawn signature.
2. **Remembers past weeks on the device**, with "copy last week" so a repeat week is one tap.
3. **"Punch now" buttons** on a phone record the current time as clock-in or clock-out.
4. **Handles the hard cases correctly:** overnight shifts past midnight, split shifts, several breaks, daily overtime and double time.
5. **Shows totals in HH:MM and in decimal hours**, the number payroll systems ask for.

## 3. MVP features

### Home: time card calculator (`/`)
- Weekly or biweekly period, a chosen week start day, and a 12h or 24h clock.
- For each day: one or more in/out pairs (split shifts) plus unpaid break minutes, or break punches.
- Shifts that cross midnight count correctly.
- Optional rounding to the nearest 5, 6, 10 or 15 minutes, labelled "match your employer's policy". Off by default.
- Daily and period totals in HH:MM and decimal.
- Pay: hourly rate, plus overtime rules the user can change. Presets: *weekly over 40 h at 1.5×* (the US federal default), *daily over 8 h at 1.5× and over 12 h at 2×*, and *none*. Custom thresholds and multipliers are allowed. Gross pay only.
- "Punch now", "copy previous day", "copy last week", "clear day".
- Export a PDF timesheet and a CSV.
- Large touch targets; it must be usable with one thumb on a 360 px wide phone.

### Supporting pages
Each has its own working tool, written content, an FAQ, internal links and a link to the main calculator:
- `/hours-calculator/`: start time, end time and break for a single shift, giving hours in HH:MM and decimal.
- `/overtime-calculator/`: regular hours, overtime hours, double time and rate, giving the pay breakdown.
- `/time-to-decimal/`: two-way minutes/HH:MM ↔ decimal converter, plus a printable 0–60 minute conversion chart.
- `/military-time-converter/`: two-way 12h ↔ 24h converter, plus a full 24-hour chart.
- `/printable-timesheet/`: blank weekly and biweekly timesheet PDFs, or a pre-filled one from the main calculator.

### 3a. Sharing loop (added at owner's request)
The aim is for the product to spread itself, without accounts, a backend or tracking. Every
loop below works through links and files the user chooses to send.

**Loop 1: worker → manager → whole team (the main loop).**
1. A worker fills in their week and taps **Share** → **"Send to my manager"**.
2. That creates a link to a **read-only timesheet view** (`/view/#…`). The whole
   timesheet is compressed into the URL *fragment*. Browsers never send the fragment to a server, so the data
   still never leaves the devices involved.
3. The manager opens it and sees the totals, the pay and a "Download PDF" button, plus a clear call to action:
   **"Collect timesheets from your whole team: set up a team link."**

**Loop 2: manager → employees (team setup link).**
1. A manager sets the company name, pay period, week start day, overtime rule and rounding once,
   and taps **"Create team link"** (`/#setup=…`, also in the fragment).
2. Every employee who opens it gets the calculator with those settings already applied. When they are done,
   **"Send to [manager name]"** creates a Loop 1 link back to the manager.
3. Each employee is a new user. Each team setup brings in N users at once.

**Loop 3: the artefacts carry the brand.**
- Every PDF timesheet has a small footer: *"Calculated with [Name], free time card calculator,
  [URL]"*, with a clickable link. Timesheets get printed and handed to payroll, so every copy advertises the tool.
- Every shared view shows "Made with [Name]: make your own in 1 minute".

**Loop 4: shareable results on the tool pages.**
- The hours, overtime, decimal and military-time pages keep their inputs in the URL fragment, so
  "Copy link to this result" reproduces the calculation for whoever opens it.

**Mechanics**
- On phones, the native share sheet (Web Share API) shares the link or the PDF file. On desktop, the fallback
  is copy link, email (`mailto:`), SMS (`sms:`) and WhatsApp (`https://wa.me/?text=`).
- The share sheet states plainly: *"Anyone with this link can see this timesheet."*
- No referral tracking or IDs. If the owner turns on cookie-free analytics, it counts visits to `/view/`
  and team-link opens by *path* only, which is enough to see whether the loop works.
- Each link has a format version number, so old links keep opening after updates.

### Saving and privacy
- IndexedDB stores periods, the employee/employer names used on the PDF, and settings.
- Past periods can be listed, reopened, duplicated and deleted. Everything can be exported or imported as a JSON backup.
- A plain warning that clearing browser data deletes saved timesheets.
- Nothing is sent to a server. Analytics are optional Cloudflare Web Analytics (free and cookie-free); the owner decides.

### Offline
- A PWA service worker, so the calculator works offline after the first visit and can be added to the home screen.

### SEO basics (from the original brief)
- **Prerender every route to static HTML at build time**, so pages are indexable without JavaScript running.
- Unique title, meta description and a single H1 on every page. Also canonical URLs, Open Graph tags, sitemap.xml, robots.txt, breadcrumbs, and correct heading order.
- Structured data only where it fits (`FAQPage` is no longer shown as rich results, so it is low priority; `WebApplication` and `BreadcrumbList` are fine).
- No near-duplicate pages. Each page answers one distinct search intent from §1.

### Legal and wording
- Never claim compliance with FLSA or any state law. Overtime presets are labelled as common rules with "check your local law and employer policy".
- A PDF signature is a record of acknowledgement, not a certified e-signature.
- Footer disclaimer: estimates only, not payroll, tax or legal advice.

## 4. Out of scope for the MVP (designed so they can be added later)
Take-home pay after tax, multiple employees, a team or manager dashboard, cloud sync, accounts,
a live running timer with notifications, branded PDFs, payments, and ads.
Possible paid tier later: multi-employee payroll export, cloud backup, branded timesheets.
Possible ad revenue later: CPCs of $4–8 on the core terms. That is a decision for after traffic exists.

## 5. Tech stack
React + TypeScript + Vite + Tailwind + React Router, prerendered with a static-generation step
(for example `vite-react-ssg`, chosen at build time after a spike). IndexedDB (through the `idb` wrapper), pdf-lib,
a PWA service worker (`vite-plugin-pwa`), Vitest for the time-calculation logic, Playwright for mobile and
end-to-end checks, Cloudflare Pages free tier, and GitHub.

The time arithmetic lives in one pure, fully unit-tested module, because getting it right is the product.

## 6. Build plan (each step tested before the next)
1. Calculation core: parsing, midnight crossing, breaks, rounding, overtime rules, decimal conversion. Unit tests cover the edge cases.
2. Main calculator UI, mobile-first, plus local saving.
3. PDF and CSV export (A4/Letter, long weeks, biweekly), and signatures.
3a. Sharing loop: share links, the read-only `/view/` page, team setup links, the PDF footer, the share sheet.
4. The four supporting tool pages and the printable timesheet page.
5. Prerendering, SEO files, PWA/offline.
6. QA pass (mobile viewports, keyboard, offline, refresh recovery, export/import) and a written test report.
7. README with Cloudflare Pages deployment instructions. The owner connects the repo; I won't activate anything paid.

## 7. How we judge it after launch (owner to confirm)
Measured in Google Search Console. A proposed check 6 months after the pages are indexed:
**at least 1,000 organic clicks a month**, or a clear upward trend in impressions
for the core terms. Otherwise, re-assess. That is a proposed threshold, not a forecast.

## 8. Decisions needed before coding
1. Approve this brief, or tell me what to change.
2. **Where should the code live?** In a new folder in this repo (`timecard/`, easy to move out later),
   or in a new GitHub repo you create and add to this session?
3. A name, now or later. (Code can start with a placeholder.)
4. Cloudflare Web Analytics on launch: yes or no?
