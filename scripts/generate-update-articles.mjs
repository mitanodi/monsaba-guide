import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { renderSeoHead, safeJsonLd, absoluteUrl, breadcrumbSchema } from './seo-helpers.mjs';
import { renderGa4Tag } from './update-ga4-tag.mjs';
import { normalizeAssetHtml } from './lib/asset-cache.mjs';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/update-articles.json'), 'utf8'));
const article = data.latest;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function write(file, value) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const next = normalizeAssetHtml(value, '/' + file)
    .replace(/\s(required|hidden|checked|disabled|selected|multiple|readonly|autofocus|async|defer)=""/g, ' $1')
    // Shared scripts are removed/reinserted by later layout passes. Keep their
    // separators stable after whole-document serialization, without touching prose.
    .replace(/(<\/script>)[ \t\r\n]+(?=<script\b)/g, '$1\n');
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== next) fs.writeFileSync(target, next);
}
const copy = {
  ja: {
    prefix: '', og: 'ja_JP', site: 'モンサバ攻略DB', home: 'トップ', updates: 'アップデート記事', all: 'すべてのアプデ記事を見る', badge: '先行情報・日程は仮', checked: '資料確認日', toc: 'この記事の内容', skip: '本文へスキップ',
    warning: '10/21は仮日程です。本番実装は未確認です。',
    warningText: 'ウィキの先行サーバー情報を整理した記事です。実装日、内容、イベント期間は変更される可能性があります。ゲーム内のお知らせで最新の適用状況をご確認ください。',
    sources: '情報源と確認状態', sourceText: '参考：モンスターサバイバル@wiki「アップデート」内の10/21（仮）。外部攻略資料による先行情報であり、公式の正式リリース告知やゲーム内実測としては扱っていません。',
    pending: '今回確認できていないこと', pendingText: '正式な実装日・メンテナンス時間、シャイプの進化・スキル詳細、チップ調整値、イベントの正確な開始終了時刻。公開中のタタDB・独自評価・現行攻略値は、この予告だけでは変更していません。',
    prepare: 'アップデート前に確認しておきたいこと', prep: ['Season 2の最高到達難易度を記録し、移行後の難易度と比較できるようにする。', '使っているチップと専用スキルの説明を控え、更新後のゲーム内表示で差分を確かめる。', 'イベント参加前にゲーム内の日程と条件を確認する。'],
    related: '関連する攻略', links: ['ゾンビラッシュ攻略', '現行チップ図鑑', 'イベントカレンダー', 'アプデ記事一覧へ戻る'], target: '対象タタ（参考資料の表記）', kind: '追加要素', history: 'これまでの記事', latestDate: '10/21予定（仮）', old: '過去の記事・確認記録',
    hubIntro: 'ゲームの更新記事を新しい順にまとめています。先行情報には確認状態を表示しています。サイト自体の変更記録は下に残しています。'
  },
  en: {
    prefix: '/en', og: 'en_US', site: 'Clash of Critters Guide DB', home: 'Home', updates: 'Game update articles', all: 'Browse all update articles', badge: 'Test-server preview · tentative date', checked: 'Source checked', toc: 'On this page', skip: 'Skip to content',
    warning: 'October 21 is tentative. Live implementation is unconfirmed.',
    warningText: 'This article summarizes external wiki test-server information. Release timing, content and event dates may change. Check in-game notices for the current rollout status.',
    sources: 'Source and verification status', sourceText: 'Reference: Monster Survival @wiki, Update section, October 21 (tentative). This is external preview evidence, not independent confirmation from an official release notice or in-game testing.',
    pending: 'Still unconfirmed', pendingText: 'Final release and maintenance times, シャイプ evolution and skill details, new chip values, and exact event start and end times. This preview alone does not change the live Tatari database, our own tiers or current guide values.',
    prepare: 'What to check before the update', prep: ['Record your highest Season 2 difficulty so you can compare it after the transition.', 'Keep the current descriptions of your chips and dedicated skills for comparison with the updated in-game text.', 'Check the in-game schedule and entry requirements before joining an event.'],
    related: 'Related guides', links: ['Zombie Rush guide', 'Current chip database', 'Event calendar', 'Back to update articles'], target: 'Tatari (Japanese source names)', kind: 'Collectible', history: 'Earlier articles', latestDate: 'Planned October 21 (tentative)', old: 'Archive and verification record',
    hubIntro: 'Game update articles, newest first, with clear preview status. Existing website change records remain below.'
  },
  'zh-CN': {
    prefix: '/zh-cn', og: 'zh_CN', site: 'Clash of Critters 攻略DB', home: '首页', updates: '游戏更新文章', all: '查看全部更新文章', badge: '先行信息・日期暂定', checked: '资料确认日', toc: '本文目录', skip: '跳到正文',
    warning: '10月21日为暂定日期，正式服实装尚未确认。',
    warningText: '本篇整理外部wiki的先行服务器信息。实装日期、内容和活动期间可能变更，请以游戏内通知确认当前情况。',
    sources: '来源与确认状态', sourceText: '参考：Monster Survival @wiki的更新栏目「10/21（暂定）」。本篇为外部攻略资料中的先行信息，不作为官方正式上线公告或游戏内实测。',
    pending: '仍待确认的内容', pendingText: '正式上线与维护时间、シャイプ的进化和技能详情、芯片调整值、活动开始结束时刻。本预告不会直接更改现行塔塔资料库、本站Tier或当前攻略数值。',
    prepare: '更新前可以确认的事项', prep: ['记录第2赛季最高到达难度，便于在赛季切换后比较。', '保留当前使用的芯片及专属技能说明，与更新后的游戏内文字核对。', '参与活动前查看游戏内日程和参加条件。'],
    related: '相关攻略', links: ['Zombie Rush攻略', '现行芯片图鉴', '活动日历', '返回更新文章'], target: '目标塔塔（资料中的日文名）', kind: '追加要素', history: '往期文章', latestDate: '预计10月21日（暂定）', old: '往期文章与确认记录',
    hubIntro: '按新到旧汇总游戏更新文章，并标明先行信息状态。网站自身的历史变更记录保留在下方。'
  }
};
const sourceNames = [...new Set([...article.sections.flatMap(s => s.groups?.flatMap(g => g.names) || []), 'ミストリア', 'エーテリファル', 'ホルリン', '安眠ミサイル', '永眠ミサイル', '縦横無尽', '火山を制する者', 'いたずらタイム'])].sort((a, b) => b.length - a.length);
const namePattern = new RegExp(sourceNames.join('|'), 'g');
const renderText = (value, locale) => locale === 'ja' ? esc(value) : esc(value).replace(namePattern, name => `<span lang="ja" translate="no">${name}</span>`);
const localized = (values, locale) => renderText(values[locale], locale);
const latestCard = (locale, c) => `<a class="update-news-card is-latest" href="${c.prefix}${article.route}"><div class="update-news-meta"><time datetime="${article.plannedDate}">${c.latestDate}</time><span class="update-preview-badge">${c.badge}</span></div><h3>${localized(article.title, locale)}</h3><p>${localized(article.summary, locale)}</p></a>`;
function inject(file, key, markup, position) {
  let source = read(file);
  let legacyCard = '';
  if (position === 'updates') {
    const legacyPattern = /<!-- USER_TATA_20261006:START -->[\s\S]*?<!-- USER_TATA_20261006:END -->/;
    legacyCard = source.match(legacyPattern)?.[0] || '';
    source = source.replace(legacyPattern, '');
    const historicalHighlight = /<!-- NINJII:UPDATES:START -->[\s\S]*?<!-- NINJII:UPDATES:END -->/;
    legacyCard += source.match(historicalHighlight)?.[0] || '';
    source = source.replace(historicalHighlight, '');
  }
  const start = `<!-- UPDATE_ARTICLES:${key}:START -->`, end = `<!-- UPDATE_ARTICLES:${key}:END -->`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, 'g');
  const $ = load(source.replace(pattern, ''));
  const block = `${start}${markup}${end}`;
  if (position === 'home') {
    if (!$('.astra-journey').length) throw new Error(`Missing home placement: ${file}`);
    const journey = $('.astra-journey');
    const existingAd = journey.next('.astra-ad');
    (existingAd.length ? existingAd : journey).after(block);
  } else {
    if (!$('main > .page-hero').length) throw new Error(`Missing update heading: ${file}`);
    $('main > .page-hero').after(block + legacyCard);
  }
  if (!$('link[href="/styles/update-articles.css"]').length) $('head').append('<link rel="stylesheet" href="/styles/update-articles.css">');
  write(file, $.html());
}
for (const [locale, c] of Object.entries(copy)) {
  const directory = c.prefix ? c.prefix.slice(1) + '/' : '';
  const template = load(read(directory + 'updates/index.html'));
  const route = c.prefix + article.route;
  const title = article.title[locale] + '｜' + c.site;
  const alternates = [['ja', ''], ['en', '/en'], ['zh-Hans', '/zh-cn'], ['x-default', '']].map(([lang, prefix]) => `<link rel="alternate" hreflang="${lang}" href="${absoluteUrl(prefix + article.route)}" data-i18n-alternate>`).join('');
  const ogAlternates = Object.values(copy).map(value => value.og).filter(value => value !== c.og).map(value => `<meta property="og:locale:alternate" content="${value}" data-i18n-alternate>`).join('');
  const runtime = locale === 'ja' ? '' : `<script src="/i18n/${directory.slice(0, -1)}-runtime.js" defer></script><script src="/i18n-runtime.js" defer></script>`;
  const nav = template('body > header').toString().replaceAll(/data-active="[^"]*"/g, '');
  const footer = template('body > footer').toString();
  const languageNav = load(nav, {}, false);
  languageNav('a[hreflang]').each((_, link) => {
    const lang = languageNav(link).attr('hreflang');
    const prefix = lang === 'en' ? '/en' : /^zh/i.test(lang) ? '/zh-cn' : '';
    languageNav(link).attr('href', prefix + article.route);
  });
  const crumbs = [{ label: c.home, href: c.prefix + '/' }, { label: c.updates, href: c.prefix + '/updates/' }, { label: article.title[locale] }];
  const graph = { '@context': 'https://schema.org', '@graph': [{ '@type': 'Article', '@id': absoluteUrl(route), url: absoluteUrl(route), headline: article.title[locale], description: article.summary[locale], datePublished: article.publishedAt, dateModified: data.checkedAt, inLanguage: locale, mainEntityOfPage: absoluteUrl(route) }, breadcrumbSchema(crumbs)] };
  const sections = article.sections.map(s => `<section id="${s.id}"><h2>${localized(s.title, locale)}</h2><ul>${s.items[locale].map(text => `<li>${renderText(text, locale)}</li>`).join('')}</ul>${s.groups ? `<table class="update-article-table"><thead><tr><th scope="col">${c.kind}</th><th scope="col">${c.target}</th></tr></thead><tbody>${s.groups.map(g => `<tr><th scope="row">${localized(g.label, locale)}</th><td>${g.names.map(name => `<span lang="ja" translate="no">${esc(name)}</span>`).join(' · ')}</td></tr>`).join('')}</tbody></table>` : ''}</section>`).join('');
  const head = renderSeoHead({ title, description: article.summary[locale], route, type: 'article', robots: 'noindex,follow' }).replace('ja_JP', c.og).replaceAll('content="モンサバ攻略DB"', `content="${c.site}"`).replace(/(<link rel="canonical"[^>]*?)\s*\/>/, '$1>');
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}${alternates}${ogAlternates}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/astra.css"><link rel="stylesheet" href="/styles/update-articles.css"><script type="application/ld+json">${safeJsonLd(graph)}</script>${renderGa4Tag()}</head><body data-locale="${locale}" data-page-type="update-preview" data-i18n-native="update-article" data-astra="experiment" data-astra-page="${article.route}"><a class="skip-link" href="#main-content">${c.skip}</a>${languageNav.html()}<main id="main-content"><section class="page-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="${c.updates}">${crumbs.map(x => x.href ? `<a href="${x.href}">${esc(x.label)}</a>` : `<span>${esc(x.label)}</span>`).join('<span aria-hidden="true">›</span>')}</nav><span class="update-preview-badge">${c.badge}</span><h1>${localized(article.title, locale)}</h1><p>${localized(article.summary, locale)}</p><p>${c.checked}: <time datetime="${data.checkedAt}">${data.checkedAt}</time></p></div></section><article class="wrap static-section update-article"><aside class="update-article-warning"><strong>${c.warning}</strong><p>${c.warningText}</p></aside><nav class="update-article-toc page-toc" aria-label="${c.toc}"><strong>${c.toc}</strong><ul>${[...article.sections, { id: 'prepare', title: Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, value.prepare])) }, { id: 'sources', title: Object.fromEntries(Object.entries(copy).map(([key, value]) => [key, value.sources])) }].map(s => `<li><a href="#${s.id}">${localized(s.title, locale)}</a></li>`).join('')}</ul></nav>${sections}<section id="prepare"><h2>${c.prepare}</h2><ol>${c.prep.map(text => `<li>${esc(text)}</li>`).join('')}</ol></section><section id="sources" class="source-note"><h2>${c.sources}</h2><p>${c.sourceText}</p><p><a href="${data.sourceUrl}" target="_blank" rel="noopener noreferrer"><span lang="ja" translate="no">モンスターサバイバル@wiki · ${esc(data.sourceSection)}</span></a> · ${data.checkedAt}</p><h3>${c.pending}</h3><p>${renderText(c.pendingText, locale)}</p></section><section><h2>${c.related}</h2><nav class="update-related">${['/zombie-rush/', '/zombie-rush/chips/', '/events/calendar/', '/updates/'].map((link, i) => `<a href="${c.prefix}${link}">${c.links[i]}</a>`).join('')}</nav></section></article></main>${footer}<script src="/family-display.js"></script><script src="/site.js"></script><script src="/growth.js"></script><script src="/astra.js" defer></script>${runtime}</body></html>`;
  write(directory + article.route.slice(1) + 'index.html', html);
  const hub = `<section class="wrap static-section update-news" id="game-updates"><div class="update-news-heading"><h2>${c.updates}</h2><span>${c.checked}: ${data.checkedAt}</span></div><p>${c.hubIntro}</p><div class="update-news-grid">${latestCard(locale, c)}${data.archive.map(item => `<a class="update-news-card" href="${c.prefix}${item.route}"><div class="update-news-meta"><time datetime="${item.date}">${item.date}</time><span>${c.old}</span></div><h3>${localized(item.label, locale)}</h3><p>${localized(item.summary, locale)}</p></a>`).join('')}</div></section>`;
  inject(directory + 'updates/index.html', 'HUB', hub, 'updates');
  inject(directory + 'index.html', 'HOME', `<section class="wrap update-news"><div class="update-news-heading"><h2>${c.updates}</h2><a href="${c.prefix}/updates/#game-updates">${c.all} ↗</a></div>${latestCard(locale, c)}</section>`, 'home');
}
console.log('Update articles generated: latest preview, archive hub and homepage links in 3 locales.');
