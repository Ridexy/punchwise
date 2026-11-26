import { describe, expect, it } from 'vitest';
import { checkAdmin } from '../../worker/admin/auth';
import { buildKpis, getStats, growthQueries, lastDays, rumQuery } from '../../worker/admin/stats';
import { ADMIN_HTML } from '../../worker/admin/page';
import worker from '../../worker/index';

const TOKEN = 'x'.repeat(10) + 'correct-horse-battery';
const req = (auth?: string, path = '/api/admin/stats?days=30') =>
  new Request('https://punchwise.example' + path, { headers: auth ? { authorization: auth } : {} });

describe('checkAdmin', () => {
  it('refuses when no (or a short) token is configured', async () => {
    expect(await checkAdmin(req('Bearer anything'), undefined)).toMatchObject({ ok: false, status: 503 });
    expect(await checkAdmin(req('Bearer short'), 'short')).toMatchObject({ ok: false, status: 503 });
  });
  it('accepts only the exact bearer token', async () => {
    expect(await checkAdmin(req(`Bearer ${TOKEN}`), TOKEN)).toEqual({ ok: true });
    expect(await checkAdmin(req(`Bearer ${TOKEN}x`), TOKEN)).toMatchObject({ ok: false, status: 401 });
    expect(await checkAdmin(req(TOKEN), TOKEN)).toMatchObject({ ok: false, status: 401 });
    expect(await checkAdmin(req(), TOKEN)).toMatchObject({ ok: false, status: 401 });
  });
});

describe('queries are built from constants only', () => {
  it('growth SQL uses the fixed dataset and an allow-listed range', () => {
    const q = growthQueries(30);
    expect(q.matrix).toContain("FROM punchwise_events WHERE timestamp > NOW() - INTERVAL '30' DAY");
    expect(q.matrix).toContain('SUM(_sample_interval * double1)');
    expect(() => growthQueries(31)).toThrow();
  });
  it('RUM query validates every inlined value', () => {
    const ok = rumQuery('ea41224d7dcd54e9a53c2ce8718d3384', 'bd2cefad7d7d402ab7e7d6e70d6dad5a', '2026-11-01T00:00:00.000Z', '2026-11-25T00:00:00.000Z');
    expect(ok).toContain('siteTag: "bd2cefad7d7d402ab7e7d6e70d6dad5a"');
    expect(() => rumQuery('nope', 'bd2cefad7d7d402ab7e7d6e70d6dad5a', '2026-11-01T00:00:00.000Z', '2026-11-25T00:00:00.000Z')).toThrow();
    expect(() => rumQuery('ea41224d7dcd54e9a53c2ce8718d3384', 'x" } } evil', '2026-11-01T00:00:00.000Z', '2026-11-25T00:00:00.000Z')).toThrow();
  });
  it('lastDays gives N consecutive ISO days ending today', () => {
    expect(lastDays(3, new Date('2026-11-25T12:00:00Z'))).toEqual(['2026-11-23', '2026-11-24', '2026-11-25']);
  });
});

function mockFetch(opts: { sqlFail?: boolean; gqlErrors?: boolean } = {}) {
  const calls: { url: string; body: string; auth: string | null }[] = [];
  const f = async (url: string, init?: RequestInit) => {
    const body = String(init?.body ?? '');
    calls.push({ url, body, auth: new Headers(init?.headers).get('authorization') });
    if (url.endsWith('/analytics_engine/sql')) {
      if (opts.sqlFail) return new Response('forbidden', { status: 403 });
      if (body.includes('toStartOfDay')) return Response.json({ data: [{ day: '2026-11-24 00:00:00', event: 'calculation_completed', n: '7' }, { day: '2026-11-25 00:00:00', event: 'calculator_opened', n: 3 }] });
      return Response.json({ meta: [], data: [
        { event: 'calculator_opened', source: 'organic_search', n: '40' },
        { event: 'calculator_opened', source: 'shared_result', n: '6' },
        { event: 'calculator_opened', source: 'coworker_invitation', n: '4' },
        { event: 'calculation_completed', source: 'organic_search', n: '20' },
        { event: 'calculation_completed', source: 'shared_result', n: '3' },
        { event: 'share_button_clicked', source: 'organic_search', n: '5' },
        { event: 'invite_clicked', source: 'direct', n: '8' },
        { event: 'not_an_event', source: 'direct', n: '999' },
      ] });
    }
    if (url.endsWith('/graphql')) {
      if (opts.gqlErrors) return Response.json({ data: null, errors: [{ message: 'unknown field rumPageloadEventsAdaptiveGroups' }] });
      return Response.json({ data: { viewer: { accounts: [{
        total: [{ count: 120, sum: { visits: 80 } }],
        daily: [{ count: 50, sum: { visits: 30 }, dimensions: { date: '2026-11-25' } }],
        pages: [{ count: 70, dimensions: { requestPath: '/' } }],
        referrers: [{ count: 20, dimensions: { refererHost: 'www.google.com' } }, { count: 5, dimensions: { refererHost: '' } }],
        countries: [{ count: 60, dimensions: { countryName: 'US' } }],
      }] } } });
    }
    return new Response('?', { status: 404 });
  };
  return { f, calls };
}
const env = { CF_API_TOKEN: 'cf-read-token', CF_ACCOUNT_ID: 'ea41224d7dcd54e9a53c2ce8718d3384', WA_SITE_TAG: 'bd2cefad7d7d402ab7e7d6e70d6dad5a' };

describe('getStats', () => {
  it('combines growth events and Web Analytics, with KPIs', async () => {
    const { f, calls } = mockFetch();
    const s = await getStats(env, 30, f);
    expect(calls.every((c) => c.auth === 'Bearer cf-read-token')).toBe(true);
    expect(s.growth.ok).toBe(true);
    expect(s.growth.totals?.calculator_opened).toBe(50);
    expect(s.growth.matrix?.calculation_completed.shared_result).toBe(3);
    expect(s.growth.daily).toHaveLength(30);
    expect(s.kpis?.shareRate.value).toBeCloseTo(5 / 23);
    expect(s.kpis?.growth).toMatchObject({ numerator: 10, denominator: 23 });
    expect(s.kpis?.referralConversion).toMatchObject({ numerator: 3, denominator: 10 });
    expect(s.kpis?.inviteConversion).toMatchObject({ numerator: 4, denominator: 8 });
    expect(s.web).toMatchObject({ ok: true, pageViews: 120, visits: 80 });
    expect(s.web.referrers?.[1].label).toBe('(direct / none)');
  });
  it('a Web Analytics failure does not break growth stats', async () => {
    const s = await getStats(env, 7, mockFetch({ gqlErrors: true }).f);
    expect(s.growth.ok).toBe(true);
    expect(s.web.ok).toBe(false);
    expect(s.web.error).toContain('unknown field');
  });
  it('a growth API failure is reported, not thrown', async () => {
    const s = await getStats(env, 7, mockFetch({ sqlFail: true }).f);
    expect(s.growth).toMatchObject({ ok: false });
    expect(s.growth.error).toContain('403');
  });
  it('missing configuration is explained', async () => {
    const s = await getStats({}, 7, mockFetch().f);
    expect(s.growth.error).toMatch(/CF_API_TOKEN/);
  });
  it('KPIs are null (not NaN) with no data', () => {
    const k = buildKpis({ calculator_opened: {}, calculation_completed: {} } as never);
    expect(k.shareRate.value).toBeNull();
  });
});

describe('worker admin routes', () => {
  const assets = { fetch: async () => new Response('asset') };
  it('serves the dashboard page with strict headers and no data', async () => {
    const r = await worker.fetch(req(undefined, '/admin'), { ...env, ASSETS: assets });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-security-policy')).toContain("connect-src 'self'");
    expect(r.headers.get('x-robots-tag')).toContain('noindex');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.text()).not.toContain('cf-read-token');
  });
  it('stats endpoint requires the admin token and a valid range', async () => {
    const e = { ...env, ADMIN_TOKEN: TOKEN, ASSETS: assets };
    expect((await worker.fetch(req(), e)).status).toBe(401);
    expect((await worker.fetch(req('Bearer wrong-token-wrong-token-xx'), e)).status).toBe(401);
    expect((await worker.fetch(req(`Bearer ${TOKEN}`, '/api/admin/stats?days=5'), e)).status).toBe(400);
    expect((await worker.fetch(req(`Bearer ${TOKEN}`), { ...env, ASSETS: assets })).status).toBe(503);
  });
  it('page never renders data through innerHTML', () => {
    expect(ADMIN_HTML).not.toMatch(/innerHTML/);
  });
});

import { parseSince } from '../../worker/admin/stats';
describe('STATS_SINCE (exclude pre-launch test data)', () => {
  it('adds a validated lower bound to the growth SQL', () => {
    expect(growthQueries(30, '2026-11-26 15:30:00').matrix).toContain("AND timestamp >= toDateTime('2026-11-26 15:30:00')");
    expect(growthQueries(30).matrix).not.toContain('toDateTime');
    expect(() => growthQueries(30, "2026-11-26'); DROP")).toThrow();
  });
  it('parseSince accepts only the exact UTC format', () => {
    expect(parseSince(undefined)).toBeNull();
    expect(parseSince('2026-11-26 15:30:00')).toBe('2026-11-26 15:30:00');
    for (const bad of ['2026-11-26', '2026-11-26T15:30:00Z', '2026-13-45 99:99:99', "x' OR 1=1"]) expect(() => parseSince(bad)).toThrow();
  });
  it('getStats applies it to both sources and reports it', async () => {
    const { f, calls } = mockFetch();
    const s = await getStats({ ...env, STATS_SINCE: '2026-11-20 00:00:00' }, 30, f);
    expect(s.since).toBe('2026-11-20 00:00:00');
    expect(calls.filter((c) => c.url.endsWith('/sql')).every((c) => c.body.includes("toDateTime('2026-11-20 00:00:00')"))).toBe(true);
    const gql = calls.find((c) => c.url.endsWith('/graphql'))!;
    expect(gql.body).toMatch(/datetime_geq: \\"(2026-11-2\d|2026-1[12]-\d\d)T/);
  });
});
