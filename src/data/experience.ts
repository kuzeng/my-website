export type Role = {
  company: string;
  title: string;
  type?: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
  stack: string[];
  sortKey: string; // YYYY-MM of start, for merging with education in the timeline
};

export const experience: Role[] = [
  {
    company: 'Intuit',
    title: 'Software Engineer, iOS',
    location: 'Mountain View, CA',
    start: 'Feb 2025',
    end: 'Present',
    sortKey: '2025-02',
    bullets: [
      'Ship features across the iOS app: home-page widgets, in-app prompts, and CRM flows.',
      'Build internal release tooling and shared, accessible UI components in SwiftUI and UIKit.',
    ],
    stack: ['Swift', 'SwiftUI', 'UIKit', 'Accessibility', 'Crashlytics', 'Claude Code'],
  },
  {
    company: 'Lululemon Athletica',
    title: 'iOS Engineer',
    type: 'Contract',
    location: 'Remote',
    start: 'Oct 2021',
    end: 'May 2023',
    sortKey: '2021-10',
    bullets: [
      'Built the iOS calling app that store associates use to talk with guests, including VoIP calls, voicemail, and offline support.',
    ],
    stack: ['Swift', 'CallKit', 'PushKit', 'Twilio Voice', 'AVFoundation', 'SQLite'],
  },
  {
    company: 'USAA',
    title: 'Mobile Developer',
    type: 'Contract',
    location: 'Remote',
    start: 'Apr 2021',
    end: 'Sep 2021',
    sortKey: '2021-04',
    bullets: ['Shipped claims features in USAA’s iOS and Android apps.'],
    stack: ['Swift', 'Kotlin'],
  },
];
