import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

test('official question queue keeps five exact pending Tata image forms', () => {
  const items = json('data/official-question-queue.json').items.filter((item) => item.category === 'tata_image');
  assert.deepEqual(items.map((item) => `${item.entities[0].familyId}:T${item.entities[0].stage}`).sort(), ['nenbutsuhebi:T4', 'pakuma:T2', 'pakuma:T3', 'pakuma:T4', 'sukedako:T4']);
  assert.ok(items.every((item) => item.status === 'awaiting_answer' && item.affectedRoutes.length));
});

test('external source differences remain review candidates only', () => {
  const policy = json('data/freshness-policy.json');
  assert.equal(policy.externalChangePolicy, 'review_candidate_only');
  assert.match(read('scripts/generate-phase4-audit.mjs'), /external_source_change_candidate/);
  assert.doesNotMatch(read('scripts/generate-phase4-audit.mjs'), /writeFileSync\([^\n]*index\.html/);
});

test('community and builder expose Phase 4 sharing and onboarding', () => {
  const community = read('team-builder/community/community.js');
  for (const value of ['community-publish-preview', 'community-share-x', 'community-share-discord', 'community-copy-url', 'loadBuild(build)']) assert.match(community, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const builder = read('team-builder/team-builder.js');
  for (const value of ['monsabaTeamBuilderOnboarding:v1', 'team-help', 'team-export-preset', 'team-discord', "event.key === 'Delete'", "event.key === '/'"]) assert.ok(builder.includes(value), value);
});

test('privacy-safe funnel events are explicitly allowlisted', () => {
  const growth = read('growth.js');
  for (const event of ['home_to_tata', 'tata_to_compare', 'tata_to_team', 'team_to_community', 'community_to_team', 'beginner_to_tata']) assert.ok(growth.includes(event), event);
  assert.ok(!growth.includes("query_text"));
});

test('generated quality audit covers all locales and core routes', () => {
  const audit = json('data/site-quality-audit.json');
  assert.ok(audit.totals.indexable > 100);
  assert.equal(audit.totals.brokenImages, 0);
  for (const route of audit.internalLinkGraph.requiredWithinThreeClicks) assert.equal(route.pass, true, route.route);
  const routes = new Set(audit.freshness.map((item) => item.route));
  for (const route of ['/', '/en/', '/zh-cn/', '/team-builder/', '/team-builder/community/']) assert.ok(routes.has(route), route);
});
