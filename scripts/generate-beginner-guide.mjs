import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, LAST_MODIFIED } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const tatari = readJson('data/tatari.json');
const ratings = readJson('data/tier-ratings.json');
const evolution = readJson('data/evolution-priority.json');
const guides = readJson('data/content-guides.json');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const familyMap = new Map((tatari.families || []).map((family) => [family.id, family]));
const familyLink = (id) => {
  const family = familyMap.get(id);
  if (!family) throw new Error(`unknown familyId: ${id}`);
  return `<a href="/tata/${esc(id)}/">${esc(family.familyName)}系</a>`;
};

const beginnerRatings = Object.entries(ratings.overall?.byFamily || {})
  .filter(([, value]) => value.beginner && value.beginner !== '－')
  .sort((a, b) => ['SSS', 'SS', 'S', 'A', 'B'].indexOf(a[1].beginner) - ['SSS', 'SS', 'S', 'A', 'B'].indexOf(b[1].beginner))
  .slice(0, 6);
const firstPriority = evolution.t3Roadmap?.firstPriority || [];
const longTerm = evolution.longTermRecommended || [];
const troubleshooting = Object.values(guides.normal?.troubleshooting || {});
const sourceUrls = [...new Set([
  ...(evolution.sources || []),
  ...troubleshooting.map((item) => item.source).filter(Boolean)
])];
const url = `${BASE_URL}/beginner-guide/`;
const title = 'モンサバ初心者攻略｜最初にやること・おすすめタタ・育成順';
const description = 'モンサバ初心者向けに、通常ステージ、最初の育成、T3候補、長く使えるタタ、各コンテンツ攻略と相談先を確認済みデータから一本道で案内します。';
const image = `${BASE_URL}/assets/heroes/IMG_6940.webp`;
const structured = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article', '@id': url, url, headline: title, name: title, description, image,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url }, dateModified: LAST_MODIFIED, inLanguage: 'ja',
      author: { '@type': 'Person', name: 'おぢ', url: `${BASE_URL}/about/` }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'モンサバ攻略DB', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: '初心者ガイド' }
      ]
    }
  ]
};
const html = `<!doctype html>
<html lang="ja"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title><meta name="description" content="${description}">
  <meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#2f6fb2">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article"><meta property="og:site_name" content="モンサバ攻略DB">
  <meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}"><meta property="og:image:alt" content="モンスターサバイバルのゲーム画面"><meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${image}">
  <link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>
</head><body><a class="skip-link" href="#main-content">本文へスキップ</a>
  <header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="モンサバ攻略DB トップ"><span class="brand-main">モンサバ攻略DB</span><span class="brand-sub">非公式</span></a><nav aria-label="主要メニュー"></nav></div></header>
  <main id="main-content">
    <section class="page-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="パンくず"><a href="/">トップ</a><span>›</span><span>初心者ガイド</span></nav><div class="family-page-head"><div><span class="attribute">最終更新 ${LAST_MODIFIED.replaceAll('-', '/')}</span><h1>${title}</h1><p>確認済みデータだけを使い、次に見る場所を順番に案内します。</p></div><a class="ghost-button" href="/consult/">攻略相談所で相談</a></div><p class="article-byline">運営・データ確認：<a href="/about/">おぢ</a></p></div></section>
    <section class="wrap static-section beginner-first"><p class="section-kicker visible-kicker">まずこれ</p><h2 class="page-h2">初心者が進む4ステップ</h2><ol class="beginner-steps"><li><a href="#normal"><b>STEP 1</b><span>通常ステージ</span></a></li><li><a href="#training"><b>STEP 2</b><span>最初の育成</span></a></li><li><a href="#t3"><b>STEP 3</b><span>最初のT3</span></a></li><li><a href="#contents"><b>STEP 4</b><span>コンテンツ攻略</span></a></li></ol></section>
    <div class="monetization-slot" data-monetization-slot="article_after_summary" hidden></div>
    <section class="wrap static-section prose-page"><h2 class="page-h2">1. 最初に何をやればいい？</h2><p>まず通常ステージで、時間切れ・全滅・配置のどこに困っているかを切り分けます。その後、確認済みの初心者評価と進化優先度から育成候補を選びます。</p></section>
    <section id="normal" class="wrap static-section prose-page"><h2 class="page-h2">2. 通常ステージを進める</h2><p>勝てないときは症状別に対処します。</p><div class="beginner-card-grid">${troubleshooting.map((item) => `<article class="guide-panel"><h3>${esc(item.label)}</h3><p>確認する点：${esc((item.causes || []).join('・'))}</p><ul class="plain-list">${(item.actions || []).map((action) => `<li>${esc(action)}</li>`).join('')}</ul></article>`).join('')}</div><p><a class="ghost-button" href="/normal-guide/">通常攻略を詳しく見る</a></p></section>
    <section class="wrap static-section prose-page"><h2 class="page-h2">3. 星を集める</h2><p>進化候補は必要星数と進化後の変化を一緒に確認します。現在のデータでは、最初のT3候補に必要な星数が明記されています。</p><p><a href="/evolution-priority/">進化優先度で必要星数を確認する</a></p></section>
    <section id="training" class="wrap static-section prose-page"><h2 class="page-h2">4. 最初に育てたいタタ</h2><p>当サイトの初心者評価がある候補です。公式ランキングではなく、現在の暫定評価です。</p><div class="beginner-card-grid">${beginnerRatings.map(([id, value]) => `<article class="guide-panel"><h3>${familyLink(id)} <span class="tier-mini">${esc(value.beginner)}</span></h3><p>${esc(value.comment || '評価コメントを確認中です。')}</p></article>`).join('')}</div></section>
    <section id="t3" class="wrap static-section prose-page"><h2 class="page-h2">5. 最初のT3候補</h2><div class="beginner-card-grid">${firstPriority.map((item) => `<article class="guide-panel"><h3>${familyLink(item.familyId)}</h3><p><b>${esc(item.priority)}・${item.requiredStars}星</b></p><p>${esc(item.reason)}</p></article>`).join('')}</div><p><a class="button" href="/evolution-priority/">進化優先度へ進む</a></p></section>
    <div class="monetization-slot" data-monetization-slot="beginner_mid" hidden></div>
    <section class="wrap static-section prose-page"><h2 class="page-h2">6. 長く使えるタタ</h2><div class="beginner-card-grid">${longTerm.map((item) => `<article class="guide-panel"><h3>${familyLink(item.familyId)}</h3><p>${esc(item.reason)}</p></article>`).join('')}</div></section>
    <section class="wrap static-section prose-page"><h2 class="page-h2">7. 勝てなくなったら</h2><p>時間切れなら火力とレーン、全滅なら前衛・回復・耐久、配置なら位置取りを確認します。手持ちに合わせたい場合は攻略相談所の選択メニューを使えます。</p><p><a class="button" href="/consult/?flow=content&amp;mode=normal">通常攻略を相談する</a></p></section>
    <section id="contents" class="wrap static-section prose-page"><h2 class="page-h2">8. ゾンビラッシュ</h2><p>専用ページでWave攻略、評価、注意するゾンビを確認できます。</p><p><a href="/zombie-rush/">ゾンビラッシュ攻略を見る</a></p><h2 class="page-h2">9. ボスラリー</h2><p>ボスごとの確認済み条件と、条件に一致する候補を分けて掲載しています。</p><p><a href="/boss-rally/">ボスラリー攻略を見る</a></p><h2 class="page-h2">10. バッジ道場</h2><p>属性別候補、配置、役割を専用ページで確認できます。</p><p><a href="/badge-dojo/">バッジ道場攻略を見る</a></p></section>
    <section class="wrap static-section prose-page"><h2 class="page-h2">11. 進化で迷ったら</h2><p>必要星数、進化差分、用途を見比べます。特定のタタが決まっている場合は個別ページから選択済みで相談できます。</p><p><a class="ghost-button" href="/evolution-priority/">進化優先度を見る</a></p><h2 class="page-h2">12. 攻略相談所</h2><p>目的を選ぶだけで、育成・進化・攻略候補を確認できます。自由質問は補助として利用できます。</p><p><a class="button" href="/consult/">攻略相談所を開く</a></p></section>
    <div class="wrap monetization-slot affiliate-placement" data-monetization-slot="article_bottom" data-affiliate-offer="point_income_003" aria-busy="true"></div>
    <section class="wrap static-section next-reading"><h2 class="page-h2">次に見るページ</h2><div class="attribute-guide-nav"><a href="/#tatari">最初に育てるタタを探す</a><a href="/evolution-priority/">進化優先度</a><a href="/normal-guide/">通常攻略</a><a href="/consult/">攻略相談所</a><a href="/friends/">一緒に遊ぶ人を探す</a></div></section>
    <section class="wrap source-note"><strong>情報の扱い</strong><p>タタDB、当サイト暫定評価、進化優先度、公開攻略情報を区別して整理しています。不明な内容は推測していません。</p><p>参考情報：${sourceUrls.map((source) => `<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">公開攻略Wiki（外部）</a>`).join(' / ')}</p><a href="/about-data/">データ更新方針を見る</a></section>
  </main>
  <footer><div class="wrap footer-inner"><div><strong>モンサバ攻略DB</strong><span>モンスターサバイバル 非公式攻略サイト</span></div><div class="footer-side"><nav class="footer-links" aria-label="サイト情報"><a href="/about/">サイトについて</a><a href="/about-data/">データ方針</a><a href="/updates/">更新履歴</a><a href="/privacy/">プライバシー</a><a href="/friends/">フレンド掲示板</a></nav><p class="footer-contact">お問い合わせ・ご連絡は <a href="https://x.com/odi_monsaba" target="_blank" rel="noopener noreferrer">おぢ（@odi_monsaba）X</a> まで。フォローもよろしくお願いします。</p><div class="footer-meta">初心者ガイド</div></div></div></footer>
  <script src="/site.js"></script><script src="/monetization.js"></script>
</body></html>`;

const directory = path.join(root, 'beginner-guide');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'index.html'), html);
console.log('初心者ガイドを既存データから生成しました。');
