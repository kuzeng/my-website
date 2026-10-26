export const profile = {
  name: 'Kuiduan Zeng',
  role: 'Software Engineer, iOS',
  company: 'Intuit',
  location: 'Santa Clara, CA · Bay Area',
  email: 'kuiduanz@gmail.com',
  linkedin: 'https://www.linkedin.com/in/kuiduan-zeng/',
  github: 'https://github.com/kuzeng',
  site: 'https://kuiduanzeng.com',

  // Hero statement, rendered as `lead` + grey `accent`.
  headline: { lead: 'I build mobile apps.', accent: 'Next, ones that get you.' },

  subhead:
    'At Intuit, I built much of the new QuickBooks Mobile home page, used by millions. Engagement doubled. Before that, I shipped the app 200+ Lululemon stores use to stay in touch with guests. Next: full-stack, AI-first, and leading projects.',

  // Optional one-line status under the hero. null = not shown.
  openTo: 'Open to interesting mobile + AI work. Say hi.' as string | null,

  // Headshot: shown as a small avatar next to the name in the header.
  headshot: '/images/headshot.webp' as string | null,
  seoDescription:
    'Kuiduan Zeng is an iOS engineer at Intuit working in Swift, SwiftUI and UIKit, building at the intersection of mobile and AI. Projects, open source and experience.',
};

export const heroFacts = [
  { label: 'Now', value: 'iOS · Intuit' },
  { label: 'Before', value: 'Lululemon · USAA' },
  { label: 'Studied', value: 'M.S. SE, CSU Fullerton · B.S. Math-CS, UCSD' },
  { label: 'Based', value: 'Bay Area' },
];
