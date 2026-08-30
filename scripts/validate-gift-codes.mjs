import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const fail = (message) => { throw new Error(`Gift codes validation: ${message}`); };
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/gift-codes.json'), 'utf8'));
const expected = ['openfestc26','openfestb26','openfesta26','welcome2026','GoonBug','HelloTatari','WeeklyGift','WelcomeGift'];
if (JSON.stringify(data.active.map((entry) => entry.code)) !== JSON.stringify(expected)) fail('code order or exact casing differs');
if (data.active.length !== 8 || data.expired.length !== 0) fail('active/expired separation is invalid');
if (data.active.slice(0,3).some((entry) => !entry.isNew || entry.reward !== null || entry.rewardStatus !== 'pending')) fail('new code state is invalid');
if (data.active.some((entry) => entry.expiresAt !== null || entry.expiryStatus !== 'unannounced')) fail('unknown expiry was not preserved');
const files = ['gift-codes/index.html','en/gift-codes/index.html','zh-cn/gift-codes/index.html'];
for (const relative of files) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  if ((html.match(/class="gift-code-card"/g) || []).length !== 8) fail(`${relative} does not render 8 cards`);
  let cursor = -1;
  for (const code of expected) { const next = html.indexOf(`<code>${code}</code>`, cursor + 1); if (next < 0) fail(`${relative} missing ${code}`); cursor = next; }
  if (!html.includes('rel="canonical"') || !html.includes('hreflang="ja"') || !html.includes('hreflang="en"') || !html.includes('hreflang="zh-Hans"') || !html.includes('hreflang="x-default"')) fail(`${relative} SEO alternates incomplete`);
  if (!html.includes('BreadcrumbList') || !html.includes('WebPage') || !html.includes('inLanguage')) fail(`${relative} structured data incomplete`);
}
const js = fs.readFileSync(path.join(root, 'gift-codes/gift-codes.js'), 'utf8');
if (!js.includes('navigator.clipboard') || !js.includes("document.execCommand('copy')")) fail('clipboard fallback missing');
if (!js.includes("gift_code_copy', { location: 'gift_codes', locale }")) fail('privacy-safe analytics event missing');
if (/gift_code_copy[^\n]*(?:\bcode\s*:|copyCode)/.test(js)) fail('code value is sent to analytics');
console.log('Gift codes validation SUCCESS: 8 exact codes / 3 locales / SEO / copy fallback / analytics privacy');
