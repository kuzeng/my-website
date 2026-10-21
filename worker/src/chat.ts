import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { Env } from './env';
import { HttpError, clientIp, isChinese, json, readJson, str } from './http';
import { systemPrompt } from './kb';
import { requireHuman } from './session';

const MAX_TURNS = 6;           // history sent to the model: the last 6 exchanges
const MAX_MESSAGE_CHARS = 500;

const Reply = z.object({
  answer: z.string(),
  status: z.enum(['answered', 'unknown', 'declined']),
  section: z.enum(['now', 'work', 'ai', 'experience', 'skills', 'contact', 'none']),
});
type Reply = z.infer<typeof Reply>;

type ChatInput = {
  sessionId?: unknown;
  messages?: unknown;
  sessionToken?: unknown;
  turnstileToken?: unknown;
};

/** Visitor-supplied history, cleaned: alternating user/assistant text, last turns only, ending on a user question. */
function cleanHistory(raw: unknown): Anthropic.MessageParam[] {
  if (!Array.isArray(raw)) throw new HttpError(400, 'bad_messages');
  const msgs: Anthropic.MessageParam[] = [];
  for (const m of raw.slice(-(MAX_TURNS * 2 + 1))) {
    const role = m?.role === 'assistant' ? 'assistant' : m?.role === 'user' ? 'user' : null;
    const content = str(m?.content, MAX_MESSAGE_CHARS);
    if (!role || !content) continue;
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs.pop(); // keep strict alternation
    msgs.push({ role, content });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') throw new HttpError(400, 'bad_messages');
  return msgs;
}

const canned = (lang: 'zh' | 'en') => ({
  declined: lang === 'zh' ? '这个问题我没法回答。可以在下面留下邮箱，他会亲自回复你。' : 'I can’t help with that one. Leave your email below and he’ll reply himself.',
  busy: lang === 'zh' ? '今天来问问题的人太多了，请稍后再试，或者直接发邮件给他。' : 'Lots of questions today. Please try again later, or email him directly.',
});

/** Local dev without an API key: keyword-matched canned replies that exercise every UI path. */
function mockReply(question: string, lang: 'zh' | 'en'): Reply {
  const q = question.toLowerCase();
  if (/salary|pay|visa|job hunt|薪|签证|找工作/.test(q)) return { answer: canned(lang).declined, status: 'declined', section: 'none' };
  if (/intuit|lululemon|usaa|experience|work at|工作|经历/.test(q)) return { answer: '[mock] Kuiduan is an iOS engineer at Intuit; before that he built calling and voicemail at Lululemon.', status: 'answered', section: 'experience' };
  if (/project|imagefeed|firefox|open source|项目/.test(q)) return { answer: '[mock] His main project is ImageFeedApp, a modular, test-driven iOS app he migrated to Swift 6.', status: 'answered', section: 'work' };
  if (/hello|hi\b|你好/.test(q)) return { answer: '[mock] Hi! Ask me anything about Kuiduan.', status: 'answered', section: 'none' };
  return { answer: '[mock] I don’t know that one yet. Leave your email below and he’ll answer it himself.', status: 'unknown', section: 'none' };
}

async function underDailyLimit(env: Env): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare(
    'INSERT INTO counters (day, chats) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET chats = chats + 1 RETURNING chats',
  ).bind(day).first<{ chats: number }>();
  return (row?.chats ?? 0) <= Number(env.DAILY_LIMIT || 2000);
}

async function askClaude(env: Env, messages: Anthropic.MessageParam[], lang: 'zh' | 'en'): Promise<Reply> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.parse({
      model: env.MODEL,
      max_tokens: 1024,
      system: await systemPrompt(env),
      messages,
      output_config: { effort: 'low', format: zodOutputFormat(Reply) },
    });
    console.log('usage', JSON.stringify(response.usage));
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      return { answer: canned(lang).declined, status: 'declined', section: 'none' };
    }
    return response.parsed_output;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      throw new HttpError(503, 'model_busy');
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error', err.status, err.message);
      throw new HttpError(502, 'model_error');
    }
    throw err;
  }
}

export async function handleChat(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const input = await readJson<ChatInput>(request);
  const sessionId = str(input.sessionId, 64)?.replace(/[^\w-]/g, '');
  if (!sessionId) throw new HttpError(400, 'bad_session');
  const messages = cleanHistory(input.messages);
  const question = messages[messages.length - 1].content as string;
  const lang = isChinese(question) ? 'zh' : 'en';

  const sessionToken = await requireHuman(request, env, sessionId, {
    sessionToken: str(input.sessionToken, 200),
    turnstileToken: str(input.turnstileToken, 2048),
  });
  const { success } = await env.CHAT_LIMITER.limit({ key: clientIp(request) });
  if (!success) throw new HttpError(429, 'rate_limited');
  if (!(await underDailyLimit(env))) return json({ answer: canned(lang).busy, status: 'declined', section: 'none', sessionToken }, 200);

  const reply = env.MOCK_MODEL === '1' ? mockReply(question, lang) : await askClaude(env, messages, lang);

  // Log after responding: 'unknown' questions become your to-do list on /admin.
  const triage = reply.status === 'unknown' ? 'new' : reply.status === 'declined' ? 'ignored' : 'resolved';
  ctx.waitUntil(
    env.DB.prepare(
      'INSERT INTO questions_log (session_id, question, answer, outcome, section, triage, lang) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(sessionId, question, reply.answer, reply.status, reply.section, triage, lang).run(),
  );

  return json({ ...reply, sessionToken });
}
