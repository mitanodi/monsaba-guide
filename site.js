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

  nav.id = 'global-navigation';
  nav.setAttribute('aria-label', '主要メニュー');
  nav.innerHTML = [
    ['/#tatari', 'タタ図鑑'],
    ['/tata-tier/', 'タタTier'],
    ['/evolution-priority/', '進化優先度'],
    ['/#content-guides', 'コンテンツ攻略'],
    ['/consult/', '攻略相談']
  ].map(([href, label]) => `<a href="${href}">${label}</a>`).join('');

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
})();
