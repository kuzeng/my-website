import type { Env } from './env';
import { HttpError, clientIp } from './http';

// Bot protection. The first request of a visit carries a Turnstile token; we verify it once and hand back a signed
// session token (HMAC of session id + expiry), so later questions in the same visit skip the Turnstile round-trip.
// Without TURNSTILE_SECRET (local dev) the check is skipped.

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function verifyTurnstile(token: string, request: Request, secret: string) {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  body.append('remoteip', clientIp(request));
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const out = (await res.json()) as { success?: boolean };
  return out.success === true;
}

/**
 * Checks the caller is a person on the site. Returns a fresh session token when one was just issued.
 * Throws 403 when neither a valid session token nor a valid Turnstile token is present.
 */
export async function requireHuman(
  request: Request,
  env: Env,
  sessionId: string,
  input: { sessionToken?: string; turnstileToken?: string },
): Promise<string | undefined> {
  if (!env.TURNSTILE_SECRET) return undefined;
  if (!env.SESSION_SECRET) throw new HttpError(500, 'misconfigured', 'SESSION_SECRET is not set');

  if (input.sessionToken) {
    const [expires, sig] = input.sessionToken.split('.');
    if (Number(expires) > Date.now() && sig === (await hmac(env.SESSION_SECRET, `${sessionId}.${expires}`))) return undefined;
  }
  if (!input.turnstileToken || !(await verifyTurnstile(input.turnstileToken, request, env.TURNSTILE_SECRET))) {
    throw new HttpError(403, 'verify_failed');
  }
  const expires = String(Date.now() + SESSION_TTL_MS);
  return `${expires}.${await hmac(env.SESSION_SECRET, `${sessionId}.${expires}`)}`;
}
