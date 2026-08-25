(function () {
  const allowedEvents = new Set([
    'nav_click', 'internal_link_click', 'related_content_click', 'site_search',
    'search_result_click', 'filter_use', 'tata_compare_start', 'tata_compare_view',
    'external_link_click', 'affiliate_click', 'ad_click', 'cta_click'
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
      track('affiliate_click', { offer_id: link.closest('[data-offer-id]')?.dataset.offerId || 'unknown', placement_id: link.closest('[data-monetization-slot]')?.dataset.monetizationSlot || 'unknown' });
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
