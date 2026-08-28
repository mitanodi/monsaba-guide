(function () {
  const allowedEvents = new Set([
    'nav_click', 'internal_link_click', 'related_content_click', 'site_search',
    'search_result_click', 'filter_use', 'tata_compare_start', 'tata_compare_view',
    'external_link_click', 'affiliate_click', 'affiliate_impression', 'ad_click', 'cta_click',
    'event_tool_use', 'favorite', 'friend_uid_copy', 'board_view', 'board_question_submit',
    'board_answer_submit', 'board_filter_use', 'board_report', 'board_resolved',
    'board_quick_question_open', 'board_question_example_use', 'board_reply_open', 'board_reply_submit'
  ]);
  const safeValue = (value) => typeof value === 'number' || typeof value === 'boolean'
    ? value
    : String(value ?? '').replace(/[\r\n\t]/g, ' ').slice(0, 80);
  const track = (name, properties = {}) => {
    if (!allowedEvents.has(name)) return false;
    const safe = Object.fromEntries(Object.entries(properties).slice(0, 8).map(([key, value]) => [key, safeValue(value)]));
    if (typeof window.va === 'function') window.va('event', name, safe);
    document.dispatchEvent(new CustomEvent('monsaba:analytics', { detail: { name, properties: safe } }));
    return true;
  };
  window.MONSABA_TRACK = Object.freeze({ event: track });
  window.monsabaTrack = (name, properties) => track(name, properties);

  const deviceClass = () => window.innerWidth <= 820 ? 'mobile' : window.innerWidth < 1200 ? 'tablet' : 'desktop';
  const affiliateProperties = (ad) => {
    const slot = ad?.closest('[data-monetization-slot]');
    return {
      offer_id: ad?.dataset.offerId || slot?.dataset.affiliateOffer || 'unknown',
      page: location.pathname,
      placement: ad?.dataset.affiliatePlacement || slot?.dataset.affiliatePlacement || 'unknown',
      placement_id: slot?.dataset.monetizationSlot || 'unknown',
      device_class: deviceClass()
    };
  };
  const measuredImpressions = new WeakSet();
  const impressionObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || measuredImpressions.has(entry.target)) continue;
      measuredImpressions.add(entry.target);
      impressionObserver.unobserve(entry.target);
      track('affiliate_impression', affiliateProperties(entry.target));
    }
  }, { threshold: [0.5] }) : null;
  const observeAffiliate = (element) => {
    if (!(element instanceof Element) || !element.matches('.affiliate-ad') || measuredImpressions.has(element)) return;
    impressionObserver?.observe(element);
  };
  document.querySelectorAll('.affiliate-ad').forEach(observeAffiliate);
  document.addEventListener('monsaba:affiliate-rendered', (event) => observeAffiliate(event.detail?.element));

  const destinationType = (url) => {
    const path = url.pathname;
    if (path.startsWith('/tata/')) return 'tata_detail';
    if (path.startsWith('/attribute/')) return 'attribute';
    if (path.startsWith('/compare/')) return 'compare';
    if (path.startsWith('/consult/')) return 'consult';
    if (['/zombie-rush/', '/boss-rally/', '/badge-dojo/', '/normal-guide/', '/guides/'].some((route) => path.startsWith(route))) return 'guide';
    return 'site_page';
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    const common = { destination_type: destinationType(url), source_type: document.body.dataset.pageType || 'page' };
    if (link.closest('.affiliate-ad')) {
      track('affiliate_click', affiliateProperties(link.closest('.affiliate-ad')));
      return;
    }
    if (link.closest('[data-ad-slot]')) track('ad_click', { slot_id: link.closest('[data-ad-slot]').dataset.adSlot || 'unknown' });
    if (url.origin !== location.origin) {
      track('external_link_click', { destination_host: url.hostname });
      return;
    }
    if (link.closest('#global-navigation')) track('nav_click', common);
    if (link.closest('.related-content, .tata-related-links, .next-reading')) track('related_content_click', common);
    if (link.matches('.button, .ghost-button, [data-cta-id]')) track('cta_click', { ...common, cta_id: link.dataset.ctaId || destinationType(url) });
    if (link.closest('.search-result-list')) track('search_result_click', common);
    track('internal_link_click', common);
  });

  document.addEventListener('change', (event) => {
    if (event.target.matches('select, input[type="checkbox"], input[type="radio"]')) {
      track('filter_use', { filter_id: event.target.id || event.target.name || 'filter', page_type: document.body.dataset.pageType || 'page' });
    }
  });

  fetch('/data/growth-config.json', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((config) => {
    for (const [id, experiment] of Object.entries(config?.experiments || {})) {
      if (!experiment?.enabled || !Array.isArray(experiment.variants) || experiment.variants.length < 2) continue;
      const key = `monsabaExperiment:${id}`;
      let variant = localStorage.getItem(key);
      if (!experiment.variants.includes(variant)) {
        variant = experiment.variants[Math.floor(Math.random() * experiment.variants.length)];
        localStorage.setItem(key, variant);
      }
      document.documentElement.dataset[`experiment${id.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())}`] = variant;
    }
  }).catch(() => {});
})();
