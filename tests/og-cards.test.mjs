import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/og-cards.json'), 'utf8'));
const decodeHtml = (value) => String(value)
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>');
const routeToFile = (route) => route === '/'
  ? path.join(root, 'index.html')
  : path.join(root, route.slice(1), 'index.html');
const metaValue = (html, attribute, key) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escaped}["'])[^>]*>`, 'i'))?.[0] || '';
  return decodeHtml(tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || '');
};

test('all 15 target pages use unique locale-specific OG cards', async () => {
  const images = new Set();
  for (const page of config.pages) {
    for (const [locale, localeConfig] of Object.entries(config.locales)) {
      const route = page.routes[locale];
      const html = fs.readFileSync(routeToFile(route), 'utf8');
      const imageUrl = metaValue(html, 'property', 'og:image');
      assert.match(imageUrl, new RegExp(`^${config.baseUrl}/assets/og/${localeConfig.directory}/${page.key}-[a-f0-9]{12}\\.png$`), route);
      assert.equal(metaValue(html, 'name', 'twitter:image'), imageUrl, route);
      assert.equal(metaValue(html, 'name', 'twitter:card'), 'summary_large_image', route);
      assert.equal(metaValue(html, 'property', 'og:title'), page.content[locale].ogTitle, route);
      assert.equal(metaValue(html, 'property', 'og:description'), page.content[locale].ogDescription, route);
      assert.equal(metaValue(html, 'name', 'twitter:title'), page.content[locale].ogTitle, route);
      assert.equal(metaValue(html, 'name', 'twitter:description'), page.content[locale].ogDescription, route);
      const imagePath = path.join(root, ...imageUrl.slice(`${config.baseUrl}/`.length).split('/'));
      assert.ok(fs.existsSync(imagePath), `${route} image exists`);
      const metadata = await sharp(imagePath).metadata();
      assert.equal(metadata.width, 1200, route);
      assert.equal(metadata.height, 630, route);
      assert.equal(metadata.format, 'png', route);
      images.add(imageUrl);
    }
  }
  assert.equal(images.size, 15);
});

test('OG card source stays truthful and does not claim official status', () => {
  const raw = fs.readFileSync(path.join(root, 'data/og-cards.json'), 'utf8');
  assert.match(raw, /非公式攻略サイト/);
  assert.match(raw, /Unofficial Guide/);
  assert.match(raw, /非官方攻略站/);
  assert.doesNotMatch(raw, /Official Guide/);
});
