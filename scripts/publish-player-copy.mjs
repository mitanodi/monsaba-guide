import fs from 'node:fs';
import path from 'node:path';
import { playerFacingHtml } from '../lib/public-copy.mjs';
const root = path.resolve(import.meta.dirname, '..');
const ignored = new Set(['.git', '.vercel', 'node_modules', 'assets', 'docs', 'tests', 'promo']);
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => ignored.has(entry.name) ? [] : entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith('.html') ? [path.join(dir, entry.name)] : []);
let changed = 0;
for (const file of walk(root)) {
  const before = fs.readFileSync(file, 'utf8'), relative = path.relative(root,file).replaceAll('\\','/');
  const after = playerFacingHtml(before, relative);
  if (after !== before) {fs.writeFileSync(file, after); changed++;}
}
console.log(`Player-facing copy published: ${changed} pages updated. Internal evidence and data retained.`);
