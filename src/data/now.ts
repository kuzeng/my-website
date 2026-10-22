// "Currently". confirmed: false lines show in dev with a CONFIRM tag and are dropped from production builds.
// `short` is what the header's Dynamic Island cycles through.
export type NowItem = { label: string; text: string; short: string; confirmed: boolean };

export const nowUpdated = 'Oct 2026';

export const now: NowItem[] = [
  { label: 'Day job', text: 'iOS at Intuit — SwiftUI, UIKit, and a lot of accessibility.', short: 'iOS at Intuit', confirmed: true },
  { label: 'Recently', text: 'Moved ImageFeedApp to Swift 6 with strict concurrency set to complete.', short: 'Swift 6, strict concurrency', confirmed: true },
  { label: 'Building', text: 'An AI festival planner: hand it your Spotify, get the best set-by-set route through Coachella. On-device Foundation Models + Claude API.', short: 'Building an AI festival planner', confirmed: true },
  { label: 'Listening', text: 'What a Life — John Summit, on repeat.', short: 'On repeat: What a Life', confirmed: true },
  { label: 'Off the keyboard', text: 'Tennis.', short: 'Tennis', confirmed: true },
  { label: 'Fuel', text: 'Lava cake. Non-negotiable.', short: 'Fueled by lava cake', confirmed: true },
  { label: 'Reading', text: 'The Beginning of Infinity — David Deutsch.', short: 'Reading: The Beginning of Infinity', confirmed: true },
];
