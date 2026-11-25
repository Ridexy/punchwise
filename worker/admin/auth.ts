/** Admin access: a long random ADMIN_TOKEN Worker secret, sent as "Authorization: Bearer <token>". */
export const MIN_TOKEN_LENGTH = 24;

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

/** Compares fixed-length hashes in constant time, so response timing reveals nothing about the token. */
async function equalTokens(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export type AuthResult = { ok: true } | { ok: false; status: 401 | 503; error: string };

export async function checkAdmin(request: Request, adminToken: string | undefined): Promise<AuthResult> {
  if (!adminToken || adminToken.length < MIN_TOKEN_LENGTH) {
    return { ok: false, status: 503, error: `Dashboard not configured: set an ADMIN_TOKEN secret of at least ${MIN_TOKEN_LENGTH} characters.` };
  }
  const header = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m || !(await equalTokens(m[1].trim(), adminToken))) return { ok: false, status: 401, error: 'Wrong or missing admin token.' };
  return { ok: true };
}
