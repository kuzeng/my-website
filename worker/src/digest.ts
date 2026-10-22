import type { Env } from './env';
import { notify } from './mail';

/** Cron: once a day, email the questions the assistant couldn't answer in the last 24 hours. Silent when there are none. */
export async function sendDigest(env: Env, adminUrl: string) {
  const { results } = await env.DB.prepare(
    `SELECT MIN(question) AS question, COUNT(*) AS n
       FROM questions_log
      WHERE triage = 'new' AND created_at >= datetime('now', '-1 day')
      GROUP BY lower(trim(question))
      ORDER BY n DESC, MAX(created_at) DESC
      LIMIT 50`,
  ).all<{ question: string; n: number }>();
  if (!results.length) return;

  const total = results.reduce((sum, r) => sum + r.n, 0);
  const lines = results.map((r) => `• ${r.question}${r.n > 1 ? `  (×${r.n})` : ''}`);
  await notify(env, {
    subject: `${total} unanswered question${total === 1 ? '' : 's'} on your site`,
    text: [
      'Visitors asked Jarvis these in the last 24 hours, and it didn’t know the answer:',
      '',
      ...lines,
      '',
      `Answer them here and they go live right away: ${adminUrl}`,
    ].join('\n'),
  });
}
