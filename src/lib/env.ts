import fs from 'node:fs';
import path from 'node:path';

// Dev-only placeholders mark content still waiting on Kuiduan's input.
// They are never rendered by `astro build`, so nothing unconfirmed can ship.
export const showPlaceholders = import.meta.env.DEV;

// Avatar: your exported Memoji if present, otherwise the photo.
export const memojiPath = '/images/memoji.png';
export const avatarSrc = fs.existsSync(path.join(process.cwd(), 'public', memojiPath)) ? memojiPath : '/images/headshot-192.webp';
export const avatarIsMemoji = avatarSrc === memojiPath;
