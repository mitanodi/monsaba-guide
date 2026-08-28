import fs from 'node:fs';
import path from 'node:path';
import { renderHeader } from './shared-layout.mjs';

const root = path.resolve(import.meta.dirname, '..');
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'promo']);
const files = [];
const retrySignal = new Int32Array(new SharedArrayBuffer(4));
function read(file) { for (let attempt = 0; attempt < 12; attempt += 1) { try { return fs.readFileSync(file, 'utf8'); } catch (error) { if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error; Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1)); } } }
function write(file, value) { for (let attempt = 0; attempt < 12; attempt += 1) { try { return fs.writeFileSync(file, value); } catch (error) { if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error; Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1)); } } }
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
  const source = read(file);
  let next = source.replace(/<header class="site-header">[\s\S]*?<\/header>/, renderHeader(routeFor(file)));
  if (!/src="\/family-display\.js(?:\?[^"#]*)?"/.test(next)) {
    next = next.replace(/<script src="\/site\.js/, '<script src="/family-display.js"></script><script src="/site.js');
  }
  if (next === source && !source.includes(renderHeader(routeFor(file)))) throw new Error(`${path.relative(root, file)}: 共通headerを更新できません`);
  if (next !== source) {
    write(file, next);
    changed += 1;
  }
}
console.log(`共通ナビを ${files.length} HTMLで生成しました（更新 ${changed}）`);
