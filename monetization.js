(function () {
  const REQUIRED_SLOTS = Object.freeze([
    'article_after_summary',
    'article_mid',
    'article_bottom',
    'tata_mid',
    'beginner_mid'
  ]);

  const safeAffiliateAttributes = (config, offerId, placementId) => {
    if (!config?.affiliateEnabled || !offerId || !placementId) return null;
    return Object.freeze({
      rel: 'sponsored nofollow noopener',
      disclosure: 'このページにはアフィリエイト広告が含まれます',
      event: Object.freeze({ name: 'affiliate_click', offer_id: String(offerId), placement_id: String(placementId) })
    });
  };

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
      document.querySelectorAll('[data-monetization-slot]').forEach((element) => { element.hidden = true; });
      const renderSlot = (slotId, contentNode) => {
        if (!config.adsEnabled || !slots.has(slotId) || !(contentNode instanceof Node)) return false;
        const element = document.querySelector(`[data-monetization-slot="${CSS.escape(slotId)}"]`);
        if (!element) return false;
        element.replaceChildren(contentNode);
        element.hidden = false;
        return true;
      };
      window.MONSABA_MONETIZATION = Object.freeze({ config: Object.freeze(config), renderSlot, safeAffiliateAttributes });
    })
    .catch((error) => {
      document.querySelectorAll('[data-monetization-slot]').forEach((element) => { element.hidden = true; });
      console.warn(error.message);
    });
})();
