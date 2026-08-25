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

  nav.id ||= 'global-navigation';
  nav.setAttribute('aria-label', '主要メニュー');

  const path = location.pathname;
  const currentHref = path.startsWith('/tata/') ? '/#tatari'
    : ['/guides/', '/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/normal-guide/'].some((route) => path.startsWith(route)) ? '/guides/'
    : path.startsWith('/attribute/') ? '/#tatari'
    : path.startsWith('/tata-tier/') ? '/tata-tier/'
    : path.startsWith('/evolution-priority/') ? '/evolution-priority/'
    : path.startsWith('/consult/') ? '/consult/'
    : path.startsWith('/search/') ? '/search/'
    : path.startsWith('/compare/') ? '/compare/'
    : path.startsWith('/beginner-guide/') ? '/beginner-guide/'
    : path.startsWith('/friends/') ? '/friends/'
    : null;
  if (currentHref) nav.querySelector(`a[href="${currentHref}"]`)?.setAttribute('aria-current', 'page');

  const button = document.createElement('button');
  button.className = 'mobile-nav-toggle';
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', nav.id);
  button.setAttribute('aria-label', 'メニューを開く');
  button.textContent = '☰';
  inner.insertBefore(button, nav);

  const closeMenu = ({ restoreFocus = false } = {}) => {
    header.classList.remove('nav-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'メニューを開く');
    if (restoreFocus) button.focus();
  };

  button.addEventListener('click', () => {
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    header.classList.toggle('nav-open', willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
    button.setAttribute('aria-label', willOpen ? 'メニューを閉じる' : 'メニューを開く');
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
  topButton.textContent = '↑ 上へ';
  topButton.setAttribute('aria-label', 'ページ上部へ戻る');
  document.body.appendChild(topButton);
  const updateTopButton = () => topButton.classList.toggle('is-visible', window.scrollY > 600);
  window.addEventListener('scroll', updateTopButton, { passive: true });
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateTopButton();

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
