(() => {
  const section = document.querySelector('[data-official-x]');
  const container = section?.querySelector('[data-x-timeline]');
  if (!section || !container) return;

  let started = false;
  const status = container.querySelector('.official-x-status');
  const renderedObserver = new MutationObserver(() => {
    if (!container.querySelector('iframe')) return;
    container.classList.add('is-loaded');
    if (status) status.hidden = true;
    renderedObserver.disconnect();
  });
  renderedObserver.observe(container, { childList: true, subtree: true });
  const markUnavailable = () => {
    if (container.querySelector('iframe')) return;
    container.classList.add('is-unavailable');
    renderedObserver.disconnect();
    if (status) status.textContent = '公式タイムラインを表示できません。公式Xへのリンクから最新情報を確認できます。';
  };

  const loadTimeline = () => {
    if (started) return;
    started = true;
    if (status) status.textContent = '公式タイムラインを読み込んでいます…';

    const existing = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
    if (existing) {
      window.twttr?.widgets?.load(container);
      window.setTimeout(markUnavailable, 8000);
      return;
    }

    const script = document.createElement('script');
    script.id = 'x-wjs';
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.addEventListener('load', () => {
      window.twttr?.widgets?.load(container);
      window.setTimeout(markUnavailable, 8000);
    }, { once: true });
    script.addEventListener('error', markUnavailable, { once: true });
    document.head.append(script);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadTimeline();
    }, { rootMargin: '600px 0px' });
    observer.observe(section);
  } else {
    window.addEventListener('load', loadTimeline, { once: true });
  }
})();
