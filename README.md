# kuiduanzeng.com

- `npm install` · `npm run dev` (local) · `npm run build` (output in `dist/`) · `npm run og` (regenerates `public/og-image.png`)
- Content lives in `src/data/*.ts`. Design tokens live in `src/styles/global.css`.
- **Placeholders show only in `npm run dev`** (dashed blue boxes and CONFIRM tags). Anything unconfirmed is left out of production builds:
  - `featured.ts`: the flagship iOS + AI app. `null` means the section is absent.
  - `ai.ts`: "Building with AI". `null` means the section is absent.
  - `now.ts`: lines with `confirmed: false` are dropped.
  - `profile.openTo`: `null` means no status line under the hero.
- Avatar: drop your Memoji at `public/images/memoji.png` (square, transparent background, ~256px) and it replaces the photo automatically.
- Layout: at ≥1000×640 the page is a folded phone (cover screen = `Hero.astro`). Slide to unfold, scroll, or follow any in-page link and it opens into a big inner screen: left half `About.astro`, right half the sections. Logic in `src/scripts/fold.ts`, geometry in `global.css`. Phones and no-JS get a normal page.
- Deploy: GitHub Pages via `.github/workflows/deploy.yml` (set the Pages source to "GitHub Actions"). `public/CNAME` = kuiduanzeng.com.
- The public site intentionally has no internal project details or metrics.

## AI assistant ("Ask Kuiduan")

A Siri-style button under the phone. Visitors ask by voice or text; Claude Haiku 5.5 answers from `/kb.json` (built from `src/data/*.ts`, confirmed content only) plus the private Q&A you write on `/admin`. Unknown questions are logged for you to answer; visitors can leave their email.

- Front end: `src/components/Assistant.astro` + `src/scripts/assistant.ts`. Talks to the page through events: `assistant:state` (island waveform), `duo:navigate` / `duo:fold` (handled in `fold.ts`). Not rendered unless `PUBLIC_ASSISTANT_API` is set.
- Back end: `worker/` (Cloudflare Worker + D1). `/api/chat`, `/api/lead`, `/admin`, and a daily digest cron.
- Anything you put in the knowledge base can be repeated to visitors. Only write what you're happy to share.

**Local dev**
1. `cd worker && npm install && cp .dev.vars.example .dev.vars` (add your `ANTHROPIC_API_KEY`, or set `MOCK_MODEL=1` for canned replies).
2. `npm run db:init:local` once, then `npm run dev` (port 8787). Admin: http://localhost:8787/admin
3. In the site root: `cp .env.example .env`, then `npm run dev`.

**Deploy**
1. `cd worker && npx wrangler login && npx wrangler d1 create assistant`, then paste the `database_id` into `wrangler.toml`.
2. `npm run db:init:remote`.
3. Secrets: `npx wrangler secret put ANTHROPIC_API_KEY`, then the same for `RESEND_API_KEY`, `TURNSTILE_SECRET`, and `SESSION_SECRET` (any long random string).
4. `npm run deploy`. Note the Worker URL (or attach `api.kuiduanzeng.com` once DNS is on Cloudflare) and set `ADMIN_URL` in `wrangler.toml`.
5. Cloudflare Zero Trust → Access → add a self-hosted application for `<worker host>/admin` and `<worker host>/api/admin/*`, allowing only your email. Put the team domain and the application's AUD tag in `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD`, then redeploy.
6. GitHub repo → Settings → Variables: `PUBLIC_ASSISTANT_API` (the Worker URL) and `PUBLIC_TURNSTILE_SITE_KEY`. Push to deploy the site.
7. Set a monthly spend limit in the Anthropic Console.
