import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const assetVersion = '20260825-affiliate';
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'assets', 'data', 'scripts', 'promo']);
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
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  if (!html.includes('/growth.js')) html = html.replace('</body>', '<script src="/growth.js" defer></script></body>');
  if (!html.includes('/monetization.js')) {
    html = html.replace(/(<script src="\/growth\.js(?:\?[^\"]*)?" defer><\/script>)/, '<script src="/monetization.js" defer></script>$1');
  }
  for (const asset of ['styles.css', 'app.js', 'site.js', 'monetization.js', 'growth.js', 'search/search.js', 'compare/compare.js']) {
    html = html.replaceAll(`"/${asset}"`, `"/${asset}?v=${assetVersion}"`);
    html = html.replaceAll(`"./${asset}"`, `"./${asset}?v=${assetVersion}"`);
  }
  if (html === before) continue;
  fs.writeFileSync(file, html);
  changed += 1;
}
console.log(`Growth foundation applied: ${changed} HTML updated`);
