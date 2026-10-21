import type { Env } from './env';

/** Sends a plain-text email to you through Resend. Without RESEND_API_KEY (local dev) it only logs. */
export async function notify(env: Env, mail: { subject: string; text: string; replyTo?: string }) {
  if (!env.RESEND_API_KEY) {
    console.log(`[mail skipped: no RESEND_API_KEY] ${mail.subject}\n${mail.text}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [env.NOTIFY_EMAIL],
      subject: mail.subject,
      text: mail.text,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });
  if (!res.ok) console.error('Resend error', res.status, await res.text());
}
