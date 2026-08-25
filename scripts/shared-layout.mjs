export const GLOBAL_NAV_ITEMS = Object.freeze([
  Object.freeze({ href: '/#tatari', label: 'タタ図鑑' }),
  Object.freeze({ href: '/tata-tier/', label: 'タタTier' }),
  Object.freeze({ href: '/evolution-priority/', label: '進化優先度' }),
  Object.freeze({ href: '/guides/', label: '攻略ハブ' }),
  Object.freeze({ href: '/compare/', label: '比較' }),
  Object.freeze({ href: '/consult/', label: '攻略相談' }),
  Object.freeze({ href: '/friends/', label: 'フレンド掲示板' }),
  Object.freeze({ href: '/search/', label: '検索' }),
  Object.freeze({ href: '/beginner-guide/', label: '初心者ガイド', className: 'mobile-only-nav-link' })
]);

const currentNavHref = (route) => {
  if (route.startsWith('/tata/') || route.startsWith('/attribute/')) return '/#tatari';
  if (['/guides/', '/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/normal-guide/'].some((item) => route.startsWith(item))) return '/guides/';
  return GLOBAL_NAV_ITEMS.find((item) => !item.href.includes('#') && route.startsWith(item.href))?.href || null;
};

export function renderGlobalNav(route = '/') {
  const current = currentNavHref(route);
  return `<nav id="global-navigation" aria-label="主要メニュー">${GLOBAL_NAV_ITEMS.map(({ href, label, className }) => `<a href="${href}"${className ? ` class="${className}"` : ''}${current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

export function renderHeader(route = '/') {
  return `<header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="モンサバ攻略DB トップ"><span class="brand-main">モンサバ攻略DB</span><span class="brand-sub">非公式</span></a>${renderGlobalNav(route)}</div></header>`;
}

export function renderBreadcrumb(items) {
  return `<nav class="breadcrumbs" aria-label="パンくず">${items.map((item, index) => item.href && index < items.length - 1 ? `<a href="${item.href}">${item.label}</a>` : `<span>${item.label}</span>`).join('<span aria-hidden="true">›</span>')}</nav>`;
}

export function renderFooter(meta = '') {
  return `<footer><div class="wrap footer-inner"><div><strong>モンサバ攻略DB</strong><span>モンスターサバイバル 非公式攻略サイト</span></div><div class="footer-side"><nav class="footer-links" aria-label="サイト情報"><a href="/attribute/">属性別</a><a href="/guides/">攻略ハブ</a><a href="/compare/">タタ比較</a><a href="/faq/">FAQ</a><a href="/about/">サイトについて</a><a href="/about-data/">データ方針</a><a href="/updates/">更新履歴</a><a href="/privacy/">プライバシー</a><a href="/friends/">フレンド掲示板</a></nav><p class="footer-contact">お問い合わせ・ご連絡は <a href="https://x.com/odi_monsaba" target="_blank" rel="noopener noreferrer">おぢ（@odi_monsaba）X</a> まで。フォローもよろしくお願いします。</p><div class="footer-meta">${meta}</div></div></div></footer>`;
}
