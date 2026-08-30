import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/og-cards.json'), 'utf8'));
const errors = [];
const seenImages = new Set();
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
  const keyPattern = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${keyPattern}["'])[^>]*>`, 'i'))?.[0] || '';
  return decodeHtml(tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || '');
};
const canonicalValue = (html) => html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1] || '';
const alternateValue = (html, hreflang) => {
  const tags = html.match(/<link\b[^>]*\brel=["']alternate["'][^>]*>/gi) || [];
  const tag = tags.find((value) => new RegExp(`\\bhreflang=["']${hreflang}["']`, 'i').test(value));
  return tag?.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
};

const requiredKeys = ['top', 'tata-tier', 'zombie-rush', 'team-builder', 'treasure-hunt', 'pakuma', 'zombie-rush-chips', 'evolution-trials', 'update-2026-08-30', 'gift-codes'];
if (config.pages.length !== requiredKeys.length || Object.keys(config.locales).length !== 3) errors.push(`OG card config must define ${requiredKeys.length} pages and 3 locales.`);
for (const key of requiredKeys) if (!config.pages.some((page) => page.key === key)) errors.push(`OG card config is missing ${key}.`);

for (const page of config.pages) {
  for (const [locale, localeConfig] of Object.entries(config.locales)) {
    const route = page.routes[locale];
    const htmlPath = routeToFile(route);
    if (!fs.existsSync(htmlPath)) {
      errors.push(`${route}: HTML file is missing.`);
      continue;
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    const content = page.content[locale];
    const expectedUrl = `${config.baseUrl}${route}`;
    const imageUrl = metaValue(html, 'property', 'og:image');
    const twitterImage = metaValue(html, 'name', 'twitter:image');
    const expectedPrefix = `${config.baseUrl}/assets/og/${localeConfig.directory}/${page.key}-`;

    const checks = [
      [metaValue(html, 'property', 'og:title') === content.ogTitle, 'og:title'],
      [metaValue(html, 'property', 'og:description') === content.ogDescription, 'og:description'],
      [metaValue(html, 'property', 'og:url') === expectedUrl, 'og:url'],
      [metaValue(html, 'property', 'og:locale') === localeConfig.ogLocale, 'og:locale'],
      [metaValue(html, 'property', 'og:image:width') === '1200', 'og:image:width'],
      [metaValue(html, 'property', 'og:image:height') === '630', 'og:image:height'],
      [metaValue(html, 'property', 'og:image:type') === 'image/png', 'og:image:type'],
      [metaValue(html, 'name', 'twitter:card') === 'summary_large_image', 'twitter:card'],
      [metaValue(html, 'name', 'twitter:title') === content.ogTitle, 'twitter:title'],
      [metaValue(html, 'name', 'twitter:description') === content.ogDescription, 'twitter:description'],
      [twitterImage === imageUrl, 'twitter:image'],
      [canonicalValue(html) === expectedUrl, 'canonical'],
      [Boolean(alternateValue(html, 'ja')), 'hreflang=ja'],
      [Boolean(alternateValue(html, 'en')), 'hreflang=en'],
      [Boolean(alternateValue(html, 'zh-Hans')), 'hreflang=zh-Hans'],
      [Boolean(alternateValue(html, 'x-default')), 'hreflang=x-default']
    ];
    for (const [passed, label] of checks) if (!passed) errors.push(`${route}: invalid ${label}.`);

    if (!imageUrl.startsWith(expectedPrefix) || !/-[a-f0-9]{12}\.png$/.test(imageUrl)) {
      errors.push(`${route}: og:image is not the locale/page-specific absolute hashed URL.`);
      continue;
    }
    const relativeImage = imageUrl.slice(`${config.baseUrl}/`.length);
    const imagePath = path.join(root, ...relativeImage.split('/'));
    if (!fs.existsSync(imagePath)) {
      errors.push(`${route}: OG image is missing (${relativeImage}).`);
      continue;
    }
    seenImages.add(relativeImage);
    const metadata = await sharp(imagePath).metadata();
    if (metadata.format !== 'png' || metadata.width !== 1200 || metadata.height !== 630) {
      errors.push(`${route}: OG image must be a 1200x630 PNG.`);
    }
  }
}

const expectedImageCount = config.pages.length * Object.keys(config.locales).length;
if (seenImages.size !== expectedImageCount) errors.push(`Expected ${expectedImageCount} unique OG images, found ${seenImages.size}.`);

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`OG card validation passed: ${expectedImageCount} locale-specific 1200x630 images and metadata sets.`);
