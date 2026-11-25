# HandoverProof: Phase 0 keyword validation and go/no-go report

Date: 2026-11-25
Status: **CLOSED. The owner chose Option C (abandon) on 2026-11-25** because the niche is too small; the target is now tens of thousands of searches a month. The follow-up research is in [`../round-1-keyword-scan.md`](../round-1-keyword-scan.md).

## 1. Data sources and limits

- **Search volume, KD, intent, CPC, competition:** OpenSEO `get_keyword_metrics`
  (DataForSEO, derived from Google Ads). Average monthly searches, English.
  Clickstream refinement was **not** used, so close variants (plurals, word
  order) may share one figure.
- **SERPs:** OpenSEO `get_serp_results`. Google page 1, desktop. Each query was
  read 3 times and merged. One day only (2026-11-25), 10 queries.
  Raw extract: [`serp-raw-2026-11-25.md`](serp-raw-2026-11-25.md).
- **Markets checked:** United States, United Kingdom, Australia, Canada.
  Not checked: Ireland, New Zealand, India, South Africa, and other English-language markets.
- **Budget:** about 116 OpenSEO credits used, 122 left.
- Google Ads volumes come in buckets (10, 20, 30, 50, 70, 90, 110…). A "10" means
  "very low", not exactly ten. **Unknown** means the tool returned no row,
  which means no measurable volume in that market.
- Keyword difficulty (KD) is DataForSEO's 0–100 estimate. Most terms here are
  under 10, but that score tends to understate how hard a long-tail SERP really is.

## 2. Keyword metrics: the brief's 15 keywords

| Keyword | US | UK | AU | CA | US KD | US intent | US CPC |
|---|---:|---:|---:|---:|---:|---|---:|
| tenant move in checklist | 1,000 | 40 | 10 | 70 | 2 | informational | $1.91 |
| tenant move out checklist | 1,000 | 50 | 20 | 110 | 0 | informational | $0.98 |
| move in inspection checklist | 590 | 10 | 10 | 90 | 8 | informational | $2.17 |
| move out inspection checklist | 480 | 10 | 10 | 70 | 7 | informational | $1.50 |
| rental inspection checklist | 480 | 30 | 390 | 90 | 0 | informational | $2.12 |
| move in move out inspection form | 260 | 10 | unknown | 50 | 8 | transactional | $1.67 |
| property condition report template | 70 | 10 | 70 | 10 | 1 | informational | $5.79 |
| rental inspection report | 30 | 10 | 40 | 20 | 0 | informational | $4.74 |
| rental property condition report | 30 | 10 | 50 | unknown | 0 | informational | $5.34 |
| landlord inspection report | 10 | 10 | unknown | 10 | – | informational | $1.27 |
| rental inspection form pdf | 10 | 10 | 10 | unknown | – | navigational | $1.70 |
| rental inspection report template | 10 | 10 | 20 | 10 | 2 | informational | $6.30 |
| rental inventory report | 10 | 10 | unknown | unknown | – | navigational | – |
| **rental handover report** | unknown | unknown | unknown | unknown | – | – | – |
| **property inspection report generator** | unknown | unknown | unknown | unknown | – | – | – |

## 3. Local terms found in other markets

People outside the US search with different words. These were added during the research:

| Market | Keyword | Volume | KD | Note |
|---|---|---:|---:|---|
| AU | condition report | 590 | 18 | Unclear intent (cars and art also use this term) |
| AU | entry condition report | 320 | 22 | State statutory forms (QLD Form 1a and others) |
| AU | exit condition report | 260 | 5 | |
| AU | condition report template | 110 | 1 | |
| AU | ingoing condition report | 90 | 13 | |
| AU | routine inspection checklist | 50 | 0 | |
| CA | condition inspection report | 320 | 1 | British Columbia's statutory RTB form name |
| CA | move in inspection report | 70 | 10 | |
| UK | property inventory | 320 | 8 | SERP is mostly paid inventory *services* |
| UK | landlord inventory template | 210 | 0 | |
| UK | inventory report | 170 | 1 | |
| UK | inventory template | 170 | 9 | Mostly generic stock inventory, not rentals |
| UK | schedule of condition template | 110 | 0 | Partly commercial lease or construction intent |
| UK | check out report | 90 | 0 | |
| UK | property inventory template | 70 | 0 | |
| UK | check in inventory | 50 | 11 | CPC £15.31, so advertisers value it highly |

## 4. What ranks on page 1

| Query (market) | Page 1 is made of | Small specialist / tool sites ranking |
|---|---|---|
| tenant move in checklist (US) | Printable forms (sampleforms, Zillow PDF, eForms, US Legal Forms), property-manager blogs, Reddit, Pinterest, university housing PDFs | checklistgenerator.ai (#2), eauditor.app (#8), avail.com (#3), happy.co (#8) |
| tenant move out checklist (US) | **Mixed intent**: news ("steps when leaving a rental"), moving/storage firms, and landlord checklists | getrentcheck.com (#4), rentros.com (#7) |
| move in inspection checklist (US) | Fillable form sites (US Legal Forms, DocHub, pdfFiller, deedsign), state-specific form sites | **blog.reportwalk.com (#8, all 3 reads)**, leasebystate.com |
| move out inspection checklist (US) | Property-manager blogs, form sites, inspection software | blog.reportwalk.com (#2), loio.com (#1), flowdit.com, trychaser.com, foxinspect.com, getrentcheck.com |
| rental inspection checklist (US) | Legal-form sites (ILRG), template sites, PM software help pages | **blog.reportwalk.com (#9, all 3 reads)**, myinspections.com (#3), rentredi, lineagehq.com |
| move in move out inspection form (US) | Fill-and-sign PDF sites (DocHub #1, US Legal Forms #3), Pinterest, Facebook | landlordforms.io (#2) |
| landlord inventory template (UK) | Landlord associations (NRLA), OpenRent forum, councils, spreadsheet templates | lendlord.io (#3), rentalbux.com (#7), gridfox.com (#5) |
| property inventory (UK) | Paid local inventory clerks and InventoryBase (software, #1) | Services, not DIY tools |
| entry condition report (AU) | **State government regulators** (RTA QLD #1, Consumer VIC, NSW, WA) plus agency blogs | propertyinspectionmanager.com, formfinder.com.au |
| condition report template (AU) | Scribd copies of statutory forms, SA template | **conditionhq.app (#6)**: a free condition-report template app |

Most of these SERPs show an AI Overview. That pushes organic results down the page and answers "what to include" questions without a click.

## 5. Go criteria scored

| # | Proposed criterion | Result | Evidence |
|---|---|---|---|
| 1 | ≥ 3,000 combined relevant monthly searches across initial markets | **PASS** | The brief's 15 keywords total 3,990 in the US alone. Even without the two broad "tenant move in/out checklist" terms (mixed moving-house intent), the US core is 1,990. Add the clearly relevant local terms: AU entry/exit/ingoing condition report and templates plus rental inspection checklist (~1,240), CA (~920), UK landlord inventory/check-in/out templates (~430). That comes to roughly 4,500 relevant searches a month. |
| 2 | ≥ 5 relevant keywords with ≥ 100 searches/month | **PASS** | US: 6 keywords (1,000 / 1,000 / 590 / 480 / 480 / 260). AU adds 5, UK 4, CA 2. |
| 3 | ≥ 3 relevant queries where smaller specialist sites rank | **PASS** | reportwalk.com in 3 US SERPs. checklistgenerator.ai, eauditor.app, getrentcheck.com, rentros.com, loio.com, landlordforms.io, lendlord.io and conditionhq.app each appear on at least one. |
| 4 | Clear demand for an interactive generator, not only printable PDFs | **NOT MET** | The keywords asking for a generator have no measurable volume ("property inspection report generator": unknown; "rental handover report": unknown). Searchers ask for "checklist", "form" and "template", and page 1 is mostly printable or fill-and-sign PDFs. The only signs that interactive tools are wanted are indirect: fill-and-sign sites (DocHub, pdfFiller) rank, and a few app companies rank with blog posts. **No keyword data shows that searchers want a generator.** |
| 5 | A defensible product difference | **WEAK** | Free or freemium tools already exist: ConditionHQ, ReportWalk, eAuditor, RentCheck, InventoryBase (UK, paid). The planned differences are no sign-up, photos kept on the device, and a free move-in vs move-out comparison. They are real, but easy to copy, and none is a search term. This is a judgement, not something keyword data can show. |

## 6. Other findings that affect the plan

1. **"Handover" has no search demand.** The product name is fine as a brand, but
   `/rental-handover-report/` targets a query with no measurable volume. The same goes for
   `/rental-inspection-form-pdf/` (10/month) and `/landlord-inspection-report/` (10/month).
2. **The demand is in "checklist" terms, not "report" terms.** Of the eight planned SEO
   routes, only `/move-in-inspection-checklist/`, `/move-out-inspection-checklist/` and
   `/rental-inspection-checklist/` target meaningful volume.
3. **The biggest non-US queries are statutory forms.** "Entry condition report"
   (AU) and "condition inspection report" (BC, Canada) are government forms, and
   regulators rank #1. The brief says the product must be jurisdiction-neutral and
   "not a purported statutory form", so it cannot fully serve these searchers. It
   could still link to the official forms and help people fill them in.
4. **The UK market buys services.** "Property inventory" SERPs are paid inventory clerks,
   and a CPC of £15 for "check in inventory" shows commercial value, but it is a
   different buyer (agents) from a free DIY tool.
5. **The traffic is small and cheap.** US CPCs of $1–$6 and a total of about 4,000
   searches a month put the realistic ceiling at hundreds to low thousands of
   visits a month, even with good rankings. That suits a lean free tool, not a
   venture-scale SaaS.

## 7. Verdict

**Strictly applying the brief's own criteria, this is a NO-GO as specified:**
criterion 4 is not met and criterion 5 is weak. Per the brief, the full
application should not be built on this evidence.

The demand that does exist is real, low-competition and checklist-shaped,
and small sites do rank. So instead of just abandoning, there are three options:

### Option A: Narrowed GO, checklist-first (recommended)
Re-scope the MVP around what people actually search for: a **free interactive
move-in / move-out inspection checklist** that you fill in room by room on a
phone, add photos to, and export as a PDF, with the move-out comparison built
on the same data. Same tech stack and privacy rules as the brief, but:
- SEO routes: `/move-in-inspection-checklist/`, `/move-out-inspection-checklist/`,
  `/rental-inspection-checklist/`, `/tenant-move-in-checklist/`,
  `/tenant-move-out-checklist/`, `/move-in-move-out-inspection-form/`.
  Drop `/rental-handover-report/`, `/rental-inspection-form-pdf/` and
  `/landlord-inspection-report/` as standalone pages.
- Each page still gives a printable PDF version, because that is what most searchers want,
  and the interactive tool is offered next to it.
- Treat criterion 4 as **the experiment**: measure how many visitors start the
  interactive tool rather than just downloading the PDF. Set a kill threshold before launch.

### Option B: Pivot to another keyword cluster
- **AU condition reports** (~780/month across entry/exit/ingoing/template, or ~1,370 counting the ambiguous "condition report").
  These are statutory, state-specific forms, so it would mean a state-aware helper,
  which conflicts with "jurisdiction-neutral".
- **UK landlord inventory / check-in / check-out** (~600/month across inventory templates and check-in/check-out reports).
  Higher commercial value, but incumbents like InventoryBase already sell software there.
- Both are smaller than the US checklist cluster and add legal complexity.

### Option C: Abandon
This is reasonable if a few thousand visits a month at best, in a crowded field
of free templates, is not worth the build.

## 8. Questions for the owner before Phase 1

1. Approve **Option A**, **B** or **C**? Or ask for more research first.
   About 122 OpenSEO credits are left. That covers roughly 7 more market checks or 24 more SERPs.
2. If A: do you accept the changed SEO route list in §7?
3. If A: what kill threshold for the interactive-tool experiment (for example,
   "under X% of checklist-page visitors start a report after 90 days")?
