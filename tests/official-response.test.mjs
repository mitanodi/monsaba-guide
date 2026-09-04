import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

test('official pending Tata review matches the five unresolved forms', () => {
  const images = json('data/tata-images.json');
  const pending = images.families.flatMap((family) => family.forms
    .filter((form) => form.status === 'pending')
    .map((form) => `${family.familyId}:T${form.stage}`)).sort();
  const review = images.officialPendingReview.forms
    .map((form) => `${form.familyId}:T${form.stage}`).sort();
  assert.deepEqual(images.counts, {
    families: 64,
    forms: 230,
    verifiedForms: 225,
    pendingForms: 5,
    officialCreatorAssetForms: 224
  });
  assert.equal(images.officialPendingReview.status, 'official_team_checking');
  assert.equal(images.officialPendingReview.asOf, '2026-09-05');
  assert.deepEqual(review, pending);
});
test('event display names and official inquiry states are explicit', () => {
  const data = json('data/events.json');
  const byId = Object.fromEntries(data.events.map((event) => [event.id, event]));
  const running = byId['running-star'];
  assert.equal(running.name, 'ランニングパーティー');
  assert.equal(running.officialNames.en, 'Running Star');
  assert.equal(running.officialNames['zh-CN'], null);
  for (const id of ['running-star', 'surprise-roulette', 'treasure-hunt']) {
    assert.equal(byId[id].officialInquiry.status, 'awaiting_official_response');
    assert.equal(byId[id].officialInquiry.requestedAt, '2026-09-05');
  }
});

test('localized event pages keep the stable slug and safe names', () => {
  const pages = [
    ['events/running-star/index.html', 'ランニングパーティー', 'lang="ja"'],
    ['en/events/running-star/index.html', 'Running Star', 'lang="en"'],
    ['zh-cn/events/running-star/index.html', 'Running Star', 'lang="zh-CN"']
  ];
  for (const [file, name, lang] of pages) {
    const html = read(file);
    assert.ok(html.includes(name), file);
    assert.ok(html.includes(lang), file);
    assert.match(html, /<link rel="canonical" href="https:\/\/monster-survival\.com\/(?:en\/|zh-cn\/)?events\/running-star\/"/);
    assert.match(html, /official-inquiry-notice/);
  }
  assert.doesNotMatch(read('zh-cn/events/running-star/index.html'), /跑步之星/);
});

test('shared footer exposes attribution and update disclaimer in every locale', () => {
  const cases = [
    ['index.html', '公式Creator Assets', 'アップデート等により'],
    ['en/index.html', 'official Creator Assets', 'after updates'],
    ['zh-cn/index.html', '官方 Creator Assets', '游戏更新后']
  ];
  for (const [file, attribution, disclaimer] of cases) {
    const html = read(file);
    assert.equal((html.match(/class="footer-disclosures"/g) || []).length, 1, file);
    assert.ok(html.includes(attribution), file);
    assert.ok(html.includes(disclaimer), file);
  }
});

test('official response evidence and inquiry procedures are recorded', () => {
  const response = read('docs/evidence/official-response-2026-09-05.md');
  for (const term of ['5形態', 'ゲーム本体のアップデート', '正式英語名・中国語名一覧は準備中', 'ランニングパーティー', 'Running Star', 'Zombie Rush', '公式認定']) assert.ok(response.includes(term), term);
  const queue = read('docs/evidence/zombie-rush-official-question-queue-2026-09-05.md');
  for (const heading of ['A. Season仕様', 'B. Difficulty仕様', 'C. 報酬仕様', 'D. Chip効果', 'E. Tata配置上限', 'F. Playerごとの配置上限', 'G. 上限解放条件', 'H. Tata Lv上限', 'I. Round関連', 'J. Team Builder採用仕様']) assert.ok(queue.includes(heading), heading);
  const guide = read('docs/evidence/official-inquiry-guidelines-2026-09-05.md');
  for (const term of ['screenshot', '使用端末', 'iOS / Android', 'UID', '現在サイト上に掲載している内容']) assert.ok(guide.includes(term), term);
});
