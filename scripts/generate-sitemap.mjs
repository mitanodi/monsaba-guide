import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL } from './site-config.mjs';

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
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tatari.json'), 'utf8'));
const tataRoutes = (tatari.families || []).map((family) => `/tata/${family.id}/`);
const preferred = ['/', '/beginner-guide/', '/search/', '/tata-tier/', '/evolution-priority/', '/consult/', '/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/normal-guide/', '/updates/', '/about/', '/about-data/', '/privacy/', '/attribute/grass/', '/attribute/water/', '/attribute/fire/', '/attribute/thunder/', '/attribute/rock/', ...tataRoutes];
const rank = new Map(preferred.map((route, index) => [route, index]));
const routes = walk(root)
  .filter((file) => !/<meta name="robots" content="[^\"]*noindex/i.test(fs.readFileSync(file, 'utf8')))
  .map(routeFor)
  .filter((route) => route !== '/attribute/earth/')
  .sort((a, b) => (rank.get(a) ?? 1000) - (rank.get(b) ?? 1000) || a.localeCompare(b));
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${BASE_URL}${route}</loc></url>`).join('\n')}\n</urlset>\n`;
const file = path.join(root, 'sitemap.xml');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== xml) {
    console.error('sitemap.xml が生成結果と一致しません。');
    process.exit(1);
  }
  console.log(`sitemap.xml 一致: ${routes.length} URL`);
} else {
  fs.writeFileSync(file, xml);
  console.log(`sitemap.xml を ${routes.length} URL で生成しました。`);
}
