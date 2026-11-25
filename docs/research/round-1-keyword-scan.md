# Idea search, round 1: free-tool keywords with 10k+ monthly searches

Date: 2026-11-25
Status: **awaiting owner choice. No application code has been written.**

The owner abandoned HandoverProof (Option C) and set a new bar: **tens of thousands
of monthly searches**. This scan looks for that demand among free tools that keep the
original brief's strengths: free tool first, runs entirely in the browser,
privacy-first, PDF output, no backend, no paid APIs.

## Method and limits

- 130 candidate keywords in the US (English), pulled with OpenSEO `get_keyword_metrics`
  (Google Ads-derived volumes, no clickstream refinement), plus a page-1 SERP
  check for 6 shortlisted queries. Raw SERPs: [`serp-raw-2026-11-25.md`](serp-raw-2026-11-25.md).
- **US only.** UK, CA and AU volumes would add to these figures but were not pulled.
- I picked the candidate list myself, so ideas I didn't think of are not covered.
- Close variants may share volume (for example "merge pdf" and "pdf merge"), so cluster
  totals are approximate upper bounds.
- About 63 credits used this round; about 59 left.

## Clusters that clear 10k/month (US)

| Cluster | Main keywords (US/month, KD) | Cluster total | CPC | Browser-only fit | Verdict |
|---|---|---:|---:|---|---|
| **Work hours / time card** | hours calculator 301k (32), time card calculator 201k (32), work hours calculator 135k (22), overtime calculator 18.1k (0), timesheet template 6.6k (5) | **~660k** | $2.6–7.6 | Excellent | **Shortlist #1** |
| **Renter & landlord money tools** | rent affordability calculator 74k (30), rent calculator 40.5k (30), prorated rent calculator 18.1k (3), how much rent can i afford 14.8k (32), rent vs buy 12.1k (50), rent receipt 9.9k (0), rent receipt template 5.4k (2), rent split calculator 3.6k (0) | **~180k** | $0.4–6.1 | Excellent | **Shortlist #2** |
| Bill of sale | bill of sale 110k (30), car bill of sale 60.5k (24), bill of sale template 33.1k (18) | ~200k | $2.4–2.9 | Good (pdf-lib) | Not recommended: state-specific legal forms, the same problem that sank HandoverProof |
| Signature tools | signature generator 49.5k (38), sign pdf 18.1k (33), signature maker 14.8k (22), sign pdf free 9.9k | ~90k | $3.2–4.6 | Excellent (privacy angle) | Not recommended: DocuSign, Canva, Signaturely and other e-sign SaaS hold page 1 |
| Resignation letters | resignation letter 74k (10), two weeks notice letter 33.1k (1) | ~107k | $1.1–1.6 | Good | Thin product, low value |
| Invoices | invoice generator 165k (50), invoice template 90.5k (40), free invoice generator 40.5k (50) | ~300k | **$11–22** | Good | Most valuable and most contested; KD 50 |
| Image / PDF utilities | background remover 1.5M (66), heic to jpg 246k (41), image resizer 246k (59), jpg to pdf 201k (47), merge pdf 165k, compress pdf 135k (80) | huge | $1.3–2.3 | Excellent | Dominated by iLovePDF, Adobe, remove.bg and similar; KD 47–80 |
| Generic calculators | percentage 673k (33), date 550k (26), age 550k (40), tip 450k (18), GPA 823k (30), days between dates 90.5k (0) | huge | $0.2–5.8 | Excellent | Commodity, owned by calculator.net and timeanddate; no product moat |

Also measured but below the bar: moving checklist 12.1k, home inventory for insurance 140,
rent increase letter 880, security deposit return letter 260.

## Page 1 for the shortlist (US desktop, 2026-11-25)

**time card calculator / work hours calculator.** **Many small single-purpose sites
rank**: hourcard.net, timecardcalc.org, hoursclocked.com, timecardcalculatorgeek.com,
calcmyhours.com, timeclockcalculator.us, slbuddy.com, shiftflow.app, finrisetools.com,
chronoid.app, orioleflow.com. They sit alongside calculator portals (calculatorsoup,
calculator.net, omnicalculator) and SaaS lead magnets (Toggl, QuickBooks, ClickUp,
Harvest, When I Work). Most sites showed up in only 1 of 3 reads, so the
rankings are volatile. That means newcomers do get in, and it also means there are a lot of clones.

**rent affordability calculator.** Small calculator sites (x-calculator, todaycalculator,
tinyuseful.app, salarybrain, rovidev, mrsdowjones) rank next to the big portals
(Zillow, Apartments.com, Redfin, RentCafe).

**prorated rent calculator.** Small sites (offermarket.us at #1, proratingrent.com,
cznull.com, kelpic.com, shukrentals.com) rank next to landlord SaaS
(TurboTenant, RentSpree, Baselane, Landlord Studio, Rentvine).

**bill of sale template.** eForms, state-specific form sites and Pinterest. Every
result is per state.

**signature generator.** E-sign SaaS: Signaturely, Canva, DocuSign, SignEasy, SignWell.

## The brief's go criteria, re-applied

| Criterion | Work hours / time card | Renter & landlord tools |
|---|---|---|
| ≥ 3,000 relevant searches/month | Pass (~660k) | Pass (~180k) |
| ≥ 5 keywords ≥ 100/month | Pass | Pass |
| ≥ 3 queries where small sites rank | Pass (two SERPs full of them) | Pass (both SERPs) |
| Demand for an interactive tool, not just PDFs | **Pass: "calculator" is the query itself** | **Pass**: calculators, plus a receipt *generator* |
| Defensible difference | **Weak**: a crowded clone market | **Weak-to-moderate**: a hub of related tools beats a single calculator |

## Recommendation

**#1 Work-hours / time-card tool (~660k US searches a month).** This is the biggest
demand with beatable difficulty (KD 22–32), the clearest tool intent, and a high CPC ($7.61), which
shows business value. A free, browser-only weekly time card with breaks and overtime that
**exports a signed, printable timesheet PDF** and keeps past weeks on the device covers
what most clones don't: most of them stop at a number on screen.
*Risk:* dozens of near-identical sites. Ranking depends on quality and speed, and the
product moat stays thin.

**#2 Renter & landlord money tools (~180k).** This keeps the rental audience
from HandoverProof. It would be a small hub: rent affordability, prorated rent, rent split, and a rent
receipt PDF generator. Each tool answers a distinct search intent, which suits the brief's
"no near-duplicate pages" rule. *Risk:* big portals own the top term, and CPCs are low
($0.40–$2.70) except on landlord queries.

## Next steps (owner decides)

1. Pick #1, #2, or another direction.
2. With about 59 credits left: check UK/CA/AU volumes for the chosen cluster (about 16 credits per
   market), or see more SERPs (about 5 each).
3. After you pick, I'll write the revised product brief for approval before any code.
