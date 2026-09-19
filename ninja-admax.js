(function () {
  const REMOVE_AFTER_MS = 5000;
  const FILLED_SELECTOR = 'iframe, img, object, embed';
  const isFilled = (slot) => Boolean(slot.querySelector(FILLED_SELECTOR));
  const finalize = (slot) => {
    if (!isFilled(slot)) { slot.remove(); return; }
    window.MONSABA_TRACK?.event('ad_impression', { slot_id: slot.dataset.admaxSlot || 'unknown' });
  };
  window.addEventListener('load', () => {
    document.querySelectorAll('.ninja-admax-slot').forEach((slot) => {
      const observer = new MutationObserver(() => {
        if (isFilled(slot)) observer.disconnect();
      });
      observer.observe(slot, { childList: true, subtree: true });
      window.setTimeout(() => {
        observer.disconnect();
        finalize(slot);
      }, REMOVE_AFTER_MS);
    });
  }, { once: true });
}());
