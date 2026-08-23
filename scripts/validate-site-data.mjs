import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

const tatari = json('data/tatari.json');
const skills = json('data/tata-skills.json');
for (const [label, values] of [
  ['tatari.json', (tatari.families || []).map((family) => family.attribute)],
  ['tata-skills.json', Object.values(skills.byFamily || {}).map((family) => family.attribute)]
]) {
  const invalid = [...new Set(values)].filter((attribute) => !['草', '水', '火', '雷', '岩'].includes(attribute));
  expect(invalid.length === 0, `${label}: 未許可の公開属性 ${invalid.join(', ')}`);
}

const counts = Object.fromEntries(['草', '水', '火', '雷', '岩'].map((attribute) => [attribute, 0]));
for (const family of tatari.families || []) counts[family.attribute] = (counts[family.attribute] || 0) + 1;
const expectedCounts = { 草: 13, 水: 12, 火: 13, 雷: 13, 岩: 12 };
expect(JSON.stringify(counts) === JSON.stringify(expectedCounts), `属性系統数: ${JSON.stringify(counts)}`);
expect((tatari.families || []).length === 63, `総系統数: ${(tatari.families || []).length}`);

const sitemap = read('sitemap.xml');
expect(!sitemap.includes('/attribute/earth/'), 'sitemap.xml に旧 earth URL が残っています');
expect(sitemap.includes('https://monsaba-guide.vercel.app/attribute/rock/'), 'sitemap.xml に rock URL がありません');

const textExtensions = new Set(['.html', '.js', '.json', '.xml', '.txt']);
const textFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', '.vercel', 'node_modules', 'assets'].includes(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (textExtensions.has(path.extname(entry.name))) textFiles.push(path.relative(root, absolute).replaceAll('\\', '/'));
  }
}
walk(root);

for (const file of textFiles) {
  if (file === 'scripts/validate-site-data.mjs') continue;
  const content = read(file);
  if (file !== 'vercel.json') expect(!content.includes('/attribute/earth/'), `${file}: 旧 earth URL`);
  expect(!content.includes('ヒヒドッグ'), `${file}: ヒヒドッグ`);
  expect(!content.includes('当サイトdojo評価'), `${file}: 当サイトdojo評価`);
  if (file !== 'consult/consult.js') expect(!content.includes('土属性'), `${file}: 土属性`);
}

const publicText = textFiles.filter((file) => file !== 'scripts/validate-site-data.mjs').map(read).join('\n');
expect(publicText.includes('ビビドッグ'), 'ビビドッグが公開データにありません');
expect(read('consult/consult.js').includes("replaceAll('土属性', '岩属性')"), '相談所の旧「土属性」入力aliasがありません');

const htmlFiles = textFiles.filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = read(file);
  const canonicalCount = (html.match(/rel=["']canonical["']/g) || []).length;
  expect(canonicalCount <= 1, `${file}: canonical が ${canonicalCount} 件あります`);
  if (html.includes('class="site-header"')) expect(html.includes('src="/site.js"'), `${file}: 共通ヘッダースクリプトがありません`);
}

for (const label of ['タタ図鑑', 'タタTier', '進化優先度', 'コンテンツ攻略', '攻略相談']) {
  expect(read('site.js').includes(label), `共通ヘッダーに ${label} がありません`);
}

const vercel = json('vercel.json');
const redirect = (vercel.redirects || []).find((item) => item.source === '/attribute/earth/' && item.destination === '/attribute/rock/');
expect(redirect?.permanent === true, 'earth → rock の恒久リダイレクトがありません');

const brokenLinks = [];
for (const file of htmlFiles) {
  const html = read(file);
  for (const match of html.matchAll(/href=["']([^"'#?]+)(?:[?#][^"']*)?["']/g)) {
    const href = match[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    if (href === '/attribute/earth/') continue;
    const target = href.endsWith('/') ? `${href.slice(1)}index.html` : href.slice(1);
    if (!fs.existsSync(path.join(root, target))) brokenLinks.push(`${file} -> ${href}`);
  }
}
expect(brokenLinks.length === 0, `存在しない内部リンク:\n${brokenLinks.join('\n')}`);

if (errors.length) {
  console.error(`検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`検証成功: 63系統 ${JSON.stringify(counts)} / HTML ${htmlFiles.length}ページ`);
