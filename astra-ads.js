/* Opt-in preview of the original renderer. No destinations, pixels or account settings are rewritten. */
(() => {
  if(new URLSearchParams(location.search).get('ads')!=='live')return;
  const area=document.querySelector('[data-astra-offer]');
  const slot=document.querySelector(`[data-affiliate-offer="${area?.dataset.astraOffer}"]`);
  if(!area||!slot||document.documentElement.lang!=='ja')return;
  const initialize=()=>{
    area.classList.add('is-live');area.querySelector('.astra-ad-preview')?.remove();area.append(slot);
    const script=document.createElement('script');script.src=document.querySelector('script[src*="monetization.js"]')?.src||'/monetization.js';script.defer=true;document.body.append(script);
  };
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();initialize();}},{rootMargin:'100px'});observer.observe(area);
})();
