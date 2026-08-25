(function () {
  const REQUIRED_SLOTS = Object.freeze(['article_after_summary', 'article_mid', 'article_bottom', 'tata_mid', 'beginner_mid']);

  const isActive = (offer, now = new Date()) => {
    if (!offer?.enabled) return false;
    const current = now.toISOString().slice(0, 10);
    return (!offer.start || offer.start <= current) && (!offer.end || current <= offer.end);
  };

  const createAffiliateAd = (offer) => {
    if (!isActive(offer)) return null;
    if (offer.desktopOnly && window.matchMedia('(max-width: 820px)').matches) return null;
    const container = document.createElement('aside');
    container.className = 'affiliate-ad';
    container.dataset.offerId = offer.id;
    container.setAttribute('aria-label', `${offer.name}の広告`);
    container.style.setProperty('--affiliate-width', `${offer.width}px`);
    container.style.setProperty('--affiliate-height', `${offer.height}px`);
    container.style.setProperty('--affiliate-ratio', `${offer.width} / ${offer.height}`);
    const disclosure = document.createElement('span');
    disclosure.className = 'affiliate-ad-disclosure';
    disclosure.textContent = offer.disclosure || 'PR';
    const description = document.createElement('span');
    description.className = 'affiliate-ad-description';
    description.textContent = `${offer.name}の広告`;
    const media = document.createElement('div');
    media.className = 'affiliate-ad-media';
    const link = document.createElement('a');
    link.href = offer.destination;
    link.rel = 'sponsored nofollow noopener';
    const banner = document.createElement('img');
    banner.src = offer.mediaSource;
    banner.width = offer.width;
    banner.height = offer.height;
    banner.alt = `${offer.name}の広告`;
    banner.loading = 'lazy';
    banner.decoding = 'async';
    link.appendChild(banner);
    const pixel = document.createElement('img');
    pixel.src = offer.trackingPixel;
    pixel.width = 1;
    pixel.height = 1;
    pixel.alt = '';
    pixel.setAttribute('aria-hidden', 'true');
    media.append(link, pixel);
    container.append(disclosure, description, media);
    return container;
  };

  const createAdSlot = (slotId, { minHeight = 250 } = {}) => {
    const slot = document.createElement('aside');
    slot.className = 'ad-slot';
    slot.dataset.adSlot = slotId;
    slot.dataset.monetizationSlot = slotId;
    slot.setAttribute('aria-label', '広告');
    slot.style.minHeight = `${Math.max(0, Number(minHeight) || 0)}px`;
    slot.hidden = true;
    return slot;
  };

  document.querySelectorAll('[data-monetization-slot]:not([data-affiliate-offer])').forEach((element) => { element.hidden = true; });

  Promise.all([
    fetch('/data/monetization.json', { cache: 'no-store' }),
    fetch('/data/affiliate-offers.json', { cache: 'no-store' })
  ]).then(async ([configResponse, offersResponse]) => {
    if (!configResponse.ok || !offersResponse.ok) throw new Error('monetization config load failed');
    return [await configResponse.json(), await offersResponse.json()];
  }).then(([config, offerConfig]) => {
    const slots = new Set(config.slots || []);
    const offers = new Map((offerConfig.offers || []).map((offer) => [offer.id, offer]));
    const valid = typeof config.adsEnabled === 'boolean' && typeof config.affiliateEnabled === 'boolean'
      && REQUIRED_SLOTS.every((slot) => slots.has(slot));
    if (!valid) throw new Error('monetization config is invalid');

    const renderSlot = (slotId, contentNode) => {
      if (!config.adsEnabled || !slots.has(slotId) || !(contentNode instanceof Node)) return false;
      const element = document.querySelector(`[data-monetization-slot="${CSS.escape(slotId)}"]`);
      if (!element) return false;
      element.replaceChildren(contentNode);
      element.hidden = false;
      return true;
    };

    document.querySelectorAll('[data-affiliate-offer]').forEach((element) => {
      const slotId = element.dataset.monetizationSlot;
      const offer = offers.get(element.dataset.affiliateOffer);
      const pageAllowed = offer?.targetPages?.includes(location.pathname);
      const content = config.affiliateEnabled && slots.has(slotId) && pageAllowed ? createAffiliateAd(offer) : null;
      if (!content) { element.hidden = true; return; }
      element.replaceChildren(content);
      element.removeAttribute('aria-busy');
      element.hidden = false;
    });

    window.MONSABA_MONETIZATION = Object.freeze({
      config: Object.freeze(config), offers: Object.freeze([...offers.values()]), renderSlot,
      createAffiliateAd, createAdSlot, isActive
    });
  }).catch((error) => {
    document.querySelectorAll('[data-monetization-slot]').forEach((element) => { element.hidden = true; });
    console.warn(error.message);
  });
})();
