import fs from 'node:fs';
import path from 'node:path';
import { renderHeader } from './shared-layout.mjs';

const root = path.resolve(import.meta.dirname, '..');
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'promo']);
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.html')) files.push(file);
  }
}
const routeFor = (file) => {
  if (path.basename(file) === '404.html') return '/404/';
  const relative = path.relative(root, path.dirname(file)).replaceAll('\\', '/');
  return relative ? `/${relative}/` : '/';
};
walk(root);
let changed = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  let next = source.replace(/<header class="site-header">[\s\S]*?<\/header>/, renderHeader(routeFor(file)));
  if (!next.includes('src="/family-display.js"')) {
    next = next.replace(/<script src="\/site\.js/, '<script src="/family-display.js"></script><script src="/site.js');
  }
  if (next === source && !source.includes(renderHeader(routeFor(file)))) throw new Error(`${path.relative(root, file)}: 共通headerを更新できません`);
  if (next !== source) {
    fs.writeFileSync(file, next);
    changed += 1;
  }
}
console.log(`共通ナビを ${files.length} HTMLで生成しました（更新 ${changed}）`);
