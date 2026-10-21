export interface Env {
  DB: D1Database;
  CHAT_LIMITER: RateLimit;
  LEAD_LIMITER: RateLimit;

  MODEL: string;
  KB_URL: string;
  ALLOWED_ORIGINS: string;
  NOTIFY_EMAIL: string;
  MAIL_FROM: string;
  DAILY_LIMIT: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ADMIN_EMAIL: string;
  ADMIN_URL: string;

  // Secrets
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  SESSION_SECRET?: string;
  DEV_ADMIN?: string; // "1" skips the Access check (local dev only)
  MOCK_MODEL?: string; // "1" answers with canned replies instead of calling Claude (local dev without an API key)
}
