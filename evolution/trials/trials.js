(() => {
  const root = document.querySelector('[data-trial-browser]');
  if (!root)
    return;
  const locale = document.documentElement.lang === 'zh-CN' ? 'zh-CN' : document.documentElement.lang === 'en' ? 'en' : 'ja';
  const ui = {
    ja: {
      count: (n) => `${n}系統`,
      pending: '確認待ち',
      external: '外部確認',
      empty: '条件に一致する系統がありません。',
      detail: '個別ページ'
    },
    en: {
      count: (n) => `${n} families`,
      pending: 'Pending',
      external: 'Externally confirmed',
      empty: 'No families match these filters.',
      detail: 'Tatari page'
    },
    'zh-CN': { count: (n) => `${n}个系列`, pending: '待确认', external: '外部确认', empty: '没有符合条件的系列。', detail: '塔塔页面' }
  }[locale];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const translateCondition = (value) => value || ui.pending;
  let families = [];
  const render = () => {
    const query = root.querySelector('[data-trial-search]').value.trim().toLocaleLowerCase(locale);
    const attribute = root.querySelector('[data-trial-attribute]').value;
    const status = root.querySelector('[data-trial-status]').value;
    const matches = families.filter((family) => (!query || `${family.familyName} ${family.searchNames} ${family.conditions.map((item) => `${item.tataName} ${item.condition}`).join(' ')}`.toLocaleLowerCase(locale).includes(query)) && (!attribute || family.attribute === attribute) && (!status || family.conditions.some((item) => item.status === status)));
    root.querySelector('[data-trial-count]').textContent = ui.count(matches.length);
    const prefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '';
    root.querySelector('[data-trial-results]').innerHTML = matches.length ? matches.map((family) => `<article class="trial-card" translate="no"><div class="trial-card-head"><h2>${esc(family.displayName)}</h2><span>${esc(family.attribute)}</span></div><ol>${family.conditions.map((item) => `<li><strong>T${item.stage} ${esc(family.evolutions?.find(e => e.stage === item.stage)?.displayName || item.tataName)}</strong>${locale === 'ja' ? '' : `<small>${locale === 'en' ? 'Conditions: Japanese source; translation pending' : '条件：日文原文；翻译待确认'}</small>`}<p lang="ja">${esc(translateCondition(item.condition))}</p><a class="trust-label is-external" href="${esc(item.individualEvidence?.sourceUrl || item.sourceUrl)}">${ui.external}</a>${item.status === 'pending' ? ` <span class="trust-label is-pending">${ui.pending}</span>` : ''}</li>`).join('')}</ol><a href="${prefix}/tata/${encodeURIComponent(family.familyId)}/">${ui.detail}</a></article>`).join('') : `<p class="empty">${ui.empty}</p>`;
  };
  for (const control of root.querySelectorAll('input,select'))
    control.addEventListener('input', () => {

      render();

      window.MONSABA_TRACK?.event('evolution_trial_filter', { filter_type: control.dataset.filterType || 'unknown' });

    });
  Promise.all([fetch('/data/evolution-trials.json', { cache: 'no-store' }).then((r) => r.json()), fetch('/data/tatari.json', { cache: 'no-store' }).then((r) => r.json())]).then(([data, tatari]) => {

    const names = new Map(tatari.families.map((family) => [family.id, family.evolutions.map(item => ({ ...item, displayName: (locale === 'en' ? item.nameEn : locale === 'zh-CN' ? item.nameZhHans : item.name) || item.name }))]));
    families = data.families.map((family) => ({ ...family, evolutions: names.get(family.familyId), displayName: names.get(family.familyId)?.[0]?.displayName || family.familyName, searchNames: names.get(family.familyId)?.flatMap(e => [e.name, e.nameEn, e.nameZhHans]).join(' ') }));

    render();

  });
})();
