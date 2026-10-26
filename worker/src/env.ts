export interface Env {
  DB: D1Database;
  CHAT_LIMITER: RateLimit;
  LEAD_LIMITER: RateLimit;
  SPEAK_LIMITER: RateLimit;

  MODEL: string;
  KB_URL: string;
  ALLOWED_ORIGINS: string;
  NOTIFY_EMAIL: string;
  MAIL_FROM: string;
  DAILY_LIMIT: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ADMIN_URL: string;
  VOICE_EN: string; // Azure neural voice names for Jarvis
  VOICE_ZH: string;

  // Secrets
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  SESSION_SECRET?: string;
  ADMIN_EMAIL?: string; // the only email allowed into /admin
  AZURE_SPEECH_KEY?: string;    // Azure Speech (free tier F0). Unset: the page uses the browser's voice
  AZURE_SPEECH_REGION?: string; // e.g. "eastus"
  DEV_ADMIN?: string; // "1" skips the Access check (local dev only)
  MOCK_MODEL?: string; // "1" answers with canned replies instead of calling Claude (local dev without an API key)
}
