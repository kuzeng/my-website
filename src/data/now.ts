// "Currently". confirmed: false lines show in dev with a CONFIRM tag and are dropped from production builds.
// `short` is what the header's Dynamic Island cycles through.
export type NowItem = { label: string; text: string; short: string; confirmed: boolean };

export const nowUpdated = 'Oct 2026';

export const now: NowItem[] = [
  { label: 'Day job', text: 'iOS at Intuit — SwiftUI, UIKit, and a lot of accessibility.', short: 'iOS at Intuit', confirmed: true },
  { label: 'Recently', text: 'Moved ImageFeedApp to Swift 6 with strict concurrency set to complete.', short: 'Swift 6, strict concurrency', confirmed: true },
  { label: 'Building', text: 'An on-device AI app for iOS 26 on Apple’s Foundation Models.', short: 'Building on-device AI', confirmed: false },
  { label: 'Listening', text: 'EDM — [what’s on repeat right now?]', short: 'On repeat: [track]', confirmed: false },
  { label: 'Off the keyboard', text: 'Sports — [which ones?]', short: '[sport]', confirmed: false },
  { label: 'Reading', text: '[a book, paper, or post you’d recommend]', short: 'Reading: [title]', confirmed: false },
];
