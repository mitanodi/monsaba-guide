import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('global navigation is grouped, searchable, sticky, and keyboard accessible', () => {
  const layout = read('scripts/shared-layout.mjs');
  const site = read('site.js');
  const css = read('styles.css');
  for (const group of ['タタ', '攻略', '育成', 'ツール', 'コミュニティ']) assert.match(layout, new RegExp(group));
  assert.match(layout, /nav-category-trigger/);
  assert.match(layout, /data-global-search-open/);
  assert.match(site, /event\.key === 'Escape'/);
  assert.match(site, /event\.key\.toLowerCase\(\) === 'k'/);
  assert.match(site, /monsaba-search-history-v1/);
  assert.doesNotMatch(site, /search_term|query_text/);
  assert.match(css, /\.site-header\{[^}]*sticky/);
});

test('top page provides intent navigation without invented popularity', () => {
  const html = read('index.html');
  assert.match(html, /id="intent-title"/);
  assert.match(html, /初心者です/);
  assert.match(html, /編成を作りたい/);
  assert.match(html, /注目攻略/);
  assert.doesNotMatch(html, /人気ランキング|よく見られている攻略/);
});

test('Tier supports shareable modes and explicit criteria', () => {
  const html = read('tata-tier/index.html');
  const js = read('tata-tier/tata-tier.js');
  assert.match(html, /tier-criteria-panel/);
  assert.match(html, /サイト独自評価/);
  assert.match(js, /#mode-/);
  for (const mode of ['overall', 'beginner', 'normal', 'zombie', 'dojo']) assert.match(js, new RegExp(mode));
});

test('Tata detail uses official hero, visual timeline, skills, and actions', () => {
  const generator = read('scripts/generate-tata-pages.mjs');
  const sample = read('tata/denjika/index.html');
  assert.match(generator, /tata-character-visual/);
  assert.match(sample, /assets\/official\/tata\/denjika\/t1-512\.webp/);
  assert.match(sample, /tata-evolution-timeline/);
  assert.match(sample, /skill-title-with-icon/);
  assert.match(sample, /tata-sticky-actions/);
  assert.match(sample, /次にできること/);
});

test('catalog, Team Builder, Community, and Events expose Phase 3 controls', () => {
  assert.match(read('app.js'), /catalogAdvancedFilters/);
  assert.match(read('app.js'), /data-clear-filter/);
  const site = read('site.js');
  assert.match(site, /team-focus-mode/);
  assert.match(site, /team-picker-sheet-toggle/);
  assert.match(site, /community-view-tabs/);
  assert.match(read('events/index.html'), /data-event-filter/);
});

test('responsive, accessibility, and reduced-motion protections exist', () => {
  const css = read('styles.css');
  assert.match(css, /mobile-bottom-nav/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(read('index.html'), /class="skip-link"/);
});
