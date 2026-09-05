import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const events = ['home_to_tata', 'tata_to_compare', 'tata_to_team', 'team_to_community', 'community_to_team', 'beginner_to_tata'];

function simulate(sourcePath, destination, hash = '') {
  const listeners = {};
  const calls = [];
  const document = {
    body: { dataset: { pageType: 'audit' } },
    querySelectorAll: () => [],
    addEventListener: (name, listener) => { listeners[name] = listener; },
    dispatchEvent: () => true
  };
  const window = { innerWidth: 1280, gtag: (...args) => calls.push(args) };
  const context = {
    window, document, location: { origin: 'https://monster-survival.com', hostname: 'monster-survival.com', pathname: sourcePath },
    fetch: async () => ({ ok: false }), URL, Element: class {}, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } }, console
  };
  vm.runInNewContext(read('growth.js'), context);
  const link = {
    href: `https://monster-survival.com${destination}${hash}`,
    dataset: {},
    matches: () => false,
    closest: (selector) => selector === 'a[href]' ? link : null
  };
  listeners.click({ target: link });
  return calls.find((args) => args[0] === 'event');
}

test('all six funnel routes emit their exact event names', () => {
  const cases = [
    ['/', '/tata/takepanda/', '', 'home_to_tata'],
    ['/tata/takepanda/', '/compare/', '', 'tata_to_compare'],
    ['/tata/takepanda/', '/team-builder/', '', 'tata_to_team'],
    ['/team-builder/', '/team-builder/community/', '', 'team_to_community'],
    ['/team-builder/community/', '/team-builder/', '', 'community_to_team'],
    ['/beginner-guide/', '/tata/takepanda/', '', 'beginner_to_tata']
  ];
  for (const [source, destination, hash, expected] of cases) assert.equal(simulate(source, destination, hash)?.[1], expected);
});

test('funnel GA4 payload contains only privacy-safe dimensions', () => {
  const payload = simulate('/tata/takepanda/', '/team-builder/')[2];
  assert.deepEqual(Object.keys(payload).sort(), ['destination_type', 'page_location', 'source_type']);
  assert.equal(payload.page_location, 'https://monster-survival.com/tata/:family/');
  const serialized = JSON.stringify(payload);
  for (const forbidden of ['takepanda', 'formation', 'chip', 'username', 'uid', 'free text']) assert.ok(!serialized.toLowerCase().includes(forbidden));
});

test('custom GA4 events are disabled outside the Production hostname', () => {
  const source = read('growth.js');
  assert.match(source, /productionAnalytics && typeof window\.gtag/);
  assert.match(source, /monster-survival\.com/);
});

test('Search Console opportunities use real required fields and preserve strong SEO pages', () => {
  const report = json('data/search-console-opportunities.json');
  assert.equal(report.opportunities.length, 10);
  assert.equal(report.decision.seoChangesApplied, 0);
  assert.equal(report.decision.newPagesCreated, 0);
  for (const row of report.opportunities) {
    for (const field of ['query', 'page', 'clicks', 'impressions', 'ctr', 'position', 'opportunityType', 'recommendedAction', 'confidence']) assert.notEqual(row[field], undefined, field);
    assert.ok(row.position >= 4 && row.position <= 15);
    assert.ok(row.ctr < report.period.siteAverageCtr);
  }
});

test('activation copy includes Japanese and English without automatic posting', () => {
  const copy = read('docs/community-activation-copy.md');
  for (const marker of ['X（日本語', 'X（English', 'Discord（日本語', 'Discord（English', 'ゲーム内チャット短文', 'Game chat short copy']) assert.ok(copy.includes(marker), marker);
  assert.match(copy, /自動投稿はしない/);
});

test('official queue and empty Community remain truthful', () => {
  assert.equal(json('data/official-question-queue.json').items.filter((item) => item.status === 'waiting').length, 8);
  assert.equal(json('data/community-live-audit.json').postCount, 0);
  assert.match(read('docs/community-live-operations.md'), /未送信/);
});

test('analytics audit explains reporting-window delay without fabricated counts', () => {
  const snapshot = json('data/analytics-funnel-snapshot.json');
  assert.deepEqual(snapshot.funnels.map((item) => item.event), events);
  assert.ok(snapshot.funnels.every((item) => item.eventCount === null));
  assert.ok(snapshot.diagnosis.includes('standard_report_ends_before_deployment'));
});
