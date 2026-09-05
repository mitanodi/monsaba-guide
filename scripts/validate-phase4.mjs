import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const policy = read('data/freshness-policy.json');
const queue = read('data/official-question-queue.json');
const audit = read('data/site-quality-audit.json');
const errors = [];

const statusKeys = ['latest_verified', 'official_public', 'in_game', 'external', 'legacy', 'pending', 'community'];
for (const key of statusKeys) if (!policy.statuses[key]) errors.push(`freshness status missing: ${key}`);
if (policy.externalChangePolicy !== 'review_candidate_only') errors.push('外部差分はreview_candidate_onlyである必要があります');
if (!policy.rules.some((rule) => rule.pattern === '*')) errors.push('freshness default rule missing');

const ids = new Set();
const questionStatuses = queue.statuses || ['waiting', 'answered', 'partially_answered', 'resolved'];
for (const item of queue.items || []) {
  if (!item.id || ids.has(item.id)) errors.push(`official question id invalid: ${item.id}`);
  ids.add(item.id);
  if (!Array.isArray(item.affectedRoutes) || !item.affectedRoutes.length) errors.push(`${item.id}: affectedRoutes missing`);
  if (!questionStatuses.includes(item.status)) errors.push(`${item.id}: unsupported status ${item.status}`);
}
if (queue.items.filter((item) => item.category === 'tata_image').length !== 5) errors.push('確認待ちTata画像は5形態である必要があります');
for (const category of ['localized_name', 'event', 'zombie_rush']) if (!queue.items.some((item) => item.category === category)) errors.push(`official question category missing: ${category}`);

if (audit.asOf !== policy.asOf) errors.push('audit asOf does not match freshness policy');
if (!fs.existsSync(path.join(root, 'docs/review-queue.md'))) errors.push('review dashboard missing');
if (!fs.existsSync(path.join(root, 'docs/search-intent-map.md'))) errors.push('search intent map missing');
for (const route of audit.internalLinkGraph.requiredWithinThreeClicks || []) if (!route.pass) errors.push(`3 click rule failed: ${route.route} depth=${route.depth}`);
if (audit.totals.brokenImages) errors.push(`broken images: ${audit.totals.brokenImages}`);
if (audit.totals.structuralIssues) errors.push(`structural issues: ${audit.totals.structuralIssues}`);

const community = fs.readFileSync(path.join(root, 'team-builder/community/community.js'), 'utf8');
for (const signal of ['community-share-x', 'community-share-discord', 'community-copy-url', 'community-publish-preview']) if (!community.includes(signal)) errors.push(`community UX signal missing: ${signal}`);
const builder = fs.readFileSync(path.join(root, 'team-builder/team-builder.js'), 'utf8');
for (const signal of ['monsabaTeamBuilderOnboarding:v1', 'team-help', 'team-export-preset', 'team-discord']) if (!builder.includes(signal) && !fs.readFileSync(path.join(root, 'team-builder/index.html'), 'utf8').includes(signal)) errors.push(`team builder UX signal missing: ${signal}`);
const growth = fs.readFileSync(path.join(root, 'growth.js'), 'utf8');
for (const event of ['home_to_tata', 'tata_to_compare', 'tata_to_team', 'team_to_community', 'community_to_team', 'beginner_to_tata']) if (!growth.includes(event)) errors.push(`funnel event missing: ${event}`);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`Phase 4検証成功: ${queue.items.length} official questions / ${audit.totals.indexable} indexable pages / ${audit.totals.reviewRequired} review candidates`);
