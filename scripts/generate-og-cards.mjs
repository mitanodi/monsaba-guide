import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const configPath = path.join(root, 'data/og-cards.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const iconPath = path.join(root, config.sourceIcon);
const iconBytes = fs.readFileSync(iconPath);
const iconDataUri = `data:image/png;base64,${iconBytes.toString('base64')}`;
const outputRoot = path.join(root, 'assets/og');

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const routeToFile = (route) => route === '/'
  ? path.join(root, 'index.html')
  : path.join(root, route.slice(1), 'index.html');

function cardHash(page, locale, localeConfig, content) {
  const fingerprint = JSON.stringify({
    templateVersion: config.templateVersion,
    page: { key: page.key, accent: page.accent, accentDark: page.accentDark, symbol: page.symbol },
    locale,
    localeConfig,
    content,
    sourceIconSha256: crypto.createHash('sha256').update(iconBytes).digest('hex')
  });
  return crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 12);
}

function titleSize(title) {
  const weightedLength = [...title].reduce((sum, character) => sum + (character.codePointAt(0) > 0xff ? 1.65 : 1), 0);
  if (weightedLength > 42) return 40;
  if (weightedLength > 34) return 44;
  if (weightedLength > 28) return 50;
  return 58;
}

function descriptionSize(description) {
  return [...description].length > 58 ? 24 : 27;
}

function renderSvg(page, localeConfig, content) {
  const mainTitleSize = titleSize(content.title);
  const bodySize = descriptionSize(content.description);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(content.ogTitle)}">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8fbff"/>
      <stop offset="0.6" stop-color="#edf5fd"/>
      <stop offset="1" stop-color="#dceaf9"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${page.accent}"/>
      <stop offset="1" stop-color="${page.accentDark}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#173a5f" flood-opacity="0.18"/>
    </filter>
    <clipPath id="mascotClip"><rect x="844" y="129" width="252" height="252" rx="54"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="url(#background)"/>
  <path d="M805 0H1200V630H920C1015 500 964 371 871 267C805 193 774 103 805 0Z" fill="url(#accent)"/>
  <g opacity="0.14" fill="none" stroke="#ffffff" stroke-width="2">
    <circle cx="1055" cy="88" r="52"/><circle cx="1055" cy="88" r="74"/>
    <circle cx="1134" cy="505" r="74"/><circle cx="1134" cy="505" r="101"/>
  </g>
  <g opacity="0.18" fill="#ffffff">
    <circle cx="853" cy="72" r="6"/><circle cx="884" cy="72" r="6"/><circle cx="915" cy="72" r="6"/>
    <circle cx="853" cy="103" r="6"/><circle cx="884" cy="103" r="6"/><circle cx="915" cy="103" r="6"/>
  </g>
  <rect x="66" y="52" width="${Math.max(185, localeConfig.unofficial.length * 17 + 48)}" height="42" rx="21" fill="#ffffff" stroke="${page.accent}" stroke-width="2"/>
  <circle cx="88" cy="73" r="6" fill="${page.accent}"/>
  <text x="105" y="80" fill="${page.accentDark}" font-family="Arial, 'Yu Gothic UI', 'Microsoft YaHei', sans-serif" font-size="20" font-weight="700">${escapeXml(localeConfig.unofficial)}</text>
  <text x="68" y="146" fill="#51647a" font-family="Arial, 'Yu Gothic UI', 'Microsoft YaHei', sans-serif" font-size="27" font-weight="700" letter-spacing="0.4">${escapeXml(localeConfig.siteName)}</text>
  <rect x="68" y="174" width="92" height="7" rx="3.5" fill="${page.accent}"/>
  <text x="68" y="260" fill="#172a3d" font-family="Arial, 'Yu Gothic UI', 'Microsoft YaHei', sans-serif" font-size="${mainTitleSize}" font-weight="800">${escapeXml(content.title)}</text>
  <text x="70" y="329" fill="#40556b" font-family="Arial, 'Yu Gothic UI', 'Microsoft YaHei', sans-serif" font-size="${bodySize}" font-weight="500">${escapeXml(content.description)}</text>
  <g transform="translate(68 375)">
    <rect width="${Math.max(246, content.badge.length * 18 + 50)}" height="54" rx="14" fill="#ffffff" stroke="#c7d8e8" stroke-width="2"/>
    <circle cx="27" cy="27" r="10" fill="${page.accent}" opacity="0.18"/>
    <path d="M22 27l4 4 7-9" fill="none" stroke="${page.accentDark}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="48" y="35" fill="#32475c" font-family="Arial, 'Yu Gothic UI', 'Microsoft YaHei', sans-serif" font-size="22" font-weight="700">${escapeXml(content.badge)}</text>
  </g>
  <g filter="url(#shadow)">
    <rect x="816" y="101" width="308" height="308" rx="68" fill="#ffffff" fill-opacity="0.96"/>
    <rect x="828" y="113" width="284" height="284" rx="60" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2"/>
    <image x="844" y="129" width="252" height="252" xlink:href="${iconDataUri}" clip-path="url(#mascotClip)" preserveAspectRatio="xMidYMid slice"/>
  </g>
  <g transform="translate(1045 381)">
    <circle r="54" fill="#ffffff"/>
    <circle r="47" fill="url(#accent)"/>
    <text x="0" y="13" text-anchor="middle" fill="#ffffff" font-family="Arial, 'Yu Gothic UI', 'Microsoft YaHei', sans-serif" font-size="35" font-weight="800">${escapeXml(page.symbol)}</text>
  </g>
  <path d="M68 492H742" stroke="#cad9e8" stroke-width="2"/>
  <text x="68" y="552" fill="#24588e" font-family="Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="0.7">monster-survival.com</text>
  <text x="68" y="587" fill="#6e7f91" font-family="Arial, 'Yu Gothic UI', 'Microsoft YaHei', sans-serif" font-size="18">${escapeXml(localeConfig.unofficial)}</text>
</svg>`;
}

function setMeta(html, attribute, key, value) {
  const tag = `<meta ${attribute}="${key}" content="${escapeXml(value)}" data-og-card />`;
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}=["']${escapeRegExp(key)}["'])[^>]*>`, 'gi');
  let replaced = false;
  html = html.replace(pattern, () => {
    if (replaced) return '';
    replaced = true;
    return tag;
  });
  if (!replaced) html = html.replace(/<\/head>/i, `${tag}</head>`);
  return html;
}

async function generate() {
  fs.mkdirSync(outputRoot, { recursive: true });
  let generated = 0;
  let updated = 0;
  const expectedImages = new Set();

  for (const page of config.pages) {
    for (const [locale, localeConfig] of Object.entries(config.locales)) {
      const content = page.content[locale];
      const route = page.routes[locale];
      const hash = cardHash(page, locale, localeConfig, content);
      const relativeImage = `assets/og/${localeConfig.directory}/${page.key}-${hash}.png`;
      const outputPath = path.join(root, relativeImage);
      expectedImages.add(path.resolve(outputPath).toLowerCase());
      const imageUrl = `${config.baseUrl}/${relativeImage.replaceAll('\\', '/')}`;
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      let validExistingImage = false;
      if (fs.existsSync(outputPath)) {
        const metadata = await sharp(outputPath).metadata();
        validExistingImage = metadata.format === 'png' && metadata.width === 1200 && metadata.height === 630;
      }
      if (!validExistingImage) {
        await sharp(Buffer.from(renderSvg(page, localeConfig, content)))
          .png({ compressionLevel: 9, palette: true, quality: 92 })
          .toFile(outputPath);
        generated += 1;
      }

      const htmlPath = routeToFile(route);
      let html = fs.readFileSync(htmlPath, 'utf8');
      const before = html;
      const alt = `${content.ogTitle} — ${localeConfig.unofficial}`;
      html = setMeta(html, 'property', 'og:site_name', localeConfig.siteName);
      html = setMeta(html, 'property', 'og:locale', localeConfig.ogLocale);
      html = setMeta(html, 'property', 'og:title', content.ogTitle);
      html = setMeta(html, 'property', 'og:description', content.ogDescription);
      html = setMeta(html, 'property', 'og:url', `${config.baseUrl}${route}`);
      html = setMeta(html, 'property', 'og:image', imageUrl);
      html = setMeta(html, 'property', 'og:image:secure_url', imageUrl);
      html = setMeta(html, 'property', 'og:image:type', 'image/png');
      html = setMeta(html, 'property', 'og:image:width', '1200');
      html = setMeta(html, 'property', 'og:image:height', '630');
      html = setMeta(html, 'property', 'og:image:alt', alt);
      html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
      html = setMeta(html, 'name', 'twitter:title', content.ogTitle);
      html = setMeta(html, 'name', 'twitter:description', content.ogDescription);
      html = setMeta(html, 'name', 'twitter:image', imageUrl);
      html = setMeta(html, 'name', 'twitter:image:alt', alt);
      if (html !== before) {
        fs.writeFileSync(htmlPath, html);
        updated += 1;
      }
    }
  }

  const knownKeys = new Set(config.pages.map((page) => page.key));
  for (const localeConfig of Object.values(config.locales)) {
    const localeDirectory = path.join(outputRoot, localeConfig.directory);
    if (!fs.existsSync(localeDirectory)) continue;
    for (const entry of fs.readdirSync(localeDirectory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const match = entry.name.match(/^(.+)-[a-f0-9]{12}\.png$/);
      const candidate = path.resolve(localeDirectory, entry.name);
      if (match && knownKeys.has(match[1]) && !expectedImages.has(candidate.toLowerCase())) fs.unlinkSync(candidate);
    }
  }

  console.log(`OG cards ready: ${config.pages.length * Object.keys(config.locales).length} (${generated} images generated, ${updated} HTML files updated)`);
}

await generate();
