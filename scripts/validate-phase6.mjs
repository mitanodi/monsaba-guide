import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const fail = (message) => { console.error(`Phase 6 validation failed: ${message}`); process.exitCode = 1; };

const events = ['home_to_tata', 'tata_to_compare', 'tata_to_team', 'team_to_community', 'community_to_team', 'beginner_to_tata'];
const growth = read('growth.js');
for (const event of events) if (!growth.includes(event)) fail(`missing funnel event ${event}`);

const analytics = json('data/analytics-funnel-snapshot.json');
if (analytics.sampleStatus !== 'INSUFFICIENT_DATA') fail('funnel sample must stay insufficient until real observations exist');
if (!analytics.funnels.every((item) => item.eventCount === null)) fail('unobserved funnel events must be null, not fabricated zeroes');
if (!analytics.implementation || analytics.implementation.privacyGuard !== 'PASS' || analytics.implementation.productionGuard !== 'PASS') fail('analytics implementation evidence is missing');

const search = json('data/search-console-opportunities.json');
if (search.opportunities.length < 1 || search.opportunities.length > 10) fail('opportunities must contain 1 through 10 rows');
for (const item of search.opportunities) {
  for (const field of ['query', 'page', 'clicks', 'impressions', 'ctr', 'position', 'opportunityType', 'recommendedAction', 'confidence']) {
    if (item[field] === undefined || item[field] === null || item[field] === '') fail(`opportunity is missing ${field}`);
  }
}
if (search.decision.seoChangesApplied !== 0) fail('Phase 6 must not claim unperformed SEO changes');

const community = json('data/community-live-audit.json');
if (community.postCount === 0 && !read('docs/community-live-operations.md').includes('未送信')) fail('empty Community must record the unsubmitted Human Action');

if (process.exitCode) process.exit(process.exitCode);
console.log(`Phase 6 validation success: ${events.length} funnels / ${search.opportunities.length} search opportunities / ${community.postCount} real posts`);
