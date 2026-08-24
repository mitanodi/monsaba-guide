import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const targets = ['tata-tier/index.html', 'evolution-priority/index.html', 'zombie-rush/index.html', 'boss-rally/index.html', 'badge-dojo/index.html', 'normal-guide/index.html'];
for (const relative of targets) {
  const file = path.join(root, relative);
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('article-byline')) {
    html = html.replace(/(<main id="main-content">[\s\S]*?<\/section>)/, '$1\n    <p class="wrap article-byline">運営・データ確認：<a href="/about/">おぢ</a></p>');
  }
  if (relative === 'zombie-rush/index.html' && !html.includes('次に見るページ')) {
    html = html.replace('<section class="wrap source-note">', '<section class="wrap static-section next-reading"><h2 class="page-h2">次に見るページ</h2><div class="attribute-guide-nav"><a href="/tata-tier/">おすすめタタを比較</a><a href="/#tatari">個別タタを見る</a><a href="/consult/?flow=content&amp;mode=zombieRush">攻略相談所で相談</a></div></section>\n    <section class="wrap source-note">');
  }
  if (relative === 'boss-rally/index.html' && !html.includes('次に見るページ')) {
    html = html.replace('<section class="wrap source-note">', '<section class="wrap static-section next-reading"><h2 class="page-h2">次に見るページ</h2><div class="attribute-guide-nav"><a href="/#tatari">条件に合うタタを探す</a><a href="/tata-tier/">個別タタを比較</a><a href="/consult/?flow=content&amp;mode=bossRally">攻略相談所で相談</a></div></section>\n    <section class="wrap source-note">');
  }
  fs.writeFileSync(file, html);
}
console.log(`著者表示を ${targets.length} 攻略ページへ反映しました。`);
