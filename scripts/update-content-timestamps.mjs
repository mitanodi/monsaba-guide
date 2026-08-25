import fs from 'node:fs';
import path from 'node:path';
import { LAST_MODIFIED, formatJapanDateTime } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'monetization.json'), 'utf8'));
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'assets', 'data', 'scripts', 'promo']);
const matches = (pattern, route) => pattern.endsWith('*') ? route.startsWith(pattern.slice(0, -1)) : route === pattern;
const toRoute = (file) => {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -10)}`;
  return `/${relative}`;
};
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

let changed = 0;
for (const file of walk(root)) {
  const route = toRoute(file);
  if (!config.pageProfiles.some((rule) => matches(rule.match, route))) continue;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replaceAll(/"dateModified":"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}\+09:00)?"/g, `"dateModified":"${LAST_MODIFIED}"`);
  html = html.replaceAll(/最終更新\s+\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{2}:\d{2}:\d{2}\s+JST)?/g, `最終更新 ${formatJapanDateTime(LAST_MODIFIED)}`);
  html = html.replaceAll(/最終更新\s+<time datetime="[^"]+">[^<]+<\/time>/g, `最終更新 <time datetime="${LAST_MODIFIED}">${formatJapanDateTime(LAST_MODIFIED)}</time>`);
  if (html === before) continue;
  fs.writeFileSync(file, html);
  changed += 1;
}
console.log(`最終更新時刻を ${LAST_MODIFIED} に統一しました: ${changed} HTML`);
