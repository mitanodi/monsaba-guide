(() => {
  const root = document.querySelector('[data-trial-browser]');
  if (!root) return;
  const locale = document.documentElement.lang === 'zh-CN' ? 'zh-CN' : document.documentElement.lang === 'en' ? 'en' : 'ja';
  const ui = {
    ja: { count: (n) => `${n}系統`, pending: '確認待ち', external: '外部確認', empty: '条件に一致する系統がありません。', detail: '個別ページ' },
    en: { count: (n) => `${n} families`, pending: 'Pending', external: 'Externally confirmed', empty: 'No families match these filters.', detail: 'Tatari page' },
    'zh-CN': { count: (n) => `${n}个系列`, pending: '待确认', external: '外部确认', empty: '没有符合条件的系列。', detail: '塔塔页面' }
  }[locale];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const translateCondition = (value) => {
    if (!value || locale === 'ja') return value || ui.pending;
    const maps = locale === 'en' ? [
      ['入手後から育成開始','Training begins after obtaining'],['最終進化','Final evolution'],['星上げ','star upgrades'],['個別試練','individual trial'],['餌付け','feedings'],['共有進行','shared progress'],['または','or'],['ランク',' rank'],['回',' times'],['体捕獲',' Tatari captured'],['星（MAX）',' stars (MAX)'],['星',' stars']
    ] : [
      ['入手後から育成開始','获得后开始培养'],['最終進化','最终进化'],['星上げ','升星'],['個別試練','个别试炼'],['餌付け','喂食'],['共有進行','共享进度'],['または','或'],['ランク','级'],['回','次'],['体捕獲','只塔塔捕获'],['星（MAX）','星（MAX）'],['星','星']
    ];
    return maps.reduce((text, [from, to]) => text.replaceAll(from, to), value);
  };
  let families = [];
  const render = () => {
    const query = root.querySelector('[data-trial-search]').value.trim().toLocaleLowerCase(locale);
    const attribute = root.querySelector('[data-trial-attribute]').value;
    const status = root.querySelector('[data-trial-status]').value;
    const matches = families.filter((family) => (!query || `${family.familyName} ${family.conditions.map((item) => `${item.tataName} ${item.condition}`).join(' ')}`.toLocaleLowerCase(locale).includes(query)) && (!attribute || family.attribute === attribute) && (!status || family.conditions.some((item) => item.status === status)));
    root.querySelector('[data-trial-count]').textContent = ui.count(matches.length);
    root.querySelector('[data-trial-results]').innerHTML = matches.length ? matches.map((family) => `<article class="trial-card"><div class="trial-card-head"><h2>${esc(family.evolutions?.[0] || family.familyName)}系</h2><span>${esc(family.attribute)}</span></div><ol>${family.conditions.map((item) => `<li><strong>T${item.stage} ${esc(item.tataName)}</strong><p>${esc(translateCondition(item.condition))}</p><span class="trust-label ${item.status === 'pending' ? 'is-pending' : 'is-external'}">${item.status === 'pending' ? ui.pending : ui.external}</span></li>`).join('')}</ol><a href="/tata/${encodeURIComponent(family.familyId)}/">${ui.detail}</a></article>`).join('') : `<p class="empty">${ui.empty}</p>`;
  };
  for (const control of root.querySelectorAll('input,select')) control.addEventListener('input', () => { render(); window.MONSABA_TRACK?.event('evolution_trial_filter', { filter_type: control.dataset.filterType || 'unknown' }); });
  Promise.all([fetch('/data/evolution-trials.json', { cache: 'no-store' }).then((r) => r.json()), fetch('/data/tatari.json', { cache: 'no-store' }).then((r) => r.json())]).then(([data, tatari]) => { const names = new Map(tatari.families.map((family) => [family.id, family.evolutions.map((item) => item.name)])); families = data.families.map((family) => ({ ...family, evolutions: names.get(family.familyId) })); render(); });
})();
