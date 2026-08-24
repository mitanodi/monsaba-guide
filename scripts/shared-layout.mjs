export const GLOBAL_NAV_ITEMS = Object.freeze([
  Object.freeze({ href: '/#tatari', label: 'タタ図鑑' }),
  Object.freeze({ href: '/tata-tier/', label: 'タタTier' }),
  Object.freeze({ href: '/evolution-priority/', label: '進化優先度' }),
  Object.freeze({ href: '/#content-guides', label: 'コンテンツ攻略' }),
  Object.freeze({ href: '/friends/', label: 'フレンド掲示板' }),
  Object.freeze({ href: '/consult/', label: '攻略相談' }),
  Object.freeze({ href: '/search/', label: '検索' }),
  Object.freeze({ href: '/beginner-guide/', label: '初心者ガイド', className: 'mobile-only-nav-link' })
]);

const currentNavHref = (route) => {
  if (route.startsWith('/tata/') || route.startsWith('/attribute/')) return '/#tatari';
  if (['/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/normal-guide/'].some((item) => route.startsWith(item))) return '/#content-guides';
  return GLOBAL_NAV_ITEMS.find((item) => !item.href.includes('#') && route.startsWith(item.href))?.href || null;
};

export function renderGlobalNav(route = '/') {
  const current = currentNavHref(route);
  return `<nav id="global-navigation" aria-label="主要メニュー">${GLOBAL_NAV_ITEMS.map(({ href, label, className }) => `<a href="${href}"${className ? ` class="${className}"` : ''}${current === href ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

export function renderHeader(route = '/') {
  return `<header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="モンサバ攻略DB トップ"><span class="brand-main">モンサバ攻略DB</span><span class="brand-sub">非公式</span></a>${renderGlobalNav(route)}</div></header>`;
}
