// Progressive enhancement: every rating is present without JavaScript.
(() => {
  const buttons = [...document.querySelectorAll('[data-tier-attribute]')];
  const rows = [...document.querySelectorAll('.tier-board .tier-chart-row')];
  const search = document.querySelector('[data-tier-search]');
  const roleLinks = [...document.querySelectorAll('[data-tier-role]')];
  let attribute = 'all';
  const normalized = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s/g, '');
  function filter() {
    const query = normalized(search?.value || '');
    rows.forEach(row => {
      const cards = [...row.querySelectorAll('[data-family-id], [data-tier-entry]')];
      cards.forEach(card => {
        card.hidden = (attribute !== 'all' && card.dataset.attribute !== attribute) || !normalized(card.textContent).includes(query);
      });
      const count = cards.filter(card => !card.hidden).length;
      row.querySelector('.tier-row-count').textContent = String(count);
      row.querySelector('.tier-empty').hidden = count !== 0;
    });
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    attribute = button.dataset.tierAttribute;
    buttons.forEach(b => {
      const active = b === button;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    filter();
  }));
  search?.addEventListener('input', filter);
  function syncPosition() {
    const role = location.hash.match(/^#zombie-(front|middle|rear)$/)?.[1] || 'all';
    document.querySelectorAll('[data-tier-position]').forEach(board => {
      board.hidden = role !== 'all' && board.dataset.tierPosition !== role;
    });
    roleLinks.forEach(link => {
      if (link.dataset.tierRole === role) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', syncPosition);
  window.addEventListener('popstate', syncPosition);
  syncPosition();
  const mode = new URL(location.href).searchParams.get('mode');
  if (['overall', 'normal', 'zombie', 'dojo', 'beginner'].includes(mode) && !location.hash)
    document.getElementById(`mode-${mode}`)?.scrollIntoView();
})();
