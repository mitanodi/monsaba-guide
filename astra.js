/* Presentation only: existing data, local storage keys and share codec are unchanged. */
(() => {
  const locale=document.body.dataset.locale||'ja';
  const prefix=locale==='en'?'/en':locale==='zh-CN'?'/zh-cn':'';
  const copy=locale==='en'?{calendar:'Calendar',details:'How to read the ratings',closed:'Close selection',readonly:'Posting is disabled in this experiment.'}:locale==='zh-CN'?{calendar:'日历',details:'评价说明与阅读方式',closed:'关闭选择',readonly:'实验版暂不支持投稿。'}:{calendar:'予定',details:'評価の読み方・詳しい説明',closed:'選択を閉じる',readonly:'実験版では投稿・編集を停止しています。'};
  document.documentElement.dataset.astraAds=new URLSearchParams(location.search).get('ads')==='off'?'off':'preview';
  document.querySelector('.astra-home-search')?.addEventListener('click',event=>{const trigger=document.querySelector('[data-global-search-open]');if(trigger){event.preventDefault();trigger.click();}});
  const bottom=document.querySelector('.mobile-bottom-nav');
  if(bottom){const search=bottom.querySelector('button');const calendar=document.createElement('a');calendar.href=`${prefix}/events/calendar/`;calendar.innerHTML=`▦<span>${copy.calendar}</span>`;search?.replaceWith(calendar);const team=bottom.querySelector(`a[href="${prefix}/team-builder/"]`);if(team)bottom.append(team);bottom.querySelectorAll('a').forEach(a=>{if(a.pathname===location.pathname&&!a.hash)a.setAttribute('aria-current','page');});}
  document.querySelector('.astra-compact-toggle')?.addEventListener('click',e=>{const compact=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(compact));document.querySelector('.astra-catalog')?.classList.toggle('is-compact',compact);});
  // Keep mobile and desktop navigation state truthful after a viewport change.
  const mobile=matchMedia('(max-width:1099px)');
  mobile.addEventListener('change',()=>{document.querySelector('.site-header')?.classList.remove('nav-open');document.querySelector('.mobile-nav-toggle')?.setAttribute('aria-expanded','false');});
  // Nonessential tier prose is still in the DOM and readable without JavaScript.
  if(document.body.dataset.astraPage==='/tata-tier/'){
    const chart=document.querySelector('.tier-chart');const section=chart?.closest('section');
    if(chart&&section&&!section.querySelector('.astra-tier-explanation')){
      const prose=[...section.children].filter(el=>['P'].includes(el.tagName));
      if(prose.length){const details=document.createElement('details');details.className='astra-tier-explanation';const summary=document.createElement('summary');summary.textContent=copy.details;details.append(summary,...prose);chart.after(details);}
    }
  }
  // Preview is explicitly read-only, including keyboard form submission.
  const isCommunity=/\/(team-builder\/community|board|friends)\//.test(location.pathname);
  if(isCommunity){document.addEventListener('submit',event=>{if(event.target.id.includes('filter')||event.submitter?.value==='cancel')return;event.preventDefault();event.stopImmediatePropagation();const status=event.target.querySelector('[role=status]')||document.createElement('p');status.textContent=copy.readonly;status.setAttribute('role','status');event.target.append(status);},true);document.querySelectorAll('button[type=submit],input[type=submit]').forEach(button=>{if(!button.closest('form')?.id.includes('filter')){button.disabled=true;button.title=copy.readonly;}});}
  // Make the existing sheet operable by keyboard with focus return; mode and drag logic stay in team-builder.js.
  const picker=document.querySelector('.formation-picker');
  if(picker){let lastFocus=null;const isNarrow=()=>matchMedia('(max-width:700px)').matches;new MutationObserver(()=>{if(!isNarrow())return;const open=picker.classList.contains('is-sheet-open');if(open&&!picker.hasAttribute('data-astra-open')){lastFocus=document.activeElement;picker.setAttribute('data-astra-open','true');picker.setAttribute('role','dialog');picker.setAttribute('aria-modal','true');picker.querySelector('input')?.focus();}else if(!open&&picker.hasAttribute('data-astra-open')){picker.removeAttribute('data-astra-open');picker.removeAttribute('role');picker.removeAttribute('aria-modal');if(lastFocus?.isConnected)lastFocus.focus();}}).observe(picker,{attributes:true,attributeFilter:['class']});
    document.addEventListener('keydown',event=>{if(!isNarrow()||!picker.classList.contains('is-sheet-open'))return;if(event.key==='Escape'){document.querySelector('.team-picker-sheet-toggle[aria-expanded=true]')?.click();return;}if(event.key==='Tab'){const nodes=[...picker.querySelectorAll('button:not([disabled]),a[href],input,select'),document.querySelector('.team-picker-sheet-toggle')].filter(e=>e&&e.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
  }
})();
