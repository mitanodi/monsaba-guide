import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { load } from 'cheerio';
import { normalizeAssetUrl, normalizeAssetHtml, normalizeSiteAssets, siteHtmlFiles, assetPolicy } from '../scripts/lib/asset-cache.mjs';
import { prepareDeployment } from '../scripts/prepare-deployment.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('CSS/JSのvだけ除去し、別パラメータ・HTMLエンティティ・fragment・相対パスを保持', () => {
  for (const [before, after] of [
    ['/site.js?v=old', '/site.js'],
    ['./styles.css?v=old#x', './styles.css#x'],
    ['../site.js?theme=dark&v=old&lang=en#x', '../site.js?theme=dark&lang=en#x'],
    ['/site.js?v=old&amp;theme=dark&amp;v=older&amp;flag#x', '/site.js?theme=dark&amp;flag#x'],
    ['site.js?lang=ja&v=old', 'site.js?lang=ja'],
    ['/site.js?x=a%20b&v=old&empty=', '/site.js?x=a%20b&empty='],
    ['/site.js?theme=dark#x', '/site.js?theme=dark#x'],
    ['/site.js?flag&version=old', '/site.js?flag&version=old']
  ]) {
    assert.equal(normalizeAssetUrl(before, '/en/test/index.html'), after);
    assert.equal(normalizeAssetUrl(after, '/en/test/index.html'), after);
  }
});

test('広告・認証・画像・JSON・通常リンク・外部CSS/JSのクエリは保持', () => {
  for (const url of ['https://third.example/sdk.js?v=1&id=keep', '//third.example/theme.css?v=2', '/assets/img.webp?v=3', '/data/tatari.json?v=4', '/api/board?token=keep&v=5', '?ads=live', '#part']) assert.equal(normalizeAssetUrl(url), url);
  const source = `<a href="/site.js?v=download">download</a><img src="/x.webp?v=image"><script src="https://third.example/sdk.js?v=external"></script><script src='/site.js?v=old&amp;mode=keep#x' defer></script><link rel="stylesheet" href="./styles.css?v=old">`;
  assert.equal(normalizeAssetHtml(source), source.replace("/site.js?v=old&amp;mode=keep#x", '/site.js?mode=keep#x').replace('./styles.css?v=old', './styles.css'));
});

test('長期キャッシュCSSは一回限りの新固定パスへ移し、旧パスの互換ファイルを残す', () => {
  assert.equal(normalizeAssetUrl('/assets/aug30-update.css?v=old&theme=keep'), '/styles/aug30-update.css?theme=keep');
  assert.equal(normalizeAssetUrl('../assets/aug30-update.css?v=old', '/events/'), '/styles/aug30-update.css');
  assert.equal(normalizeAssetUrl('/styles/aug30-update.css'), '/styles/aug30-update.css');
  assert.ok(fs.existsSync(path.join(root, 'assets/aug30-update.css')));
  assert.ok(fs.existsSync(path.join(root, 'styles/aug30-update.css')));
  assert.equal(assetPolicy.strategy, 'revalidate');
  assert.equal(Object.hasOwn(assetPolicy, 'version'), false);
});

test('単独CSS/JS変更でHTMLやpolicyを更新せず、正規化の再実行も差分なし', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'monsaba-cache-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture, 'index.html'), '<link href="/style.css?v=old"><script src="/app.js?v=old&mode=keep"></script>');
  fs.writeFileSync(path.join(fixture, 'app.js'), 'const revision=1;');
  fs.writeFileSync(path.join(fixture, 'style.css'), 'body{color:black}');
  fs.mkdirSync(path.join(fixture, 'promo'));
  fs.writeFileSync(path.join(fixture, 'promo/index.html'), '<script src="/app.js?v=untouched"></script>');
  assert.equal(normalizeSiteAssets(fixture).changed.length, 1);
  const html = fs.readFileSync(path.join(fixture, 'index.html'), 'utf8');
  const policyBefore = read('data/asset-build.json');
  for (const [file, content] of [['app.js','const revision=2;'], ['style.css','body{color:blue}']]) {
    fs.writeFileSync(path.join(fixture, file), content);
    assert.equal(normalizeSiteAssets(fixture).changed.length, 0);
    assert.equal(fs.readFileSync(path.join(fixture, 'index.html'), 'utf8'), html);
    assert.equal(read('data/asset-build.json'), policyBefore);
  }
  assert.match(fs.readFileSync(path.join(fixture, 'promo/index.html'), 'utf8'), /v=untouched/);
});

test('日本語・英語・簡体字の全生成HTMLは固定URLで、参照ファイルが存在する', () => {
  let checked = 0;
  for (const file of siteHtmlFiles(root)) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const html = fs.readFileSync(file, 'utf8');
    assert.equal(normalizeAssetHtml(html, '/' + relative), html, relative);
    const $ = load(html);
    for (const element of $('script[src],link[href]').toArray()) {
      const value = $(element).attr('src') ?? $(element).attr('href');
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) continue;
      const url = new URL(value, `https://local.invalid/${relative}`);
      if (!/\.(?:css|js)$/.test(url.pathname)) continue;
      assert.equal(url.searchParams.has('v'), false, relative + value);
      assert.ok(fs.existsSync(path.join(root, url.pathname.slice(1))), relative + value);
      checked++;
    }
  }
  assert.ok(checked > 1000);
  for (const prefix of ['','en/','zh-cn/']) {
    const html = read(prefix + 'index.html');
    assert.ok(html.includes('src="/site.js"'));
    assert.ok(html.includes('href="/astra.css"'));
    if (prefix) assert.ok(html.includes(`src="/i18n/${prefix.slice(0,-1)}-runtime.js"`));
  }
});

test('CSS/JSと画像のCache-Controlルールが排他的でAPIや認証を変更しない', () => {
  const config = JSON.parse(read('vercel.json'));
  const values = pathname => config.headers.filter(rule => !rule.has && !rule.missing && new RegExp(`^${rule.source}$`).test(pathname))
    .flatMap(rule => rule.headers.filter(h => h.key.toLowerCase() === 'cache-control').map(h => h.value));
  for (const pathname of ['/styles.css','/site.js','/assets/aug30-update.css','/assets/future.js','/styles/aug30-update.css','/en/site.js','/zh-cn/team-builder/team-builder.js','/i18n/zh-cn-runtime.js','/calendar/calendar-core.js']) assert.deepEqual(values(pathname), ['public, no-cache'], pathname);
  for (const pathname of ['/assets/img.webp','/assets/img.png','/assets/font.woff2','/assets/audio.mp3']) assert.deepEqual(values(pathname), ['public, max-age=31536000, immutable']);
  for (const pathname of ['/api/board','/api/board.js','/index.html','/ads.txt']) assert.deepEqual(values(pathname), []);
  assert.ok(!config.headers.some(rule => rule.headers.some(h => ['ETag','Last-Modified'].includes(h.key))));
});

test('Deployment処理も旧URLを正規化し、広告コードとSEO日付を保持・再実行は冪等', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'monsaba-deploy-cache-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const html = '<html><head><script type="application/ld+json">{"dateModified":"2026-10-07"}</script><link href="/styles.css?v=old"></head><body><a href="https://px.a8.net/?keep=tracking">広告</a><script src="/site.js?v=old&mode=keep"></script></body></html>';
  fs.writeFileSync(path.join(fixture, 'index.html'), html);
  prepareDeployment(fixture, 'production');
  const after = fs.readFileSync(path.join(fixture, 'index.html'), 'utf8');
  assert.equal(after, normalizeAssetHtml(html));
  prepareDeployment(fixture, 'production');
  assert.equal(fs.readFileSync(path.join(fixture, 'index.html'), 'utf8'), after);
});
