import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const images = json('data/tata-images.json');
const tatari = json('data/tatari.json');

test('64 unique Stage 1 crops map one-to-one to the database', () => {
  assert.equal(images.families.length, 64);
  assert.equal(new Set(images.families.map((family) => family.familyId)).size, 64);
  assert.deepEqual(images.families.map((family) => family.familyId), tatari.families.map((family) => family.id));
  assert.equal(new Set(images.families.map((family) => family.stage1.sha256)).size, 64);
  for (const family of images.families) {
    assert.equal(family.stage1.status, 'verified');
    assert.match(family.stage1.src, new RegExp(`^/assets/tata-crops/stage1/${family.familyId}\\.webp$`));
    assert.ok(fs.existsSync(path.join(root, family.stage1.src.slice(1))));
  }
});

test('only verified forms have publishable image URLs', () => {
  const forms = images.families.flatMap((family) => family.forms);
  assert.equal(forms.length, 230);
  assert.equal(forms.filter((form) => form.status === 'verified').length, 111);
  assert.equal(forms.filter((form) => form.status === 'pending').length, 119);
  assert.ok(forms.filter((form) => form.status === 'pending').every((form) => form.src === null && form.reason === 'locked_silhouette_only'));
  assert.ok(forms.filter((form) => form.status === 'verified').every((form) => fs.existsSync(path.join(root, form.src.slice(1)))));
  assert.equal(images.sourcePolicy.lockedSilhouettesPublished, false);
});

test('generated JA, EN and zh-CN pages use the shared crops', () => {
  for (const file of ['index.html', 'en/index.html', 'zh-cn/index.html']) {
    const html = read(file);
    assert.equal((html.match(/\/assets\/tata-crops\/stage1\//g) || []).length, 64, `${file}: Stage 1 image count`);
    assert.doesNotMatch(html, /card-image[^>]*>[\s\S]{0,180}assets\/thumbs\//);
  }
});

test('detail pages publish verified crops and neutral pending states', () => {
  const allDetailHtml = tatari.families.map((family) => read(`tata/${family.id}/index.html`)).join('\n');
  assert.equal((allDetailHtml.match(/\/assets\/tata-crops\/forms\//g) || []).length, 111);
  assert.equal((allDetailHtml.match(/class="tata-image-pending"/g) || []).length, 119);
  assert.doesNotMatch(allDetailHtml, /assets\/thumbs\//);
  assert.match(read('tata/purabi/index.html'), /assets\/tata-crops\/forms\/purabi\/t1\.webp/);
  assert.match(read('en/tata/purabi/index.html'), /assets\/tata-crops\/forms\/purabi\/t1\.webp/);
  assert.match(read('zh-cn/tata/purabi/index.html'), /assets\/tata-crops\/forms\/purabi\/t1\.webp/);
});

test('Tier, Compare, Team Builder, My Monsaba, Search and Evolution Priority use crop mappings', () => {
  assert.match(read('tata-tier/index.html'), /assets\/tata-crops\/stage1\//);
  assert.match(read('evolution-priority/index.html'), /assets\/tata-crops\/stage1\//);
  for (const file of ['tata-tier/tata-tier.js', 'compare/compare.js', 'team-builder/team-builder.js', 'my-monsaba/my-monsaba.js', 'search/search.js', 'zombie-rush/zombie-rush.js', 'evolution-priority/evolution-priority.js']) {
    assert.match(read(file), /data\/tata-images\.json/, `${file}: image manifest fetch`);
  }
  assert.match(read('compare/compare.js'), /compare-family-head/);
  assert.match(read('search/search.js'), /has-tata-image/);
  assert.doesNotMatch(read('evolution-priority/evolution-priority.js'), /assets\/thumbs\//);
});

test('current UI counts are 64 families, 230 forms and 13/13/13/13/12 attributes', () => {
  const counts = Object.fromEntries(['草', '水', '火', '雷', '岩'].map((attribute) => [attribute, tatari.families.filter((family) => family.attribute === attribute).length]));
  assert.equal(tatari.families.length, 64);
  assert.equal(tatari.families.flatMap((family) => family.evolutions).length, 230);
  assert.deepEqual(counts, { 草: 13, 水: 13, 火: 13, 雷: 13, 岩: 12 });
  for (const file of ['index.html', 'about/index.html', 'about-data/index.html', 'tata-tier/index.html', 'en/index.html', 'zh-cn/index.html']) {
    assert.doesNotMatch(read(file), /63系統|224体|63 families|224 Tatari|63 个系列|224 个 Tatari/, `${file}: stale current count`);
  }
  assert.match(read('index.html'), /water[^>]*href="\/attribute\/water\/"[^>]*>[^<]*水属性 <small>13系統<\/small>/);
  assert.doesNotMatch(read('index.html'), /water[^>]*href="\/attribute\/water\/"[^>]*>[^<]*水属性 <small>12系統<\/small>/);
});

test('crop CSS preserves complete characters and responsive layouts', () => {
  const css = read('styles.css') + read('my-tools.css');
  assert.match(css, /Standardized 1:1 Tata crops/);
  assert.match(css, /card-image img[^}]*object-fit:contain/);
  assert.match(css, /compare-family-head/);
  assert.match(css, /@media\(max-width:430px\)/);
});
