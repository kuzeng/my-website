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
  headline: { lead: 'I build careful iOS apps.', accent: 'Next: models that run on the phone.' },

  subhead:
    'I’m an iOS engineer at Intuit. Before that I built calling and voicemail at Lululemon and claims features at USAA. I care about accessibility, test-driven architecture, and tooling that makes a team faster — and I’m exploring what to build with Apple’s on-device Foundation Models.',

  // Optional one-line status under the hero. null = not shown.
  openTo: null as string | null,

  // Headshot: shown as a small avatar next to the name in the header.
  headshot: '/images/headshot.webp' as string | null,
  seoDescription:
    'Kuiduan Zeng is an iOS engineer at Intuit working in Swift, SwiftUI and UIKit, building toward on-device AI. Projects, open source and experience.',
};

export const heroFacts = [
  { label: 'Now', value: 'iOS · Intuit' },
  { label: 'Before', value: 'Lululemon · USAA' },
  { label: 'Studied', value: 'M.S. SE, CSU Fullerton · B.S. Math-CS, UCSD' },
  { label: 'Based', value: 'Bay Area' },
];
