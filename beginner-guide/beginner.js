(() => {
  const buttons = [...document.querySelectorAll('[data-beginner-choice]')];
  const cards = [...document.querySelectorAll('[data-beginner-modes]')];
  const status = document.querySelector('#beginner-choice-status');
  const locale = document.body.dataset.locale || 'ja';
  if (!buttons.length || !cards.length) return;
  let owned = {};
  try { const raw = JSON.parse(localStorage.getItem('monsabaRoster:v1') || '{}'); owned = raw.entries || raw; } catch { owned = {}; }
  const hasRoster = Object.keys(owned).length > 0;
  for (const card of cards) {
    const familyId = card.dataset.beginnerFamily; const entry = owned[familyId]; const status = card.querySelector('.beginner-owned-status');
    const ownedCopy = locale === 'en' ? (entry ? 'In your roster — use this Tata as a candidate.' : hasRoster ? 'Not owned — shown as a general recommendation.' : 'No roster yet — register your Tata to narrow the list.') : locale === 'zh-CN' ? (entry ? '已在持有列表中——可作为编队候选。' : hasRoster ? '未持有——此处作为一般推荐显示。' : '尚未登记持有——登记后可缩小候选范围。') : (entry ? '手持ち登録済み — このタタを使う候補です。' : hasRoster ? '未所持 — 一般おすすめとして表示しています。' : '手持ち未登録 — マイモンサバへ登録すると候補を絞れます。');
    if (status) { status.textContent = ownedCopy; status.dataset.owned = entry ? 'true' : 'false'; }
    const prefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : ''; const team = card.querySelector('[data-beginner-team]'); if (team && familyId) team.href = `${prefix}/team-builder/?roster=1&from=beginner&family=${encodeURIComponent(familyId)}`;
  }
  for (const button of buttons) button.addEventListener('click', () => {
    const choice = button.dataset.beginnerChoice; let visible = 0;
    for (const item of buttons) item.classList.toggle('is-active', item === button);
    for (const card of cards) { const show = card.dataset.beginnerModes.split(' ').includes(choice); card.hidden = !show; if (show) visible += 1; }
    if (status) status.textContent = locale === 'en' ? `${visible} verified candidates shown.` : locale === 'zh-CN' ? `显示${visible}个已确认候选。` : `${visible}件の確認済み候補を表示しています。`;
  });
})();
