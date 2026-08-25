import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const base = (process.argv.find((arg) => arg.startsWith('--base='))?.slice(7) || 'http://127.0.0.1:8765').replace(/\/$/, '');
const production = base === 'https://monster-survival.com';
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data/tatari.json'), 'utf8'));
const routes = ['/', '/beginner-guide/', '/friends/', '/about/', '/search/', '/updates/', '/privacy/', '/about-data/', '/consult/', '/guides/', '/attribute/', '/compare/', '/faq/', '/tata-tier/', '/evolution-priority/', '/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/normal-guide/', '/attribute/grass/', '/attribute/water/', '/attribute/fire/', '/attribute/thunder/', '/attribute/rock/', ...tatari.families.map((family) => `/tata/${family.id}/`)];
const jsonRoutes = ['/data/tatari.json', '/data/tata-skills.json', '/data/tier-ratings.json', '/data/evolution-priority.json', '/data/content-guides.json'];
const heroes = [
  ...Array.from({length:7}, (_, index) => `/assets/heroes/IMG_${6940 + index}.webp`),
  '/assets/heroes/top-main.webp',
  '/assets/heroes/evolution-main.webp',
  ...['top-main-480.webp', 'top-main-768.webp', 'evolution-main-480.webp', 'evolution-main-768.webp', 'IMG_6941-480.webp', 'IMG_6941-768.webp', 'IMG_6942-480.webp', 'IMG_6942-768.webp', 'IMG_6943-480.webp', 'IMG_6943-768.webp', 'IMG_6944-480.webp', 'IMG_6945-480.webp'].map((file) => `/assets/heroes/responsive/${file}`),
  '/favicon.ico',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];
const errors = [];

async function inBatches(items, size, worker) {
  for (let index = 0; index < items.length; index += size) await Promise.all(items.slice(index, index + size).map(worker));
}
await inBatches(routes, 1, async (route) => {
  let response;
  try { response = await fetch(`${base}${route}`); }
  catch (error) { errors.push(`${route}: fetch ${error.cause?.code || error.message}`); return; }
  if (response.status !== 200) return errors.push(`${route}: HTTP ${response.status}`);
  const html = await response.text();
  if (!/<h1(?:\s[^>]*)?>/.test(html)) errors.push(`${route}: H1 missing`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${route}: title missing`);
  if (route.startsWith('/tata/')) {
    const id = route.split('/')[2];
    if (!html.includes(`${base}/tata/${id}/`) && production) errors.push(`${route}: canonical missing`);
  }
});
await inBatches(jsonRoutes, 1, async (route) => {
  let response;
  try { response = await fetch(`${base}${route}`); }
  catch (error) { errors.push(`${route}: fetch ${error.cause?.code || error.message}`); return; }
  if (response.status !== 200) return errors.push(`${route}: HTTP ${response.status}`);
  try { await response.json(); } catch (error) { errors.push(`${route}: JSON parse ${error.message}`); }
});
await inBatches(heroes, 1, async (route) => {
  let response;
  try { response = await fetch(`${base}${route}`); }
  catch (error) { errors.push(`${route}: fetch ${error.cause?.code || error.message}`); return; }
  if (response.status !== 200) errors.push(`${route}: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  const validType = route.endsWith('.webp')
    ? contentType.includes('image/webp')
    : route.endsWith('.png')
      ? contentType.includes('image/png')
      : ['image/x-icon', 'image/vnd.microsoft.icon'].some((type) => contentType.includes(type));
  if (!validType) errors.push(`${route}: content-type ${contentType}`);
  await response.arrayBuffer();
});
if (production) {
  const redirect = await fetch(`${base}/attribute/earth/`, {redirect:'manual'});
  if (![301, 308].includes(redirect.status)) errors.push(`/attribute/earth/: HTTP ${redirect.status}`);
  if (new URL(redirect.headers.get('location') || '', base).pathname !== '/attribute/rock/') errors.push('/attribute/earth/: redirect destination');
  const missing = await fetch(`${base}/this-page-does-not-exist/`);
  const missingHtml = await missing.text();
  if (missing.status !== 404) errors.push(`/this-page-does-not-exist/: HTTP ${missing.status}`);
  if (!missingHtml.includes('noindex,follow')) errors.push('Production 404: noindex,follow missing');
}
if (errors.length) {
  console.error(`HTTP回帰失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`HTTP回帰成功: ${routes.length} pages / ${jsonRoutes.length} JSON / ${heroes.length} Hero${production ? ' / earth redirect / custom 404' : ''}`);
