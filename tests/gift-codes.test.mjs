import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/gift-codes.json'), 'utf8'));
const codes = ['openfestc26','openfestb26','openfesta26','welcome2026','GoonBug','HelloTatari','WeeklyGift','WelcomeGift'];
const pages = ['gift-codes/index.html','en/gift-codes/index.html','zh-cn/gift-codes/index.html'];

test('gift code data preserves all exact strings, order and unknown states', () => {
  assert.deepEqual(data.active.map((entry) => entry.code), codes);
  assert.equal(data.active.length, 8);
  assert.equal(data.expired.length, 0);
  assert.deepEqual(data.active.slice(0,3).map((entry) => entry.reward), [null,null,null]);
  assert.ok(data.active.slice(0,3).every((entry) => entry.isNew && entry.rewardStatus === 'pending'));
  assert.ok(data.active.every((entry) => entry.expiresAt === null && entry.expiryStatus === 'unannounced'));
});

test('all locales render eight cards in exact order with canonical and hreflang', () => {
  for (const relative of pages) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.equal((html.match(/class="gift-code-card"/g) || []).length, 8, relative);
    let cursor = -1;
    for (const code of codes) { const next = html.indexOf(`<code>${code}</code>`, cursor + 1); assert.ok(next > cursor, `${relative}: ${code}`); cursor = next; }
    for (const hreflang of ['ja','en','zh-Hans','x-default']) assert.match(html, new RegExp(`hreflang="${hreflang}"`));
    assert.match(html, /rel="canonical"/);
    assert.match(html, /"@type":"WebPage"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
  }
});

test('copy uses exact data attribute with fallback and privacy-safe analytics', () => {
  const ja = fs.readFileSync(path.join(root, pages[0]), 'utf8');
  for (const code of codes) assert.match(ja, new RegExp(`data-copy-code="${code}"`));
  const js = fs.readFileSync(path.join(root, 'gift-codes/gift-codes.js'), 'utf8');
  assert.match(js, /navigator\.clipboard\?\.writeText/);
  assert.match(js, /document\.execCommand\('copy'\)/);
  assert.match(js, /gift_code_copy', \{ location: 'gift_codes', locale \}/);
  assert.doesNotMatch(js, /gift_code_copy[^\n]*(?:\bcode\s*:|copyCode)/);
});

test('search, top, guide and beginner routes include gift codes', () => {
  const search = fs.readFileSync(path.join(root, 'search/search.js'), 'utf8');
  for (const term of ['ギフトコード','gift code','openfestc26','openfestb26','openfesta26','welcome2026']) assert.ok(search.includes(term));
  assert.ok(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('/gift-codes/'));
  assert.ok(fs.readFileSync(path.join(root, 'guides/index.html'), 'utf8').includes('/gift-codes/'));
  assert.ok(fs.readFileSync(path.join(root, 'beginner-guide/index.html'), 'utf8').includes('/gift-codes/'));
});

test('sitemap contains all three indexable routes', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const route of ['/gift-codes/','/en/gift-codes/','/zh-cn/gift-codes/']) assert.ok(sitemap.includes(`https://monster-survival.com${route}`));
});
