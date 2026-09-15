/* Opt-in preview of the original renderer. No destinations, pixels or account settings are rewritten. */
(() => {
  if(new URLSearchParams(location.search).get('ads')!=='live')return;
  const areas=[...document.querySelectorAll('[data-astra-offer]')];
  if(!areas.length||document.documentElement.lang!=='ja')return;
  const initialize=()=>{
    for(const area of areas){if(!area.querySelector('[data-affiliate-offer]'))continue;area.classList.add('is-live');area.querySelector('.astra-ad-preview')?.remove();}
    const script=document.createElement('script');script.src=document.querySelector('script[src*="monetization.js"]')?.src||'/monetization.js';script.defer=true;document.body.append(script);
  };
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();initialize();}},{rootMargin:'100px'});
  for(const area of areas)observer.observe(area);
})();
