export type Project = {
  title: string;
  kind: string;
  period: string;
  summary: string;
  points: string[];
  tags: string[];
  image?: { base: string; alt: string; width: number; height: number };
  links: { label: string; href: string }[];
};

export const projects: Project[] = [
  {
    title: 'Modular iOS Media Architecture',
    kind: 'iOS app · ImageFeedApp',
    period: '2025 – 2026',
    summary:
      'An image feed app with paginated loading, image comments, and an offline cache. I use it to practice modular, test-driven iOS design, and recently migrated it to Swift 6 with strict concurrency.',
    points: [
      'Migrated to Swift 6 with strict concurrency set to complete, replaced Combine with async/await across feed, image, comments, and pagination loading, and made view protocols MainActor-isolated.',
      'Separate modules for core feed logic, API, iOS UI, and app composition, each with its own tests: unit, snapshot, API end-to-end, cache integration, and UI acceptance tests, running in CI.',
      'Thread-safe Core Data and in-memory caching with prefetching and request cancellation; profiled scrolling in Instruments and moved image decoding off the main thread to remove scroll hitches.',
      'Requirements written as user stories and use cases, covering happy and sad paths, in the README.',
    ],
    tags: ['Swift 6', 'Swift Concurrency', 'UIKit', 'Core Data', 'XCTest', 'Snapshot tests', 'CI'],
    image: { base: '/images/feed-app', alt: 'Module architecture diagram (feed and comments scenes, composers, UIKit layer) beside the running image-feed app', width: 960, height: 634 },
    links: [{ label: 'View on GitHub', href: 'https://github.com/kuzeng/ImageFeedApp' }],
  },
  {
    title: 'Firefox for iOS',
    kind: 'Open-source contribution',
    period: '2024',
    summary:
      'A merged pull request to Mozilla’s Firefox for iOS, part of moving screens onto the app’s shared typography system.',
    points: [
      'Updated the wallpaper selector to use the FXFontStyles design-system fonts instead of the older DefaultDynamicFontHelper, with before/after screenshots for review.',
      'Worked through Mozilla’s ticket, contribution, and code review process in a large production Swift codebase.',
    ],
    tags: ['Swift', 'UIKit', 'Dynamic Type', 'Open source'],
    links: [{ label: 'View merged PR #21247', href: 'https://github.com/mozilla-mobile/firefox-ios/pull/21247' }],
  },
];
