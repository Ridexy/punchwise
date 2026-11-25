/**
 * Privacy-conscious growth measurement.
 * - Only an event NAME and an attribution CATEGORY are ever sent. Never time entries,
 *   names, pay rates or any other value typed by the user.
 * - No cookies, no IDs. Attribution lives in sessionStorage for the visit only.
 * - Events are counted in memory and sent as ONE small batch per visit (when the page is hidden),
 *   to the same-site collector /api/e (worker/collector.ts). VITE_EVENTS_URL=off disables sending.
 */
import type { Attribution, EventName } from './events';
export { EVENTS, type Attribution, type EventName } from './events';

/** Values for the ?ref= tag we put on every link the product sends out. */
export const REF = { invite: 'invite', card: 'card', pdf: 'pdf', share: 'share', team: 'team', embed: 'embed' } as const;

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|yandex|baidu|brave|startpage|qwant)\./;

export function classify(path: string, search: string, referrer: string, ownHost: string): Attribution {
  const ref = new URLSearchParams(search).get('ref');
  if (ref === REF.invite) return 'coworker_invitation';
  if (ref === REF.embed) return 'embedded_calculator';
  if (ref === REF.card || ref === REF.pdf || ref === REF.share || ref === REF.team || path.startsWith('/view/')) return 'shared_result';
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname;
    if (host === ownHost) return 'direct';
    if (SEARCH.test(host)) return 'organic_search';
  } catch { /* ignore */ }
  return 'other_referral';
}

const KEY = 'ht_attr';
let cached: Attribution | null = null;

/** Determine (once per visit) how this visitor arrived, then remove the ?ref tag from the address bar. */
export function attribution(): Attribution {
  if (cached) return cached;
  try { cached = (sessionStorage.getItem(KEY) as Attribution) || null; } catch { /* storage blocked */ }
  if (!cached) {
    cached = classify(location.pathname, location.search, document.referrer, location.hostname);
    try { sessionStorage.setItem(KEY, cached); } catch { /* ignore */ }
  }
  if (new URLSearchParams(location.search).has('ref')) {
    const u = new URL(location.href);
    u.searchParams.delete('ref');
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  }
  return cached;
}

const CONFIG: string = import.meta.env.VITE_EVENTS_URL || '/api/e';
const ENDPOINT = CONFIG === 'off' || import.meta.env.DEV ? '' : CONFIG;
const sentOnce = new Set<string>();
let counts: Partial<Record<EventName, number>> = {};
let listening = false;

/** Build the batch body; exported for tests. */
export function batchBody(a: Attribution, c: Partial<Record<EventName, number>>): string | null {
  return Object.keys(c).length ? JSON.stringify({ a, e: c }) : null;
}

function flush() {
  const body = batchBody(attribution(), counts);
  counts = {};
  if (!body || !ENDPOINT) return;
  try {
    const ok = navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }));
    if (!ok) fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
  } catch { /* never break the app for analytics */ }
}

export function track(event: EventName, opts: { once?: boolean } = {}) {
  if (typeof window === 'undefined') return;
  if (opts.once) { if (sentOnce.has(event)) return; sentOnce.add(event); }
  counts[event] = (counts[event] ?? 0) + 1;
  if (import.meta.env.DEV) console.debug('[track]', event, attribution());
  if (!listening) {
    listening = true;
    // One beacon when the visitor leaves or switches away (the reliable moment on mobile).
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    window.addEventListener('pagehide', flush);
  }
}

/** Append ?ref=... to an outgoing product link (before any #fragment). */
export function withRef(url: string, ref: string): string {
  const [base, hash] = url.split('#');
  const u = base + (base.includes('?') ? '&' : '?') + 'ref=' + ref;
  return hash !== undefined ? `${u}#${hash}` : u;
}
