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
      'Core engineer on the QuickBooks Mobile home page redesign, used by millions — engagement rate doubled.',
      'Ship CRM flows, in-app prompts, and shared, accessible UI components in SwiftUI and UIKit.',
      'Built AI workflows that summarize alerts and surface critical user reviews, giving on-call engineers back ~2 hours a week.',
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
      'Built the iOS app store associates use to stay in touch with guests — VoIP calls, call history, voicemail playback, offline support.',
      'Launched in 200+ stores and used by thousands of associates.',
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
    bullets: ['Shipped claims and roadside assistance features in USAA’s iOS and Android apps, including real-time tow-truck location updates.'],
    stack: ['Swift', 'Kotlin'],
  },
];
