import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const heroes = Object.freeze({
  'top-main.webp': [480, 768, 1193],
  'evolution-main.webp': [480, 768, 1093],
  'IMG_6941.webp': [480, 768, 1320],
  'IMG_6942.webp': [480, 768, 1320],
  'IMG_6943.webp': [480, 768, 1320],
  'IMG_6944.webp': [480, 707],
  'IMG_6945.webp': [480, 707]
});
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'promo', 'en', 'zh-cn', 'i18n']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  const next = source.replace(/<img\b[^>]*\bsrc="\/assets\/heroes\/([^"]+)"[^>]*>/g, (tag, filename) => {
    const widths = heroes[filename];
    if (!widths) return tag;
    const stem = filename.replace(/\.webp$/, '');
    const full = widths.at(-1);
    const candidates = widths.map((width) => width === full
      ? `/assets/heroes/${filename} ${width}w`
      : `/assets/heroes/responsive/${stem}-${width}.webp ${width}w`);
    const withoutResponsive = tag
      .replace(/\s+srcset="[^"]*"/g, '')
      .replace(/\s+sizes="[^"]*"/g, '');
    return withoutResponsive.replace(/\s*\/?>$/, ` srcset="${candidates.join(', ')}" sizes="(max-width: 820px) calc(100vw - 22px), 707px">`);
  });
  if (next !== source) fs.writeFileSync(file, next);
}

console.log(`Hero srcsetを更新しました: ${walk(root).length} HTMLを確認`);
