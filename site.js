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
  const localePrefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '';
  const localizedRoute = (route) => localePrefix ? `${localePrefix}${route}` : route;
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

  // Phase 3: task-oriented navigation groups with click and keyboard support.
  const navCategories = [...nav.querySelectorAll('.nav-category')];
  const closeNavCategories = ({ except = null, restoreFocus = false } = {}) => {
    navCategories.forEach((category) => {
      if (category === except) return;
      category.classList.remove('is-open');
      const trigger = category.querySelector('.nav-category-trigger');
      trigger?.setAttribute('aria-expanded', 'false');
      if (restoreFocus && category.dataset.wasOpen === 'true') trigger?.focus();
      category.dataset.wasOpen = 'false';
    });
  };
  navCategories.forEach((category) => {
    const trigger = category.querySelector('.nav-category-trigger');
    const panel = category.querySelector('.nav-category-panel');
    trigger?.addEventListener('click', () => {
      const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
      closeNavCategories({ except: category });
      category.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
      category.dataset.wasOpen = String(willOpen);
      if (willOpen) window.MONSABA_TRACK?.event('nav_category_open', { category: category.dataset.navCategory });
    });
    trigger?.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      category.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      panel?.querySelector('a')?.focus();
    });
    panel?.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const links = [...panel.querySelectorAll('a')];
      const index = links.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      links[(index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus();
    });
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-category')) closeNavCategories();
  });

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
    if (event.key !== 'Escape') return;
    if (header.classList.contains('nav-open')) closeMenu({ restoreFocus: true });
    closeNavCategories({ restoreFocus: true });
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });

  const syncCompactHeader = () => header.classList.toggle('is-compact', window.scrollY > 80);
  window.addEventListener('scroll', syncCompactHeader, { passive: true });
  syncCompactHeader();

  const searchCopy = {
    ja: { title: 'サイト内検索', placeholder: 'タタ・進化・Skill・攻略を検索', recent: '最近の検索', submit: '検索', close: '閉じる', hint: 'Ctrl / ⌘ + K' },
    en: { title: 'Search this site', placeholder: 'Search Tata, skills, events and guides', recent: 'Recent searches', submit: 'Search', close: 'Close', hint: 'Ctrl / ⌘ + K' },
    'zh-CN': { title: '站内搜索', placeholder: '搜索 Tata、技能、活动和攻略', recent: '最近搜索', submit: '搜索', close: '关闭', hint: 'Ctrl / ⌘ + K' }
  }[locale];
  const searchDialog = document.createElement('dialog');
  searchDialog.className = 'global-search-dialog';
  searchDialog.setAttribute('aria-labelledby', 'global-search-title');
  searchDialog.innerHTML = '<form class="global-search-shell" action="/search/"><div class="global-search-head"><div><h2 id="global-search-title">' + searchCopy.title + '</h2><small>' + searchCopy.hint + '</small></div><button class="global-search-close" type="button" aria-label="' + searchCopy.close + '">×</button></div><label class="global-search-field"><span aria-hidden="true">⌕</span><input name="q" type="search" autocomplete="off" placeholder="' + searchCopy.placeholder + '" aria-label="' + searchCopy.title + '"><button type="submit">' + searchCopy.submit + '</button></label><div class="global-search-shortcuts"><a href="/#tatari">Tata</a><a href="/tata-tier/">Tier</a><a href="/team-builder/">Team Builder</a><a href="/events/">Events</a></div><section class="global-search-recent" hidden><h3>' + searchCopy.recent + '</h3><div></div></section></form>';
  document.body.appendChild(searchDialog);
  const searchInput = searchDialog.querySelector('input[type="search"]');
  const recentSection = searchDialog.querySelector('.global-search-recent');
  const recentRoot = recentSection.querySelector('div');
  const searchHistoryKey = 'monsaba-search-history-v1';
  const readSearchHistory = () => {
    try { return JSON.parse(localStorage.getItem(searchHistoryKey) || '[]').filter((item) => typeof item === 'string').slice(0, 5); }
    catch { return []; }
  };
  const escapeSearchValue = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const renderSearchHistory = () => {
    const values = readSearchHistory();
    recentSection.hidden = values.length === 0;
    recentRoot.innerHTML = values.map((value) => '<button type="button">' + escapeSearchValue(value) + '</button>').join('');
  };
  const openGlobalSearch = () => {
    renderSearchHistory();
    searchDialog.showModal();
    searchInput.focus();
    window.MONSABA_TRACK?.event('global_search_open');
  };
  document.querySelectorAll('[data-global-search-open]').forEach((trigger) => trigger.addEventListener('click', openGlobalSearch));
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (!searchDialog.open) openGlobalSearch();
    }
  });
  searchDialog.querySelector('.global-search-close').addEventListener('click', () => searchDialog.close());
  searchDialog.addEventListener('click', (event) => { if (event.target === searchDialog) searchDialog.close(); });
  recentRoot.addEventListener('click', (event) => {
    const historyButton = event.target.closest('button');
    if (!historyButton) return;
    searchInput.value = historyButton.textContent;
    searchInput.focus();
  });
  searchDialog.querySelector('form').addEventListener('submit', () => {
    const value = searchInput.value.trim();
    if (!value) return;
    const next = [value, ...readSearchHistory().filter((item) => item !== value)].slice(0, 5);
    localStorage.setItem(searchHistoryKey, JSON.stringify(next));
    // Search terms intentionally never enter analytics.
  });

  const mobileBottomNav = document.createElement('nav');
  mobileBottomNav.className = 'mobile-bottom-nav';
  mobileBottomNav.setAttribute('aria-label', ui('主要ショートカット'));
  const mobileCopy = {
    ja: { home: 'ホーム', tata: 'タタ', tier: 'Tier', team: '編成', search: '検索' },
    en: { home: 'Home', tata: 'Tatari', tier: 'Tier', team: 'Team', search: 'Search' },
    'zh-CN': { home: '首页', tata: 'Tatari', tier: 'Tier', team: '阵容', search: '搜索' }
  }[locale];
  mobileBottomNav.innerHTML = `<a href="${localizedRoute('/')}">⌂<span>${mobileCopy.home}</span></a><a href="${localizedRoute('/#tatari')}">◈<span>${mobileCopy.tata}</span></a><a href="${localizedRoute('/tata-tier/')}">▲<span>${mobileCopy.tier}</span></a><a href="${localizedRoute('/team-builder/')}">▦<span>${mobileCopy.team}</span></a><button type="button">⌕<span>${mobileCopy.search}</span></button>`;
  document.body.appendChild(mobileBottomNav);
  mobileBottomNav.querySelector('button').addEventListener('click', openGlobalSearch);

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

  if (personalPanel) {
    const recent = readPersonal('monsaba-recent-tata-v1');
    const hasRoster = Boolean(localStorage.getItem('monsabaMyRoster:v1'));
    const hasTeam = Boolean(localStorage.getItem('monsabaFormationDraft:v2') || localStorage.getItem('monsabaTeamBuilds:v1'));
    if (hasRoster || hasTeam || recent.length) {
      personalPanel.hidden = false;
      const continueBox = document.createElement('div');
      continueBox.className = 'continue-card';
      const continueCopy = {
        ja: { title: '続きから', team: '前回の編成を開く', roster: 'My Monsabaを見る', recent: '最近見たTata' },
        en: { title: 'Continue', team: 'Open previous team', roster: 'Open My Monsaba', recent: 'Recently viewed Tatari' },
        'zh-CN': { title: '继续', team: '打开上次阵容', roster: '打开 My Monsaba', recent: '最近查看的 Tatari' }
      }[locale];
      continueBox.innerHTML = '<strong>' + continueCopy.title + '</strong><div>' + (hasTeam ? `<a href="${localizedRoute('/team-builder/')}">${continueCopy.team}</a>` : '') + (hasRoster ? `<a href="${localizedRoute('/my-monsaba/')}">${continueCopy.roster}</a>` : '') + (recent[0] ? '<a href="' + recent[0].href + '">' + continueCopy.recent + '</a>' : '') + '</div>';
      personalPanel.prepend(continueBox);
    }
  }

  // Long-form pages keep their headings in HTML; this only adds a navigable
  // representation and stable anchor URLs.
  const main = document.querySelector('main');
  const tocExcluded = ['team_builder', 'community'];
  const tocHeadings = main && !tocExcluded.includes(document.body.dataset.pageType)
    ? [...main.querySelectorAll('h2')].filter((heading) => !heading.closest('.global-search-dialog')).slice(0, 18)
    : [];
  if (tocHeadings.length >= 4 && !main.querySelector('.page-toc')) {
    tocHeadings.forEach((heading, index) => {
      if (!heading.id) heading.id = 'section-' + (index + 1);
    });
    const toc = document.createElement('details');
    toc.className = 'page-toc wrap';
    toc.innerHTML = '<summary>' + ({ ja: '目次', en: 'On this page', 'zh-CN': '目录' }[locale]) + '</summary><nav aria-label="' + ({ ja: 'ページ内目次', en: 'Table of contents', 'zh-CN': '页面目录' }[locale]) + '">' + tocHeadings.map((heading) => '<a href="#' + heading.id + '">' + heading.textContent + '</a>').join('') + '</nav>';
    const hero = main.querySelector('.page-hero, .hero');
    hero?.insertAdjacentElement('afterend', toc);
  }

  // Tier content is the primary task on this route, so place it immediately
  // after the compact introduction without changing the source data.
  const tierList = document.querySelector('#tier-list');
  if (tierList) {
    const byline = main.querySelector('.article-byline');
    byline?.insertAdjacentElement('afterend', tierList);
  }

  const focusCopy = {
    ja: { focus: '集中モード', close: '集中モードを終了', picker: 'タタを選ぶ', pickerClose: '選択を閉じる' },
    en: { focus: 'Focus mode', close: 'Exit focus mode', picker: 'Choose Tata', pickerClose: 'Close picker' },
    'zh-CN': { focus: '专注模式', close: '退出专注模式', picker: '选择 Tata', pickerClose: '关闭选择器' }
  }[locale];
  const formationShell = document.querySelector('.formation-shell');
  const formationPicker = document.querySelector('.formation-picker');
  if (formationShell && formationPicker) {
    const focusButton = document.createElement('button');
    focusButton.type = 'button';
    focusButton.className = 'ghost-button team-focus-toggle';
    focusButton.textContent = focusCopy.focus;
    focusButton.setAttribute('aria-pressed', 'false');
    formationShell.prepend(focusButton);
    const setFocusMode = (active) => {
      document.body.classList.toggle('team-focus-mode', active);
      focusButton.setAttribute('aria-pressed', String(active));
      focusButton.textContent = active ? focusCopy.close : focusCopy.focus;
      if (active) window.MONSABA_TRACK?.event('team_focus_mode', { state: 'on' });
    };
    focusButton.addEventListener('click', () => setFocusMode(focusButton.getAttribute('aria-pressed') !== 'true'));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('team-focus-mode')) setFocusMode(false);
    });
    const pickerToggle = document.createElement('button');
    pickerToggle.type = 'button';
    pickerToggle.className = 'button team-picker-sheet-toggle';
    pickerToggle.textContent = focusCopy.picker;
    pickerToggle.setAttribute('aria-expanded', 'false');
    pickerToggle.addEventListener('click', () => {
      const open = !formationPicker.classList.contains('is-sheet-open');
      formationPicker.classList.toggle('is-sheet-open', open);
      pickerToggle.setAttribute('aria-expanded', String(open));
      pickerToggle.textContent = open ? focusCopy.pickerClose : focusCopy.picker;
    });
    formationPicker.before(pickerToggle);
  }

  const communityPublish = document.querySelector('#community-publish-panel');
  const communityList = document.querySelector('#community-list')?.closest('.community-panel');
  if (communityPublish && communityList) {
    const communityTabs = document.createElement('div');
    communityTabs.className = 'community-view-tabs';
    communityTabs.setAttribute('role', 'tablist');
    const communityCopy = {
      ja: { explore: 'みんなの編成を見る', publish: '投稿する' },
      en: { explore: 'Explore teams', publish: 'Publish a team' },
      'zh-CN': { explore: '查看大家的阵容', publish: '发布阵容' }
    }[locale];
    communityTabs.innerHTML = `<button type="button" role="tab" aria-selected="true" data-community-view="explore">${communityCopy.explore}</button><button type="button" role="tab" aria-selected="false" data-community-view="publish">${communityCopy.publish}</button>`;
    communityPublish.parentElement.insertBefore(communityTabs, communityPublish);
    communityTabs.after(communityList);
    communityList.after(communityPublish);
    communityPublish.hidden = true;
    communityTabs.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-community-view]');
      if (!tab) return;
      const publish = tab.dataset.communityView === 'publish';
      communityPublish.hidden = !publish;
      communityList.hidden = publish;
      communityTabs.querySelectorAll('[role="tab"]').forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
      window.MONSABA_TRACK?.event('community_tab', { tab: publish ? 'publish' : 'explore' });
    });
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
