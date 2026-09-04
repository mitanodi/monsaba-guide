export const GLOBAL_NAV_GROUPS = Object.freeze([
  Object.freeze({ id: 'tata', label: 'タタ', icon: '◈', items: Object.freeze([
    Object.freeze({ href: '/#tatari', label: 'タタ図鑑', description: '64系統を画像と条件で探す' }),
    Object.freeze({ href: '/tata-tier/', label: 'タタTier', description: '用途別の独自評価を見る' }),
    Object.freeze({ href: '/attribute/', label: '属性別', description: '草・水・火・雷・岩で探す' }),
    Object.freeze({ href: '/compare/', label: 'タタ比較', description: '2体の評価と進化を比較' })
  ]) }),
  Object.freeze({ id: 'strategy', label: '攻略', icon: '◆', items: Object.freeze([
    Object.freeze({ href: '/guides/', label: '攻略ハブ', description: 'モード別攻略の入口' }),
    Object.freeze({ href: '/normal-guide/', label: '通常ステージ', description: '詰まり方から対策を探す' }),
    Object.freeze({ href: '/zombie-rush/', label: 'ゾンビラッシュ', description: '編成・チップ・予測' }),
    Object.freeze({ href: '/boss-rally/', label: 'ボスラリー', description: 'ボス戦の役割と編成' }),
    Object.freeze({ href: '/badge-dojo/', label: 'バッジ道場', description: '道場向け評価と攻略' }),
    Object.freeze({ href: '/events/', label: 'イベント', description: '確認状態別のイベント攻略' })
  ]) }),
  Object.freeze({ id: 'growth', label: '育成', icon: '▲', items: Object.freeze([
    Object.freeze({ href: '/beginner-guide/', label: '初心者ガイド', description: '最初にやることを順番に' }),
    Object.freeze({ href: '/evolution-priority/', label: '進化優先度', description: '進化差分と育成順を確認' }),
    Object.freeze({ href: '/evolution/', label: '進化DB', description: '進化条件・試練を探す' }),
    Object.freeze({ href: '/my-monsaba/', label: 'マイモンサバ', description: '手持ちを端末内で管理' })
  ]) }),
  Object.freeze({ id: 'tools', label: 'ツール', icon: '▦', items: Object.freeze([
    Object.freeze({ href: '/team-builder/', label: '編成メーカー', description: '6×6盤面を作成・共有' }),
    Object.freeze({ href: '/compare/', label: '比較', description: '2体を横並びで比較' }),
    Object.freeze({ href: '/consult/', label: '攻略相談', description: '条件から次の行動を整理' }),
    Object.freeze({ href: '/events/treasure-hunt/', label: 'お宝ソルバー', description: '確認済みイベント用ツール' }),
    Object.freeze({ href: '/search/', label: '検索', description: 'タタ・Skill・攻略を横断' })
  ]) }),
  Object.freeze({ id: 'community', label: 'コミュニティ', icon: '●', items: Object.freeze([
    Object.freeze({ href: '/team-builder/community/', label: 'みんなの編成', description: '投稿編成を探して読み込む' }),
    Object.freeze({ href: '/friends/', label: 'フレンド掲示板', description: '一緒に遊ぶ人を探す' }),
    Object.freeze({ href: '/board/', label: '質問掲示板', description: '攻略の質問と情報交換' })
  ]) })
]);

export const GLOBAL_NAV_ITEMS = Object.freeze(GLOBAL_NAV_GROUPS.flatMap((group) => group.items));

const currentNavHrefs = (route) => {
  if (route.startsWith('/team-builder/community/')) return new Set(['/team-builder/community/']);
  if (route.startsWith('/tata/') || route.startsWith('/attribute/')) return new Set(['/#tatari']);
  const current = GLOBAL_NAV_ITEMS.find((item) => !item.href.includes('#') && route.startsWith(item.href))?.href;
  return new Set(current ? [current] : []);
};

export function renderGlobalNav(route = '/') {
  const current = currentNavHrefs(route);
  const groups = GLOBAL_NAV_GROUPS.map((group) => {
    const active = group.items.some((item) => current.has(item.href));
    const links = group.items.map((item) => `<a href="${item.href}"${current.has(item.href) ? ' aria-current="page"' : ''}><span>${item.label}</span><small>${item.description}</small></a>`).join('');
    return `<div class="nav-category" data-nav-category="${group.id}"><button class="nav-category-trigger" type="button" aria-expanded="false" aria-controls="nav-panel-${group.id}"${active ? ' data-current="true"' : ''}><span aria-hidden="true">${group.icon}</span>${group.label}<span class="nav-chevron" aria-hidden="true">⌄</span></button><div id="nav-panel-${group.id}" class="nav-category-panel">${links}</div></div>`;
  }).join('');
  const languageSwitcher = '<div class="language-switcher"><label for="site-language">言語</label><select id="site-language" aria-label="表示言語"><option value="ja" selected>日本語</option><option value="en">English</option><option value="zh-CN">简体中文</option></select></div>';
  return `<nav id="global-navigation" aria-label="主要メニュー">${groups}${languageSwitcher}</nav>`;
}

export function renderHeader(route = '/') {
  return `<header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="モンサバ攻略DB トップ"><span class="brand-main">モンサバ攻略DB</span><span class="brand-sub">非公式</span></a><button class="global-search-trigger" type="button" data-global-search-open aria-label="サイト内検索を開く"><span aria-hidden="true">⌕</span><span class="global-search-label">検索</span><kbd>⌘K</kbd></button>${renderGlobalNav(route)}</div></header>`;
}

export function renderBreadcrumb(items) {
  return `<nav class="breadcrumbs" aria-label="パンくず">${items.map((item, index) => item.href && index < items.length - 1 ? `<a href="${item.href}">${item.label}</a>` : `<span>${item.label}</span>`).join('<span aria-hidden="true">›</span>')}</nav>`;
}

export function renderFooter(meta = '') {
  return `<footer><div class="wrap footer-inner"><div><strong>モンサバ攻略DB</strong><span>モンスターサバイバル 非公式攻略サイト</span></div><div class="footer-side"><nav class="footer-links" aria-label="サイト情報"><a href="/attribute/">属性別</a><a href="/guides/">攻略ハブ</a><a href="/compare/">タタ比較</a><a href="/my-monsaba/">マイモンサバ</a><a href="/team-builder/">編成メーカー</a><a href="/faq/">FAQ</a><a href="/about/">サイトについて</a><a href="/about-data/">データ方針</a><a href="/updates/">更新履歴</a><a href="/privacy/">プライバシー</a><a href="/friends/">フレンド掲示板</a><a href="/board/">質問掲示板</a></nav><p class="footer-contact">お問い合わせ・ご連絡は <a href="https://x.com/odi_monsaba" target="_blank" rel="noopener noreferrer">おぢ（@odi_monsaba）X</a> まで。フォローもよろしくお願いします。</p><div class="footer-disclosures"><p>掲載している一部画像素材は、モンスターサバイバル運営チームより共有いただいた公式Creator Assetsを使用しています。</p><p>掲載情報は確認時点の内容です。アップデート等により、実際のゲーム内仕様と異なる場合があります。</p></div><div class="footer-meta">${meta}</div></div></div></footer>`;
}
