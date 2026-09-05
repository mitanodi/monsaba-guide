import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

test('live Community audit preserves an empty real database without fake actions', () => {
  const audit = json('data/community-live-audit.json');
  assert.equal(audit.postCount, 0);
  assert.equal(audit.sampleStatus, 'INSUFFICIENT_DATA');
  assert.equal(audit.checks.fakeSeedAbsent, 'pass');
  const script = read('scripts/audit-community-live.mjs');
  assert.match(script, /nextCursor/);
  assert.doesNotMatch(script, /method\s*:\s*['"](?:POST|DELETE|PATCH|PUT)/i);
});

test('official queue uses the Phase 5 status taxonomy and keeps all unanswered items waiting', () => {
  const queue = json('data/official-question-queue.json');
  const allowed = new Set(['waiting', 'answered', 'partially_answered', 'resolved']);
  assert.equal(queue.items.length, 8);
  assert.ok(queue.items.every((item) => allowed.has(item.status)));
  assert.equal(queue.items.filter((item) => item.status === 'waiting').length, 8);
});

test('real Search Console evidence and insufficient Analytics funnel data are explicit', () => {
  const search = json('data/search-console-snapshot.json');
  assert.equal(search.periods['7d'].clicks, 5704);
  assert.equal(search.periods['28d'].impressions, 28717);
  assert.ok(search.indexInspection.every((item) => item.status === 'indexed'));
  const analytics = json('data/analytics-funnel-snapshot.json');
  assert.equal(analytics.sampleStatus, 'INSUFFICIENT_DATA');
  assert.deepEqual(analytics.funnels.map((item) => item.event), ['home_to_tata', 'tata_to_compare', 'tata_to_team', 'team_to_community', 'community_to_team', 'beginner_to_tata']);
  assert.ok(analytics.funnels.every((item) => item.eventCount === null));
});

test('Community operations cover the complete two-device workflow and safe sharing copy', () => {
  const operations = read('docs/community-live-operations.md');
  for (const value of ['端末A', '端末B', 'Helpful', 'Trial Report', 'Comment', 'Reply', 'Edit', 'Delete', 'Report', '20KB request limit']) assert.ok(operations.includes(value), value);
  const copy = read('docs/community-activation-copy.md');
  for (const value of ['Zombie Rush', 'P1/P2', 'Tier', 'Lv', 'Chip', 'そのまま読込']) assert.ok(copy.includes(value), value);
});

test('Community detail remains noindex,follow with useful generic OG metadata', () => {
  const detail = read('team-builder/community/detail/index.html');
  assert.match(detail, /name="robots" content="noindex,follow"/);
  assert.match(detail, /property="og:title"/);
  assert.match(detail, /property="og:description"/);
  assert.match(detail, /property="og:image"/);
});

test('Beginner reads the same My Monsaba roster namespace used by the roster tool', () => {
  const rosterCore = read('my-monsaba/roster-core.js');
  const beginner = read('beginner-guide/beginner.js');
  assert.match(rosterCore, /ROSTER_KEY = 'monsabaMyRoster:v1'/);
  assert.match(beginner, /getItem\('monsabaMyRoster:v1'\)/);
  assert.doesNotMatch(beginner, /getItem\('monsabaRoster:v1'\)/);
});
