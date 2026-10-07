/* Presentation only: existing data, local storage keys and share codec are unchanged. */
(() => {
  const production = document.body.dataset.astra === 'production';
  const locale = document.body.dataset.locale || 'ja';
  const prefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '';
  const copy = locale === 'en' ? {
    calendar: 'Calendar',
    details: 'How to read the ratings',
    closed: 'Close selection',
    readonly: 'Posting is disabled in this experiment.'
  } : locale === 'zh-CN' ? { calendar: '日历', details: '评价说明与阅读方式', closed: '关闭选择', readonly: '实验版暂不支持投稿。' } : { calendar: '予定', details: '評価の読み方・詳しい説明', closed: '選択を閉じる', readonly: '実験版では投稿・編集を停止しています。' };
  document.documentElement.dataset.astraAds = production ? 'live' : new URLSearchParams(location.search).get('ads') === 'off' ? 'off' : 'preview';
  document.querySelector('.astra-home-search')?.addEventListener('click', event => {
    const trigger = document.querySelector('[data-global-search-open]');
    if (trigger) {
      event.preventDefault();
      trigger.click();
    }
  });
  const bottom = document.querySelector('.mobile-bottom-nav');
  if (bottom) {
    const search = bottom.querySelector('button');
    const calendar = document.createElement('a');
    calendar.href = `${prefix}/events/calendar/`;
    calendar.innerHTML = `▦<span>${copy.calendar}</span>`;
    search?.replaceWith(calendar);
    const team = bottom.querySelector(`a[href="${prefix}/team-builder/"]`);
    if (team)
      bottom.append(team);
    window.MONSABA_NAV?.syncCurrent();
  }
  document.querySelector('.astra-compact-toggle')?.addEventListener('click', e => {
    const compact = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(compact));
    document.querySelector('.astra-catalog')?.classList.toggle('is-compact', compact);
  });
  // Keep mobile and desktop navigation state truthful after a viewport change.
  const mobile = matchMedia('(max-width:1099px)');
  mobile.addEventListener('change', () => {
    document.querySelector('.site-header')?.classList.remove('nav-open');
    document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded', 'false');
  });
  // Preview is explicitly read-only, including keyboard form submission.
  const isCommunity = /\/(team-builder\/community|board|friends)\//.test(location.pathname);
  if (isCommunity && !production) {
    document.addEventListener('submit', event => {
      if (event.target.id.includes('filter') || event.submitter?.value === 'cancel')
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const status = event.target.querySelector('[role=status]') || document.createElement('p');
      status.textContent = copy.readonly;
      status.setAttribute('role', 'status');
      event.target.append(status);
    }, true);
    document.querySelectorAll('button[type=submit],input[type=submit]').forEach(button => {
      if (!button.closest('form')?.id.includes('filter')) {
        button.disabled = true;
        button.title = copy.readonly;
      }
    });
  }
})();
