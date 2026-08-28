import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import '../family-display.js';

const root = path.resolve(import.meta.dirname, '..');
const retrySignal = new Int32Array(new SharedArrayBuffer(4));
function readWithRetry(file, encoding) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try { return fs.readFileSync(file, encoding); }
    catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error;
      Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1));
    }
  }
}
const read = (file) => readWithRetry(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const ignored = new Set(['.git', '.vercel', 'node_modules', 'assets', 'data', 'scripts', 'promo']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name === 'index.html' ? [path.relative(root, full).replaceAll('\\', '/')] : [];
  });
}

const routeFor = (file) => file === 'index.html' ? '/' : `/${path.posix.dirname(file)}/`;
const plainText = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();

test('search is noindex, self-canonical, outside sitemap and keeps legacy alias search data', () => {
  const search = read('search/index.html');
  assert.match(search, /<meta name="robots" content="noindex,follow"/);
  assert.match(search, /<link rel="canonical" href="https:\/\/monster-survival\.com\/search\/"/);
  assert.doesNotMatch(read('sitemap.xml'), /https:\/\/monster-survival\.com\/search\//);
  const family = json('data/tatari.json').families.find((item) => item.evolutions?.[0]?.name === 'ライメー');
  assert.ok(family, 'ライメー系が見つかりません');
  assert.ok(globalThis.MONSABA_FAMILY.getFamilySearchAliases(family).includes('ライマー'));
  assert.equal(globalThis.MONSABA_FAMILY.getFamilyDisplayLabel(family), 'ライメー系');
});

test('AdSense ownership verification uses the official ads.txt while delivery remains disabled', () => {
  const config = json('data/adsense-config.json');
  assert.equal(config.enabled, false);
  assert.equal(config.publisherId, 'pub-2710725734378326');
  assert.equal(config.autoAds, false);
  assert.deepEqual(config.excludedPages, ['/search/', '/compare/', '/consult/', '/friends/', '/board/', '/board/*']);
  const adsTxt = read('ads.txt');
  assert.equal(adsTxt.trim(), 'google.com, pub-2710725734378326, DIRECT, f08c47fec0942fa0');
  assert.equal(adsTxt.trim().split(', ').length, 4);
  assert.ok(adsTxt.endsWith('\n'));
  assert.equal(json('vercel.json').headers.some((rule) => rule.source === '/ads.txt' && rule.headers.some((header) => header.key === 'Content-Type' && /^text\/plain(?:; charset=utf-8)?$/i.test(header.value))), true);
  const publicSource = walk(root).map(read).join('\n');
  assert.doesNotMatch(publicSource, /adsbygoogle|pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/i);
  const textFiles = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString('utf8').split('\0').filter((file) => /\.(?:html|js|mjs|json|md|txt|xml|css)$/i.test(file));
  const repositoryText = [...textFiles, 'ads.txt'].filter((file, index, files) => files.indexOf(file) === index && fs.existsSync(path.join(root, file))).map(read).join('\n');
  assert.doesNotMatch(repositoryText, /pub-(?:X{8,}|0{8,}|1234567890123456)/i);
});

test('A8 delivery is low-density and all fixed/floating placements are disabled', () => {
  const config = json('data/monetization.json');
  assert.equal(config.adsEnabled, false);
  assert.equal(config.affiliateEnabled, true);
  assert.equal(config.affiliateDensity, 'low');
  for (const key of ['stickyAffiliateEnabled', 'slideAffiliateEnabled', 'bottomAffiliateEnabled', 'desktopRailAffiliateEnabled']) assert.equal(config[key], false, key);
  assert.match(read('monetization.js'), /affiliateDensity === 'low'/);
  const staticAds = walk(root).flatMap((file) => [...read(file).matchAll(/data-affiliate-offer="([^"]+)"/g)].map((match) => ({ file, id: match[1] })));
  assert.equal(staticAds.length, 4);
  assert.equal(Math.max(...Object.values(Object.groupBy(staticAds, (item) => item.file)).map((items) => items.length)), 1);
});

test('Privacy describes future AdSense use without claiming it is active', () => {
  const privacy = read('privacy/index.html');
  for (const phrase of ['今後Google AdSenseを導入する可能性', '現時点ではGoogle AdSenseの広告配信コードを設置しておらず', '第三者配信事業者', 'Cookie', '広告の配信・効果測定', 'パーソナライズ広告', 'Googleの広告設定', 'このページを再更新']) assert.ok(privacy.includes(phrase), phrase);
  assert.doesNotMatch(privacy, /現在Google AdSenseを利用しています/);
});

test('meaningfully changed pages retain the exact review timestamp after generation', () => {
  const expected = json('data/page-freshness.json').routes['/search/'].updated;
  assert.equal(expected, '2026-08-28T07:53:10+09:00');
  for (const file of ['search/index.html', 'privacy/index.html', 'friends/index.html', 'roles/paralysis/index.html', 'roles/heal/index.html']) {
    assert.ok(read(file).includes(expected), `${file}: 秒単位の更新時刻が失われています`);
  }
  assert.match(read('privacy/index.html'), /最終更新：2026\/8\/28 07:53:10 JST/);
});

test('every active role guide has substantive original context, mode guidance and evidence links', () => {
  const roleDirectories = fs.readdirSync(path.join(root, 'roles'), { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.equal(roleDirectories.length, 10);
  for (const { name } of roleDirectories) {
    const html = read(`roles/${name}/index.html`);
    assert.doesNotMatch(html, /noindex/i, name);
    assert.ok(plainText(html).length >= 1400, `${name}: 本文が短すぎます (${plainText(html).length})`);
    for (const phrase of ['役とは', '候補に入れやすい場面', '優先度を下げる判断', '候補', '用途別の使い分け', '通常ステージ', 'Zombie Rush', 'バッジ道場', 'ボスラリー', '初心者・育成優先の考え方', '関連する役割と確認先', '確認済みDB', '当サイト独自整理']) assert.ok(html.includes(phrase), `${name}: ${phrase}`);
    assert.match(html, /href="\/tata\/[^/]+\/"/);
    assert.match(html, /href="\/about-data\/"/);
  }
});

test('sitemap has no noindex mismatch, indexable pages are present and custom 404 stays noindex', () => {
  const sitemap = read('sitemap.xml');
  for (const file of walk(root)) {
    const html = read(file);
    const route = routeFor(file);
    const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
    const included = sitemap.includes(`<loc>https://monster-survival.com${route}</loc>`);
    if (noindex) assert.equal(included, false, `${route} is noindex but in sitemap`);
    else assert.equal(included, true, `${route} is indexable but absent from sitemap`);
  }
  const notFound = read('404.html');
  assert.match(notFound, /<meta name="robots" content="noindex,follow"/);
  assert.match(notFound, /ページが見つかりません/);
});

test('responsive guards cover review widths without fixed AdSense UI', () => {
  const css = read('styles.css');
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /max-width:calc\(100vw - 8px\)/);
  assert.match(css, /\.table-wrap\{overflow-x:auto/);
  assert.match(css, /\.role-context-grid.*grid-template-columns:1fr/);
});

test('full site generation is idempotent', { timeout: 120000 }, () => {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString('utf8').split('\0').filter(Boolean);
  const digest = () => {
    const hash = createHash('sha256');
    for (const file of tracked) {
      const target = path.join(root, file);
      hash.update(file);
      hash.update(readWithRetry(target));
    }
    return hash.digest('hex');
  };
  const before = digest();
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, 'npm executable path is unavailable');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      execFileSync(process.execPath, [npmCli, 'run', 'generate:site'], { cwd: root, stdio: 'pipe', timeout: 110000 });
      break;
    } catch (error) {
      const output = `${error.stderr || ''}\n${error.stdout || ''}`;
      if (!/EBUSY|EPERM/.test(output) || attempt === 2) throw error;
      Atomics.wait(retrySignal, 0, 0, 200 * (attempt + 1));
    }
  }
  const after = digest();
  const changed = after === before ? '' : execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(after, before, `generate:site changed tracked output; run generation and commit the result\n${changed}`);
});
