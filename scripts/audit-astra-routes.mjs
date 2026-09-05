import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const base = process.argv.find(x => x.startsWith('--base='))?.slice(7) || 'http://127.0.0.1:8765';
const ignored = new Set(['.git', '.vercel', 'node_modules', 'promo', '.openai', 'docs']);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => ignored.has(e.name) ? [] : e.isDirectory() ? walk(path.join(dir, e.name)) : e.name === 'index.html' ? [path.join(dir, e.name)] : []);
}
const files = walk(root);
const pages = files.map(file => {
  const html = fs.readFileSync(file, 'utf8');
  const route = '/' + path.relative(root, file).replaceAll('\\', '/').replace(/index\.html$/, '');
  const value = re => html.match(re)?.[1] || '';
  const issues = [];
  const title = value(/<title>([^<]+)<\/title>/i);
  const h1Count = [...html.matchAll(/<h1(?:\s|>)/gi)].length;
  const canonical = value(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i);
  const indexable = !/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html);
  if (!title) issues.push('missing title');
  if (h1Count !== 1) issues.push(`H1 count ${h1Count}`);
  if (!canonical) issues.push('missing canonical');
  if (indexable && !html.includes('hreflang=')) issues.push('missing hreflang');
  for (const match of html.matchAll(/<(a|img)\b[^>]*(?:href|src)="([^"]+)"/gi)) {
    const url = new URL(match[2].replaceAll('&amp;', '&'), 'https://monster-survival.com'+route);
    if (url.origin !== 'https://monster-survival.com' || url.pathname.startsWith('/api/')) continue;
    const target = path.join(root, decodeURIComponent(url.pathname));
    if (!fs.existsSync(target) && !fs.existsSync(path.join(target, 'index.html'))) issues.push(`missing ${match[1]} ${url.pathname}`);
  }
  return { route, indexable, title, h1Count, canonical, issues };
});
for (let start = 0; start < pages.length; start += 4) {
  await Promise.all(pages.slice(start, start+4).map(async page => {
    try {
      const response = await fetch(base+page.route+'?qa=astra-audit', { signal: AbortSignal.timeout(20000) });
      page.http = response.status;
      await response.arrayBuffer();
      if (page.http !== 200) page.issues.push(`HTTP ${page.http}`);
    } catch (error) { page.issues.push(`HTTP error ${error.message}`); }
  }));
}
const report = { base, total: pages.length, indexable: pages.filter(p=>p.indexable).length, failures: pages.filter(p=>p.issues.length), routes: pages.map(p=>p.route) };
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
