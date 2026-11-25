/**
 * Server-side stats for the admin dashboard. Reads two Cloudflare APIs with a read-only token
 * (Account | Account Analytics | Read), held as the CF_API_TOKEN Worker secret:
 *  - Workers Analytics Engine SQL API: growth events written by worker/collector.ts (documented API).
 *  - GraphQL Analytics API, Web Analytics (RUM) dataset: page views/visits. Cloudflare does not
 *    document this dataset publicly, so failures here are reported in `web.error` and never break
 *    the growth section.
 */
import { ATTRIBUTIONS, EVENTS, type Attribution, type EventName } from '../../src/lib/events';

export const DATASET = 'punchwise_events';
export const ALLOWED_DAYS = [7, 30, 90] as const;

export type StatsEnv = {
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  WA_SITE_TAG?: string;
  CF_API_BASE?: string; // tests/local only; defaults to Cloudflare's API
};
type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export type Matrix = Record<EventName, Record<Attribution, number>>;
export type WebStats = {
  ok: boolean;
  error?: string;
  pageViews?: number;
  visits?: number;
  daily?: { date: string; pageViews: number; visits: number }[];
  pages?: { label: string; count: number }[];
  referrers?: { label: string; count: number }[];
  countries?: { label: string; count: number }[];
};
export type Stats = {
  days: number;
  generatedAt: string;
  growth: { ok: boolean; error?: string; matrix?: Matrix; totals?: Record<EventName, number>; daily?: { date: string; calculations: number; opens: number }[] };
  kpis?: Record<string, { value: number | null; numerator: number; denominator: number; label: string; help: string }>;
  web: WebStats;
};

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const isoDay = (v: unknown) => String(v ?? '').slice(0, 10);

function emptyMatrix(): Matrix {
  return Object.fromEntries(EVENTS.map((e) => [e, Object.fromEntries(ATTRIBUTIONS.map((a) => [a, 0]))])) as Matrix;
}

async function sql(env: StatsEnv, f: Fetch, query: string): Promise<Record<string, unknown>[]> {
  const base = env.CF_API_BASE || 'https://api.cloudflare.com/client/v4';
  const res = await f(`${base}/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST', headers: { authorization: `Bearer ${env.CF_API_TOKEN}` }, body: query,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Analytics Engine SQL API ${res.status}: ${text.slice(0, 200)}`);
  const body = JSON.parse(text) as { data?: Record<string, unknown>[] };
  return body.data ?? [];
}

/** Queries built only from constants and an allow-listed integer: no user text reaches SQL. */
export function growthQueries(days: number) {
  if (!(ALLOWED_DAYS as readonly number[]).includes(days)) throw new Error('bad range');
  const where = `FROM ${DATASET} WHERE timestamp > NOW() - INTERVAL '${days}' DAY`;
  return {
    matrix: `SELECT blob1 AS event, blob2 AS source, SUM(_sample_interval * double1) AS n ${where} GROUP BY event, source FORMAT JSON`,
    daily: `SELECT toStartOfDay(timestamp) AS day, blob1 AS event, SUM(_sample_interval * double1) AS n ${where} AND blob1 IN ('calculation_completed', 'calculator_opened') GROUP BY day, event ORDER BY day FORMAT JSON`,
  };
}

export function lastDays(days: number, now = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => new Date(now.getTime() - (days - 1 - i) * 86400000).toISOString().slice(0, 10));
}

export function buildKpis(m: Matrix) {
  const sum = (e: EventName, sources: readonly Attribution[] = ATTRIBUTIONS) => sources.reduce((a, s) => a + (m[e]?.[s] ?? 0), 0);
  const referral = ['shared_result', 'coworker_invitation'] as const;
  const ratio = (n: number, d: number) => (d > 0 ? n / d : null);
  const k = (numerator: number, denominator: number, label: string, help: string) => ({ value: ratio(numerator, denominator), numerator, denominator, label, help });
  const calcs = sum('calculation_completed');
  return {
    shareRate: k(sum('share_button_clicked'), calcs, 'Share rate', 'Share buttons opened ÷ calculations completed'),
    actionsPerCalc: k(sum('share_link_copied') + sum('share_card_downloaded') + sum('report_exported'), calcs, 'Share & export actions per calculation', '(links copied + cards + PDF/CSV/print) ÷ calculations'),
    referralConversion: k(sum('calculation_completed', referral), sum('calculator_opened', referral), 'Referral → calculation', 'Calculations ÷ calculator opens, for visitors from shared links and invites'),
    inviteConversion: k(sum('calculator_opened', ['coworker_invitation']), sum('invite_clicked'), 'Invite conversion', 'Calculator opens from invites ÷ invites opened (can pass 100%: one invite can reach a whole group chat)'),
    growth: k(sum('calculator_opened', referral), calcs, 'Key growth measure', 'New visits from shared links and invites ÷ calculations completed'),
  };
}

async function growth(env: StatsEnv, f: Fetch, days: number): Promise<Stats['growth'] & { kpis?: Stats['kpis'] }> {
  try {
    const q = growthQueries(days);
    const [rows, dailyRows] = await Promise.all([sql(env, f, q.matrix), sql(env, f, q.daily)]);
    const matrix = emptyMatrix();
    for (const r of rows) {
      const e = String(r.event) as EventName, s = String(r.source) as Attribution;
      if (matrix[e] && s in matrix[e]) matrix[e][s] += num(r.n);
    }
    const totals = Object.fromEntries(EVENTS.map((e) => [e, Object.values(matrix[e]).reduce((a, b) => a + b, 0)])) as Record<EventName, number>;
    const byDay = new Map(lastDays(days).map((d) => [d, { date: d, calculations: 0, opens: 0 }]));
    for (const r of dailyRows) {
      const d = byDay.get(isoDay(r.day));
      if (!d) continue;
      if (r.event === 'calculation_completed') d.calculations += num(r.n);
      if (r.event === 'calculator_opened') d.opens += num(r.n);
    }
    return { ok: true, matrix, totals, daily: [...byDay.values()], kpis: buildKpis(matrix) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Values are validated to safe character sets and then inlined, avoiding undocumented GraphQL type names. */
export function rumQuery(accountTag: string, siteTag: string, start: string, end: string): string {
  if (!/^[a-f0-9]{32}$/i.test(accountTag)) throw new Error('CF_ACCOUNT_ID looks wrong (expected 32 hex characters).');
  if (!/^[A-Za-z0-9]{8,64}$/.test(siteTag)) throw new Error('WA_SITE_TAG looks wrong.');
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (!iso.test(start) || !iso.test(end)) throw new Error('bad dates');
  const f = `{ siteTag: "${siteTag}", datetime_geq: "${start}", datetime_leq: "${end}" }`;
  return `{ viewer { accounts(filter: { accountTag: "${accountTag}" }) {
    total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: ${f}) { count sum { visits } }
    daily: rumPageloadEventsAdaptiveGroups(limit: 100, filter: ${f}, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
    pages: rumPageloadEventsAdaptiveGroups(limit: 10, filter: ${f}, orderBy: [count_DESC]) { count dimensions { requestPath } }
    referrers: rumPageloadEventsAdaptiveGroups(limit: 10, filter: ${f}, orderBy: [count_DESC]) { count dimensions { refererHost } }
    countries: rumPageloadEventsAdaptiveGroups(limit: 10, filter: ${f}, orderBy: [count_DESC]) { count dimensions { countryName } }
  } } }`;
}

type RumGroup = { count?: number; sum?: { visits?: number }; dimensions?: Record<string, string> };

async function web(env: StatsEnv, f: Fetch, days: number, now = new Date()): Promise<WebStats> {
  if (!env.WA_SITE_TAG) return { ok: false, error: 'WA_SITE_TAG is not set.' };
  try {
    const base = env.CF_API_BASE || 'https://api.cloudflare.com/client/v4';
    const start = new Date(now.getTime() - days * 86400000).toISOString();
    const res = await f(`${base}/graphql`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.CF_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: rumQuery(env.CF_ACCOUNT_ID ?? '', env.WA_SITE_TAG, start, now.toISOString()) }),
    });
    const body = (await res.json()) as { data?: { viewer?: { accounts?: Record<string, RumGroup[]>[] } }; errors?: { message: string }[] };
    if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; ').slice(0, 300));
    const acc = body.data?.viewer?.accounts?.[0];
    if (!res.ok || !acc) throw new Error(`GraphQL API ${res.status}`);
    const top = (rows: RumGroup[] = [], dim: string, empty: string) =>
      rows.map((r) => ({ label: r.dimensions?.[dim] || empty, count: num(r.count) }));
    const byDay = new Map(lastDays(days, now).map((d) => [d, { date: d, pageViews: 0, visits: 0 }]));
    for (const r of acc.daily ?? []) {
      const d = byDay.get(isoDay(r.dimensions?.date));
      if (d) { d.pageViews += num(r.count); d.visits += num(r.sum?.visits); }
    }
    return {
      ok: true,
      pageViews: num(acc.total?.[0]?.count),
      visits: num(acc.total?.[0]?.sum?.visits),
      daily: [...byDay.values()],
      pages: top(acc.pages, 'requestPath', '(unknown)'),
      referrers: top(acc.referrers, 'refererHost', '(direct / none)'),
      countries: top(acc.countries, 'countryName', '(unknown)'),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getStats(env: StatsEnv, days: number, f: Fetch = fetch): Promise<Stats> {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    const error = 'Set the CF_API_TOKEN secret (Account Analytics: Read) and the CF_ACCOUNT_ID variable.';
    return { days, generatedAt: new Date().toISOString(), growth: { ok: false, error }, web: { ok: false, error } };
  }
  const [g, w] = await Promise.all([growth(env, f, days), web(env, f, days)]);
  const { kpis, ...growthRest } = g;
  return { days, generatedAt: new Date().toISOString(), growth: growthRest, kpis, web: w };
}
