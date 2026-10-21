// "How I build with AI". Only confirmed, first-hand practice goes here — no claims we can't stand behind.
// null → section absent in production; dev shows the questions below as a placeholder.
export type Practice = { title: string; body: string };

export const aiPractice: Practice[] | null = null;

// Prompts shown in the dev placeholder until the section is written.
export const aiQuestions = [
  'How do you actually use Claude Code / Cursor day to day? (planning, writing, refactors, tests, review?)',
  'Was the ImageFeedApp Swift 6 strict-concurrency migration done with an agent? What worked, what did you have to correct?',
  'How do you review agent-written code before it ships — what do you check, what do you never delegate?',
  'Anything public you can say about AI at Intuit (no internal details), or leave work out entirely?',
];
