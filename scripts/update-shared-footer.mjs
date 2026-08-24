import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const contact = '<p class="footer-contact">お問い合わせ・ご連絡は <a href="https://x.com/odi_monsaba" target="_blank" rel="noopener noreferrer">おぢ（@odi_monsaba）X</a> まで。フォローもよろしくお願いします。</p>';
const ignored = new Set(['.git', '.vercel', 'node_modules', 'assets', 'data', 'scripts']);

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
  if (!html.includes('class="footer-links"') || html.includes('class="footer-contact"')) continue;
  html = html.replace(/(<nav class="footer-links"[\s\S]*?<\/nav>)/, `$1${contact}`);
  fs.writeFileSync(file, html);
  changed += 1;
}
console.log(`問い合わせ先を ${changed} HTML の共通フッターへ追加しました。`);
