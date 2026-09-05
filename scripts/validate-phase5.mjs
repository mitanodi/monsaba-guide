import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const allowedQuestionStatuses = new Set(['waiting', 'answered', 'partially_answered', 'resolved']);
const queue = json('data/official-question-queue.json');
assert.equal(queue.items.length, 8);
assert.ok(queue.items.every((item) => allowedQuestionStatuses.has(item.status)));
assert.equal(queue.items.filter((item) => item.status === 'resolved').length, 0);

const community = json('data/community-live-audit.json');
assert.equal(community.postCount, 0);
assert.equal(community.sampleStatus, 'INSUFFICIENT_DATA');
assert.equal(community.checks.fakeSeedAbsent, 'pass');

const analytics = json('data/analytics-funnel-snapshot.json');
assert.equal(analytics.funnels.length, 6);
assert.equal(analytics.sampleStatus, 'INSUFFICIENT_DATA');
assert.ok(analytics.funnels.every((item) => item.eventCount === null && item.status === 'not_observed'));

const search = json('data/search-console-snapshot.json');
assert.ok(search.periods['7d'].clicks > 0 && search.periods['28d'].impressions > 0);
assert.ok(search.indexInspection.every((item) => item.status === 'indexed'));

const liveScript = read('scripts/audit-community-live.mjs');
assert.doesNotMatch(liveScript, /method\s*:\s*['"](?:POST|DELETE|PATCH|PUT)/i);
assert.match(read('docs/community-live-operations.md'), /端末A\/B確認/);
assert.match(read('docs/community-activation-copy.md'), /P1\/P2/);
console.log('Phase 5 validation passed.');
