import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const args = new Map(process.argv.slice(2).map((arg, index, all) => arg.startsWith('--') ? [arg, all[index + 1]?.startsWith('--') ? true : all[index + 1]] : null).filter(Boolean));
const from = args.get('--from') || BASE_URL;
const to = args.get('--to');
const dryRun = args.has('--dry-run');
if (!to || !/^https:\/\/[a-z0-9.-]+$/i.test(to)) throw new Error('--to に https:// から始まるoriginを指定してください。');
if (!dryRun && !args.has('--apply')) throw new Error('実変更には --apply が必要です。確認だけなら --dry-run を指定してください。');

const extensions = new Set(['.html', '.xml', '.txt', '.mjs', '.js', '.webmanifest']);
const ignored = new Set(['.git', '.vercel', 'node_modules', 'assets', 'data']);
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return extensions.has(path.extname(entry.name)) && full !== path.resolve(process.argv[1]) ? [full] : [];
  });
}
const categories = {canonical:0, 'og:url':0, image:0, 'JSON-LD':0, robots:0, sitemap:0, other:0};
const changes = [];
for (const file of walk(root)) {
  const original = fs.readFileSync(file, 'utf8');
  const count = original.split(from).length - 1;
  if (!count) continue;
  const relative = path.relative(root, file).replaceAll('\\', '/');
  for (const line of original.split(/\r?\n/)) {
    const occurrences = line.split(from).length - 1;
    if (!occurrences) continue;
    const category = line.includes('rel="canonical"') ? 'canonical' : line.includes('property="og:url"') ? 'og:url' : /og:image|twitter:image/.test(line) ? 'image' : line.includes('application/ld+json') ? 'JSON-LD' : relative === 'robots.txt' ? 'robots' : relative === 'sitemap.xml' ? 'sitemap' : 'other';
    categories[category] += occurrences;
  }
  changes.push({file:relative, count});
  if (!dryRun) fs.writeFileSync(file, original.replaceAll(from, to));
}
console.log(`${dryRun ? 'DRY RUN' : 'UPDATED'}: ${from} -> ${to}`);
console.log(`変更対象ファイル数: ${changes.length}`);
console.log(`変更URL数: ${changes.reduce((sum, item) => sum + item.count, 0)}`);
console.log(`対象カテゴリ: ${Object.entries(categories).filter(([, count]) => count).map(([name, count]) => `${name}=${count}`).join(', ')}`);
