(() => {
  const section = document.querySelector('[data-official-x]');
  const container = section?.querySelector('[data-x-timeline]');
  if (!section || !container) return;

  let started = false;
  let settled = false;
  let renderedObserver;
  let renderTimeout;
  const status = container.querySelector('.official-x-status');
  const fallback = container.querySelector('.official-x-fallback');
  const widgetSelector = 'iframe[id^="twitter-widget"], iframe[title*="Timeline"]';

  const hasVisibleTimeline = () => {
    const frame = container.querySelector(widgetSelector);
    if (!frame) return false;
    const rect = frame.getBoundingClientRect();
    const style = window.getComputedStyle(frame);
    return rect.width >= 240
      && rect.height >= 300
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && style.opacity !== '0';
  };

  const cleanUp = () => {
    renderedObserver?.disconnect();
    window.clearTimeout(renderTimeout);
  };

  const markLoaded = () => {
    if (settled || !hasVisibleTimeline()) return;
    settled = true;
    container.classList.add('is-loaded');
    container.classList.remove('is-unavailable');
    if (status) status.hidden = true;
    if (fallback) fallback.hidden = true;
    cleanUp();
  };

  const markUnavailable = () => {
    if (settled) return;
    if (hasVisibleTimeline()) {
      markLoaded();
      return;
    }
    settled = true;
    container.classList.add('is-unavailable');
    container.classList.remove('is-loaded');
    if (status) status.hidden = true;
    if (fallback) fallback.hidden = false;
    cleanUp();
  };

  const watchForRenderedTimeline = () => {
    renderedObserver = new MutationObserver(markLoaded);
    renderedObserver.observe(container, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true,
    });
    renderTimeout = window.setTimeout(markUnavailable, 15000);
  };

  const requestWidgetRender = () => {
    if (!window.twttr?.ready) return;
    window.twttr.ready((twttr) => {
      if (settled) return;
      try {
        twttr.widgets.load(container);
        twttr.events?.bind?.('rendered', (event) => {
          if (container.contains(event.target)) window.requestAnimationFrame(markLoaded);
        });
      } catch {
        markUnavailable();
      }
    });
  };

  const loadTimeline = () => {
    if (started) return;
    started = true;
    if (status) status.textContent = '公式タイムラインを読み込んでいます…';
    watchForRenderedTimeline();

    const existing = document.querySelector('script[src*="platform.twitter.com/widgets.js"], script[src*="platform.x.com/widgets.js"]');
    if (existing) {
      if (window.twttr?.ready) requestWidgetRender();
      else {
        existing.addEventListener('load', requestWidgetRender, { once: true });
        existing.addEventListener('error', markUnavailable, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'x-wjs';
    script.src = 'https://platform.x.com/widgets.js';
    script.async = true;
    script.charset = 'utf-8';
    script.addEventListener('load', requestWidgetRender, { once: true });
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
