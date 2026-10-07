import fs from 'node:fs';
import path from 'node:path';
import { normalizeSiteAssets, assetPolicy } from './lib/asset-cache.mjs';

const root = path.resolve(import.meta.dirname, '..');
const errors = [];
const result = normalizeSiteAssets(root, { check: true });
if (result.changed.length) errors.push(`Non-fixed CSS/JS URLs: ${result.changed.join(', ')}`);
if (assetPolicy.strategy !== 'revalidate' || assetPolicy.cacheControl !== 'public, no-cache' || Object.hasOwn(assetPolicy, 'version')) errors.push('Invalid revalidation policy');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const cacheValues = pathname => config.headers.filter(rule => !rule.has && !rule.missing && new RegExp(`^${rule.source}$`).test(pathname))
  .flatMap(rule => rule.headers.filter(header => header.key.toLowerCase() === 'cache-control').map(header => header.value));
for (const pathname of ['/styles.css','/site.js','/styles/aug30-update.css','/assets/aug30-update.css','/assets/future.js','/en/team-builder/team-builder.js','/i18n/en-runtime.js','/calendar/calendar-core.js']) {
  if (JSON.stringify(cacheValues(pathname)) !== JSON.stringify([assetPolicy.cacheControl])) errors.push(`Conflicting/missing CSS/JS headers: ${pathname}`);
}
if (cacheValues('/assets/official/tata/purabi/t1-512.webp').join() !== 'public, max-age=31536000, immutable') errors.push('Image cache changed');
if (cacheValues('/api/board.js').length) errors.push('API cache changed');
for (const [oldPath, newPath] of Object.entries(assetPolicy.migrations)) for (const pathname of [oldPath, newPath]) {
  if (!fs.existsSync(path.join(root, pathname.slice(1)))) errors.push(`Migration compatibility file missing: ${pathname}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Fixed asset cache validated: ${result.scanned} HTML; no conflicting immutable CSS/JS rules.`);
