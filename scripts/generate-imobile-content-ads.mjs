import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const excludedRoutes = new Set([
  'board',
  'friends',
  'tata-tier',
  'team-builder',
  'team-builder/community',
  'feeding',
  'events/calendar'
]);
const excludedSelectors = [
  '.page-hero',
  '.ninja-admax-slot',
  '.astra-ad',
  '.monetization-slot',
  '.imobile-ad-slot',
  '.personal-tool-shell',
  '.tata-sticky-actions',
  '.tata-family-nav',
  '.community-form',
  'form',
  'input',
  'select',
  'textarea',
  'button',
  '[data-team-builder]',
  '#team-settings',
  '#feeding-app'
].join(',');

function collectHtml(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtml(target);
    return entry.isFile() && entry.name.endsWith('.html') ? [target] : [];
  });
}

function routeFor(file) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  return relative.replace(/\/index\.html$/, '').replace(/^index\.html$/, '');
}

function localeFor(route) {
  if (route === 'en' || route.startsWith('en/')) return 'en';
  if (route === 'zh-cn' || route.startsWith('zh-cn/')) return 'zh-cn';
  return 'ja';
}

function isNoindex($) {
  return /(?:^|[,\s])noindex(?:$|[,\s])/i.test($('meta[name="robots"]').attr('content') || '');
}

function isExcludedRoute(route) {
  const normalized = route.replace(/^(?:en|zh-cn)\//, '');
  return excludedRoutes.has(normalized) || normalized === '404';
}

function contentLength($) {
  return $('main').text().replace(/\s+/g, ' ').trim().length;
}

function hasNearbyAd($, node) {
  const element = $(node);
  if (element.closest(excludedSelectors).length || element.find(excludedSelectors).length) return true;
  const siblings = element.parent().children();
  const index = siblings.index(element);
  return [siblings.eq(index - 1), siblings.eq(index + 1)].some(sibling =>
    sibling.is('.ninja-admax-slot, .astra-ad, .monetization-slot, .imobile-ad-slot')
  );
}

function candidatesFor($) {
  const candidates = [];
  $('main section, main article').each((_, node) => {
    const element = $(node);
    const length = element.text().replace(/\s+/g, ' ').trim().length;
    const location = node.sourceCodeLocation;
    if (length < 80 || !location?.endTag || hasNearbyAd($, node)) return;
    candidates.push({ node, length, offset: location.endTag.startOffset });
  });
  return candidates;
}

function stableIndex(route, size) {
  let hash = 2166136261;
  for (const char of route) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

function placementFor(route, candidates, mainLength) {
  const routeIndex = stableIndex(route, 3);
  const targetRatio = [0.3, 0.56, 0.78][routeIndex];
  const total = candidates.reduce((sum, item) => sum + item.length, 0);
  let consumed = 0;
  let selected = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const center = (consumed + candidate.length / 2) / Math.max(total, 1);
    const distance = Math.abs(center - targetRatio);
    if (distance < bestDistance) {
      selected = candidate;
      bestDistance = distance;
    }
    consumed += candidate.length;
  }
  if (targetRatio < 0.42) return { ...selected, slot: 'top' };
  if (targetRatio > 0.68) return { ...selected, slot: 'bottom' };
  return { ...selected, slot: 'mid' };
}

const htmlFiles = collectHtml(root);
const versionSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const assetVersion = versionSource.match(/href="\/astra\.css\?v=([a-f\d]+)"/i)?.[1];
if (!assetVersion) throw new Error('Could not read the current shared asset version from index.html');

let added = 0;
let skipped = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = load(html, { sourceCodeLocationInfo: true });
  const route = routeFor(file);
  const locale = localeFor(route);
  if (locale !== 'ja') {
    if (!$('.imobile-content-ad').length) {
      skipped++;
      continue;
    }
    let corrected = html.replace(/[ \t]*<aside\b(?=[^>]*\bimobile-content-ad\b)[^>]*>[\s\S]*?<\/aside>[ \t]*(?:\r?\n)?/, '');
    if (!load(corrected)('.imobile-ad-slot').length) {
      corrected = corrected.replace(/[ \t]*<link rel="stylesheet" href="\/imobile-ads\.css\?v=[^"]+">[ \t]*(?:\r?\n)?/, '');
    }
    fs.writeFileSync(file, corrected, 'utf8');
    skipped++;
    continue;
  }
  if (isNoindex($) || isExcludedRoute(route) || contentLength($) < 200) {
    skipped++;
    continue;
  }

  const adLabel = '広告';
  if ($('.imobile-content-ad').length) {
    const corrected = html.replace(/(<aside\b[^>]*\bclass="[^"]*\bimobile-content-ad\b[^"]*"[^>]*\baria-label=")[^"]*("><span class="imobile-ad-label">)[^<]*(<\/span>)/, `$1${adLabel}$2${adLabel}$3`).replace(/[ \t]+(?=\r?$)/gm, '');
    if (corrected !== html) fs.writeFileSync(file, corrected, 'utf8');
    skipped++;
    continue;
  }
  if ($('.imobile-ad-slot').length) {
    skipped++;
    continue;
  }

  const candidates = candidatesFor($);
  if (!candidates.length) {
    skipped++;
    continue;
  }

  const placement = placementFor(route, candidates, contentLength($));
  const aside = `\n<aside class="wrap imobile-ad-slot imobile-content-ad" data-imobile-placement="${placement.slot}" aria-label="${adLabel}"><span class="imobile-ad-label">${adLabel}</span><script src="/imobile-ads.js?v=${assetVersion}" data-imobile-slot="${placement.slot}"></script></aside>`;
  let updated = `${html.slice(0, placement.offset)}${aside}${html.slice(placement.offset)}`;
  const updatedDoc = load(updated);
  if (!updatedDoc('link[href^="/imobile-ads.css"]').length) {
    const headClose = updated.toLowerCase().lastIndexOf('</head>');
    if (headClose < 0) throw new Error(`Could not find </head> in ${route || '/'}`);
    const css = `<link rel="stylesheet" href="/imobile-ads.css?v=${assetVersion}">`;
    updated = `${updated.slice(0, headClose)}${css}${updated.slice(headClose)}`;
  }
  updated = updated.replace(/[ \t]+(?=\r?$)/gm, '');
  if (updated !== html) {
    fs.writeFileSync(file, updated, 'utf8');
    added++;
  }
}

console.log(`i-mobile content slots: added ${added}; skipped ${skipped}; asset version ${assetVersion}`);
