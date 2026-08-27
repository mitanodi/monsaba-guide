import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL } from './site-config.mjs';
import { formatJapanDateTime } from './site-config.mjs';
import { renderHeader, renderFooter, renderBreadcrumb } from './shared-layout.mjs';
import { renderSeoHead, safeJsonLd, breadcrumbSchema, absoluteUrl } from './seo-helpers.mjs';

const root = path.resolve(import.meta.dirname, '..');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const freshness = JSON.parse(fs.readFileSync(path.join(root, 'data', 'page-freshness.json'), 'utf8'));
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tatari.json'), 'utf8'));
const statusFor = (route) => {
  const wildcard = Object.entries(freshness.routes).find(([key]) => key.endsWith('*') && route.startsWith(key.slice(0, -1)))?.[1] || {};
  return { ...freshness.default, ...wildcard, ...(freshness.routes[route] || {}) };
};
const write = (route, html) => {
  const directory = path.join(root, route.slice(1));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), html);
};

function pageShell({ route, title, description, body, structured, robots, scripts = [], pageType }) {
  const status = statusFor(route);
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
  ${renderSeoHead({ title, description, route, robots })}
  <link rel="icon" href="/favicon.ico" sizes="any" /><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" /><link rel="manifest" href="/site.webmanifest" /><link rel="stylesheet" href="/styles.css?v=20260825-growth" />
  <script type="application/ld+json">${safeJsonLd(structured)}</script></head>
<body data-page-type="${pageType}"><a class="skip-link" href="#main-content">本文へスキップ</a>${renderHeader(route)}<main id="main-content">${body}
  <section class="wrap source-note page-freshness"><strong>情報の状態</strong><p><span class="trust-label is-verified">確認済み</span> 最終更新 <time datetime="${status.updated}">${formatJapanDateTime(status.updated)}</time> / データ確認 <time datetime="${status.verified}">${formatJapanDateTime(status.verified)}</time></p>${status.pending?.length ? `<p><span class="trust-label is-pending">確認中</span> ${status.pending.map(esc).join(' / ')}</p>` : ''}<a href="/about-data/">更新・確認方針を見る</a></section>
</main>${renderFooter('63系統 / 224体')}<script src="/site.js"></script>${scripts.map((src) => `<script src="${src}" defer></script>`).join('')}<script src="/growth.js" defer></script></body></html>`;
}

const guideItems = [
  { href: '/normal-guide/', title: '通常ステージ', feature: '時間切れ・全滅・配置の見直し', roles: '症状に合う役割を確認', next: '/consult/?flow=content&mode=normal' },
  { href: '/zombie-rush/', title: 'ゾンビラッシュ', feature: '高Wave・注意ゾンビ・旧環境Tier', roles: '範囲攻撃・妨害・回復などを確認', next: '/consult/?flow=content&mode=zombie' },
  { href: '/boss-rally/', title: 'ボスラリー', feature: 'ボスごとの確認済み条件', roles: '条件と一致する候補だけを抽出', next: '/consult/?flow=content&mode=bossRally' },
  { href: '/badge-dojo/', title: 'バッジ道場', feature: '属性別候補・配置・役割', roles: '公開攻略の例と独自評価を分離', next: '/consult/?flow=content&mode=dojo' }
];
const guideRoute = '/guides/';
const guideCrumbs = [{ label: 'トップ', href: '/' }, { label: '攻略ハブ' }];
const guideTitle = 'モンサバ コンテンツ攻略ハブ｜通常・ゾンビ・ボス・道場';
const guideDescription = 'モンサバの通常ステージ、ゾンビラッシュ、ボスラリー、バッジ道場を目的・必要役割・適性タタ・育成導線から探せる攻略ハブです。';
write(guideRoute, pageShell({
  route: guideRoute, title: guideTitle, description: guideDescription, pageType: 'guide_hub',
  structured: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', '@id': absoluteUrl(guideRoute), url: absoluteUrl(guideRoute), name: guideTitle, description: guideDescription, dateModified: statusFor(guideRoute).updated, inLanguage: 'ja', mainEntity: { '@type': 'ItemList', itemListElement: guideItems.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: absoluteUrl(item.href) })) } },
    breadcrumbSchema(guideCrumbs)
  ] },
  body: `<section class="page-hero"><div class="wrap">${renderBreadcrumb(guideCrumbs)}<div class="family-page-head"><div><span class="visible-kicker">目的から探す</span><h1>コンテンツ攻略ハブ</h1><p>攻略したいモードから、確認済みの特徴・必要役割・候補タタ・育成ページへ進めます。</p></div><a class="button" data-cta-id="guide_consult" href="/consult/?flow=content">攻略相談を始める</a></div></div></section>
  <section class="wrap static-section"><h2 class="page-h2">攻略したいものを選ぶ</h2><div class="guide-hub-grid">${guideItems.map((item) => `<article class="guide-hub-card"><h3><a href="${item.href}">${item.title}</a></h3><dl><div><dt>特徴</dt><dd>${item.feature}</dd></div><div><dt>見るポイント</dt><dd>${item.roles}</dd></div></dl><div class="guide-card-actions"><a class="ghost-button" href="${item.href}">攻略を見る</a><a href="${item.next}">条件から相談</a></div></article>`).join('')}</div></section>
  <section class="wrap static-section next-reading"><h2 class="page-h2">タタ選びまで進む</h2><div class="attribute-guide-nav"><a href="/tata-tier/">用途別Tierを見る</a><a href="/compare/">2体を比較する</a><a href="/evolution-priority/">進化優先度を見る</a><a href="/beginner-guide/">初心者ガイド</a></div></section>`
}));

const attributeItems = [
  ['草', '🌿', '/attribute/grass/'], ['水', '💧', '/attribute/water/'], ['火', '🔥', '/attribute/fire/'],
  ['雷', '⚡', '/attribute/thunder/'], ['岩', '🪨', '/attribute/rock/']
].map(([label, icon, href]) => ({ label, icon, href, count: tatari.families.filter((family) => family.attribute === label).length }));
const attributeRoute = '/attribute/';
const attributeCrumbs = [{ label: 'トップ', href: '/' }, { label: '属性別タタ' }];
const attributeTitle = 'モンサバ 属性別タタ一覧｜草・水・火・雷・岩';
const attributeDescription = 'モンサバのタタ63系統を草・水・火・雷・岩の属性別に探し、Tier・役割・進化優先・比較へ進める属性ハブです。';
write(attributeRoute, pageShell({
  route: attributeRoute, title: attributeTitle, description: attributeDescription, pageType: 'attribute_hub',
  structured: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', '@id': absoluteUrl(attributeRoute), url: absoluteUrl(attributeRoute), name: attributeTitle, description: attributeDescription, dateModified: statusFor(attributeRoute).updated, inLanguage: 'ja', mainEntity: { '@type': 'ItemList', itemListElement: attributeItems.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: `${item.label}属性`, url: absoluteUrl(item.href) })) } },
    breadcrumbSchema(attributeCrumbs)
  ] },
  body: `<section class="page-hero"><div class="wrap">${renderBreadcrumb(attributeCrumbs)}<div class="family-page-head"><div><span class="visible-kicker">63系統を5属性から探す</span><h1>属性別タタ一覧</h1><p>属性を選び、タタ一覧・用途別Tier・役割・進化優先・比較候補を確認できます。</p></div><a class="button" data-cta-id="attribute_compare" href="/compare/">2体を比較する</a></div></div></section>
  <section class="wrap static-section"><h2 class="page-h2">属性を選ぶ</h2><div class="guide-hub-grid">${attributeItems.map((item) => `<article class="guide-hub-card"><h3><a href="${item.href}">${item.icon} ${item.label}属性</a></h3><p>${item.count}系統を収録。確認済みDBと当サイトの暫定評価を分けて掲載しています。</p><div class="guide-card-actions"><a class="ghost-button" href="${item.href}">一覧を見る</a><a href="${item.href}#attribute-ranking">候補を絞る</a></div></article>`).join('')}</div></section>
  <section class="wrap static-section next-reading"><h2 class="page-h2">属性を選んだあと</h2><div class="attribute-guide-nav"><a href="/tata-tier/">用途別Tier</a><a href="/evolution-priority/">進化優先度</a><a href="/consult/?flow=evolution">攻略相談</a></div></section>`
}));

const compareRoute = '/compare/';
const compareCrumbs = [{ label: 'トップ', href: '/' }, { label: 'タタ比較' }];
const compareTitle = 'モンサバ タタ比較｜属性・Tier・スキル・進化を2体で比較';
const compareDescription = 'モンサバのタタ2系統を、属性・Tier・役割・スキル・進化・適性・育成判断材料で比較します。比較条件はURLで共有できます。';
write(compareRoute, pageShell({
  route: compareRoute, title: compareTitle, description: compareDescription, robots: 'noindex,follow', pageType: 'compare', scripts: ['/compare/compare.js'],
  structured: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': absoluteUrl(compareRoute), url: absoluteUrl(compareRoute), name: compareTitle, description: compareDescription, dateModified: statusFor(compareRoute).updated, inLanguage: 'ja' },
    breadcrumbSchema(compareCrumbs)
  ] },
  body: `<section class="page-hero"><div class="wrap">${renderBreadcrumb(compareCrumbs)}<div class="family-page-head"><div><span class="visible-kicker">URL共有対応・検索結果には登録しません</span><h1>タタ2体を比較</h1><p>確認済みDBと当サイトの暫定評価を横並びで確認します。</p></div></div></div></section>
  <section class="wrap static-section compare-tool" aria-labelledby="compare-form-title"><h2 id="compare-form-title" class="page-h2">比較するタタを選ぶ</h2><form id="compareForm" class="compare-controls"><datalist id="compareCandidates"></datalist><label class="compare-a">1体目を検索<input id="compareASearch" list="compareCandidates" autocomplete="off" placeholder="例：ビリ" aria-describedby="compareSearchHelp"><select id="compareA" required aria-label="1体目の候補"><option value="">選択してください</option></select></label><button id="swapCompare" type="button" class="ghost-button" aria-label="1体目と2体目を入れ替える">⇄ 入れ替え</button><label class="compare-b">2体目を検索<input id="compareBSearch" list="compareCandidates" autocomplete="off" placeholder="例：プラビ" aria-describedby="compareSearchHelp"><select id="compareB" required aria-label="2体目の候補"><option value="">選択してください</option></select></label><p id="compareSearchHelp" class="section-note">入力候補は矢印キー・Enterまたはタップで選択できます。下の選択欄も利用できます。</p><label class="compare-mode">用途<select id="compareMode"><option value="overall">総合</option><option value="normal">通常</option><option value="zombie">ゾンビラッシュ</option><option value="dojo">道場</option><option value="beginner">初心者</option></select></label><button class="button" type="submit" data-cta-id="compare_view">比較する</button></form><p id="compareMessage" class="section-note" role="status" aria-live="polite"></p><div id="compareResult"></div></section>
  <section class="wrap static-section next-reading"><h2 class="page-h2">比較後の判断</h2><div class="attribute-guide-nav"><a href="/evolution-priority/">進化優先度を確認</a><a href="/consult/?flow=evolution">進化相談</a><a href="/tata-tier/">Tier全体を見る</a></div></section>`
}));

const faqs = [
  ['次に進化させるなら誰？', '手持ち、現在の進化段階、必要星数、攻略目的で変わります。進化優先度を確認し、判断材料が足りない場合は攻略相談所で条件を選んでください。', '/evolution-priority/', '進化優先度を見る'],
  ['どの属性を育てるべき？', '全員に共通する1属性は断定できません。挑戦するコンテンツと不足している役割を確認し、属性ページから候補を絞ってください。', '/attribute/grass/', '属性別ページを見る'],
  ['2体ならどっちを育てる？', '属性、用途別Tier、役割、進化差分を同じ条件で比べます。タタ比較はURLで共有でき、比較結果ページ自体は検索登録しません。', '/compare/', '2体を比較する'],
  ['Tierはどう見ればいい？', 'Tierは公式ランキングではなく当サイトの暫定評価です。総合だけで決めず、通常・ゾンビラッシュ・道場・初心者の用途別評価も確認してください。', '/tata-tier/', 'Tierの見方を確認'],
  ['Zombie Rush専用変更は総合Tierに影響する？', '専用変更だけを理由に総合Tierを自動変更しません。Season 1開始後に実戦を確認し、モードごとの評価を再検討します。', '/zombie-rush/', 'Zombie Rushの注意を見る']
  ,['最初のT3は誰がおすすめ？', '既存進化データでは、ネコオリ系・ヒモリ系・フルググ系がT3まで6星の最優先候補です。手持ちと目的でも変わります。', '/evolution/t3/', 'T3おすすめを見る']
  ,['T4は誰から進化させる？', 'T4は必要星数と大きな変化を確認して選びます。根拠が揃った高インパクト進化だけをT4おすすめに掲載しています。', '/evolution/t4/', 'T4おすすめを見る']
  ,['Zombie Rushで属性オーラは効く？', '現在の確認済み情報では、第4進化の属性オーラはZombie Rushでは無効として扱っています。専用Lv3・Lv5・Lv7スキルや基礎性能を重視します。', '/zombie-rush/', 'Zombie Rush攻略を見る']
  ,['ビリジカ系とプラビ系はどっち？', '貫通・麻痺・CCが必要ならビリジカ系、回復・バフ・生存補助が必要ならプラビ系が候補です。攻略モードと不足役割で選びます。', '/compare-guides/purabi-vs-denjika/', '比較記事を見る']
  ,['麻痺持ちのタタは？', '既存Tier DBの役割ラベルから、麻痺役を自動抽出した一覧を用意しています。個別ページでスキル本文も確認してください。', '/roles/paralysis/', '麻痺役を見る']
  ,['バッジ道場のおすすめは？', '属性、前線維持、単体火力など条件で変わります。道場ページの属性別候補と配置の考え方を確認してください。', '/badge-dojo/', 'バッジ道場攻略を見る']
  ,['ボスラリーのおすすめは？', 'ボスごとの条件と必要役割で候補が変わります。確認済み条件と一致するタタだけを絞り込んでください。', '/boss-rally/', 'ボスラリー攻略を見る']
];
const faqRoute = '/faq/';
const faqCrumbs = [{ label: 'トップ', href: '/' }, { label: 'FAQ' }];
const faqTitle = 'モンサバ攻略 FAQ｜進化・属性・Tier・タタ比較';
const faqDescription = 'モンサバの進化、属性育成、2体比較、Tierの見方、Zombie Rush専用変更について、確認済みデータに基づく短い回答をまとめます。';
write(faqRoute, pageShell({
  route: faqRoute, title: faqTitle, description: faqDescription, pageType: 'faq',
  structured: { '@context': 'https://schema.org', '@graph': [
    { '@type': 'FAQPage', '@id': absoluteUrl(faqRoute), url: absoluteUrl(faqRoute), name: faqTitle, description: faqDescription, dateModified: statusFor(faqRoute).updated, inLanguage: 'ja', mainEntity: faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    breadcrumbSchema(faqCrumbs)
  ] },
  body: `<section class="page-hero"><div class="wrap">${renderBreadcrumb(faqCrumbs)}<div class="family-page-head"><div><span class="visible-kicker">確認済み情報から回答</span><h1>モンサバ攻略 FAQ</h1><p>結論を先に読み、必要なページへ進めます。</p></div><a class="button" data-cta-id="faq_consult" href="/consult/">攻略相談所を開く</a></div></div></section>
  <section class="wrap static-section faq-list">${faqs.map(([question, answer, href, label]) => `<article><h2>${esc(question)}</h2><p>${esc(answer)}</p><a href="${href}">${esc(label)} →</a></article>`).join('')}</section>`
}));

console.log('Growth pages generated: /guides/ /attribute/ /compare/ /faq/');
