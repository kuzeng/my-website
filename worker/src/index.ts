import type { Env } from './env';
import { handleAdmin } from './admin';
import { handleChat } from './chat';
import { sendDigest } from './digest';
import { HttpError, corsHeaders, json } from './http';
import { handleLead } from './lead';
import { handleSpeak } from './speak';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    const cors = corsHeaders(request, env);
    try {
      if (pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/api/admin/')) {
        return await handleAdmin(request, env);
      }
      if (pathname === '/api/chat' || pathname === '/api/lead' || pathname === '/api/speak') {
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
        if (!cors['access-control-allow-origin']) throw new HttpError(403, 'origin_not_allowed');
        const res = pathname === '/api/chat' ? await handleChat(request, env, ctx)
          : pathname === '/api/speak' ? await handleSpeak(request, env, ctx)
          : await handleLead(request, env, ctx);
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      if (pathname === '/health') return json({ ok: true });
      throw new HttpError(404, 'not_found');
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.code, message: err.message }, err.status, cors);
      console.error(err);
      return json({ error: 'internal' }, 500, cors);
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(sendDigest(env, env.ADMIN_URL || '/admin on your assistant Worker'));
  },
} satisfies ExportedHandler<Env>;
