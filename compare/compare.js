const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const modeLabels = { overall: '総合', normal: '通常', zombie: 'ゾンビラッシュ', dojo: '道場', beginner: '初心者' };
const tierScore = { SSS: 0, SS: 1, S: 2, A: 3, '－': 9 };
const { getFamilyDisplayLabel } = MONSABA_FAMILY;
let state = {};

async function json(url) { const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error(`${url} ${response.status}`); return response.json(); }
async function boot() {
  const [tatari, skills, ratings, evolution, imageData] = await Promise.all(['/data/tatari.json', '/data/tata-skills.json', '/data/tier-ratings.json', '/data/evolution-priority.json', '/data/tata-images.json'].map(json));
  state = { families: tatari.families || [], skills: skills.byFamily || {}, ratings, evolution, imageByFamily: new Map((imageData.families || []).map((item) => [item.familyId, item])) };
  const options = state.families.map((family) => `<option value="${esc(family.id)}">${esc(getFamilyDisplayLabel(family))}（${esc(family.evolutions.map((item) => item.name).join('・'))}）</option>`).join('');
  $('#compareA').insertAdjacentHTML('beforeend', options);
  $('#compareB').insertAdjacentHTML('beforeend', options);
  const candidateLabels = new Map();
  for (const item of state.families) {
    candidateLabels.set(getFamilyDisplayLabel(item), item.id);
    for (const stage of item.evolutions) {
      for (const name of [stage.name, stage.nameEn, stage.nameZhHans].filter(Boolean)) candidateLabels.set(name, item.id);
    }
  }
  $('#compareCandidates').innerHTML = [...candidateLabels.keys()].map((label) => `<option value="${esc(label)}"></option>`).join('');
  const bindSearch = (inputSelector, selectSelector) => {
    const input = $(inputSelector), select = $(selectSelector);
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      const exact = candidateLabels.get(raw);
      const partials = raw ? state.families.filter((item) => [getFamilyDisplayLabel(item), ...item.evolutions.flatMap((stage) => [stage.name, stage.nameEn, stage.nameZhHans])].filter(Boolean).some((name) => name.includes(raw))) : [];
      if (exact || partials.length === 1) { select.value = exact || partials[0].id; startEvent(); }
    });
    select.addEventListener('change', () => { const selected = family(select.value); input.value = selected ? getFamilyDisplayLabel(selected) : ''; });
  };
  bindSearch('#compareASearch', '#compareA');
  bindSearch('#compareBSearch', '#compareB');
  const params = new URLSearchParams(location.search);
  for (const [selector, key] of [['#compareA', 'a'], ['#compareB', 'b'], ['#compareMode', 'mode']]) if (params.get(key)) $(selector).value = params.get(key);
  if ($('#compareA').value) $('#compareASearch').value = getFamilyDisplayLabel(family($('#compareA').value));
  if ($('#compareB').value) $('#compareBSearch').value = getFamilyDisplayLabel(family($('#compareB').value));
  $('#compareForm').addEventListener('submit', (event) => { event.preventDefault(); render(true); });
  $('#swapCompare').addEventListener('click', () => { const a = $('#compareA').value; $('#compareA').value = $('#compareB').value; $('#compareB').value = a; $('#compareASearch').value=$('#compareA').value?getFamilyDisplayLabel(family($('#compareA').value)):''; $('#compareBSearch').value=$('#compareB').value?getFamilyDisplayLabel(family($('#compareB').value)):''; render(true); });
  $('#compareA').addEventListener('change', startEvent);
  $('#compareB').addEventListener('change', startEvent);
  if ($('#compareA').value && $('#compareB').value) render(false);
}
function startEvent() { if ($('#compareA').value || $('#compareB').value) window.MONSABA_TRACK?.event('tata_compare_start', { source: 'compare_page' }); }
function family(id) { return state.families.find((item) => item.id === id); }
function overall(id) { return state.ratings.overall?.byFamily?.[id] || {}; }
function tier(id, mode) { const item = overall(id); return mode === 'overall' ? item.tier : mode === 'zombie' ? (state.ratings.zombieRush?.byFamily?.[id]?.tier || item.zombie) : item[mode]; }
function priority(id) {
  const roadmap = [...(state.evolution.t3Roadmap?.firstPriority || []), ...(state.evolution.t3Roadmap?.secondPriority || [])].find((item) => item.familyId === id);
  const transitions = (state.evolution.highImpactTransitions || []).filter((item) => item.familyId === id);
  if (roadmap) return `${roadmap.priority}：T3まで${roadmap.requiredStars}星。${roadmap.reason}`;
  if (transitions.length) return transitions.map((item) => `T${item.fromStage}→T${item.toStage} ${item.priority}：${item.reason}`).join(' / ');
  return '判断材料不足：進化差分は個別ページで確認できますが、優先順位は断定できません。';
}
function suitability(id, mode) {
  const rating = tier(id, mode);
  const item = overall(id);
  const comment = mode === 'zombie' ? state.ratings.zombieRush?.byFamily?.[id]?.comment : item.comment;
  return `${modeLabels[mode]} ${rating || '評価保留'}${comment ? `。${comment}` : '。用途の説明は確認中です。'}`;
}
function card(item, mode) {
  const rating = overall(item.id);
  const stages = state.skills[item.id]?.stages || [];
  const image = state.imageByFamily.get(item.id)?.stage1;
  return `<article class="compare-family-card"><div class="compare-family-head"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(item.evolutions[0].name)}"><h3><a href="/tata/${esc(item.id)}/">${esc(getFamilyDisplayLabel(item))}</a></h3></div><dl>
    <div><dt>属性</dt><dd>${esc(item.attribute)}属性</dd></div>
    <div><dt>${esc(modeLabels[mode])}Tier</dt><dd><span class="tier-badge">${esc(tier(item.id, mode) || '評価保留')}</span></dd></div>
    <div><dt>役割</dt><dd>${esc((rating.roles || []).join(' / ') || '確認中')}</dd></div>
    <div><dt>進化</dt><dd>${esc(item.evolutions.map((entry) => `T${entry.stage} ${entry.name}`).join(' → '))}</dd></div>
    <div><dt>スキル</dt><dd>${esc(stages.map((entry) => `T${entry.stage} ${entry.skillName}`).join(' / ') || '確認中')}</dd></div>
    <div><dt>適性・向いている状況</dt><dd>${esc(suitability(item.id, mode))}</dd></div>
    <div><dt>育成優先の判断材料</dt><dd>${esc(priority(item.id))}</dd></div>
  </dl><div class="guide-card-actions"><a class="ghost-button" href="/tata/${esc(item.id)}/">個別ページ</a><a href="/consult/?flow=evolution&amp;family=${esc(item.id)}">進化相談</a></div></article>`;
}
function conclusion(a, b, mode) {
  const left = tier(a.id, mode) || '－'; const right = tier(b.id, mode) || '－';
  if (left === '－' || right === '－' || left === right) return `${modeLabels[mode]}Tierだけでは優先順位を決められません。役割・属性・進化差分を確認してください。`;
  const winner = tierScore[left] < tierScore[right] ? a : b;
  return `${modeLabels[mode]}の現在評価では${getFamilyDisplayLabel(winner)}が上位です。Tierだけでなく、手持ちの不足役割と進化条件も合わせて判断してください。`;
}
function render(updateUrl) {
  const a = family($('#compareA').value); const b = family($('#compareB').value); const mode = $('#compareMode').value;
  if (!a || !b) { $('#compareMessage').textContent = '比較する2体を選んでください。'; $('#compareResult').replaceChildren(); return; }
  if (a.id === b.id) { $('#compareMessage').textContent = '異なる2体を選んでください。'; $('#compareResult').replaceChildren(); return; }
  if (updateUrl) history.replaceState(null, '', `/compare/?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(b.id)}&mode=${encodeURIComponent(mode)}`);
  $('#compareMessage').textContent = `${getFamilyDisplayLabel(a)}と${getFamilyDisplayLabel(b)}を${modeLabels[mode]}用途で比較しています。`;
  $('#compareResult').innerHTML = `<div class="compare-result-grid">${card(a, mode)}${card(b, mode)}</div><aside class="summary-box compare-conclusion"><strong>比較の結論</strong><p>${esc(conclusion(a, b, mode))}</p><button id="copyCompareUrl" type="button" class="ghost-button">比較URLをコピー</button></aside>`;
  $('#copyCompareUrl').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); $('#compareMessage').textContent = '比較URLをコピーしました。'; } catch { $('#compareMessage').textContent = 'アドレスバーのURLをコピーして共有してください。'; } });
  window.MONSABA_TRACK?.event('tata_compare_view', { mode, left_attribute: a.attribute, right_attribute: b.attribute });
}
boot().catch((error) => { console.error(error); $('#compareMessage').textContent = '比較データの読み込みに失敗しました。'; });
