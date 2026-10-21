import type { Env } from './env';
import { HttpError, clientIp, json, readJson, str } from './http';
import { notify } from './mail';
import { requireHuman } from './session';

type LeadInput = {
  sessionId?: unknown;
  email?: unknown;
  name?: unknown;
  company?: unknown;
  question?: unknown;
  sessionToken?: unknown;
  turnstileToken?: unknown;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function handleLead(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const input = await readJson<LeadInput>(request);
  const sessionId = str(input.sessionId, 64)?.replace(/[^\w-]/g, '');
  if (!sessionId) throw new HttpError(400, 'bad_session');
  const email = str(input.email, 254);
  if (!email || !EMAIL.test(email)) throw new HttpError(400, 'bad_email');
  const name = str(input.name, 100);
  const company = str(input.company, 100);
  const question = str(input.question, 500);

  const sessionToken = await requireHuman(request, env, sessionId, {
    sessionToken: str(input.sessionToken, 200),
    turnstileToken: str(input.turnstileToken, 2048),
  });
  const { success } = await env.LEAD_LIMITER.limit({ key: clientIp(request) });
  if (!success) throw new HttpError(429, 'rate_limited');

  await env.DB.prepare('INSERT INTO leads (email, name, company, question, session_id) VALUES (?, ?, ?, ?, ?)')
    .bind(email, name ?? null, company ?? null, question ?? null, sessionId)
    .run();

  const who = [name, company && `(${company})`].filter(Boolean).join(' ') || email;
  ctx.waitUntil(
    notify(env, {
      subject: `New contact from your site: ${who}`,
      replyTo: email,
      text: [
        `${who} left their email after asking Kiki a question on your site.`,
        '',
        `Email:    ${email}`,
        `Name:     ${name ?? '-'}`,
        `Company:  ${company ?? '-'}`,
        `Question: ${question ?? '-'}`,
        '',
        'Reply to this email to answer them directly.',
      ].join('\n'),
    }),
  );
  return json({ ok: true, sessionToken });
}
