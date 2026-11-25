import { describe, expect, it } from 'vitest';
import { onRequest, parseBatch } from '../../worker/collector';
import worker from '../../worker/index';
import { batchBody } from './track';

type Point = { indexes?: unknown[]; blobs?: unknown[]; doubles?: number[] };
function fakeEnv() {
  const points: Point[] = [];
  return { points, env: { EVENTS: { writeDataPoint: (p: Point) => { points.push(p); } } } };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (req: Request, env: any) => onRequest({ request: req, env });
const post = (body: string, headers: Record<string, string> = {}) =>
  new Request('https://punchwise.com/api/e', { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } });

describe('client batch body', () => {
  it('is null when nothing happened, compact JSON otherwise', () => {
    expect(batchBody('direct', {})).toBeNull();
    expect(JSON.parse(batchBody('organic_search', { calculator_opened: 1, report_exported: 2 })!)).toEqual({ a: 'organic_search', e: { calculator_opened: 1, report_exported: 2 } });
  });
});

describe('parseBatch (strict allow-list)', () => {
  it('accepts a valid batch and caps counts', () => {
    expect(parseBatch(JSON.stringify({ a: 'direct', e: { invite_clicked: 2, report_exported: 999 } }))).toEqual({ a: 'direct', e: { invite_clicked: 2, report_exported: 50 } });
  });
  it('rejects unknown events, unknown sources, extra data and junk', () => {
    for (const bad of [
      { a: 'direct', e: { name: 'Ana' } },
      { a: 'facebook', e: { calculator_opened: 1 } },
      { a: 'direct', e: { calculator_opened: '9:00' } },
      { a: 'direct', e: { calculator_opened: 1.5 } },
      { a: 'direct', e: { calculator_opened: 0 } },
      { a: 'direct', e: [] },
      { a: 'direct', e: {} },
    ]) expect(parseBatch(JSON.stringify(bad))).toBeNull();
    expect(parseBatch('not json')).toBeNull();
    expect(parseBatch('x'.repeat(2000))).toBeNull();
  });
});

describe('POST /api/e collector', () => {
  it('writes one data point per event: blobs [event, attribution], double = count, index = event', async () => {
    const { points, env } = fakeEnv();
    const res = await call(post(JSON.stringify({ a: 'shared_result', e: { calculator_opened: 1, calculation_completed: 1 } }), { origin: 'https://punchwise.com' }), env);
    expect(res.status).toBe(204);
    expect(points).toEqual([
      { indexes: ['calculator_opened'], blobs: ['calculator_opened', 'shared_result'], doubles: [1] },
      { indexes: ['calculation_completed'], blobs: ['calculation_completed', 'shared_result'], doubles: [1] },
    ]);
  });
  it('stores nothing from headers (no IP, no user agent)', async () => {
    const { points, env } = fakeEnv();
    await call(post(JSON.stringify({ a: 'direct', e: { invite_clicked: 1 } }), { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'Secret/1.0' }), env);
    expect(JSON.stringify(points)).not.toMatch(/203\.0\.113|Secret/);
  });
  it('rejects cross-site posts and non-POST methods', async () => {
    const { points, env } = fakeEnv();
    expect((await call(post('{}', { origin: 'https://evil.example' }), env)).status).toBe(403);
    expect((await call(new Request('https://punchwise.com/api/e'), env)).status).toBe(405);
    expect(points).toHaveLength(0);
  });
  it('invalid batches are accepted silently but not stored', async () => {
    const { points, env } = fakeEnv();
    expect((await call(post(JSON.stringify({ a: 'direct', e: { hours: 40 } })), env)).status).toBe(204);
    expect(points).toHaveLength(0);
  });
  it('works without the binding (dataset not set up yet)', async () => {
    expect((await call(post(JSON.stringify({ a: 'direct', e: { calculator_opened: 1 } })), {})).status).toBe(204);
  });
  it('a failing write does not fail the request', async () => {
    const env = { EVENTS: { writeDataPoint: () => { throw new Error('quota'); } } };
    expect((await call(post(JSON.stringify({ a: 'direct', e: { calculator_opened: 1 } })), env)).status).toBe(204);
  });
});

describe('worker router', () => {
  const assets = { fetch: async (r: Request) => new Response('asset:' + new URL(r.url).pathname) };
  it('sends /api/e to the collector and everything else to static assets', async () => {
    const { points, env } = fakeEnv();
    const e = { ...env, ASSETS: assets };
    expect((await worker.fetch(post(JSON.stringify({ a: 'direct', e: { calculator_opened: 1 } })), e)).status).toBe(204);
    expect(points).toHaveLength(1);
    expect(await (await worker.fetch(new Request('https://punchwise.com/overtime-calculator/'), e)).text()).toBe('asset:/overtime-calculator/');
    expect((await worker.fetch(new Request('https://punchwise.com/api/other'), e)).status).toBe(404);
  });
});
