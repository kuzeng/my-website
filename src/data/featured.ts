// The iOS + AI flagship app. Built in its own session; filled in here as it becomes real.
//
// null       → section is absent from the page (production) / placeholder preview (dev)
// 'building' → shows the public repo link and a dated status line
// 'shipped'  → shows screens and the architecture note
export type Featured = {
  status: 'building' | 'shipped';
  title: string;
  oneLiner: string;
  statusNote: string; // e.g. 'Building in public since Oct 2026'
  points: string[];
  tags: string[];
  repo: string;
  screens?: { src: string; alt: string; width: number; height: number }[];
};

export const featured: Featured | null = null;
