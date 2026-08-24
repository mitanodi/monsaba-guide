import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { BASE_URL, LAST_MODIFIED } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'assets', 'data', 'scripts']);
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name === 'index.html' ? [full] : [];
  });
}
const routeFor = (file) => {
  const relative = path.relative(root, path.dirname(file)).replaceAll('\\', '/');
  return relative ? `/${relative}/` : '/';
};
const gitDateCache = new Map();
function gitDate(relativeFile) {
  if (gitDateCache.has(relativeFile)) return gitDateCache.get(relativeFile);
  let date = LAST_MODIFIED;
  try {
    const result = execFileSync('git', ['log', '-1', '--format=%cs', '--', relativeFile], { cwd: root, encoding: 'utf8' }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(result)) date = result;
  } catch {
    // Git情報を利用できない生成環境では、明示した最終更新日を安定したfallbackにする。
  }
  gitDateCache.set(relativeFile, date);
  return date;
}
function dependenciesFor(route, htmlFile) {
  const dependencies = [path.relative(root, htmlFile).replaceAll('\\', '/')];
  if (route === '/') dependencies.push('data/tatari.json', 'data/tata-skills.json', 'scripts/generate-core-pages.mjs');
  if (route === '/tata-tier/') dependencies.push('data/tatari.json', 'data/tier-ratings.json', 'scripts/generate-core-pages.mjs');
  if (route === '/evolution-priority/') dependencies.push('data/tatari.json', 'data/tata-skills.json', 'data/tier-ratings.json', 'data/evolution-priority.json', 'scripts/generate-core-pages.mjs');
  if (route.startsWith('/tata/')) dependencies.push('data/tatari.json', 'data/tata-skills.json', 'data/tier-ratings.json', 'data/evolution-priority.json', 'scripts/generate-tata-pages.mjs');
  if (route.startsWith('/attribute/')) dependencies.push('data/tatari.json', 'data/tata-skills.json');
  if (route === '/beginner-guide/') dependencies.push('data/tatari.json', 'data/tier-ratings.json', 'data/evolution-priority.json', 'data/content-guides.json', 'scripts/generate-beginner-guide.mjs');
  if (['/normal-guide/', '/zombie-rush/', '/boss-rally/', '/badge-dojo/'].includes(route)) dependencies.push('data/content-guides.json');
  return [...new Set(dependencies)];
}
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tatari.json'), 'utf8'));
const tataRoutes = (tatari.families || []).map((family) => `/tata/${family.id}/`);
const preferred = ['/', '/beginner-guide/', '/friends/', '/search/', '/tata-tier/', '/evolution-priority/', '/consult/', '/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/normal-guide/', '/updates/', '/about/', '/about-data/', '/privacy/', '/attribute/grass/', '/attribute/water/', '/attribute/fire/', '/attribute/thunder/', '/attribute/rock/', ...tataRoutes];
const rank = new Map(preferred.map((route, index) => [route, index]));
const pages = walk(root)
  .filter((file) => !/<meta name="robots" content="[^\"]*noindex/i.test(fs.readFileSync(file, 'utf8')))
  .map((file) => ({ file, route: routeFor(file) }))
  .filter(({ route }) => route !== '/attribute/earth/')
  .sort((a, b) => (rank.get(a.route) ?? 1000) - (rank.get(b.route) ?? 1000) || a.route.localeCompare(b.route));
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(({ file: htmlFile, route }) => {
  const lastmod = dependenciesFor(route, htmlFile).map(gitDate).sort().at(-1);
  return `  <url><loc>${BASE_URL}${route}</loc><lastmod>${lastmod}</lastmod></url>`;
}).join('\n')}\n</urlset>\n`;
const file = path.join(root, 'sitemap.xml');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== xml) {
    console.error('sitemap.xml が生成結果と一致しません。');
    process.exit(1);
  }
  console.log(`sitemap.xml 一致: ${pages.length} URL（Git・依存データ由来のlastmod）`);
} else {
  fs.writeFileSync(file, xml);
  console.log(`sitemap.xml を ${pages.length} URLと実更新lastmodで生成しました。`);
}
