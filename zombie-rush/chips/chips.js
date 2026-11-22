(() => {
  const root = document.querySelector('[data-chip-browser]');
  if (!root)
    return;
  const locale = document.documentElement.lang === 'zh-CN' ? 'zh-CN' : document.documentElement.lang === 'en' ? 'en' : 'ja';
  const text = {
    ja: { count: (n) => `${n}件`, empty: '条件に一致するチップがありません。', official: '公式更新告知で確認', source: '外部攻略資料で確認', pending: '画像の利用条件を確認中', imageSource: '画像出典', detail: '効果を表示' },
    en: {
      count: (n) => `${n} results`,
      empty: 'No chips match these filters.',
      official: 'Confirmed by official update', source: 'Verified with an external guide', fallback: 'Official English name pending · Japanese label', pending: 'Image reuse permission pending', imageSource: 'Image source',
      detail: 'Show effect'
    },
    'zh-CN': { count: (n) => `${n}项`, empty: '没有符合条件的芯片。', official: '官方更新公告确认', source: '外部攻略资料确认', fallback: '中文正式名待确认 · 日文原名', pending: '图片使用条件待确认', imageSource: '图片来源', detail: '显示效果' }
  }[locale];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const controls = [...root.querySelectorAll('input,select')];
  let chips = [];
  const render = () => {
    const query = root.querySelector('[data-chip-search]').value.trim().toLocaleLowerCase(locale);
    const rarity = root.querySelector('[data-chip-rarity]').value;
    const tag = root.querySelector('[data-chip-tag]').value;
    const matches = chips.filter((chip) => (!query || `${Object.values(chip.name).join(" ")} ${chip.id} ${chip.id.replaceAll("-", " ")} ${chip.effect[locale] || chip.effect.ja}`.toLocaleLowerCase(locale).includes(query)) && (!rarity || chip.rarity === rarity) && (!tag || chip.tags.includes(tag)));
    root.querySelector('[data-chip-count]').textContent = text.count(matches.length);
    root.querySelector('[data-chip-results]').innerHTML = matches.length ? matches.map((chip) => `<article translate="no" class="chip-card"${chip.icon ? '' : ' data-icon-pending="true"'} data-chip-id="${esc(chip.id)}" data-rarity="${chip.rarity}">${chip.icon ? `<img src="${esc(chip.icon)}" width="96" height="96" loading="lazy" alt="${esc(chip.name[locale] || chip.name.ja)}">` : ''}<div><div class="chip-card-head"><h2>${esc((chip.name[locale] || chip.name.ja))}</h2><span>Rank ${chip.rarity}</span></div><details><summary>${text.detail}</summary><p>${esc(chip.effect[locale] || chip.effect.ja)}</p></details></div></article>`).join('') : `<p class="empty">${text.empty}</p>`;
  };
  for (const control of controls)
    control.addEventListener('input', () => {

      render();

      window.MONSABA_TRACK?.event('chip_filter_use', { filter_type: control.dataset.filterType || 'unknown' });

    });
  root.addEventListener('toggle', (event) => {

    if (event.target.open)
      window.MONSABA_TRACK?.event('chip_detail_open', { source: 'chip_db' });

  }, true);
  fetch('/data/zombie-rush/chips.json', { cache: 'no-store' }).then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status)))).then((data) => {

    chips = data.chips;

    render();

  }).catch(() => {

    root.querySelector('[data-chip-results]').innerHTML = '<p class="error-message">Data could not be loaded.</p>';

  });
})();
