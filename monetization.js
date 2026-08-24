(function () {
  const REQUIRED_SLOTS = Object.freeze([
    'article_after_summary',
    'article_mid',
    'article_bottom',
    'tata_mid',
    'beginner_mid'
  ]);

  const AFFILIATE_OFFERS = Object.freeze({
    point_income_003: Object.freeze({
      offerId: 's00000025908001',
      placementId: 'point_income_003',
      label: 'ポイントインカムの広告',
      width: 300,
      height: 250,
      html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BADDF+YJ6MY+5JWO+5YZ75" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www28.a8.net/svt/bgt?aid=260824371058&wid=002&eno=01&mid=s00000025908001003000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=4BADDF+YJ6MY+5JWO+5YZ75" alt="">`
    }),
    warau_003: Object.freeze({
      offerId: 's00000018660003',
      placementId: 'warau_003',
      label: 'ワラウの広告',
      width: 468,
      height: 60,
      html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BADDF+XCBFE+3ZZC+HXKQP" rel="nofollow">
<img border="0" width="468" height="60" alt="" src="https://www25.a8.net/svt/bgt?aid=260824371056&wid=002&eno=01&mid=s00000018660003012000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=4BADDF+XCBFE+3ZZC+HXKQP" alt="">`
    }),
    macromill_002: Object.freeze({
      offerId: 's00000013554002',
      placementId: 'macromill_002',
      label: 'マクロミルの広告',
      width: 120,
      height: 600,
      desktopOnly: true,
      html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BADDF+1JU+2WL0+CN8W1" rel="nofollow">
<img border="0" width="120" height="600" alt="" src="https://www21.a8.net/svt/bgt?aid=260824371000&wid=002&eno=01&mid=s00000013554002124000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www18.a8.net/0.gif?a8mat=4BADDF+1JU+2WL0+CN8W1" alt="">`
    }),
    ipsos_isay_001: Object.freeze({
      offerId: 's00000018951001',
      placementId: 'ipsos_isay_001',
      label: 'Ipsos iSayの広告',
      width: 250,
      height: 250,
      html: `<a href="https://px.a8.net/svt/ejp?a8mat=4BADDE+G8NPLM+4286+62U35" rel="nofollow">
<img border="0" width="250" height="250" alt="" src="https://www21.a8.net/svt/bgt?aid=260824370982&wid=002&eno=01&mid=s00000018951001021000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=4BADDE+G8NPLM+4286+62U35" alt="">`
    })
  });

  const safeAffiliateAttributes = (config, offerId, placementId) => {
    if (!config?.affiliateEnabled || !offerId || !placementId) return null;
    return Object.freeze({
      rel: 'sponsored nofollow noopener',
      disclosure: 'このページにはアフィリエイト広告が含まれます',
      event: Object.freeze({ name: 'affiliate_click', offer_id: String(offerId), placement_id: String(placementId) })
    });
  };

  const createAffiliateAd = (offerKey) => {
    const offer = AFFILIATE_OFFERS[offerKey];
    if (!offer) return null;
    if (offer.desktopOnly && window.matchMedia('(max-width: 820px)').matches) return null;
    const container = document.createElement('aside');
    container.className = 'affiliate-ad';
    container.setAttribute('aria-label', offer.label);
    container.style.setProperty('--affiliate-width', `${offer.width}px`);
    container.style.setProperty('--affiliate-height', `${offer.height}px`);
    container.style.setProperty('--affiliate-ratio', `${offer.width} / ${offer.height}`);
    const disclosure = document.createElement('span');
    disclosure.className = 'affiliate-ad-disclosure';
    disclosure.textContent = 'PR';
    const description = document.createElement('span');
    description.className = 'affiliate-ad-description';
    description.textContent = offer.label;
    const media = document.createElement('div');
    media.className = 'affiliate-ad-media';
    media.innerHTML = offer.html;
    container.append(disclosure, description, media);
    return container;
  };

  document.querySelectorAll('[data-monetization-slot]:not([data-affiliate-offer])').forEach((element) => { element.hidden = true; });

  fetch('/data/monetization.json')
    .then((response) => {
      if (!response.ok) throw new Error(`monetization config: ${response.status}`);
      return response.json();
    })
    .then((config) => {
      const slots = new Set(config.slots || []);
      const valid = typeof config.adsEnabled === 'boolean'
        && typeof config.affiliateEnabled === 'boolean'
        && REQUIRED_SLOTS.every((slot) => slots.has(slot));
      if (!valid) throw new Error('monetization config is invalid');
      if (!config.affiliateEnabled) document.querySelectorAll('[data-affiliate-offer]').forEach((element) => { element.hidden = true; });
      const renderSlot = (slotId, contentNode) => {
        if (!config.adsEnabled || !slots.has(slotId) || !(contentNode instanceof Node)) return false;
        const element = document.querySelector(`[data-monetization-slot="${CSS.escape(slotId)}"]`);
        if (!element) return false;
        element.replaceChildren(contentNode);
        element.hidden = false;
        return true;
      };
      if (config.affiliateEnabled) {
        document.querySelectorAll('[data-affiliate-offer]').forEach((element) => {
          const slotId = element.dataset.monetizationSlot;
          const content = slots.has(slotId) ? createAffiliateAd(element.dataset.affiliateOffer) : null;
          if (!content) {
            element.hidden = true;
            return;
          }
          element.replaceChildren(content);
          element.removeAttribute('aria-busy');
          element.hidden = false;
        });
      }
      window.MONSABA_MONETIZATION = Object.freeze({ config: Object.freeze(config), renderSlot, safeAffiliateAttributes, createAffiliateAd });
    })
    .catch((error) => {
      document.querySelectorAll('[data-monetization-slot]').forEach((element) => { element.hidden = true; });
      console.warn(error.message);
    });
})();
