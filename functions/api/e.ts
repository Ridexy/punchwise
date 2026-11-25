/**
 * Aggregate growth-event collector (Cloudflare Pages Function, route: POST /api/e).
 *
 * Accepts ONE batch per visit: {"a": "<attribution>", "e": {"<event>": <count>, ...}}
 * Stores only event name, attribution category and a count in Workers Analytics Engine.
 * Never stores IP address, user agent, time entries, names, pay or any free text:
 * every value must match an allow-list or the whole batch is dropped.
 * If the EVENTS binding is not configured, it accepts and discards (the site keeps working).
 */
import { ATTRIBUTIONS, EVENTS } from '../../src/lib/events';

/** Minimal shapes (match @cloudflare/workers-types AnalyticsEngineDataset / PagesFunction context). */
type Dataset = { writeDataPoint(point: { indexes?: string[]; blobs?: string[]; doubles?: number[] }): void };
type Env = { EVENTS?: Dataset };
type Context = { request: Request; env: Env };

const MAX_BODY = 1024;
const MAX_COUNT = 50;
const noContent = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export type Batch = { a: string; e: Record<string, number> };

/** Strict validation; returns null if anything is off. */
export function parseBatch(text: string): Batch | null {
  if (!text || text.length > MAX_BODY) return null;
  let o: unknown;
  try { o = JSON.parse(text); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const { a, e } = o as { a?: unknown; e?: unknown };
  if (typeof a !== 'string' || !(ATTRIBUTIONS as readonly string[]).includes(a)) return null;
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(e as Record<string, unknown>)) {
    if (!(EVENTS as readonly string[]).includes(k)) return null;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return null;
    out[k] = Math.min(v, MAX_COUNT);
  }
  return Object.keys(out).length ? { a, e: out } : null;
}

/** Same-site browsers only (blocks trivial cross-site spam; not a security boundary). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // sendBeacon from some browsers omits Origin on same-origin requests
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export const onRequest = async ({ request, env }: Context): Promise<Response> => {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const batch = parseBatch(await request.text());
  if (!batch || !env.EVENTS) return noContent();
  for (const [event, count] of Object.entries(batch.e)) {
    try {
      // blob1 = event, blob2 = attribution, double1 = count; index = event (sampling key)
      env.EVENTS.writeDataPoint({ indexes: [event], blobs: [event, batch.a], doubles: [count] });
    } catch { /* never fail the request over analytics */ }
  }
  return noContent();
};
