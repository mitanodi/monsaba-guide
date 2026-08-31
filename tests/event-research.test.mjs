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
  assert.equal(byId['zombie-siege'].overseasStatus, 'community_reference_only');
});

test('Zombie Siege stores the Japanese playtest separately from community and legacy data', () => {
  const event = byId['zombie-siege'];
  assert.equal(event.name, 'ゾンビ包囲戦');
  assert.equal(event.status, 'periodic');
  assert.equal(event.verificationStatus, 'verified');
  assert.equal(event.sourceType, 'user_playtest');
  assert.equal(event.verifiedAt, '2026-08-31');
  assert.deepEqual(event.strategy.buffOrder, ['レイジ', 'ロックオン']);
  assert.deepEqual(event.strategy.targetPriority.slice(0, 2), ['シャーマンゾンビ', '電撃ゾンビ']);
  assert.equal(event.strategy.preparationMultiplier, 1);
  assert.equal(event.strategy.scoreMultiplier, 200);
  assert.deepEqual(event.userBenchmark, {
    huntCoins: 500000,
    score: 10000000,
    pointsPerCoin: 20,
    status: 'user_tested_estimate',
    note: 'バフ、ボス抽選、部屋人数、撃破競合で大きく変動'
  });
  assert.equal(event.legacy.separated, true);
});

test('Zombie Siege guide exposes the complete tested route in every locale', () => {
  const cases = [
    {
      file: 'events/zombie-siege/index.html',
      title: 'モンサバ ゾンビ包囲戦攻略',
      current: '日本版で現行プレイ可能',
      terms: ['×1でレイジを確保', 'まずロックオンを取る', '×200のシャーマン', '混雑時は電撃', '人が少ない部屋を探す', '約500,000', '約10,000,000pt', '約20pt / coin', 'ユーザー実戦目安', 'コミュニティ攻略との照合', '旧仕様：宝箱ドロップ方式']
    },
    {
      file: 'en/events/zombie-siege/index.html',
      title: 'Zombie Siege Guide',
      current: 'Currently playable in the Japanese version',
      terms: ['Collect Rage at 1x', 'Get Lock-On before moving up', 'Shaman at 200x', 'Switch to Shocker if crowded', 'Look for a quieter room', 'about 500,000', 'about 10,000,000', 'about 20 points / coin', 'Japanese user benchmark', 'Community cross-check', 'Legacy: chest-drop version']
    },
    {
      file: 'zh-cn/events/zombie-siege/index.html',
      title: '僵尸围城攻略',
      current: '日本版目前可以游玩',
      terms: ['在1倍区取得Rage', '提高倍率前先取得Lock-On', '200倍区的Shaman', '拥挤时改打Shocker', '寻找人数较少的房间', '约500,000', '约10,000,000pt', '约20pt / coin', '日本版用户实战参考', '社区信息交叉核对', '旧机制：宝箱掉落版本']
    }
  ];
  for (const page of cases) {
    const html = read(page.file);
    assert.match(html, new RegExp(`<title>[^<]*${page.title}`), page.file);
    assert.ok(html.includes(page.current), page.file);
    for (const term of page.terms) assert.ok(html.includes(term), `${page.file}: ${term}`);
    assert.equal((html.match(/class="zombie-siege-steps"/g) || []).length, 1, page.file);
    assert.equal((html.match(/class="zombie-siege-benchmark"/g) || []).length, 1, page.file);
    assert.match(html, /"dateModified"\s*:\s*"2026-08-31"/, page.file);
  }
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
      assert.equal((html.match(/class="event-status-grid"/g) || []).length, id === 'zombie-siege' ? 3 : 1, relative);
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
