// "How I build with AI". Only confirmed, first-hand practice goes here — no claims we can't stand behind.
// null → section absent in production; dev shows the questions below as a placeholder.
export type Practice = { title: string; body: string };

export const aiPractice: Practice[] | null = [
  {
    title: 'Agents type. I think.',
    body: 'Claude Code and Cursor run through my whole loop — planning, writing, refactors, tests, review — and I orchestrate several agents in parallel on bigger changes.',
  },
  {
    title: 'No code I can’t explain.',
    body: 'If an agent writes something I don’t understand, it doesn’t ship. The architecture calls, and the reasoning behind them, stay with me.',
  },
  {
    title: 'Automating the pager.',
    body: 'At Intuit I built AI workflows that summarize alerts and surface critical user reviews, giving on-call engineers back ~2 hours a week.',
  },
  {
    title: 'Hand-written, on purpose.',
    body: 'ImageFeedApp’s Swift 6 migration was all me — a side project to keep my concurrency and clean-architecture fundamentals sharp, so I can judge what agents write.',
  },
];

// Prompts shown in the dev placeholder until the section is written.
export const aiQuestions = [
  'How do you actually use Claude Code / Cursor day to day? (planning, writing, refactors, tests, review?)',
  'Was the ImageFeedApp Swift 6 strict-concurrency migration done with an agent? What worked, what did you have to correct?',
  'How do you review agent-written code before it ships — what do you check, what do you never delegate?',
  'Anything public you can say about AI at Intuit (no internal details), or leave work out entirely?',
];
