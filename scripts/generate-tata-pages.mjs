import fs from 'node:fs';
import path from 'node:path';
import { ATTRIBUTE_META, BASE_URL, LAST_MODIFIED } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const tatari = readJson('data/tatari.json');
const skills = readJson('data/tata-skills.json');
const ratings = readJson('data/tier-ratings.json');
const families = tatari.families || [];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const jsonLd = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const thumb = (image) => `/${String(image).replace('assets/monsters/', 'assets/thumbs/')}`;

function evaluationRows(id) {
  const overall = ratings.overall?.byFamily?.[id];
  const zombie = ratings.zombieRush?.byFamily?.[id];
  if (!overall && !zombie) return [];
  return [
    ['総合', overall?.tier],
    ['通常', overall?.normal],
    ['ゾンビラッシュ', zombie?.tier || overall?.zombie],
    ['道場', overall?.dojo],
    ['初心者', overall?.beginner]
  ].filter(([, value]) => value && value !== '－');
}

function renderPage(family, index) {
  const stageData = skills.byFamily?.[family.id]?.stages || [];
  const overall = ratings.overall?.byFamily?.[family.id];
  const zombie = ratings.zombieRush?.byFamily?.[family.id];
  const evaluations = evaluationRows(family.id);
  const roles = overall?.roles || [];
  const attr = ATTRIBUTE_META[family.attribute];
  if (!attr) throw new Error(`${family.id}: 属性設定がありません`);
  const route = `/tata/${family.id}/`;
  const url = `${BASE_URL}${route}`;
  const chain = family.evolutions.map((item) => item.name).join(' → ');
  const title = `${family.familyName}系の進化・スキル・評価｜モンサバ攻略`;
  const description = `モンサバの${family.familyName}系（${chain}）の進化ルート、各段階のスキル説明・確認済み数値${evaluations.length ? '・Tier評価' : ''}を掲載。`;
  const image = `${BASE_URL}${thumb(family.evolutions.at(-1)?.image || family.evolutions[0]?.image)}`;
  const previous = families[index - 1];
  const next = families[index + 1];
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': url, url, name: title, description, image,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        dateModified: LAST_MODIFIED, inLanguage: 'ja',
        about: { '@type': 'Thing', name: `${family.familyName}系`, description }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'モンサバ攻略DB', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'タタ図鑑', item: `${BASE_URL}/#tatari` },
          { '@type': 'ListItem', position: 3, name: `${family.familyName}系` }
        ]
      }
    ]
  };
  const evolutionCards = family.evolutions.map((evolution) => `<article class="evo-card static-evo"><img src="${esc(thumb(evolution.image))}" width="160" height="160" alt="${esc(evolution.name)}" loading="lazy" decoding="async"><div><small>進化 ${evolution.stage}</small><strong>${esc(evolution.name)}</strong></div></article>`).join('');
  const skillBlocks = stageData.map((stage) => `<section class="skill-block" id="stage-${stage.stage}"><div class="skill-head"><div><small>第${stage.stage}進化：${esc(stage.tataName)}</small><h2>${esc(stage.skillName)}</h2></div><p class="skill-summary">${esc(stage.description || '説明データは収録されていません。')}</p></div>${stage.values?.length ? `<div class="stats-grid">${stage.values.map((value) => `<div class="stat-cell"><span>${esc(value.label)}</span><b>${esc(value.value)}</b></div>`).join('')}</div>` : '<p class="section-note">確認済み数値は収録されていません。</p>'}${stage.sources?.length ? `<details class="source-details"><summary>参照スクショ</summary><div class="sources">${stage.sources.map(esc).join(' / ')}</div></details>` : ''}</section>`).join('');
  const ratingSection = evaluations.length ? `<section class="wrap static-section tata-purpose"><h2 class="page-h2">このタタは何向け？</h2><div class="mode-rating-grid">${evaluations.map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}</div>${roles.length ? `<h3>主な役割</h3><div class="role-tags tata-role-tags">${roles.map((role) => `<span>${esc(role)}</span>`).join('')}</div>` : ''}${overall?.comment ? `<p class="section-note">${esc(overall.comment)}</p>` : ''}${zombie?.comment ? `<p class="section-note"><b>ゾンビラッシュ：</b>${esc(zombie.comment)}</p>` : ''}<p class="rating-hold-note">評価保留は、弱いという意味ではなく、順位を付ける根拠が不足している状態です。</p></section>` : '';
  const evolutionLinks = family.evolutions.slice(0, -1).map((stage) => `<a class="ghost-button" href="/consult/?flow=evolution&amp;family=${encodeURIComponent(family.id)}&amp;stage=${stage.stage}">T${stage.stage} ${esc(stage.name)}から次の進化を相談</a>`).join('');
  const modeLinks = [
    [`/${`attribute/${attr.slug}`}/`, `${family.attribute}属性のタタを見る`],
    ['/tata-tier/', '総合タタTier'],
    ['/evolution-priority/', '進化優先度'],
    ['/normal-guide/', '通常攻略'],
    ['/zombie-rush/', 'ゾンビラッシュ攻略'],
    ['/boss-rally/', 'ボスラリー攻略'],
    ['/badge-dojo/', 'バッジ道場攻略']
  ];
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#2f6fb2" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="モンサバ攻略DB" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:alt" content="${esc(family.familyName)}系の代表画像" />
  <meta property="og:locale" content="ja_JP" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${image}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="stylesheet" href="/styles.css" />
  <script type="application/ld+json">${jsonLd(structured)}</script>
</head>
<body><a class="skip-link" href="#main-content">本文へスキップ</a>
  <header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="モンサバ攻略DB トップ"><span class="brand-main">モンサバ攻略DB</span><span class="brand-sub">非公式</span></a><nav aria-label="主要メニュー"><a href="/#tatari">タタ図鑑</a><a href="/tata-tier/">タタTier</a><a href="/evolution-priority/">進化優先度</a><a href="/consult/">攻略相談</a></nav></div></header>
  <main id="main-content">
    <section class="page-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="パンくず"><a href="/">トップ</a><span>›</span><a href="/#tatari">タタ図鑑</a><span>›</span><span>${esc(family.familyName)}系</span></nav><div class="family-page-head tata-page-head"><div><span class="attribute">${attr.icon} ${family.attribute}属性</span><h1>${esc(family.familyName)}系</h1><p>${esc(chain)}</p>${roles.length ? `<div class="role-tags tata-role-tags">${roles.map((role) => `<span>${esc(role)}</span>`).join('')}</div>` : ''}</div><div class="tata-hero-actions"><a class="button" href="/consult/?flow=detail&amp;family=${encodeURIComponent(family.id)}">このタタを攻略相談所で相談</a><a class="ghost-button" href="/attribute/${attr.slug}/">同じ属性のタタを見る</a></div></div></div></section>
${ratingSection}
    <section class="wrap static-section"><h2 class="page-h2">全進化ルート</h2><div class="evolution-row static-row" role="region" tabindex="0" aria-label="${esc(family.familyName)}系の全進化ルート">${evolutionCards}</div></section>
    <section class="wrap static-section"><h2 class="page-h2">各進化段階のスキル</h2><div class="skills static-skills">${skillBlocks}</div></section>
${evolutionLinks ? `<section class="wrap static-section tata-consult-cta"><h2 class="page-h2">次の進化を相談する</h2><p class="section-note">現在の進化段階を選んだ状態で攻略相談所を開きます。</p><div class="tata-consult-links">${evolutionLinks}</div></section>` : ''}
    <section class="wrap static-section"><h2 class="page-h2">関連攻略</h2><p class="section-note">各ページへの案内です。このタタが各コンテンツの最上位候補であることを示すものではありません。</p><div class="attribute-guide-nav tata-related-links">${modeLinks.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join('')}</div></section>
    <nav class="wrap tata-family-nav" aria-label="前後のタタ系統">${previous ? `<a href="/tata/${previous.id}/"><span>← 前の系統</span><b>${esc(previous.familyName)}系</b></a>` : '<span></span>'}${next ? `<a href="/tata/${next.id}/"><span>次の系統 →</span><b>${esc(next.familyName)}系</b></a>` : '<span></span>'}</nav>
    <section class="wrap source-note"><strong>掲載データについて</strong><p>タタ名・進化・スキルと数値は、ゲーム内スクリーンショットで確認できた内容を掲載しています。読めない内容は推測で補完していません。Tierは当サイト独自の暫定評価です。</p><a href="/about-data/">データ更新方針を見る</a></section>
  </main>
  <footer><div class="wrap footer-inner"><div><strong>モンサバ攻略DB</strong><span>モンスターサバイバル 非公式攻略サイト</span></div><div class="footer-side"><nav class="footer-links" aria-label="サイト情報"><a href="/privacy/">プライバシー</a><a href="/updates/">更新履歴</a><a href="/about-data/">データ方針</a></nav><p class="footer-contact">お問い合わせ・ご連絡は <a href="https://x.com/odi_monsaba" target="_blank" rel="noopener noreferrer">おぢ（@odi_monsaba）X</a> まで。フォローもよろしくお願いします。</p><div class="footer-meta">63系統 / 224体</div></div></div></footer>
  <script src="/site.js"></script>
</body>
</html>
`;
}

for (const [index, family] of families.entries()) {
  const directory = path.join(root, 'tata', family.id);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), renderPage(family, index));
}

console.log(`タタ個別ページを ${families.length} 系統分生成しました。`);
