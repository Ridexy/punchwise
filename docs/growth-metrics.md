# Punchwise growth measurement spec

This is what we measure, how, and what stays private. Implemented in `src/lib/track.ts` and `worker/collector.ts`.

## Principles
- Only an **event name** and an **attribution category** are ever sent. Never time entries, names, employers,
  pay rates, pay, share-link contents or anything else the user typed.
- No cookies, no user IDs, no fingerprinting. Attribution is kept in `sessionStorage` for one visit only.
- No claim that a share "caused" a visit unless that visit arrived with a matching `?ref=` tag or `/view/` path.

## Attribution: how a visit is classified (first page of the visit)
| Category | Rule |
|---|---|
| `shared_result` | URL has `?ref=share`, `?ref=card`, `?ref=pdf` or `?ref=team`, or the path is `/view/` |
| `coworker_invitation` | `?ref=invite` |
| `embedded_calculator` | `?ref=embed` (reserved for the future embed) |
| `organic_search` | The referrer is a search engine (Google, Bing, DuckDuckGo, Yahoo, Ecosia, Yandex, Baidu, Brave, Startpage, Qwant) |
| `direct` | No referrer, or our own site |
| `other_referral` | Any other referring site |

Where the tags come from: the manager share link (`/view/?ref=share#…`), the share-card summary (`/?ref=card`),
the PDF footer link (`/?ref=pdf`), the team setup link (`/?ref=team#setup=…`) and the coworker invite (`/?ref=invite`).
The tag is removed from the address bar as soon as the page loads, so it doesn't get copied onward.

Caveat: messaging apps often hide the referrer, so `?ref` tags are the reliable signal and the referrer is only a fallback.

## Events
| Event | Fires when |
|---|---|
| `calculator_opened` | The calculator finishes loading (once per visit) |
| `calculation_completed` | The first warning-free total above zero in a visit (once per visit) |
| `share_button_clicked` | "Share your report" / "Send to …" or "Share my week" is opened |
| `share_link_copied` | Copy link, copy message or copy summary is used |
| `share_card_downloaded` | The share card PNG is downloaded or shared |
| `report_exported` | PDF, CSV or Print |
| `invite_clicked` | "Share Punchwise" (invite a coworker) is opened |
| `embed_code_copied` | Reserved for the embeddable calculator (not built yet) |

## Metrics
| Metric | Formula |
|---|---|
| Share rate | visits with ≥1 `share_button_clicked` ÷ visits with `calculation_completed` |
| Share actions per completed calculation | (`share_link_copied` + `share_card_downloaded` + `report_exported`) ÷ `calculation_completed` |
| Referral visit rate | visits attributed `shared_result` or `coworker_invitation` ÷ all visits |
| Referral-to-calculation conversion | `calculation_completed` with attribution `shared_result`/`coworker_invitation` ÷ visits with that attribution |
| Invitation conversion | `calculator_opened` with `coworker_invitation` ÷ `invite_clicked` |
| Embed referral traffic | visits attributed `embedded_calculator` (after the embed ships) |
| Organic traffic | visits attributed `organic_search`; cross-check with Google Search Console |
| Repeat usage | Not measurable without IDs, by design. Proxy: Search Console branded queries, and `direct` visits that complete a calculation |
| **Key growth measure** | new attributable visits (`shared_result` + `coworker_invitation`) ÷ `calculation_completed`, over the same period |

## How it is collected
- **Browser** (`src/lib/track.ts`): counts events in memory and sends **one** JSON batch per visit with
  `navigator.sendBeacon`, when the page is hidden or closed: `{"a":"<attribution>","e":{"<event>":<count>,…}}`.
  There's no request while the calculator is being used. `VITE_EVENTS_URL=off` disables it.
- **Collector** (`worker/collector.ts`, served by the Cloudflare Worker at `POST /api/e`):
  - accepts same-site posts only (403 otherwise) and POST only (405 otherwise);
  - validates every key and value against the allow-lists in `src/lib/events.ts` and caps counts at 50, silently dropping anything else;
  - writes one Analytics Engine data point per event: `blob1` = event, `blob2` = attribution, `double1` = count, `index1` = event;
  - **never** reads or stores the IP address, user agent, cookies or any other header;
  - returns 204 even when the dataset is missing or a write fails, so analytics can't break the site.
- **Storage:** Workers Analytics Engine dataset `punchwise_events`, bound in `wrangler.toml`.
- **Page views:** Cloudflare Web Analytics (cookie-free), separately.

## Reading the numbers
The easiest way is the **admin dashboard at `/admin`** (setup in the README). It computes every metric below.
To query directly instead:
Analytics Engine is queried with SQL over HTTPS. Create an API token with **Account Analytics: Read**, then:

```bash
curl "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -d "SELECT blob1 AS event, blob2 AS source, SUM(_sample_interval * double1) AS n
      FROM punchwise_events WHERE timestamp > NOW() - INTERVAL '30' DAY
      GROUP BY event, source ORDER BY n DESC"
```

`_sample_interval` corrects for Analytics Engine's sampling at high volume, so always multiply by it.
Useful cuts:
- **Share rate:** `share_button_clicked` ÷ `calculation_completed` (all sources).
- **Referral-to-calculation conversion:** `calculation_completed` ÷ `calculator_opened`, filtered to `source IN ('shared_result','coworker_invitation')`.
- **Key growth measure:** `calculator_opened` where source is `shared_result` or `coworker_invitation`, ÷ `calculation_completed` (all sources), over the same 30 days.

**Verified against Cloudflare's docs on 2026-11-25:** the SQL API endpoint, the **Account | Account Analytics | Read**
token permission, the `_sample_interval` column and the `INTERVAL '1' DAY` syntax are all as above.

## Free-tier capacity (Cloudflare docs, 2026-11-25)
| Resource | Workers Free | Our usage |
|---|---|---|
| Static asset requests (every page, script, image) | Free and unlimited | All page views |
| Worker requests | 100,000 per day | 1 per visit that triggers events (`POST /api/e`) |
| Analytics Engine data points written | 100,000 per day | 1 per distinct event in a visit, typically 2–4, so roughly 25k–50k calculator visits a day |
| Analytics Engine read queries | 10,000 per day | Only when you run reports |

Cloudflare's docs also say Analytics Engine usage is **not currently billed** (pricing is published in advance). If a daily
cap is reached, only event collection stops for the rest of that day; the static site is unaffected.
