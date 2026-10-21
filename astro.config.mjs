import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kuiduanzeng.com',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'always' },
});
