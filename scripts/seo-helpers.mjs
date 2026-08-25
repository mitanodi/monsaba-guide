import { BASE_URL } from './site-config.mjs';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const safeJsonLd = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
export const absoluteUrl = (route) => new URL(route, `${BASE_URL}/`).href;

export function renderSeoHead({ title, description, route, image = '/assets/heroes/top-main.webp', robots = 'index,follow,max-image-preview:large', type = 'website' }) {
  const canonical = absoluteUrl(route);
  const imageUrl = image ? absoluteUrl(image) : null;
  return `<title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#2f6fb2" />
  <meta name="robots" content="${esc(robots)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="${esc(type)}" />
  <meta property="og:site_name" content="モンサバ攻略DB" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonical}" />
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}" />\n  <meta property="og:image:alt" content="モンサバ攻略DB" />` : ''}
  <meta property="og:locale" content="ja_JP" />
  <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : ''}`;
}

export function breadcrumbSchema(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.label,
      ...(item.href && index < items.length - 1 ? { item: absoluteUrl(item.href) } : {})
    }))
  };
}
