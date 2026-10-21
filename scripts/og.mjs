// Renders public/og-image.png (1200×630) in the site's type and palette.
// Run: npm run og  (satori is content-box: root size = 1200×630 minus padding)
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const root = process.cwd();
const font = (file) => fs.readFileSync(path.join(root, 'node_modules', '@fontsource', 'inter', 'files', file));
const fonts = [
  { name: 'Inter', data: font('inter-latin-500-normal.woff'), weight: 500, style: 'normal' },
  { name: 'Inter', data: font('inter-latin-600-normal.woff'), weight: 600, style: 'normal' },
];

const bg = '#fcfbf8', ink = '#1f1e1c', faint = '#94908a', muted = '#74716a';
const h = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

const tree = h('div', { width: 1040, height: 500, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 80px 66px', background: bg, color: ink, fontFamily: 'Inter' },
  h('div', { display: 'flex', alignItems: 'center', gap: 14, alignSelf: 'flex-start', height: 50, padding: '0 26px 0 20px', borderRadius: 999, background: '#000', color: '#f5f5f7', fontSize: 22, fontWeight: 500 },
    h('div', { width: 11, height: 11, borderRadius: 999, background: '#32d74b' }),
    h('div', {}, 'Kuiduan Zeng · iOS Engineer'),
  ),
  h('div', { display: 'flex', flexDirection: 'column', fontSize: 72, fontWeight: 600, lineHeight: 1.06, letterSpacing: -2.8 },
    h('div', {}, 'I build careful iOS apps.'),
    h('div', { color: faint }, 'Next: models that run'),
    h('div', { color: faint }, 'on the phone.'),
  ),
  h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 24, fontWeight: 500, color: muted },
    h('div', {}, 'Swift · SwiftUI · UIKit · Bay Area'),
    h('div', { color: ink }, 'kuiduanzeng.com'),
  ),
);

const svg = await satori(tree, { width: 1200, height: 630, fonts });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
fs.writeFileSync(path.join(root, 'public', 'og-image.png'), png);
console.log(`wrote public/og-image.png (${(png.length / 1024).toFixed(0)} KB)`);
