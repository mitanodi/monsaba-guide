(function () {
  const REMOVE_AFTER_MS = 3500;
  const isFilled = (slot) => {
    const holder = slot.querySelector('[id^="admax-banner-"]');
    return Boolean(holder?.querySelector('iframe, img, object, embed'));
  };
  const finalize = (slot) => {
    if (!isFilled(slot)) { slot.remove(); return; }
    window.MONSABA_TRACK?.event('ad_impression', { slot_id: slot.dataset.admaxSlot || 'unknown' });
  };
  window.addEventListener('load', () => {
    window.setTimeout(() => document.querySelectorAll('.ninja-admax-slot').forEach(finalize), REMOVE_AFTER_MS);
  }, { once: true });
}());
