import fs from 'node:fs';
import path from 'node:path';
import { renderFooter } from './shared-layout.mjs';

const root = path.resolve(import.meta.dirname, '..');
const contact = '<p class="footer-contact">お問い合わせ・ご連絡は <a href="https://x.com/odi_monsaba" target="_blank" rel="noopener noreferrer">おぢ（@odi_monsaba）X</a> まで。フォローもよろしくお願いします。</p>';
const links = '<nav class="footer-links" aria-label="サイト情報"><a href="/attribute/">属性別</a><a href="/guides/">攻略ハブ</a><a href="/compare/">タタ比較</a><a href="/faq/">FAQ</a><a href="/about/">サイトについて</a><a href="/about-data/">データ方針</a><a href="/updates/">更新履歴</a><a href="/privacy/">プライバシー</a><a href="/friends/">フレンド掲示板</a></nav>';
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
  const before = html;
  if (html.includes('<footer') && !html.includes('class="footer-links"')) html = html.replace(/<footer[\s\S]*?<\/footer>/, renderFooter(''));
  else if (html.includes('class="footer-links"')) {
    html = html.replace(/<nav class="footer-links"[\s\S]*?<\/nav>/, links);
    if (!html.includes('class="footer-contact"')) html = html.replace(links, `${links}${contact}`);
  }
  if (html === before) continue;
  fs.writeFileSync(file, html);
  changed += 1;
}
const aboutDataFile = path.join(root, 'about-data', 'index.html');
let aboutData = fs.readFileSync(aboutDataFile, 'utf8');
if (!aboutData.includes('運営者について')) {
  aboutData = aboutData.replace('</main><footer>', '<section class="wrap source-note"><strong>運営者について</strong><p>運営者とサイト全体の作成方針は<a href="/about/">モンサバ攻略DBについて</a>をご覧ください。</p></section></main><footer>');
  fs.writeFileSync(aboutDataFile, aboutData);
}
const updatesFile = path.join(root, 'updates', 'index.html');
let updates = fs.readFileSync(updatesFile, 'utf8');
if (!updates.includes('article-byline')) {
  updates = updates.replace('<section class="wrap static-section prose-page">', '<section class="wrap static-section prose-page"><p class="article-byline">運営：<a href="/about/">おぢ</a></p>');
  fs.writeFileSync(updatesFile, updates);
}
console.log(`問い合わせ先を ${changed} HTML の共通フッターへ追加しました。`);
