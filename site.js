(function () {
  const ATTRIBUTE_META = Object.freeze({
    草: Object.freeze({ slug: 'grass', icon: '🌿' }),
    水: Object.freeze({ slug: 'water', icon: '💧' }),
    火: Object.freeze({ slug: 'fire', icon: '🔥' }),
    雷: Object.freeze({ slug: 'thunder', icon: '⚡' }),
    岩: Object.freeze({ slug: 'rock', icon: '🪨', aliases: Object.freeze(['土']) })
  });

  window.ATTRIBUTE_META = ATTRIBUTE_META;

  const header = document.querySelector('.site-header');
  const inner = header?.querySelector('.header-inner');
  const nav = inner?.querySelector('nav');
  if (!header || !inner || !nav) return;

  const locale = document.documentElement.lang === 'zh-CN' ? 'zh-CN' : document.documentElement.lang === 'en' ? 'en' : 'ja';
  const ui = (source) => window.monsabaI18n?.translate(source) || source;
  const languageSelect = nav.querySelector('#site-language');
  if (languageSelect) {
    languageSelect.value = locale;
    languageSelect.addEventListener('change', () => {
      const toLocale = languageSelect.value;
      localStorage.setItem('monsabaLanguage:v1', toLocale);
      const sourcePath = location.pathname.replace(/^\/(?:en|zh-cn)(?=\/)/, '') || '/';
      const prefix = toLocale === 'en' ? '/en' : toLocale === 'zh-CN' ? '/zh-cn' : '';
      const nextPath = sourcePath === '/' ? `${prefix}/` || '/' : `${prefix}${sourcePath}`;
      if (typeof window.gtag === 'function') window.gtag('event', 'language_switch', { from_locale: locale, to_locale: toLocale });
      location.assign(`${nextPath}${location.search}${location.hash}`);
    });
  }

  nav.id ||= 'global-navigation';
  nav.setAttribute('aria-label', ui('主要メニュー'));

  const path = location.pathname;
  const currentHref = path.startsWith('/tata/') ? '/#tatari'
    : ['/guides/', '/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/normal-guide/'].some((route) => path.startsWith(route)) ? '/guides/'
    : path.startsWith('/attribute/') ? '/#tatari'
    : path.startsWith('/tata-tier/') ? '/tata-tier/'
    : path.startsWith('/evolution-priority/') ? '/evolution-priority/'
    : path.startsWith('/consult/') ? '/consult/'
    : path.startsWith('/search/') ? '/search/'
    : path.startsWith('/compare/') ? '/compare/'
    : path.startsWith('/team-builder/') ? '/team-builder/'
    : path.startsWith('/beginner-guide/') ? '/beginner-guide/'
    : path.startsWith('/friends/') ? '/friends/'
    : path.startsWith('/board/') ? '/board/'
    : null;
  if (currentHref) nav.querySelector(`a[href="${currentHref}"]`)?.setAttribute('aria-current', 'page');

  const button = document.createElement('button');
  button.className = 'mobile-nav-toggle';
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', nav.id);
  button.setAttribute('aria-label', ui('メニューを開く'));
  button.textContent = '☰';
  inner.insertBefore(button, nav);

  const closeMenu = ({ restoreFocus = false } = {}) => {
    header.classList.remove('nav-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', ui('メニューを開く'));
    if (restoreFocus) button.focus();
  };

  button.addEventListener('click', () => {
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    header.classList.toggle('nav-open', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
    button.setAttribute('aria-label', ui(willOpen ? 'メニューを閉じる' : 'メニューを開く'));
    if (willOpen) nav.querySelector('a')?.focus();
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('nav-open')) closeMenu({ restoreFocus: true });
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });

  const topButton = document.createElement('button');
  topButton.className = 'back-to-top';
  topButton.type = 'button';
  topButton.textContent = ui('↑ 上へ');
  topButton.setAttribute('aria-label', ui('ページ上部へ戻る'));
  document.body.appendChild(topButton);
  const updateTopButton = () => topButton.classList.toggle('is-visible', window.scrollY > 600);
  window.addEventListener('scroll', updateTopButton, { passive: true });
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateTopButton();

  const pullToRefreshMedia = window.matchMedia('(max-width: 820px) and (pointer: coarse)');
  const PULL_THRESHOLD = 72;
  const PULL_DIRECTION_LOCK = 8;
  let pullIndicator = null;
  let pullLabel = null;
  let pullStartX = 0;
  let pullStartY = 0;
  let pullTracking = false;
  let pullDirection = null;
  let pullReady = false;
  let pullReloading = false;

  const supportsPullToRefresh = () => pullToRefreshMedia.matches && navigator.maxTouchPoints > 0;
  const isAtPageTop = () => window.scrollY <= 0 && document.documentElement.scrollTop <= 0;
  const isFormInteraction = (target) => target instanceof Element
    && Boolean(target.closest('form,input,textarea,select,option,button,[contenteditable]:not([contenteditable="false"])'));
  const isFixedAdInteraction = (target) => target instanceof Element
    && Boolean(target.closest('.floating-affiliate'));
  const pullToRefreshIsBlocked = (target) => header.classList.contains('nav-open')
    || isFormInteraction(target)
    || isFormInteraction(document.activeElement)
    || isFixedAdInteraction(target)
    || isFixedAdInteraction(document.activeElement);

  const ensurePullIndicator = () => {
    const supported = supportsPullToRefresh();
    document.documentElement.classList.toggle('pull-to-refresh-enabled', supported);
    if (!supported || pullIndicator) return;
    pullIndicator = document.createElement('div');
    pullIndicator.className = 'pull-to-refresh';
    pullIndicator.setAttribute('role', 'status');
    pullIndicator.setAttribute('aria-live', 'polite');
    pullIndicator.setAttribute('aria-hidden', 'true');
    pullIndicator.innerHTML = '<span class="pull-to-refresh-icon" aria-hidden="true">↓</span><span class="pull-to-refresh-text">引っ張って更新</span>';
    pullLabel = pullIndicator.querySelector('.pull-to-refresh-text');
    document.body.appendChild(pullIndicator);
  };

  const resetPullToRefresh = () => {
    pullTracking = false;
    pullDirection = null;
    pullReady = false;
    if (!pullIndicator || pullReloading) return;
    pullIndicator.classList.remove('is-visible', 'is-ready');
    pullIndicator.style.removeProperty('--pull-distance');
    pullIndicator.setAttribute('aria-hidden', 'true');
    if (pullLabel) pullLabel.textContent = '引っ張って更新';
  };

  const cancelPullToRefresh = () => {
    resetPullToRefresh();
    ensurePullIndicator();
  };

  window.addEventListener('touchstart', (event) => {
    ensurePullIndicator();
    if (!supportsPullToRefresh() || pullReloading || event.touches.length !== 1
      || !isAtPageTop() || pullToRefreshIsBlocked(event.target)) {
      resetPullToRefresh();
      return;
    }
    const touch = event.touches[0];
    pullStartX = touch.clientX;
    pullStartY = touch.clientY;
    pullTracking = true;
    pullDirection = null;
    pullReady = false;
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (!pullTracking || event.touches.length !== 1) return;
    if (!supportsPullToRefresh() || !isAtPageTop() || pullToRefreshIsBlocked(event.target)) {
      cancelPullToRefresh();
      return;
    }
    const touch = event.touches[0];
    const deltaX = touch.clientX - pullStartX;
    const deltaY = touch.clientY - pullStartY;
    const absoluteX = Math.abs(deltaX);
    const absoluteY = Math.abs(deltaY);
    if (!pullDirection && Math.max(absoluteX, absoluteY) >= PULL_DIRECTION_LOCK) {
      pullDirection = absoluteY > absoluteX * 1.25 && deltaY > 0 ? 'vertical' : 'blocked';
    }
    if (pullDirection === 'blocked' || deltaY <= 0) {
      cancelPullToRefresh();
      return;
    }
    if (pullDirection !== 'vertical') return;

    // Custom操作が確定した後だけ標準overscrollを止め、通常スクロールや横スワイプを妨げない。
    event.preventDefault();
    pullReady = deltaY >= PULL_THRESHOLD;
    const pullDistance = Math.min(22, Math.max(0, deltaY - PULL_DIRECTION_LOCK) * 0.3);
    pullIndicator?.style.setProperty('--pull-distance', `${pullDistance}px`);
    pullIndicator?.classList.add('is-visible');
    pullIndicator?.classList.toggle('is-ready', pullReady);
    pullIndicator?.setAttribute('aria-hidden', 'false');
    if (pullLabel) pullLabel.textContent = pullReady ? '離して更新' : '引っ張って更新';
  }, { passive: false });

  window.addEventListener('touchend', (event) => {
    if (!pullTracking) return;
    const shouldReload = pullReady && supportsPullToRefresh() && isAtPageTop()
      && !pullToRefreshIsBlocked(event.target);
    if (!shouldReload) {
      resetPullToRefresh();
      return;
    }
    pullTracking = false;
    pullReloading = true;
    pullIndicator?.classList.add('is-visible', 'is-loading');
    pullIndicator?.classList.remove('is-ready');
    if (pullLabel) pullLabel.textContent = '更新中…';
    window.requestAnimationFrame(() => location.reload());
  }, { passive: true });
  window.addEventListener('touchcancel', resetPullToRefresh, { passive: true });
  window.addEventListener('pageshow', () => {
    pullReloading = false;
    pullIndicator?.classList.remove('is-loading');
    resetPullToRefresh();
  });
  pullToRefreshMedia.addEventListener('change', cancelPullToRefresh);
  ensurePullIndicator();

  const footer = document.querySelector('footer .footer-inner');
  if (footer && !footer.querySelector('.footer-links')) {
    const side = document.createElement('div');
    side.className = 'footer-side';
    side.innerHTML = '<nav class="footer-links" aria-label="サイト情報"><a href="/guides/">攻略ハブ</a><a href="/compare/">タタ比較</a><a href="/faq/">FAQ</a><a href="/about/">サイトについて</a><a href="/about-data/">データ方針</a><a href="/updates/">更新履歴</a><a href="/privacy/">プライバシー</a><a href="/friends/">フレンド掲示板</a></nav><p class="footer-contact">お問い合わせ・ご連絡は <a href="https://x.com/odi_monsaba" target="_blank" rel="noopener noreferrer">おぢ（@odi_monsaba）X</a> まで。フォローもよろしくお願いします。</p>';
    const meta = footer.querySelector('.footer-meta');
    if (meta) side.appendChild(meta);
    footer.appendChild(side);
  }
  const footerSide = footer?.querySelector('.footer-side');
  if (footerSide && !footerSide.querySelector('.footer-affiliate-disclosure')) {
    const disclosure = document.createElement('p');
    disclosure.className = 'footer-affiliate-disclosure';
    disclosure.textContent = '当サイトはアフィリエイト広告を利用しています。';
    const meta = footerSide.querySelector('.footer-meta');
    footerSide.insertBefore(disclosure, meta || null);
  }

  const readPersonal = (key) => {
    try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const writePersonal = (key, value) => localStorage.setItem(key, JSON.stringify(value.slice(0, 10)));
  const familyId = document.body.dataset.familyId;
  const familyName = document.body.dataset.familyName;
  if (familyId && familyName) {
    const recentKey = 'monsaba-recent-tata-v1';
    const recent = readPersonal(recentKey).filter((item) => item.id !== familyId);
    writePersonal(recentKey, [{ id: familyId, name: familyName, href: location.pathname }, ...recent]);
    const favoriteKey = 'monsaba-favorites-v1';
    const favoriteButton = document.querySelector('.tata-favorite-button');
    const syncFavorite = () => {
      const active = readPersonal(favoriteKey).some((item) => item.id === familyId);
      if (!favoriteButton) return;
      favoriteButton.setAttribute('aria-pressed', String(active));
      favoriteButton.textContent = `${active ? '★' : '☆'} お気に入り`;
    };
    favoriteButton?.addEventListener('click', () => {
      const favorites = readPersonal(favoriteKey);
      const active = favorites.some((item) => item.id === familyId);
      writePersonal(favoriteKey, active ? favorites.filter((item) => item.id !== familyId) : [{ id: familyId, name: familyName, href: location.pathname }, ...favorites]);
      syncFavorite();
      window.MONSABA_TRACK?.event('favorite', { action: active ? 'remove' : 'add' });
    });
    syncFavorite();
  }
  const personalPanel = document.querySelector('#personalTataPanel');
  const personalLinks = document.querySelector('#personalTataLinks');
  if (personalPanel && personalLinks) {
    const favorites = readPersonal('monsaba-favorites-v1');
    const recent = readPersonal('monsaba-recent-tata-v1');
    const combined = [...favorites.map((item) => ({ ...item, prefix: '★' })), ...recent.map((item) => ({ ...item, prefix: '最近' }))]
      .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 8);
    if (combined.length) {
      personalPanel.hidden = false;
      personalLinks.innerHTML = combined.map((item) => `<a href="${item.href}">${item.prefix} ${item.name}</a>`).join('');
    }
  }

  const loadVercelScript = (queueName, queueKey, src) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    window[queueName] = window[queueName] || function (...args) {
      (window[queueKey] = window[queueKey] || []).push(args);
    };
    const script = document.createElement('script');
    script.defer = true;
    script.src = src;
    document.head.appendChild(script);
  };
  const analyticsHost = location.hostname === 'monster-survival.com'
    || location.hostname === 'www.monster-survival.com'
    || location.hostname.endsWith('.vercel.app');
  if (analyticsHost) {
    loadVercelScript('va', 'vaq', '/_vercel/insights/script.js');
    loadVercelScript('si', 'siq', '/_vercel/speed-insights/script.js');
  }
})();
