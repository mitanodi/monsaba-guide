// Progressive enhancement: all five complete boards are already in the HTML.
(() => {
  const buttons=[...document.querySelectorAll('[data-tier-attribute]')];
  const rows=[...document.querySelectorAll('.tier-board .tier-chart-row')];
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const attribute=button.dataset.tierAttribute;
    buttons.forEach(b=>{const active=b===button;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});
    rows.forEach(row=>{
      const cards=[...row.querySelectorAll('[data-family-id]')];
      cards.forEach(card=>{card.hidden=attribute!=='all'&&card.dataset.attribute!==attribute;});
      const count=cards.filter(card=>!card.hidden).length;
      row.querySelector('.tier-row-count').textContent=String(count);
      row.querySelector('.tier-empty').hidden=count!==0;
    });
  }));
  const mode=new URL(location.href).searchParams.get('mode');
  if(['overall','normal','zombie','dojo','beginner'].includes(mode))document.getElementById(`mode-${mode}`)?.scrollIntoView();
})();
