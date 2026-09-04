import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

test('9イベントの状態・内部導線・公式素材4点を表示する', () => {
  const events = json('data/events.json').events; const images = json('data/official-assets/event-images.json').events; const html = read('events/index.html');
  assert.equal(events.length, 9); assert.equal(images.length, 4); assert.ok(events.every((event) => ['verified', 'externally_confirmed'].includes(event.sourceStatus)));
  for (const item of images) { assert.equal(item.eventId, 'treasure-hunt'); assert.ok(fs.existsSync(path.join(root, item.optimizedPath.slice(1)))); assert.ok(read('events/treasure-hunt/index.html').includes(item.optimizedPath)); }
  assert.ok(images.some((item) => html.includes(item.optimizedPath)));
  assert.match(read('events/treasure-hunt/index.html'), /id="event-guide"/);
  assert.match(read('events/treasure-hunt/index.html'), /href="#event-guide"/);
  for (const href of ['/beginner-guide/', '/team-builder/', '/items/']) assert.ok(html.includes(href));
  for (const prefix of ['', 'en/', 'zh-cn/']) for (const route of ['running-star', 'surprise-roulette']) assert.match(read(`${prefix}events/${route}/index.html`), /name="robots" content="noindex,follow"/);
});

test('58公式スキルアイコンは重複・stage不一致なく意味のあるaltで表示する', () => {
  const icons = json('data/official-assets/skill-icons.json').icons; const keys = new Set(); assert.equal(icons.length, 58);
  for (const icon of icons) { const key = `${icon.familyId}:${icon.stage}`; assert.equal(keys.has(key), false); keys.add(key); assert.ok(fs.existsSync(path.join(root, icon.optimizedPath.slice(1)))); const html = read(`tata/${icon.familyId}/index.html`); assert.ok(html.includes(`data-skill-stage="${icon.stage}"`)); const tag = html.match(new RegExp(`<img[^>]+src="${icon.optimizedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`))?.[0] || ''; assert.match(tag, /alt="[^"]+スキルアイコン"/); }
});

test('初心者候補はSSOT由来8件・画像・診断・My Monsaba導線を持つ', () => {
  const ratings = json('data/tier-ratings.json').overall.byFamily; const tiers = ['SSS', 'SS', 'S', 'A', 'B']; const expected = Object.values(ratings).filter((item) => tiers.includes(item.beginner)).length;
  const html = read('beginner-guide/index.html'); assert.equal((html.match(/class="guide-panel beginner-tata-card"/g) || []).length, Math.min(8, expected)); assert.equal((html.match(/class="beginner-tata-image"/g) || []).length, Math.min(8, expected));
  for (const token of ['data-beginner-choice="overall"', 'data-beginner-choice="zombie"', 'data-beginner-choice="normal"', 'data-beginner-choice="evolution"', 'href="/my-monsaba/"']) assert.ok(html.includes(token));
  assert.doesNotMatch(html, /絶対この順|公式おすすめ|入手しやすい/);
});

test('Community一覧のみindex対象で主要導線と3言語ページがある', () => {
  for (const prefix of ['', 'en/', 'zh-cn/']) { const list = read(`${prefix}team-builder/community/index.html`); const detail = read(`${prefix}team-builder/community/detail/index.html`); assert.match(list, /index,follow/); assert.match(detail, /noindex,follow/); assert.match(list, /community_user/); }
  assert.match(read('team-builder/index.html'), /team-community-publish/); assert.match(read('zombie-rush/index.html'), /みんなの編成を見る/); assert.match(read('index.html'), /みんなのゾンビラッシュ編成/);
  const sitemap = read('sitemap.xml'); assert.match(sitemap, /team-builder\/community\//); assert.doesNotMatch(sitemap, /team-builder\/community\/detail/);
  assert.doesNotMatch(read('team-builder/community/index.html'), /テスト投稿|seed/i);
});
