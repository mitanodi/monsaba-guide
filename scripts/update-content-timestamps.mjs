import fs from 'node:fs';
import path from 'node:path';
import { formatJapanDateTime } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const freshness = JSON.parse(fs.readFileSync(path.join(root, 'data', 'page-freshness.json'), 'utf8'));
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'assets', 'data', 'scripts', 'promo', 'en', 'zh-cn', 'i18n']);
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
function routeFreshness(route) {
  const exact = freshness.routes?.[route];
  const wildcard = Object.entries(freshness.routes || {}).find(([pattern]) => pattern.endsWith('*') && matches(pattern, route))?.[1];
  if (!exact && !wildcard) return null;
  return { ...freshness.default, ...(wildcard || {}), ...(exact || {}) };
}

let changed = 0;
for (const file of walk(root)) {
  const route = toRoute(file);
  const updated = routeFreshness(route)?.updated;
  if (!updated) continue;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replaceAll(/"dateModified":"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}\+09:00)?"/g, `"dateModified":"${updated}"`);
  html = html.replaceAll(/最終更新：\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{2}:\d{2}:\d{2}\s+JST)?/g, `最終更新：${formatJapanDateTime(updated)}`);
  html = html.replaceAll(/最終更新\s+\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{2}:\d{2}:\d{2}\s+JST)?/g, `最終更新 ${formatJapanDateTime(updated)}`);
  html = html.replaceAll(/最終更新\s+<time datetime="[^"]+">[^<]+<\/time>/g, `最終更新 <time datetime="${updated}">${formatJapanDateTime(updated)}</time>`);
  html = html.replaceAll(/最終更新：\d{4}年\d{1,2}月\d{1,2}日(?:\s+\d{2}:\d{2}:\d{2}\s+JST)?/g, `最終更新：${formatJapanDateTime(updated)}`);
  if (html === before) continue;
  fs.writeFileSync(file, html);
  changed += 1;
}
console.log(`ページ別の意味ある更新日を反映しました: ${changed} HTML`);
