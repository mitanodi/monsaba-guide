import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/events.json'), 'utf8'));
const byId = Object.fromEntries(data.events.map((event) => [event.id, event]));

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
  const search = fs.readFileSync(path.join(root, 'search/search.js'), 'utf8');
  for (const alias of ['Summer Bash', 'Marathon Party', 'Deepsea Dive', 'Cozy Farm', 'Fishing Contest', 'Treasure Hunt', 'Zobo Shooter']) {
    assert.ok(search.includes(alias), alias);
  }
});
