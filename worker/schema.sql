-- Knowledge the assistant may share. Only status = 'live' rows reach the model; 'draft' rows are the interview questionnaire.
CREATE TABLE IF NOT EXISTS facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT 'general' CHECK (audience IN ('recruiter', 'engineer', 'friend', 'general')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Every question visitors ask. outcome = what the model did; triage = your to-do state ('new' = waiting for an answer).
CREATE TABLE IF NOT EXISTS questions_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('answered', 'unknown', 'declined')),
  section TEXT,
  triage TEXT NOT NULL CHECK (triage IN ('new', 'resolved', 'ignored')),
  lang TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS questions_triage ON questions_log (triage, created_at);
CREATE INDEX IF NOT EXISTS questions_created ON questions_log (created_at);

-- Visitors who left an email when the assistant couldn't answer. Never sent to the model.
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  question TEXT,
  session_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-day chat count, for the global daily cap.
CREATE TABLE IF NOT EXISTS counters (
  day TEXT PRIMARY KEY,
  chats INTEGER NOT NULL DEFAULT 0
);
