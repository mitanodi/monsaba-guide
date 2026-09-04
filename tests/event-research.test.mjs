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
  assert.equal(byId['running-star'].name, 'ランニングパーティー');
  assert.equal(byId['running-star'].officialNames.en, 'Running Star');
  assert.equal(byId['running-star'].officialNames['zh-CN'], null);
  assert.equal(byId['summer-party'].name, 'サマーパーティ');
  assert.deepEqual(byId['summer-party'].communityAliases, ['Summer Party', 'Summer Bash']);
  assert.ok(byId['island-treasure'].communityAliases.includes('Deepsea Dive'));
  assert.ok(byId['zombie-siege'].communityAliases.includes('Zobo Shooter'));
  assert.equal(byId['zombie-siege'].overseasStatus, 'community_reference_only');
});

test('Zombie Siege stores field verification separately from community and legacy data', () => {
  const event = byId['zombie-siege'];
  assert.equal(event.name, 'ゾンビ包囲戦');
  assert.equal(event.status, 'periodic');
  assert.equal(event.verificationStatus, 'verified');
  assert.equal(event.sourceType, 'field_verification');
  assert.equal(event.verifiedAt, '2026-09-01');
  assert.deepEqual(event.strategy.buffOrder, ['レイジ', 'ロックオン']);
  assert.deepEqual(event.strategy.targetPriority.slice(0, 2), ['シャーマンゾンビ', '電撃ゾンビ']);
  assert.equal(event.strategy.preparationMultiplier, 1);
  assert.equal(event.strategy.scoreMultiplier, 200);
  assert.deepEqual(event.fieldVerification, {
    runs: 2,
    huntCoinsPerRunApprox: 500000,
    minimumScorePerRun: 10000000,
    bestRunScoreOver: 11000000,
    minimumPointsPerCoinApprox: 20,
    status: 'verified_observation',
    note: 'バフ、ボス抽選、部屋人数、撃破競合で大きく変動'
  });
  assert.equal(event.legacy.separated, true);
});

test('Zombie Siege guide exposes the complete tested route in every locale', () => {
  const cases = [
    {
      file: 'events/zombie-siege/index.html',
      title: 'モンサバ ゾンビ包囲戦攻略',
      current: '<div class="summary-box zombie-siege-current"><strong>実戦確認</strong></div>',
      terms: ['×1でレイジを確保', 'まずロックオンを取る', '×200のシャーマン', '混雑時は電撃', '人が少ない部屋を探す', '約500,000 / 回', '1,000万pt超 / 回', '約20pt / coin以上', '実戦確認', '2回実戦', '1回は1,100万pt超', 'コミュニティ攻略との照合', '旧仕様：宝箱ドロップ方式'],
      forbidden: ['ユーザー本人', 'ユーザー実戦', '1例です', '古い「一時閉鎖」情報は現行状態として扱いません']
    },
    {
      file: 'en/events/zombie-siege/index.html',
      title: 'Zombie Siege Guide',
      current: '<div class="summary-box zombie-siege-current"><strong>Field verification</strong></div>',
      terms: ['Collect Rage at 1x', 'Get Lock-On before moving up', 'Shaman at 200x', 'Switch to Shocker if crowded', 'Look for a quieter room', 'about 500,000 / run', 'over 10,000,000 / run', 'about 20+ points / coin', 'Field verification', 'tested twice', 'one exceeded 11,000,000 points', 'Community cross-check', 'Legacy: chest-drop version'],
      forbidden: ['The user personally', 'Japanese user benchmark', 'one observed run', 'The previous “temporarily closed” notice is no longer treated as current']
    },
    {
      file: 'zh-cn/events/zombie-siege/index.html',
      title: '僵尸围城攻略',
      current: '<div class="summary-box zombie-siege-current"><strong>实战确认</strong></div>',
      terms: ['在1倍区取得Rage', '提高倍率前先取得Lock-On', '200倍区的Shaman', '拥挤时改打Shocker', '寻找人数较少的房间', '约500,000 / 次', '每次超过1,000万pt', '约20pt / coin以上', '实战确认', '实战2次', '其中1次超过1,100万pt', '社区信息交叉核对', '旧机制：宝箱掉落版本'],
      forbidden: ['用户于', '日本版用户实战参考', '一次实战记录', '旧有“暂时关闭”信息不再作为当前状态']
    }
  ];
  for (const page of cases) {
    const html = read(page.file);
    assert.match(html, new RegExp(`<title>[^<]*${page.title}`), page.file);
    assert.ok(html.includes(page.current), page.file);
    for (const term of page.terms) assert.ok(html.includes(term), `${page.file}: ${term}`);
    for (const term of page.forbidden) assert.ok(!html.includes(term), `${page.file}: forbidden ${term}`);
    assert.equal((html.match(/class="zombie-siege-steps"/g) || []).length, 1, page.file);
    assert.equal((html.match(/class="zombie-siege-benchmark"/g) || []).length, 1, page.file);
    assert.match(html, /"dateModified"\s*:\s*"2026-09-01"/, page.file);
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

test('event research dates agree in every locale and sitemap', () => {
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
      const officialPending = ['running-star', 'treasure-hunt', 'surprise-roulette'].includes(id);
      const updated = id === 'zombie-siege' ? '2026-09-01' : officialPending ? '2026-09-05' : '2026-08-31';
      const kickerDate = id === 'zombie-siege'
        ? (locale.prefix === 'en/' ? 'Sep 1, 2026' : '2026年9月1日')
        : officialPending
          ? (locale.prefix === 'en/' ? 'Sep 5, 2026' : '2026年9月5日')
        : locale.kickerDate;
      const checked = id === 'zombie-siege'
        ? (locale.prefix === 'en/' ? 'Last checked: Sep 1, 2026' : locale.prefix === 'zh-cn/' ? '最后确认：2026年9月1日' : '最終確認日：2026年9月1日')
        : officialPending
          ? (locale.prefix === 'en/' ? 'Last checked: Sep 5, 2026' : locale.prefix === 'zh-cn/' ? '最后确认：2026年9月5日' : '最終確認日：2026年9月5日')
        : locale.checked;
      assert.match(html, new RegExp(`"dateModified"\\s*:\\s*"${updated}"`), relative);
      assert.match(html, new RegExp(`<span class="visible-kicker">[^<]*${kickerDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*<\\/span>`), relative);
      assert.ok(html.includes(checked), relative);
      const route = `/${locale.prefix}events/${id}/`;
      if (['running-star', 'surprise-roulette'].includes(id)) {
        assert.match(html, /name="robots" content="noindex,follow"/);
        assert.equal(sitemap.includes(`<loc>https://monster-survival.com${route}</loc>`), false, route);
      } else assert.ok(sitemap.includes(`<loc>https://monster-survival.com${route}</loc><lastmod>${updated}</lastmod>`), route);
    }
  }
  assert.ok(sitemap.includes('<loc>https://monster-survival.com/events/</loc><lastmod>2026-09-05</lastmod>'));
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
