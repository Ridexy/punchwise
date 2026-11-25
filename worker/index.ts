/**
 * Punchwise Worker. Every page and file is a static asset served straight from ./dist by Cloudflare
 * (see [assets] in wrangler.toml). Only /api/* and /admin reach this code:
 *  - POST /api/e            growth-event collector (public, same-site)
 *  - GET  /admin            admin dashboard page (static HTML; data needs the admin token)
 *  - GET  /api/admin/stats  dashboard data (requires "Authorization: Bearer <ADMIN_TOKEN>")
 */
import { onRequest as collect, type Env as CollectorEnv } from './collector';
import { checkAdmin } from './admin/auth';
import { ALLOWED_DAYS, getStats, type StatsEnv } from './admin/stats';
import { ADMIN_CSP, ADMIN_HTML } from './admin/page';

type Env = CollectorEnv & StatsEnv & { ADMIN_TOKEN?: string; ASSETS: { fetch(request: Request): Promise<Response> } };

const PRIVATE = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...PRIVATE, 'content-type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    if (pathname === '/api/e') return collect({ request, env });
    if (pathname === '/admin' || pathname === '/admin/') {
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { allow: 'GET' } });
      return new Response(ADMIN_HTML, { headers: { ...PRIVATE, 'content-type': 'text/html; charset=utf-8', 'content-security-policy': ADMIN_CSP, 'x-frame-options': 'DENY' } });
    }
    if (pathname === '/api/admin/stats') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
      const auth = await checkAdmin(request, env.ADMIN_TOKEN);
      if (!auth.ok) return json({ error: auth.error }, auth.status);
      const days = Number(url.searchParams.get('days') || 30);
      if (!(ALLOWED_DAYS as readonly number[]).includes(days)) return json({ error: 'days must be 7, 30 or 90' }, 400);
      return json(await getStats(env, days));
    }
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
