/**
 * Session handling (edge-safe: used by middleware and API routes).
 * A session cookie is `${userId}.${hmac(userId)}`, signed with SESSION_SECRET
 * via Web Crypto so it works in both the Edge and Node runtimes.
 */
export const SESSION_COOKIE = 'mt_session';

async function hmac(message: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || 'insecure-default-secret-change-me';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Cookie value for a signed-in user. */
export async function createSession(userId: number): Promise<string> {
  return `${userId}.${await hmac(String(userId))}`;
}

/** Verify a session cookie and return the userId, or null. */
export async function verifySession(value: string | undefined | null): Promise<number | null> {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (sig !== (await hmac(id))) return null;
  const n = Number(id);
  return Number.isInteger(n) ? n : null;
}
