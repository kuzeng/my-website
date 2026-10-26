import type { Env } from './env';
import { HttpError, clientIp, isChinese, readJson, str } from './http';
import { verifySpeech } from './session';

// Jarvis's voice: Azure neural text-to-speech (free tier F0: 0.5M characters a month).
// Only answers this Worker wrote can be spoken: /api/chat hands back a speakToken (HMAC of the answer) and we check it,
// so nobody can run arbitrary text through our quota. Identical answers are served from the edge cache.
// Without AZURE_SPEECH_KEY this returns 503 and the page falls back to the browser's own voice.

type SpeakInput = { text?: unknown; token?: unknown };

const MAX_CHARS = 1200;
const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

async function cacheKey(voice: string, text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${voice}\n${text}`));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return new Request(`https://speak.cache/${hex}.mp3`);
}

export async function handleSpeak(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) throw new HttpError(503, 'tts_unavailable');
  const input = await readJson<SpeakInput>(request);
  const text = str(input.text, MAX_CHARS);
  if (!text) throw new HttpError(400, 'bad_text');
  if (!(await verifySpeech(env, text, str(input.token, 100) ?? ''))) throw new HttpError(403, 'bad_token');

  const zh = isChinese(text);
  const voice = zh ? env.VOICE_ZH : env.VOICE_EN;
  const key = await cacheKey(voice, text);
  const cache = caches.default;
  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, hit);

  const { success } = await env.SPEAK_LIMITER.limit({ key: clientIp(request) });
  if (!success) throw new HttpError(429, 'rate_limited');

  // A measured, slightly unhurried delivery suits a butler.
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${zh ? 'zh-CN' : 'en-GB'}">`
    + `<voice name="${voice}"><prosody rate="-4%">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'kuiduanzeng-assistant',
    },
    body: ssml,
  });
  if (!res.ok) {
    console.error('Azure TTS error', res.status, await res.text().catch(() => ''));
    throw new HttpError(502, 'tts_error');
  }

  const audio = new Response(res.body, {
    headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=2592000' },
  });
  ctx.waitUntil(cache.put(key, audio.clone()));
  return audio;
}
