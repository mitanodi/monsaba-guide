import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const asJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const policy = asJson('data/freshness-policy.json');
const freshness = asJson('data/page-freshness.json');
const sources = asJson('data/external-source-watch.json');
const questions = asJson('data/official-question-queue.json');
const ignored = new Set(['.git', '.vercel', 'node_modules', 'promo']);
const posix = (value) => value.replaceAll('\\', '/');

function walk(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, result);
    else if (entry.name === 'index.html') result.push(absolute);
  }
  return result;
}

function routeFor(file) {
  const relative = posix(path.relative(root, file));
  return relative === 'index.html' ? '/' : `/${relative.replace(/index\.html$/, '')}`;
}

const text = (html, re) => (html.match(re)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const attrs = (html, re) => [...html.matchAll(re)].map((match) => match[1]);
const normalizeRoute = (href, route) => {
  try {
    const url = new URL(href, `https://monster-survival.com${route}`);
    if (url.origin !== 'https://monster-survival.com') return null;
    let pathname = decodeURI(url.pathname);
    if (pathname.endsWith('.html')) pathname = pathname.replace(/index\.html$/, '');
    if (!path.extname(pathname) && !pathname.endsWith('/')) pathname += '/';
    return pathname;
  } catch { return null; }
};

const pages = walk(root).map((file) => {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFor(file);
  const robots = text(html, /<meta\s+name=["']robots["'][^>]+content=["']([^"']+)/i);
  const links = attrs(html, /<a\b[^>]*href=["']([^"']+)["']/gi).map((href) => normalizeRoute(href, route)).filter(Boolean);
  const images = attrs(html, /<img\b[^>]*src=["']([^"']+)["']/gi).map((src) => normalizeRoute(src, route)).filter(Boolean);
  const alternates = [...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi)].map((match) => ({ locale: match[1], href: match[2] }));
  return {
    route, file: posix(path.relative(root, file)), indexable: !/noindex/i.test(robots),
    title: text(html, /<title>([\s\S]*?)<\/title>/i),
    description: text(html, /<meta\s+name=["']description["'][^>]+content=["']([^"']*)/i),
    canonical: text(html, /<link\s+rel=["']canonical["'][^>]+href=["']([^"']*)/i),
    h1: text(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i),
    hasSchema: /application\/ld\+json/i.test(html),
    hasVisibleBreadcrumb: /class=["'][^"']*breadcrumbs/i.test(html),
    hasBreadcrumbSchema: /BreadcrumbList/.test(html),
    alternates, links: [...new Set(links)], images: [...new Set(images)]
  };
});

const pageRoutes = new Set(pages.map((page) => page.route));
const assetExists = (route) => {
  if (pageRoutes.has(route)) return true;
  const relative = route.replace(/^\//, '');
  return fs.existsSync(path.join(root, relative)) || fs.existsSync(path.join(root, relative, 'index.html'));
};
const indexable = pages.filter((page) => page.indexable);
const brokenLinks = [];
const brokenImages = [];
for (const page of indexable) {
  for (const link of page.links) if (!assetExists(link)) brokenLinks.push({ from: page.route, to: link });
  for (const image of page.images) if (!assetExists(image)) brokenImages.push({ from: page.route, to: image });
}

const duplicate = (field) => Object.entries(indexable.reduce((map, page) => {
  const value = page[field];
  if (value) (map[value] ||= []).push(page.route);
  return map;
}, {})).filter(([, routes]) => routes.length > 1).map(([value, routes]) => ({ value, routes }));

const distances = new Map([['/', 0], ['/en/', 0], ['/zh-cn/', 0]]);
const queue = [...distances.keys()];
while (queue.length) {
  const current = queue.shift();
  const from = pages.find((page) => page.route === current);
  if (!from) continue;
  for (const next of from.links.filter((route) => pageRoutes.has(route))) {
    const distance = distances.get(current) + 1;
    if (!distances.has(next) || distance < distances.get(next)) { distances.set(next, distance); queue.push(next); }
  }
}

const routePattern = (route) => {
  const localized = route.replace(/^\/(?:en|zh-cn)(?=\/)/, '') || '/';
  const entries = Object.entries(freshness.routes);
  return entries.find(([pattern]) => pattern === localized)?.[1]
    || entries.filter(([pattern]) => pattern.endsWith('*') && localized.startsWith(pattern.slice(0, -1))).sort((a, b) => b[0].length - a[0].length)[0]?.[1]
    || freshness.default;
};
const policyFor = (route) => {
  const localized = route.replace(/^\/(?:en|zh-cn)(?=\/)/, '') || '/';
  return policy.rules.find((rule) => rule.pattern === localized)
    || policy.rules.find((rule) => rule.pattern.endsWith('*') && localized.startsWith(rule.pattern.slice(0, -1)))
    || policy.rules.at(-1);
};
const ageDays = (date) => Math.floor((Date.parse(`${policy.asOf}T00:00:00Z`) - Date.parse(date)) / 86400000);
const freshnessAudit = indexable.map((page) => {
  const record = { ...freshness.default, ...routePattern(page.route) };
  const rule = policyFor(page.route);
  const verified = String(record.verified || record.updated || '').slice(0, 10);
  const age = verified ? ageDays(verified) : null;
  const sourceChanged = sources.sources.some((source) => source.lastKnownUpdateDate && verified && source.lastKnownUpdateDate > verified && (rule.category === 'tier' ? source.category === 'tier' : source.category === 'official'));
  return { route: page.route, verified, ageDays: age, category: rule.category, priority: rule.priority, status: record.status || 'latest_verified', reviewRequired: !verified || age > rule.maxAgeDays || sourceChanged, reasons: [...(!verified ? ['missing_verified_date'] : []), ...(age > rule.maxAgeDays ? [`age_over_${rule.maxAgeDays}_days`] : []), ...(sourceChanged ? ['external_source_change_candidate'] : [])] };
});

const requiredThreeClicks = ['/', '/tata-tier/', '/beginner-guide/', '/team-builder/', '/team-builder/community/', '/zombie-rush/', '/events/'];
const structuralIssues = indexable.flatMap((page) => [
  ...(!page.title ? [{ route: page.route, issue: 'missing_title' }] : []),
  ...(!page.description ? [{ route: page.route, issue: 'missing_description' }] : []),
  ...(!page.canonical ? [{ route: page.route, issue: 'missing_canonical' }] : []),
  ...(!page.h1 ? [{ route: page.route, issue: 'missing_h1' }] : []),
  ...(!page.hasSchema ? [{ route: page.route, issue: 'missing_schema' }] : []),
  ...(page.hasVisibleBreadcrumb !== page.hasBreadcrumbSchema ? [{ route: page.route, issue: 'breadcrumb_visible_schema_mismatch' }] : []),
  ...(!page.alternates.length ? [{ route: page.route, issue: 'missing_hreflang' }] : [])
]);
const bundles = ['styles.css', 'site.js', 'growth.js', 'team-builder/team-builder.js', 'team-builder/community/community.js'].map((file) => ({ file, bytes: fs.statSync(path.join(root, file)).size }));
const report = {
  version: 1, asOf: policy.asOf,
  totals: { pages: pages.length, indexable: indexable.length, brokenLinks: brokenLinks.length, brokenImages: brokenImages.length, structuralIssues: structuralIssues.length, reviewRequired: freshnessAudit.filter((item) => item.reviewRequired).length },
  duplicates: { titles: duplicate('title'), descriptions: duplicate('description'), h1: duplicate('h1') },
  brokenLinks, brokenImages, structuralIssues,
  internalLinkGraph: {
    orphans: indexable.filter((page) => !distances.has(page.route)).map((page) => page.route),
    requiredWithinThreeClicks: requiredThreeClicks.map((route) => ({ route, depth: distances.get(route) ?? null, pass: (distances.get(route) ?? 99) <= 3 })),
    maxDepth: Math.max(...[...distances.values()])
  },
  freshness: freshnessAudit,
  officialQuestions: questions.items.map((item) => ({ id: item.id, category: item.category, status: item.status, affectedRoutes: item.affectedRoutes })),
  performance: { bundles, localStorageNamespaces: ['monsabaFormationDraft:v2', 'monsabaSavedFormations:v2', 'monsabaRoster:v1', 'monsabaFavorites:v1', 'monsabaCommunityDraft:v1'], communityPagination: true, previewImagesLazy: true }
};
fs.writeFileSync(path.join(root, 'data/site-quality-audit.json'), `${JSON.stringify(report, null, 2)}\n`);

const reviews = freshnessAudit.filter((item) => item.reviewRequired).sort((a, b) => ['HIGH', 'MEDIUM', 'LOW'].indexOf(a.priority) - ['HIGH', 'MEDIUM', 'LOW'].indexOf(b.priority) || a.route.localeCompare(b.route));
const reviewLines = ['# 更新待ちDashboard', '', `基準日: ${policy.asOf}`, '', '> 外部情報の変化は本文へ自動反映しません。すべて差分候補として人間が確認します。', ''];
for (const priority of ['HIGH', 'MEDIUM', 'LOW']) {
  reviewLines.push(`## ${priority}`, '');
  const rows = reviews.filter((item) => item.priority === priority);
  reviewLines.push(...(rows.length ? rows.map((item) => `- \`${item.route}\` — ${item.reasons.join(', ') || 'review required'}`) : ['- なし']), '');
}
reviewLines.push('## 公式回答待ち', '', ...questions.items.filter((item) => item.status !== 'production_ready').map((item) => `- \`${item.id}\` (${item.category}) — 影響: ${item.affectedRoutes.join(', ')}`));
fs.writeFileSync(path.join(root, 'docs/review-queue.md'), `${reviewLines.join('\n')}\n`);

const intent = `# Search intent / Landing Page\n\n|検索意図|主Landing Page|補助ページ|\n|---|---|---|\n|モンサバ / モンサバ 攻略|/|/guides/|\n|モンサバ タタ|/#tatari|/attribute/|\n|モンサバ Tier / 最強|/tata-tier/|/evolution-priority/|\n|モンサバ 初心者|/beginner-guide/|/my-monsaba/|\n|モンサバ 進化|/evolution/|/evolution-priority/, /evolution/trials/|\n|モンサバ ゾンビラッシュ|/zombie-rush/|/zombie-rush/chips/|\n|モンサバ 編成|/team-builder/|/team-builder/community/|\n|モンサバ イベント|/events/|各イベント詳細|\n\nTier・初心者・進化・個別タタ・Zombie Rushは、主検索意図を上表へ分離し、相互リンクで補完する。\n`;
fs.writeFileSync(path.join(root, 'docs/search-intent-map.md'), intent);
console.log(`Phase 4監査生成: indexable ${indexable.length} / review ${reviews.length} / broken link ${brokenLinks.length} / broken image ${brokenImages.length}`);
