/**
 * Punchwise Worker. Every page and file is a static asset served straight from ./dist by Cloudflare
 * (see [assets] in wrangler.toml). Only /api/* reaches this code; today that is just the
 * growth-event collector at POST /api/e.
 */
import { onRequest, type Env as CollectorEnv } from './collector';

type Env = CollectorEnv & { ASSETS: { fetch(request: Request): Promise<Response> } };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/e') return onRequest({ request, env });
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
