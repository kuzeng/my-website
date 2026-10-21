import type { Env } from './env';
import { HttpError, json, readJson, str } from './http';
import page from './admin.html';

// /admin: your private dashboard, behind Cloudflare Access (Google login, your email only).
// The Worker re-checks the Access JWT itself, so the page stays private even if the Access app is misconfigured.

type Jwk = JsonWebKey & { kid: string };
let certs: { keys: Jwk[]; at: number } | null = null;

const b64urlBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const b64urlJson = (s: string) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

async function accessKeys(team: string): Promise<Jwk[]> {
  if (certs && Date.now() - certs.at < 60 * 60 * 1000) return certs.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  certs = { keys, at: Date.now() };
  return keys;
}

async function requireAdmin(request: Request, env: Env): Promise<void> {
  const { hostname } = new URL(request.url);
  if (env.DEV_ADMIN === '1' && (hostname === 'localhost' || hostname === '127.0.0.1')) return;
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new HttpError(403, 'access_not_configured', 'Set up Cloudflare Access for /admin first.');

  const token = request.headers.get('cf-access-jwt-assertion');
  const parts = token?.split('.') ?? [];
  if (parts.length !== 3) throw new HttpError(403, 'forbidden');
  const [h, p, s] = parts;
  const header = b64urlJson(h);
  const payload = b64urlJson(p);
  const jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(403, 'forbidden');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`));
  const aud: string[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const email = String(payload.email ?? '').toLowerCase();
  if (
    !valid ||
    !aud.includes(env.ACCESS_AUD) ||
    payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}` ||
    Number(payload.exp) * 1000 < Date.now() ||
    (env.ADMIN_EMAIL && email !== env.ADMIN_EMAIL.toLowerCase())
  ) {
    throw new HttpError(403, 'forbidden');
  }
}

const AUDIENCES = ['recruiter', 'engineer', 'friend', 'general'];
const ids = (raw: unknown): number[] => (Array.isArray(raw) ? raw.map(Number).filter(Number.isInteger).slice(0, 500) : []);
const placeholders = (n: number) => Array(n).fill('?').join(',');

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;

  if (path === '/admin' && method === 'GET') {
    return new Response(page, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
        'x-robots-tag': 'noindex',
      },
    });
  }

  // Writes need a custom header: browsers can't send it cross-site without a CORS preflight, which this API never grants.
  if (method !== 'GET' && request.headers.get('x-admin') !== '1') throw new HttpError(403, 'csrf');

  // --- Unanswered questions, grouped by text ---
  if (path === '/api/admin/pending' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT MIN(question) AS question, COUNT(*) AS count, MAX(created_at) AS last, group_concat(id) AS ids
         FROM questions_log WHERE triage = 'new'
        GROUP BY lower(trim(question)) ORDER BY last DESC LIMIT 200`,
    ).all<{ question: string; count: number; last: string; ids: string }>();
    return json(results.map((r) => ({ ...r, ids: r.ids.split(',').map(Number) })));
  }
  if (path === '/api/admin/pending/answer' && method === 'POST') {
    const body = await readJson<{ ids?: unknown; question?: unknown; answer?: unknown; audience?: unknown }>(request);
    const question = str(body.question, 500);
    const answer = str(body.answer, 4000);
    const list = ids(body.ids);
    if (!question || !answer || !list.length) throw new HttpError(400, 'missing_fields');
    const audience = AUDIENCES.includes(String(body.audience)) ? String(body.audience) : 'general';
    await env.DB.batch([
      env.DB.prepare("INSERT INTO facts (question, answer, audience, status) VALUES (?, ?, ?, 'live')").bind(question, answer, audience),
      env.DB.prepare(`UPDATE questions_log SET triage = 'resolved' WHERE id IN (${placeholders(list.length)})`).bind(...list),
    ]);
    return json({ ok: true });
  }
  if (path === '/api/admin/pending/ignore' && method === 'POST') {
    const list = ids((await readJson<{ ids?: unknown }>(request)).ids);
    if (!list.length) throw new HttpError(400, 'missing_fields');
    await env.DB.prepare(`UPDATE questions_log SET triage = 'ignored' WHERE id IN (${placeholders(list.length)})`).bind(...list).run();
    return json({ ok: true });
  }

  // --- Facts (knowledge base + interview drafts) ---
  if (path === '/api/admin/facts' && method === 'GET') {
    const status = url.searchParams.get('status');
    const stmt = status === 'draft' || status === 'live'
      ? env.DB.prepare('SELECT * FROM facts WHERE status = ? ORDER BY id').bind(status)
      : env.DB.prepare('SELECT * FROM facts ORDER BY status DESC, audience, id');
    return json((await stmt.all()).results);
  }
  if (path === '/api/admin/facts' && method === 'POST') {
    const body = await readJson<Record<string, unknown>>(request);
    const question = str(body.question, 500);
    const answer = str(body.answer, 4000) ?? '';
    if (!question) throw new HttpError(400, 'missing_fields');
    const audience = AUDIENCES.includes(String(body.audience)) ? String(body.audience) : 'general';
    const status = answer && body.status !== 'draft' ? 'live' : 'draft';
    const row = await env.DB.prepare('INSERT INTO facts (question, answer, audience, status) VALUES (?, ?, ?, ?) RETURNING *')
      .bind(question, answer, audience, status).first();
    return json(row, 201);
  }
  const factMatch = path.match(/^\/api\/admin\/facts\/(\d+)$/);
  if (factMatch && method === 'PUT') {
    const body = await readJson<Record<string, unknown>>(request);
    const question = str(body.question, 500);
    const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 4000) : undefined;
    const audience = AUDIENCES.includes(String(body.audience)) ? String(body.audience) : undefined;
    // An answer makes a fact live; clearing it (or asking for draft) parks it back in the interview.
    const status = body.status === 'draft' || answer === '' ? 'draft' : answer ? 'live' : undefined;
    const row = await env.DB.prepare(
      `UPDATE facts SET question = COALESCE(?, question), answer = COALESCE(?, answer), audience = COALESCE(?, audience),
              status = COALESCE(?, status), updated_at = datetime('now') WHERE id = ? RETURNING *`,
    ).bind(question ?? null, answer ?? null, audience ?? null, status ?? null, Number(factMatch[1])).first();
    if (!row) throw new HttpError(404, 'not_found');
    return json(row);
  }
  if (factMatch && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM facts WHERE id = ?').bind(Number(factMatch[1])).run();
    return json({ ok: true });
  }

  // --- Log, top questions, leads ---
  if (path === '/api/admin/log' && method === 'GET') {
    const outcome = url.searchParams.get('outcome');
    const stmt = ['answered', 'unknown', 'declined'].includes(outcome ?? '')
      ? env.DB.prepare('SELECT * FROM questions_log WHERE outcome = ? ORDER BY id DESC LIMIT 300').bind(outcome)
      : env.DB.prepare('SELECT * FROM questions_log ORDER BY id DESC LIMIT 300');
    return json((await stmt.all()).results);
  }
  if (path === '/api/admin/top' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT MIN(question) AS question, COUNT(*) AS count, MAX(outcome) AS outcome
         FROM questions_log WHERE created_at >= datetime('now', '-30 day')
        GROUP BY lower(trim(question)) ORDER BY count DESC LIMIT 20`,
    ).all();
    return json(results);
  }
  if (path === '/api/admin/leads' && method === 'GET') {
    return json((await env.DB.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 300').all()).results);
  }

  throw new HttpError(404, 'not_found');
}
