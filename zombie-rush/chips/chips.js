(() => {
  const root = document.querySelector('[data-chip-browser]');
  if (!root) return;
  const locale = document.documentElement.lang === 'zh-CN' ? 'zh-CN' : document.documentElement.lang === 'en' ? 'en' : 'ja';
  const text = {
    ja: { count: (n) => `${n}件`, empty: '条件に一致するチップがありません。', source: 'ゲーム内確認', detail: '効果を表示' },
    en: { count: (n) => `${n} results`, empty: 'No chips match these filters.', source: 'Verified in game', detail: 'Show effect' },
    'zh-CN': { count: (n) => `${n}项`, empty: '没有符合条件的芯片。', source: '游戏内确认', detail: '显示效果' }
  }[locale];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const controls = [...root.querySelectorAll('input,select')];
  let chips = [];
  const render = () => {
    const query = root.querySelector('[data-chip-search]').value.trim().toLocaleLowerCase(locale);
    const rarity = root.querySelector('[data-chip-rarity]').value;
    const tag = root.querySelector('[data-chip-tag]').value;
    const matches = chips.filter((chip) => (!query || `${chip.name.ja} ${chip.effect[locale] || chip.effect.ja}`.toLocaleLowerCase(locale).includes(query)) && (!rarity || chip.rarity === rarity) && (!tag || chip.tags.includes(tag)));
    root.querySelector('[data-chip-count]').textContent = text.count(matches.length);
    root.querySelector('[data-chip-results]').innerHTML = matches.length ? matches.map((chip) => `<article class="chip-card" data-rarity="${chip.rarity}"><img src="${chip.icon}" width="96" height="96" loading="lazy" alt="${esc(chip.name.ja)}"><div><div class="chip-card-head"><h2>${esc(chip.name.ja)}</h2><span>Rank ${chip.rarity}</span></div><details><summary>${text.detail}</summary><p>${esc(chip.effect[locale] || chip.effect.ja)}</p><small>${text.source} · PDF p.${chip.source.pdfPage}</small></details></div></article>`).join('') : `<p class="empty">${text.empty}</p>`;
  };
  for (const control of controls) control.addEventListener('input', () => { render(); window.MONSABA_TRACK?.event('chip_filter_use', { filter_type: control.dataset.filterType || 'unknown' }); });
  root.addEventListener('toggle', (event) => { if (event.target.open) window.MONSABA_TRACK?.event('chip_detail_open', { source: 'chip_db' }); }, true);
  fetch('/data/zombie-rush/chips.json', { cache: 'no-store' }).then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status)))).then((data) => { chips = data.chips; render(); }).catch(() => { root.querySelector('[data-chip-results]').innerHTML = '<p class="error-message">Data could not be loaded.</p>'; });
})();
