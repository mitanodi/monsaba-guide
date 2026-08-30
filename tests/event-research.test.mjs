import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/events.json'), 'utf8'));
const byId = Object.fromEntries(data.events.map((event) => [event.id, event]));
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const researchedEventIds = [
  'running-party',
  'running-star',
  'island-treasure',
  'magic-farm',
  'fishing-tournament',
  'treasure-hunt',
  'zombie-siege',
  'surprise-roulette'
];

test('community rotation is explicitly non-guaranteed', () => {
  assert.equal(data.communityRotation.sourceStatus, 'externally_confirmed');
  assert.equal(data.communityRotation.notGuaranteedSchedule, true);
  assert.deepEqual(data.communityRotation.sequence, [
    'fishing-tournament',
    'treasure-hunt',
    'running-party',
    'zombie-siege',
    'magic-farm'
  ]);
});

test('community aliases stay separate from official Japanese event names', () => {
  assert.equal(byId['summer-party'].name, 'サマーパーティ');
  assert.deepEqual(byId['summer-party'].communityAliases, ['Summer Party', 'Summer Bash']);
  assert.ok(byId['island-treasure'].communityAliases.includes('Deepsea Dive'));
  assert.ok(byId['zombie-siege'].communityAliases.includes('Zobo Shooter'));
  assert.equal(byId['zombie-siege'].overseasStatus, 'japan_implementation_pending');
});

test('unverified event details are marked for human verification', () => {
  for (const id of ['running-party', 'island-treasure', 'magic-farm', 'fishing-tournament', 'treasure-hunt', 'zombie-siege', 'surprise-roulette']) {
    assert.equal(byId[id].needsHumanVerification, true, id);
  }
  assert.equal(byId['island-treasure'].territoryValues.length, 6);
  assert.deepEqual(byId['island-treasure'].territoryValues.at(-1), { name: '巨大な金鉱', pointsPerHour: 1800, hp: 1000 });
});

test('research record prioritizes the user-provided 23-page in-game evidence', () => {
  const record = fs.readFileSync(path.join(root, 'docs/event-research-2026-08-31.md'), 'utf8');
  assert.match(record, /23ページ、日本語版ゲーム内スクリーンショット/);
  assert.match(record, /外部攻略情報より優先/);
  assert.match(record, /画像、文章、表、HTML、CSSは転載していない/);
  assert.match(record, /Human Verification/);
});

test('event search exposes community aliases without replacing primary names', () => {
  const search = read('search/search.js');
  for (const alias of ['Summer Bash', 'Marathon Party', 'Deepsea Dive', 'Cozy Farm', 'Fishing Contest', 'Treasure Hunt', 'Zobo Shooter']) {
    assert.ok(search.includes(alias), alias);
  }
});

test('August 31 event research dates agree in every locale and sitemap', () => {
  const locales = [
    { prefix: '', checked: '最終確認日：2026年8月31日', kickerDate: '2026年8月31日' },
    { prefix: 'en/', checked: 'Last checked: Aug 31, 2026', kickerDate: 'Aug 31, 2026' },
    { prefix: 'zh-cn/', checked: '最后确认：2026年8月31日', kickerDate: '2026年8月31日' }
  ];
  const sitemap = read('sitemap.xml');
  for (const id of researchedEventIds) {
    for (const locale of locales) {
      const relative = `${locale.prefix}events/${id}/index.html`;
      const html = read(relative);
      assert.match(html, /"dateModified"\s*:\s*"2026-08-31"/, relative);
      assert.match(html, new RegExp(`<span class="visible-kicker">[^<]*${locale.kickerDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*<\\/span>`), relative);
      assert.ok(html.includes(locale.checked), relative);
      const route = `/${locale.prefix}events/${id}/`;
      assert.ok(sitemap.includes(`<loc>https://monster-survival.com${route}</loc><lastmod>2026-08-31</lastmod>`), route);
    }
  }
  assert.ok(sitemap.includes('<loc>https://monster-survival.com/events/</loc><lastmod>2026-08-30</lastmod>'));
});

test('Treasure Hunt uses the shared localized footer totals', () => {
  const expected = [
    ['events/treasure-hunt/index.html', '64系統 / 230体'],
    ['en/events/treasure-hunt/index.html', '64 families / 230 Tatari'],
    ['zh-cn/events/treasure-hunt/index.html', '64 个系列 / 230 个 Tatari']
  ];
  for (const [relative, footerMeta] of expected) {
    const html = read(relative);
    assert.ok(html.includes(`<div class="footer-meta">${footerMeta}</div>`), relative);
    assert.doesNotMatch(html, /<div class="footer-meta"><\/div>/, relative);
    assert.match(html, /hreflang="ja"/);
    assert.match(html, /hreflang="en"/);
    assert.match(html, /hreflang="zh-Hans"/);
  }
});

test('localized event guides and freshness sections appear exactly once', () => {
  for (const locale of ['en', 'zh-cn']) {
    for (const id of researchedEventIds) {
      const relative = `${locale}/events/${id}/index.html`;
      const html = read(relative);
      assert.equal((html.match(/class="event-status-grid"/g) || []).length, 1, relative);
      assert.equal((html.match(/>Human Verification</g) || []).length, 1, relative);
      assert.equal((html.match(/class="wrap source-note page-freshness"/g) || []).length, 1, relative);
    }
  }
});

test('localized Treasure Hunt pages never mix shared and legacy locale markers', () => {
  const cases = [
    ['events/treasure-hunt/index.html', null],
    ['en/events/treasure-hunt/index.html', 'EN'],
    ['zh-cn/events/treasure-hunt/index.html', 'ZH']
  ];
  for (const [relative, localeMarker] of cases) {
    const html = read(relative);
    assert.equal((html.match(/AUG30:EVENT_GUIDE:START/g) || []).length, 1, relative);
    assert.equal((html.match(/AUG30:EVENT_FRESHNESS:START/g) || []).length, 1, relative);
    if (localeMarker) {
      assert.doesNotMatch(html, new RegExp(`AUG30:EVENT_GUIDE_${localeMarker}:START`), relative);
      assert.doesNotMatch(html, new RegExp(`AUG30:EVENT_FRESHNESS_${localeMarker}:START`), relative);
    }
  }
});
