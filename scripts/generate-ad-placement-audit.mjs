import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data', 'monetization.json'), 'utf8'));
const offers = JSON.parse(fs.readFileSync(path.join(root, 'data', 'affiliate-offers.json'), 'utf8')).offers || [];
const offerNames = new Map(offers.map((offer) => [offer.id, offer.name]));
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'assets', 'data', 'scripts', 'promo']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

const toRoute = (file) => {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -10)}`;
  return `/${relative}`;
};
const matches = (pattern, route) => pattern.endsWith('*') ? route.startsWith(pattern.slice(0, -1)) : route === pattern;
const ruleFor = (route) => config.pageProfiles.find((rule) => matches(rule.match, route));
const files = walk(root).sort((a, b) => toRoute(a).localeCompare(toRoute(b), 'ja'));
const routes = files.map(toRoute);
const eligibleRoutes = routes.filter((route) => ruleFor(route));
const baseline = new Map([
  ['/', ['1', 'ワラウ', '本文下部', 'desktop / mobile', '表示']],
  ['/beginner-guide/', ['1', 'ポイントインカム', '本文下部', 'desktop / mobile', '表示']],
  ['/evolution-priority/', ['1', 'マクロミル', '本文下部', 'desktop only', '820px以下は非表示']],
  ['/normal-guide/', ['1', 'Ipsos iSay', '本文下部', 'desktop / mobile', '表示']]
]);

const beforeRows = routes.map((route) => {
  const row = baseline.get(route) || ['0', '—', '—', '—', '非表示'];
  return `| ${BASE_URL}${route} | ${row.join(' | ')} |`;
});

const afterRows = routes.map((route) => {
  const rule = ruleFor(route);
  if (!rule) return `| ${BASE_URL}${route} | 0 | — | — | — | 対象外 |`;
  const profile = config.profiles[rule.profile];
  const inline = profile.placements.map((placement) => `${placement.offerIds.map((id) => offerNames.get(id)).join(' / ')}（${placement.placement}）`).join('、');
  const floating = 'ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide）';
  const rail = route === '/evolution-priority/' ? '、マクロミル（1920px級 desktop rail）' : '';
  const count = profile.placements.length + 1;
  const positions = `${profile.placements.map((placement) => placement.placement).join(' / ')} / floating${rail ? ' / rail' : ''}`;
  return `| ${BASE_URL}${route} | 最大${count} | ${inline}、${floating}${rail} | ${positions} | desktop / mobile | 表示（固定広告は1セッション1回） |`;
});

const audit = `# A8広告配置監査

生成元: \`data/monetization.json\` / \`data/affiliate-offers.json\`
対象: 公開HTML ${routes.length}ページ（404を含む）
監査日: 2026-08-25

## Before

- 広告ページ数: ${baseline.size}
- 広告枠数: ${baseline.size}
- 通常広告: OFF（\`adsEnabled:false\`）

| URL | 広告数 | 案件 | 位置 | desktop/mobile | 表示可否 |
|---|---:|---|---|---|---|
${beforeRows.join('\n')}

## After

- 広告対象ページ数: ${eligibleRoutes.length}
- インライン枠数: ${eligibleRoutes.reduce((total, route) => total + config.profiles[ruleFor(route).profile].placements.length, 0)}
- 固定広告候補枠数: ${eligibleRoutes.length}（実表示は1セッション最大${config.floatingAffiliateSessionLimit}回）
- Desktop rail: /evolution-priority/ の1600px以上のみ。表示時は固定slideを出さない。
- 通常広告: 引き続きOFF。空の通常広告枠は表示しない。

| URL | 広告数 | 案件 | 位置 | desktop/mobile | 表示可否 |
|---|---:|---|---|---|---|
${afterRows.join('\n')}

## A8広告掲載URL管理

A8.net公式ヘルプでは、同一ドメイン内でトップページからリンクされたページへの掲載は可能と案内されています。一方、提携プログラムごとの広告掲載URL提出機能があるため、新規掲載URLは人間がA8管理画面から提出してください。

- 公式: https://support.a8.net/a8/as/faq/2004/08/post_41.html
- 公式: https://support.a8.net/a8/as/faq/manual/ad_url_manage.php
- 一括提出用: \`docs/a8-ad-url-submission.csv\`（ヘッダーなし、A列=プログラムID、B列=URL）
- このRepository変更だけではA8管理画面への提出は完了しません。
`;

const originalTargets = new Map([
  ['point_income_003', new Set(['/beginner-guide/'])],
  ['warau_003', new Set(['/'])],
  ['ipsos_isay_001', new Set(['/normal-guide/'])]
]);
const submissionRows = [];
for (const offer of offers.filter((offer) => originalTargets.has(offer.id))) {
  for (const route of eligibleRoutes) {
    if (originalTargets.get(offer.id).has(route)) continue;
    submissionRows.push(`${offer.trackingId},${BASE_URL}${route}`);
  }
}

fs.writeFileSync(path.join(root, 'docs', 'ad-placement-audit.md'), audit);
fs.writeFileSync(path.join(root, 'docs', 'a8-ad-url-submission.csv'), `${submissionRows.join('\n')}\n`);
console.log(`広告配置監査を生成しました: ${routes.length} pages / before ${baseline.size} / after ${eligibleRoutes.length} / A8追加URL ${submissionRows.length}`);
