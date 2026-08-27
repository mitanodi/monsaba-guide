(function (runtime) {
  const REQUIRED_SLOTS = Object.freeze(['article_after_summary', 'article_mid', 'article_bottom', 'tata_mid', 'beginner_mid']);
  const SESSION_COUNT_KEY = 'monsabaAffiliateFloatingCount';
  const SESSION_CLOSED_KEY = 'monsabaAffiliateFloatingClosedAt';
  const SESSION_SEED_KEY = 'monsabaAffiliateRotationSeed';

  const matchesPage = (pattern, pathname) => pattern.endsWith('*')
    ? pathname.startsWith(pattern.slice(0, -1))
    : pathname === pattern;
  const isPageAllowed = (offer, pathname) => Array.isArray(offer?.targetPages)
    && offer.targetPages.some((pattern) => matchesPage(pattern, pathname));
  const isActive = (offer, now = new Date()) => {
    if (!offer?.enabled) return false;
    const current = now.toISOString().slice(0, 10);
    return (!offer.start || offer.start <= current) && (!offer.end || current <= offer.end);
  };
  const deviceClass = (width) => width <= 820 ? 'mobile' : width < 1200 ? 'tablet' : 'desktop';
  const hashText = (value) => {
    let hash = 2166136261;
    for (const char of String(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };
  const sessionCanShow = (storage, limit) => {
    if (!storage || limit < 1) return false;
    const count = Number.parseInt(storage.getItem(SESSION_COUNT_KEY) || '0', 10);
    return Number.isFinite(count) && count < limit;
  };
  const markSessionShown = (storage) => {
    if (!storage) return;
    const current = Number.parseInt(storage.getItem(SESSION_COUNT_KEY) || '0', 10);
    storage.setItem(SESSION_COUNT_KEY, String((Number.isFinite(current) ? current : 0) + 1));
  };
  const markSessionClosed = (storage, now = Date.now()) => {
    if (storage) storage.setItem(SESSION_CLOSED_KEY, String(now));
  };

  runtime.MONSABA_MONETIZATION_TEST = Object.freeze({
    matchesPage, isPageAllowed, isActive, deviceClass, hashText,
    sessionCanShow, markSessionShown, markSessionClosed,
    sessionKeys: Object.freeze({ count: SESSION_COUNT_KEY, closed: SESSION_CLOSED_KEY, seed: SESSION_SEED_KEY })
  });
  if (typeof document === 'undefined') return;

  const pathname = location.pathname;
  const renderedOfferIds = new Set();
  let floatingShell = null;
  const getSessionStorage = () => {
    try { return runtime.sessionStorage; } catch { return null; }
  };
  const getSessionSeed = () => {
    const storage = getSessionStorage();
    if (!storage) return 'no-storage';
    let seed = storage.getItem(SESSION_SEED_KEY);
    if (!seed) {
      seed = String(runtime.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 1e9));
      storage.setItem(SESSION_SEED_KEY, seed);
    }
    return seed;
  };

  const createAffiliateAd = (offer, placement = 'unknown', { showDisclosure = true } = {}) => {
    if (!isActive(offer) || !isPageAllowed(offer, pathname)) return null;
    if (offer.desktopOnly && runtime.matchMedia('(max-width: 820px)').matches) return null;
    const container = document.createElement('aside');
    container.className = 'affiliate-ad';
    container.dataset.offerId = offer.id;
    container.dataset.affiliatePlacement = placement;
    container.setAttribute('aria-label', `${offer.name}の広告`);
    container.style.setProperty('--affiliate-width', `${offer.width}px`);
    container.style.setProperty('--affiliate-height', `${offer.height}px`);
    container.style.setProperty('--affiliate-ratio', `${offer.width} / ${offer.height}`);
    if (showDisclosure) {
      const disclosure = document.createElement('span');
      disclosure.className = 'affiliate-ad-disclosure';
      disclosure.textContent = offer.disclosure || 'PR';
      container.appendChild(disclosure);
    }
    const description = document.createElement('span');
    description.className = 'affiliate-ad-description';
    description.textContent = `${offer.name}の広告`;
    const media = document.createElement('div');
    media.className = 'affiliate-ad-media';
    const link = document.createElement('a');
    link.href = offer.destination;
    link.rel = 'sponsored nofollow noopener';
    link.dataset.affiliateLink = 'true';
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
    container.append(description, media);
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

  const selectOffer = (offerIds, offers, placement, { avoidRendered = false } = {}) => {
    let candidates = (offerIds || []).map((id) => offers.get(id)).filter((offer) => isActive(offer) && isPageAllowed(offer, pathname));
    if (runtime.matchMedia('(max-width: 820px)').matches) candidates = candidates.filter((offer) => !offer.desktopOnly);
    if (avoidRendered) {
      const unseen = candidates.filter((offer) => !renderedOfferIds.has(offer.id));
      if (unseen.length) candidates = unseen;
    }
    if (!candidates.length) return null;
    return candidates[hashText(`${pathname}|${placement}|${getSessionSeed()}`) % candidates.length];
  };

  const findProfile = (config) => {
    const rule = (config.pageProfiles || []).find((entry) => matchesPage(entry.match, pathname));
    return rule ? config.profiles?.[rule.profile] || null : null;
  };
  const createInlineSlot = (placement) => {
    const slot = document.createElement('div');
    slot.className = `wrap monetization-slot affiliate-placement affiliate-placement-${placement}`;
    return slot;
  };
  const placeInlineSlot = (slot, anchor) => {
    const main = document.querySelector('main');
    if (!main) return false;
    if (anchor === 'after_hero') {
      const hero = main.querySelector(':scope > .page-hero, :scope > section.page-hero, :scope > section.hero');
      if (hero) { hero.after(slot); return true; }
    }
    const sections = [...main.querySelectorAll(':scope > section')].filter((section) =>
      !section.classList.contains('page-hero')
      && !section.classList.contains('source-note')
      && !section.classList.contains('page-freshness')
      && !section.classList.contains('next-reading'));
    if (anchor === 'middle' && sections.length) {
      sections[Math.max(0, Math.floor((sections.length - 1) * 0.5))].after(slot);
      return true;
    }
    const bottomAnchor = main.querySelector(':scope > .source-note:last-of-type, :scope > .next-reading:last-of-type');
    if (bottomAnchor) bottomAnchor.before(slot); else main.appendChild(slot);
    return true;
  };
  const dispatchRendered = (ad) => document.dispatchEvent(new CustomEvent('monsaba:affiliate-rendered', { detail: { element: ad } }));

  const renderInlinePlacements = (config, offers, profile) => {
    if (!profile || config.affiliateDensity === 'low') return;
    const placements = config.affiliateDensity === 'medium' ? profile.placements.slice(0, 1) : profile.placements;
    for (const definition of placements) {
      const offer = selectOffer(definition.offerIds, offers, definition.placement);
      if (!offer) continue;
      let slot = document.querySelector(`[data-monetization-slot="${CSS.escape(definition.slotId)}"]:not([data-affiliate-rendered])`);
      if (!slot) {
        slot = createInlineSlot(definition.placement);
        if (!placeInlineSlot(slot, definition.anchor)) continue;
      }
      slot.classList.add('affiliate-placement', `affiliate-placement-${definition.placement}`);
      slot.dataset.monetizationSlot = definition.slotId;
      slot.dataset.affiliateOffer = offer.id;
      slot.dataset.affiliatePlacement = definition.placement;
      const ad = createAffiliateAd(offer, definition.placement);
      if (!ad) { slot.hidden = true; continue; }
      ad.querySelector('.affiliate-ad-media>a>img')?.addEventListener('error', () => { slot.hidden = true; });
      slot.replaceChildren(ad);
      slot.dataset.affiliateRendered = 'true';
      slot.removeAttribute('aria-busy');
      slot.hidden = false;
      renderedOfferIds.add(offer.id);
      dispatchRendered(ad);
    }
  };

  const renderPresetPlacements = (config, offers) => {
    if (!config.affiliateEnabled) return;
    for (const slot of document.querySelectorAll('[data-affiliate-offer]')) {
      const offer = offers.get(slot.dataset.affiliateOffer);
      const placement = slot.dataset.affiliatePlacement || 'article_bottom';
      const ad = createAffiliateAd(offer, placement);
      if (!ad) { slot.hidden = true; continue; }
      ad.querySelector('.affiliate-ad-media>a>img')?.addEventListener('error', () => { slot.hidden = true; });
      slot.replaceChildren(ad);
      slot.dataset.affiliateRendered = 'true';
      slot.removeAttribute('aria-busy');
      slot.hidden = false;
      renderedOfferIds.add(offer.id);
      dispatchRendered(ad);
    }
  };

  const renderDesktopRail = (config, offers) => {
    if (!config.desktopRailAffiliateEnabled || runtime.innerWidth < Number(config.desktopRailAffiliateMinWidth || 1600)) return false;
    const offer = offers.get(config.desktopRailPages?.[pathname]);
    if (!offer || !isActive(offer) || !isPageAllowed(offer, pathname)) return false;
    const main = document.querySelector('main');
    if (!main || main.parentElement?.classList.contains('affiliate-page-layout')) return false;
    const layout = document.createElement('div');
    layout.className = 'affiliate-page-layout';
    const rail = document.createElement('aside');
    rail.className = 'desktop-affiliate-rail';
    rail.dataset.monetizationSlot = 'affiliate_mid';
    rail.dataset.affiliateOffer = offer.id;
    rail.dataset.affiliatePlacement = 'desktop_rail';
    rail.setAttribute('aria-label', 'PR広告');
    const ad = createAffiliateAd(offer, 'desktop_rail');
    if (!ad) return false;
    main.before(layout);
    layout.append(main, rail);
    rail.appendChild(ad);
    renderedOfferIds.add(offer.id);
    dispatchRendered(ad);
    return true;
  };

  const interfaceIsBusy = () => {
    if (document.hidden || document.querySelector('.site-header.nav-open, dialog[open], [aria-modal="true"]')) return true;
    return Boolean(document.activeElement?.closest?.('form, .compare-tool, [contenteditable="true"]'));
  };
  const setFloatingSuspended = () => {
    if (floatingShell) floatingShell.classList.toggle('is-suspended', interfaceIsBusy());
  };
  const closeFloating = () => {
    if (!floatingShell) return;
    const shell = floatingShell;
    floatingShell = null;
    markSessionClosed(getSessionStorage());
    shell.classList.remove('is-visible');
    shell.classList.add('is-closing');
    document.body.classList.remove('has-bottom-affiliate', 'has-side-affiliate', 'has-side-affiliate-left', 'has-side-affiliate-right');
    document.body.style.removeProperty('--affiliate-floating-offset');
    runtime.setTimeout(() => shell.remove(), 280);
  };

  const showFloating = (config, offers, profile) => {
    if (!profile || !config.stickyAffiliateEnabled || floatingShell || document.querySelector('.desktop-affiliate-rail')) return false;
    const storage = getSessionStorage();
    if (!sessionCanShow(storage, Number(config.floatingAffiliateSessionLimit) || 0) || interfaceIsBusy()) return false;
    const isSlide = runtime.innerWidth >= Number(config.slideAffiliateMinWidth || 1200)
      && config.slideAffiliateEnabled && ['left', 'right'].includes(config.slideAffiliateSide);
    const isBottom = !isSlide && config.bottomAffiliateEnabled;
    if (!isSlide && !isBottom) return false;
    const placement = isSlide ? `slide_${config.slideAffiliateSide}` : 'bottom_floating';
    const offer = selectOffer(isSlide ? config.floating?.slideOfferIds : config.floating?.bottomOfferIds, offers, placement, { avoidRendered: true });
    if (!offer) return false;
    const shell = document.createElement('aside');
    shell.className = `floating-affiliate floating-affiliate-${placement}`;
    shell.dataset.monetizationSlot = 'affiliate_floating';
    shell.dataset.affiliateOffer = offer.id;
    shell.dataset.affiliatePlacement = placement;
    shell.setAttribute('aria-label', 'PR広告');
    const controls = document.createElement('div');
    controls.className = 'floating-affiliate-controls';
    const label = document.createElement('strong');
    label.textContent = 'PR';
    const close = document.createElement('button');
    close.className = 'floating-affiliate-close';
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', '広告を閉じる');
    close.addEventListener('click', closeFloating);
    controls.append(label, close);
    const ad = createAffiliateAd(offer, placement, { showDisclosure: false });
    if (!ad) return false;
    ad.querySelector('.affiliate-ad-media>a>img')?.addEventListener('error', closeFloating);
    shell.append(controls, ad);
    document.body.appendChild(shell);
    floatingShell = shell;
    markSessionShown(storage);
    renderedOfferIds.add(offer.id);
    document.body.classList.add(isSlide ? 'has-side-affiliate' : 'has-bottom-affiliate');
    if (isSlide) document.body.classList.add(`has-side-affiliate-${config.slideAffiliateSide}`);
    runtime.requestAnimationFrame(() => {
      if (!floatingShell) return;
      document.body.style.setProperty('--affiliate-floating-offset', `${Math.ceil(shell.getBoundingClientRect().height)}px`);
      shell.classList.add('is-visible');
      dispatchRendered(ad);
    });
    return true;
  };

  const scheduleFloating = (config, offers, profile) => {
    if (!profile || !config.stickyAffiliateEnabled || document.querySelector('.desktop-affiliate-rail')) return;
    const isSlideViewport = runtime.innerWidth >= Number(config.slideAffiliateMinWidth || 1200);
    const delay = isSlideViewport ? Number(config.slideAffiliateDelaySeconds) : Number(config.bottomAffiliateDelaySeconds);
    const started = Date.now();
    const attempt = () => {
      if (showFloating(config, offers, profile)) return;
      if (Date.now() - started < 60000 && sessionCanShow(getSessionStorage(), Number(config.floatingAffiliateSessionLimit) || 0)) runtime.setTimeout(attempt, 1000);
    };
    runtime.setTimeout(attempt, Math.max(5, Number.isFinite(delay) ? delay : 10) * 1000);
  };

  document.querySelectorAll('[data-affiliate-offer]').forEach((element) => { element.hidden = true; });
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
      && REQUIRED_SLOTS.every((slot) => slots.has(slot))
      && ['low', 'medium', 'high'].includes(config.affiliateDensity)
      && ['left', 'right', 'off'].includes(config.slideAffiliateSide);
    if (!valid) throw new Error('monetization config is invalid');
    const renderSlot = (slotId, contentNode) => {
      if (!config.adsEnabled || !slots.has(slotId) || !(contentNode instanceof Node)) return false;
      const element = document.querySelector(`[data-monetization-slot="${CSS.escape(slotId)}"]`);
      if (!element) return false;
      element.replaceChildren(contentNode);
      element.hidden = false;
      return true;
    };
    const profile = config.affiliateEnabled ? findProfile(config) : null;
    renderPresetPlacements(config, offers);
    renderInlinePlacements(config, offers, profile);
    renderDesktopRail(config, offers);
    scheduleFloating(config, offers, profile);
    const header = document.querySelector('.site-header');
    if (header) new MutationObserver(setFloatingSuspended).observe(header, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('focusin', setFloatingSuspended);
    document.addEventListener('focusout', () => runtime.setTimeout(setFloatingSuspended, 0));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && floatingShell) closeFloating();
    });
    runtime.MONSABA_MONETIZATION = Object.freeze({
      config: Object.freeze(config), offers: Object.freeze([...offers.values()]), renderSlot,
      createAffiliateAd, createAdSlot, isActive, isPageAllowed, closeFloating
    });
  }).catch((error) => {
    document.querySelectorAll('[data-monetization-slot]').forEach((element) => { element.hidden = true; });
    console.warn(error.message);
  });
})(typeof window === 'undefined' ? globalThis : window);
