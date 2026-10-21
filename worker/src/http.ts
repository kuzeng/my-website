import type { Env } from './env';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message = code) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

/** CORS headers for the public API: only the site's own origins (and localhost in dev) may call it. */
export function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

export async function readJson<T>(request: Request, maxBytes = 16_384): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too_large');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

export const clientIp = (request: Request) => request.headers.get('cf-connecting-ip') ?? 'local';

/** A short string field from untrusted input: trimmed, length-capped, or undefined. */
export function str(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const s = value.trim();
  return s ? s.slice(0, max) : undefined;
}

export const isChinese = (s: string) => /[㐀-鿿]/.test(s);
