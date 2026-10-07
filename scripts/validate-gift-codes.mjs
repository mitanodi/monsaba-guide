import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fail = (message) => {

  throw new Error(`Gift codes validation: ${message}`);

};
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/gift-codes.json'), 'utf8'));
const expected = [
  'tatatata',
  'tatamoon',
  'bulipaohuata',
  'dcardtatago',
  'steeamertata',
  'ttukkapet26',
  'openfestc26',
  'openfestb26',
  'openfesta26',
  'welcome2026',
  'GoonBug',
  'HelloTatari',
  'WeeklyGift',
  'WelcomeGift'
];
if (JSON.stringify(data.active.map((entry) => entry.code)) !== JSON.stringify(expected))
  fail('code order or exact casing differs');
if (data.active.length !== expected.length || data.expired.length !== 0)
  fail('active/expired separation is invalid');
if (!data.active.slice(0, 2).every((entry) => entry.isNew && entry.reward.length > 0) || data.active[0].confirmationStatus !== 'externally_listed_unredeemed' || data.active[1].confirmationStatus !== 'officially_listed_unredeemed')
  fail('NEW external evidence state is invalid');
if (data.active.slice(2).some((entry) => entry.isNew))
  fail('only the first two codes may be NEW');
if (data.active.filter(entry=>!['tatamoon','GoonBug','HelloTatari'].includes(entry.code)).some((entry) => entry.expiresAt !== null || !['unknown', 'unannounced'].includes(entry.expiryStatus)))
  fail('unknown expiry was not preserved');
const moon=data.active.find(entry=>entry.code==='tatamoon');
if (moon.expiresAt !== '2026-10-25T01:00:00+09:00' || moon.expiryStatus !== 'official_announced' || moon.sourceUrl !== 'https://discord.com/channels/1343763804349267989/1507036690672517350/1552983131470954497') fail('official tatamoon deadline or evidence differs');
for (const code of ['GoonBug','HelloTatari']) { const entry=data.active.find(row=>row.code===code);if(entry.validityStatus !== 'officially_reported_expired' || entry.officialString !== code.toLowerCase() || entry.expiresAt !== null) fail('official expiry status differs: '+code); }
if (new Set(expected).size !== expected.length)
  fail('expected fixture contains duplicate codes');
const files = ['gift-codes/index.html', 'en/gift-codes/index.html', 'zh-cn/gift-codes/index.html'];
for (const relative of files) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  if ((html.match(/class="gift-code-card"/g) || []).length !== expected.length)
    fail(`${relative} does not render ${expected.length} cards`);
  let cursor = -1;
  for (const code of expected) {

    const next = html.indexOf(`<code>${code}</code>`, cursor + 1);

    if (next < 0)
      fail(`${relative} missing ${code}`);

    cursor = next;

  }
  for (const code of expected)
    if (!html.includes(`data-copy-code="${code}"`))
      fail(`${relative} copy value differs for ${code}`);
  if ((html.match(/class="gift-code-new"/g) || []).length !== 2)
    fail(`${relative} does not render exactly 2 NEW badges`);
  if (!html.includes('rel="canonical"') || !html.includes('hreflang="ja"') || !html.includes('hreflang="en"') || !html.includes('hreflang="zh-Hans"') || !html.includes('hreflang="x-default"'))
    fail(`${relative} SEO alternates incomplete`);
  if (!html.includes('BreadcrumbList') || !html.includes('WebPage') || !html.includes('inLanguage'))
    fail(`${relative} structured data incomplete`);
}
const js = fs.readFileSync(path.join(root, 'gift-codes/gift-codes.js'), 'utf8');
if (!js.includes('navigator.clipboard') || !js.includes("document.execCommand('copy')"))
  fail('clipboard fallback missing');
if (!js.includes("gift_code_copy', { location: 'gift_codes', locale }"))
  fail('privacy-safe analytics event missing');
if (/gift_code_copy[^\n]*(?:\bcode\s*:|copyCode)/.test(js))
  fail('code value is sent to analytics');
console.log(`Gift codes validation SUCCESS: ${expected.length} exact codes / 3 locales / SEO / copy fallback / analytics privacy`);
