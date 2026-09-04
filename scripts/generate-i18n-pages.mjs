import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL } from './site-config.mjs';
import { polishTranslation } from './i18n-quality.mjs';
import { createTataHtmlLocalizer } from './lib/localize-tata-html.mjs';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/config.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/overrides.json'), 'utf8'));
const glossary = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/glossary.json'), 'utf8'));
for (const term of glossary.terms) for (const locale of ['en', 'zh-CN']) overrides[locale][term.ja] = term[locale];
const qualityOverrides = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/quality-overrides.json'), 'utf8'));
for (const locale of ['en', 'zh-CN']) Object.assign(overrides[locale], qualityOverrides[locale]);
const aug30Overrides = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/aug30.json'), 'utf8'));
for (const locale of ['en', 'zh-CN']) Object.assign(overrides[locale], aug30Overrides[locale]);
const communityOverrides = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/community.json'), 'utf8'));
for (const locale of ['en', 'zh-CN']) Object.assign(overrides[locale], communityOverrides[locale]);
const phase3Overrides = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/phase3.json'), 'utf8'));
for (const locale of ['en', 'zh-CN']) Object.assign(overrides[locale], phase3Overrides[locale]);
const notices = JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/notices.json'), 'utf8'));
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data/tatari.json'), 'utf8'));
const localizeTataNames = createTataHtmlLocalizer(tatari);
const assetVersion = JSON.parse(fs.readFileSync(path.join(root, 'data/asset-build.json'), 'utf8')).version;
const locales = ['en', 'zh-CN'];
const targetDirectory = Object.freeze({ en: 'en', 'zh-CN': 'zh-cn' });
const translations = Object.fromEntries(locales.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(root, `data/i18n/${locale}.json`), 'utf8'))]));
const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
const retrySignal = new Int32Array(new SharedArrayBuffer(4));

function retry(operation) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return operation(); } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error;
      Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1));
    }
  }
}
const read = (file) => retry(() => fs.readFileSync(file, 'utf8'));
const write = (file, value) => retry(() => fs.writeFileSync(file, value));
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'promo', 'en', 'zh-cn', 'assets', 'data', 'scripts']);
const selfLocalized = new Set([
  'zombie-rush/chips', 'evolution/trials', 'updates/2026-08-30', 'gift-codes',
  ...['running-party','running-star','island-treasure','magic-farm','fishing-tournament','summer-party','zombie-siege','surprise-roulette'].map((id) => `events/${id}`)
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const relative = path.relative(root, full).replaceAll('\\', '/');
      if (selfLocalized.has(relative)) return [];
      return walk(full);
    }
    return entry.name === 'index.html' || (directory === root && entry.name === '404.html') ? [full] : [];
  });
}

const routeFor = (file) => {
  if (path.basename(file) === '404.html') return '/404/';
  const relative = path.relative(root, path.dirname(file)).replaceAll('\\', '/');
  return relative ? `/${relative}/` : '/';
};
const localeRoute = (route, locale) => route === '/' ? `/${targetDirectory[locale]}/` : `/${targetDirectory[locale]}${route}`;
const absolute = (route) => `${BASE_URL}${route}`;
const alternateMarkup = (sourceRoute) => {
  const links = [
    ['ja', sourceRoute],
    ['en', localeRoute(sourceRoute, 'en')],
    ['zh-Hans', localeRoute(sourceRoute, 'zh-CN')],
    ['x-default', sourceRoute]
  ];
  return links.map(([hreflang, route]) => `<link rel="alternate" hreflang="${hreflang}" href="${absolute(route)}" data-i18n-alternate>`).join('');
};

function normalizeTranslation(value, locale, source = '') {
  let result = String(value || '').trim();
  if (locale === 'en') {
    result = result.replace(/\bTata(?:'s)?\b/g, 'Tatari').replace(/\bTatas\b/g, 'Tatari').replace(/\bOtakara\b/g, 'Treasure Hunt').replace(/Monster Survival/g, 'Clash of Critters');
  } else {
    result = result.replaceAll('塔塔', 'Tatari').replaceAll('怪物生存', 'Clash of Critters').replaceAll('Otakara', '寻宝');
  }
  return polishTranslation(result, locale, source);
}

function formatDates(value, locale) {
  return value.replace(/\b(20\d{2})\/(\d{1,2})\/(\d{1,2})\b/g, (_, year, month, day) => {
    if (locale === 'zh-CN') return `${year}年${Number(month)}月${Number(day)}日`;
    const formatted = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Tokyo' }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
    return formatted;
  });
}

function translator(locale, missing) {
  return (source) => {
    const raw = String(source);
    const trimmed = raw.replace(/\s+/g, ' ').trim();
    if (!trimmed || !japanese.test(trimmed)) return raw;
    if (trimmed === '系統') return raw.replace(trimmed, locale === 'en' ? ' families' : ' 个系列');
    if (trimmed === '体') return raw.replace(trimmed, locale === 'en' ? ' Tatari' : ' 个 Tatari');
    if (trimmed === '属性') return raw.replace(trimmed, locale === 'en' ? ' attributes' : '种属性');
    const familyCompare = trimmed.match(/^(.+?)系を比較表示$/);
    const familyPage = trimmed.match(/^(.+?)系の個別ページを見る$/);
    const familyOnly = trimmed.match(/^(.+?)系$/);
    const familySeoTitle = trimmed.match(/^モンサバ (.+?)系（.+?）は強い？進化・スキル・用途$/);
    const familySeoDescription = trimmed.match(/^モンサバの(.+?)系（(.+?)）の進化先、スキル、確認済み数値、Tierと用途評価を掲載。\s*主な役割は(.+?)。$/);
    const familyDataSummary = trimmed.match(/^(.+?)系のT1〜T(\d)について、進化先・スキル・確認済み数値をまとめています。$/);
    const familyT1Alt = trimmed.match(/^(.+?系) T1$/);
    const skillIconAlt = trimmed.match(/^(.+?系) .+ スキルアイコン$/);
    const tierLabel = trimmed.match(/^(総合|通常|ゾンビ|道場|初心者) (SSS|SS|S|A|B|評価保留)$/);
    const tataPatterns = [
      [/^(.+?)は強い？$/, (name) => `Is ${name} strong?`],
      [/^(.+?)は進化するべき？$/, (name) => `Should you evolve ${name}?`],
      [/^(.+?)の進化先$/, (name) => `${name} evolutions`],
      [/^(.+?)系のおすすめ用途$/, (name) => `Best uses for the ${name} family`],
      [/^(.+?)系のスキル一覧$/, (name) => `${name} family skills`],
      [/^(.+?)系の代表画像$/, (name) => `Representative image of the ${name} family`],
      [/^(.+?)系の全進化ルート$/, (name) => `Full ${name} family evolution path`],
      [/^(.+?)系のT1〜T4について、進化先・スキル・確認済み数値をまとめています。$/, (name) => `Verified evolutions, skills and values for the ${name} family from T1 through T4.`]
    ];
    if (locale === 'en' && familyCompare) return raw.replace(trimmed, `Compare the ${familyCompare[1]} family`);
    if (locale === 'en' && familyPage) return raw.replace(trimmed, `View the ${familyPage[1]} family page`);
    if (locale === 'en' && familyOnly) return raw.replace(trimmed, `${familyOnly[1]} family`);
    if (locale === 'zh-CN' && familyCompare) return raw.replace(trimmed, `比较${familyCompare[1]}系列`);
    if (locale === 'zh-CN' && familyPage) return raw.replace(trimmed, `查看${familyPage[1]}系列页面`);
    if (locale === 'zh-CN' && familyOnly) return raw.replace(trimmed, `${familyOnly[1]}系列`);
    if (familySeoTitle) return raw.replace(trimmed, locale === 'en'
      ? `Clash of Critters ${familySeoTitle[1]} Family Guide | Evolutions, Skills & Uses`
      : `Clash of Critters ${familySeoTitle[1]} 系列攻略｜进化、技能与用途`);
    if (familySeoDescription) {
      const roleSource = familySeoDescription[3];
      const roleValue = overrides[locale]?.[roleSource] || translations[locale][roleSource] || roleSource;
      const roles = normalizeTranslation(roleValue, locale, `主な役割は${roleSource}`);
      return raw.replace(trimmed, locale === 'en'
        ? `Guide to the ${familySeoDescription[1]} family (${familySeoDescription[2]}), including evolution paths, skills, verified values, Tier ratings and best uses. Main roles: ${roles}.`
        : `${familySeoDescription[1]} 系列（${familySeoDescription[2]}）攻略，包含进化路线、技能、已确认数值、Tier 与玩法评价。主要定位：${roles}。`);
    }
    if (familyDataSummary) return raw.replace(trimmed, locale === 'en'
      ? `Verified evolution paths, skills and values for the ${familyDataSummary[1]} family from T1 to T${familyDataSummary[2]}.`
      : `${familyDataSummary[1]} 系列从 T1 到 T${familyDataSummary[2]} 的已确认进化路线、技能和数值。`);
    if (familyT1Alt) return raw.replace(trimmed, locale === 'en' ? `${familyT1Alt[1]} official T1 image` : `${familyT1Alt[1]}官方T1图片`);
    if (skillIconAlt) return raw.replace(trimmed, locale === 'en' ? `${skillIconAlt[1]} official skill icon` : `${skillIconAlt[1]}官方技能图标`);
    if (tierLabel) {
      const labels = locale === 'en' ? { 総合: 'Overall', 通常: 'Normal', ゾンビ: 'Zombie', 道場: 'Dojo', 初心者: 'Beginner', 評価保留: 'Pending' } : { 総合: '综合', 通常: '普通', ゾンビ: 'Zombie', 道場: '道场', 初心者: '新手', 評価保留: '待评估' };
      return raw.replace(trimmed, `${labels[tierLabel[1]]} ${labels[tierLabel[2]] || tierLabel[2]}`);
    }
    if (locale === 'en') {
      for (const [pattern, render] of tataPatterns) {
        const match = trimmed.match(pattern);
        if (match) return raw.replace(trimmed, render(match[1]));
      }
    }
    const countPair = trimmed.match(/^(\d+)系統 \/ (\d+)体$/);
    if (countPair) return raw.replace(trimmed, locale === 'en' ? `${countPair[1]} families / ${countPair[2]} Tatari` : `${countPair[1]} 个系列 / ${countPair[2]} 个 Tatari`);
    const familyCount = trimmed.match(/^(\d+)系統$/);
    if (familyCount) return raw.replace(trimmed, locale === 'en' ? `${familyCount[1]} families` : `${familyCount[1]} 个系列`);
    const evolutionHeading = trimmed.match(/^第(\d+)進化：(.+)$/);
    if (evolutionHeading) return raw.replace(trimmed, locale === 'en' ? `Evolution ${evolutionHeading[1]}: ${evolutionHeading[2]}` : `第${evolutionHeading[1]}次进化：${evolutionHeading[2]}`);
    const consultEvolution = trimmed.match(/^T(\d) (.+)から次の進化を相談$/);
    if (consultEvolution) return raw.replace(trimmed, locale === 'en' ? `Ask about the next evolution after T${consultEvolution[1]} ${consultEvolution[2]}` : `咨询T${consultEvolution[1]} ${consultEvolution[2]}之后的进化`);
    const skillChange = trimmed.match(/^スキル名：(.+) → (.+)$/);
    if (skillChange) return raw.replace(trimmed, locale === 'en' ? `Skill: ${skillChange[1]} → ${skillChange[2]}` : `技能：${skillChange[1]} → ${skillChange[2]}`);
    const stageTransition = trimmed.match(/^T(\d) (.+) → T(\d) (.+)$/);
    if (stageTransition) return raw.replace(trimmed, locale === 'en' ? `T${stageTransition[1]} ${stageTransition[2]} → T${stageTransition[3]} ${stageTransition[4]}` : `T${stageTransition[1]} ${stageTransition[2]} → T${stageTransition[3]} ${stageTransition[4]}`);
    if (/^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9＆・\s]+(?: → [\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}A-Za-z0-9＆・\s]+)+$/u.test(trimmed)) return raw;
    const pdfSource = trimmed.match(/^写真\.pdf p\.(.+)$/);
    if (pdfSource) return raw.replace(trimmed, locale === 'en' ? `In-game PDF pp. ${pdfSource[1]}` : `游戏内PDF第${pdfSource[1]}页`);
    const japaneseDate = trimmed.match(/^(20\d{2})年(\d{1,2})月(\d{1,2})日$/);
    if (japaneseDate) return raw.replace(trimmed, locale === 'en' ? `${new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' }).format(new Date(Date.UTC(+japaneseDate[1], +japaneseDate[2] - 1, +japaneseDate[3])))}` : `${japaneseDate[1]}年${japaneseDate[2]}月${japaneseDate[3]}日`);
    const legacyZombieRushSource = trimmed.replaceAll('ゾンビラッシュ', 'Zombie Rush');
    const value = overrides[locale]?.[trimmed]
      || translations[locale][trimmed]
      || overrides[locale]?.[legacyZombieRushSource]
      || translations[locale][legacyZombieRushSource];
    if (!value) {
      missing.add(trimmed);
      return raw;
    }
    return formatDates(raw.replace(trimmed, normalizeTranslation(value, locale, trimmed)), locale);
  };
}

function localizePath(value, locale) {
  const prefix = `/${targetDirectory[locale]}`;
  if (value.startsWith(BASE_URL)) {
    const url = new URL(value);
    if (/^\/(?:api|data|assets)\//.test(url.pathname) || /\.(?:css|js|json|xml|txt|webmanifest|ico|png|jpe?g|webp|svg)$/.test(url.pathname)) return value;
    if (/^\/(?:en|zh-cn)(?:\/|$)/.test(url.pathname)) return value;
    url.pathname = url.pathname === '/' ? `${prefix}/` : `${prefix}${url.pathname}`;
    return url.toString();
  }
  if (!value.startsWith('/') || value.startsWith('/api/') || value.startsWith('/data/') || value.startsWith('/assets/') || /^\/(?:en|zh-cn)(?:\/|$)/.test(value) || /\.(?:css|js|json|xml|txt|webmanifest|ico|png|jpe?g|webp|svg)(?:[?#]|$)/i.test(value)) return value;
  return value === '/' ? `${prefix}/` : `${prefix}${value}`;
}

const sharedResource = /\.(?:css|js|json|xml|txt|webmanifest|ico|png|jpe?g|webp|svg)(?:[?#]|$)/i;
function normalizeSharedResource(value, sourceRoute) {
  if (!sharedResource.test(value) || !/^(?:\.\.?\/)+/.test(value)) return value;
  const url = new URL(value, `${BASE_URL}${sourceRoute}`);
  return `${url.pathname}${url.search}${url.hash}`;
}

function localizeJsonLd(source, locale, translate) {
  try {
    const data = JSON.parse(source);
    const visit = (value, key = '') => {
      if (Array.isArray(value)) return value.map((item) => visit(item, key));
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, visit(child, childKey)]));
      if (typeof value !== 'string') return value;
      if (key === 'inLanguage') return config.locales[locale].htmlLang;
      if (key === 'alternateName') return value;
      if (value.startsWith(BASE_URL)) return localizePath(value, locale);
      return translate(value);
    };
    return JSON.stringify(visit(data), null, 2);
  } catch { return source; }
}

function addSeoAlternates(html, sourceRoute, locale = 'ja') {
  const withoutOld = html.replace(/<link rel="alternate" hreflang="[^"]+"[^>]*data-i18n-alternate[^>]*>/g, '').replace(/<meta property="og:locale:alternate"[^>]*data-i18n-alternate[^>]*>/g, '');
  const alternates = Object.entries({ ja: 'ja_JP', en: 'en_US', 'zh-CN': 'zh_CN' }).filter(([key]) => key !== locale).map(([, value]) => `<meta property="og:locale:alternate" content="${value}" data-i18n-alternate>`).join('');
  const tags = `${alternateMarkup(sourceRoute)}${alternates}`;
  return withoutOld.replace(/(<link rel="canonical"[^>]*>)/, `$1${tags}`);
}

function localizeHtml(source, sourceRoute, locale, missing) {
  const translate = translator(locale, missing);
  let html = source;
  html = html.replace(/<script\b([^>]*application\/ld\+json[^>]*)>([\s\S]*?)<\/script>/gi, (_, attributes, json) => `<script${attributes}>${localizeJsonLd(json, locale, translate)}</script>`);
  const blocks = [];
  html = html.replace(/<([a-z][\w:-]*)\b[^>]*\btranslate="no"[^>]*>[\s\S]*?<\/\1>|<meta\b[^>]*\bdata-og-card\b[^>]*>|<(?:script|style)\b[\s\S]*?<\/(?:script|style)>|<!--[\s\S]*?-->/gi, (block) => {
    const token = `<i18n-block data-index="${blocks.length}"></i18n-block>`;
    blocks.push(block);
    return token;
  });
  html = html.replace(/>([^<>]+)</g, (_, text) => `>${translate(text)}<`);
  html = html.replace(/\b(alt|title|placeholder|aria-label|content)="([^"]+)"/g, (_, name, value) => `${name}="${translate(value)}"`);
  html = html.replace(/\b(href|action)="([^"]+)"/g, (_, name, value) => {
    const normalized = normalizeSharedResource(value, sourceRoute);
    return `${name}="${localizePath(normalized, locale)}"`;
  });
  blocks.forEach((block, index) => { html = html.replace(`<i18n-block data-index="${index}"></i18n-block>`, block); });
  html = html.replace(/\bsrc="([^"]+)"/g, (_, value) => `src="${normalizeSharedResource(value, sourceRoute)}"`);
  html = html.replace(/<html\s+lang="[^"]+"/, `<html lang="${config.locales[locale].htmlLang}"`);
  html = html.replace(/<body\b([^>]*)>/, (_, attributes) => `<body data-locale="${locale}"${attributes.replace(/\sdata-locale="[^"]*"/g, '')}>`);
  if (sourceRoute !== '/404/') {
    html = html.replace(/<link rel="canonical" href="[^"]+"[^>]*>/, `<link rel="canonical" href="${absolute(localeRoute(sourceRoute, locale))}">`);
    html = addSeoAlternates(html, sourceRoute, locale);
    html = html.replace(/<meta property="og:url" content="[^"]+"\s*\/?>/, `<meta property="og:url" content="${absolute(localeRoute(sourceRoute, locale))}" />`);
  }
  html = html.replace(/<meta property="og:locale" content="[^"]+"\s*\/?>/, `<meta property="og:locale" content="${config.locales[locale].ogLocale}" />`);
  if (!html.includes('property="og:locale"')) html = html.replace('</title>', `</title><meta property="og:locale" content="${config.locales[locale].ogLocale}" />`);
  html = html.replace(/(<option value="(?:ja|en|zh-CN)")\s+selected/g, '$1').replace(`<option value="${locale}">`, `<option value="${locale}" selected>`);
  const noticeKey = sourceRoute.startsWith('/board/') ? 'board' : sourceRoute === '/friends/' ? 'friends' : sourceRoute === '/privacy/' ? 'privacy' : sourceRoute === '/consult/' ? 'consult' : null;
  if (noticeKey) html = html.replace(/(<main\b[^>]*>)/, `$1<p class="wrap i18n-locale-notice" role="note">${notices[noticeKey][locale]}</p>`);
  const runtime = `<script src="/i18n/${targetDirectory[locale]}-runtime.js?v=${assetVersion}" defer></script><script src="/i18n-runtime.js?v=${assetVersion}" defer></script>`;
  html = html.replace(/(<script\b(?![^>]*application\/ld\+json)[^>]*src=)/, `${runtime}$1`);
  return html;
}

function addJapaneseMetadata(source, route) {
  let html = source.replace(/<html\s+lang="[^"]+"/, '<html lang="ja"');
  html = html.replace(/<body\b([^>]*)>/, (_, attributes) => `<body data-locale="ja"${attributes.replace(/\sdata-locale="[^"]*"/g, '')}>`);
  return route === '/404/' ? html : addSeoAlternates(html, route, 'ja');
}

function dynamicSourceStrings() {
  const values = new Set(['主要メニュー', 'メニューを開く', 'メニューを閉じる', '↑ 上へ', 'ページ上部へ戻る']);
  const skip = new Set(['node_modules', 'scripts', 'tests', 'api', 'lib', 'promo', 'en', 'zh-cn']);
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith('.js')) {
        const source = read(full);
        for (const pattern of [/'((?:\\.|[^'\\])*)'/g, /"((?:\\.|[^"\\])*)"/g, /`((?:\\.|[^`\\])*)`/g]) {
          for (const match of source.matchAll(pattern)) {
            const text = match[1].replace(/\s+/g, ' ').trim();
            if (text && text.length <= 500 && !/[{};$]|=>|\b(?:const|let|var|function)\b/.test(text)) values.add(text);
          }
        }
      }
    }
  };
  visit(root);
  return values;
}

function writeRuntime(locale) {
  const sources = [...dynamicSourceStrings()];
  const dictionary = {};
  for (const source of sources) {
    const value = overrides[locale]?.[source] || translations[locale][source];
    if (value) dictionary[source] = normalizeTranslation(value, locale, source);
  }
  for (const [source, value] of Object.entries(overrides[locale] || {})) {
    if (japanese.test(source)) dictionary[source] = normalizeTranslation(value, locale, source);
  }
  const phrases = Object.entries(dictionary).filter(([source]) => source.length >= 2 && source.length <= 40).sort(([a], [b]) => b.length - a.length);
  const properNames = new Set();
  const collectNames = (value, key = '') => {
    if (Array.isArray(value)) return value.forEach((item) => collectNames(item, key));
    if (value && typeof value === 'object') return Object.entries(value).forEach(([childKey, child]) => collectNames(child, childKey));
    if (typeof value === 'string' && /(?:name|familyName|skillName)$/i.test(key) && japanese.test(value)) properNames.add(value);
  };
  for (const relative of ['data/tatari.json', 'data/tata-skills.json', 'data/zombie-rush/seasons/season-1.json']) collectNames(JSON.parse(read(path.join(root, relative))));
  const payload = JSON.stringify({ locale, translations: dictionary, phrases, properNames: [...properNames].sort((a, b) => b.length - a.length) });
  const dir = path.join(root, 'i18n');
  fs.mkdirSync(dir, { recursive: true });
  write(path.join(dir, `${targetDirectory[locale]}-runtime.js`), `window.__MONSABA_I18N__=${payload};\n`);
}

for (const locale of locales) writeRuntime(locale);
const sourceFiles = walk(root);
const missing = Object.fromEntries(locales.map((locale) => [locale, new Set()]));
for (const file of sourceFiles) {
  const source = read(file);
  const route = routeFor(file);
  const japanese = addJapaneseMetadata(source, route);
  if (japanese !== source) write(file, japanese);
  for (const locale of locales) {
    const relative = path.relative(root, file);
    const output = path.join(root, targetDirectory[locale], relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    write(output, localizeTataNames(localizeHtml(localizeTataNames.protect(japanese), route, locale, missing[locale]), locale));
  }
}
for (const locale of locales) {
  if (missing[locale].size) {
    console.error(`${locale}: ${missing[locale].size} missing translations`);
    console.error([...missing[locale]].slice(0, 30).join('\n'));
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log(`i18n pages generated: Japanese ${sourceFiles.length}, English ${sourceFiles.length}, Simplified Chinese ${sourceFiles.length}`);
