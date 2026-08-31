import { ROSTER_KEY, MAX_IMPORT_BYTES, familyMatches, loadRoster, saveRoster, removeRoster, exportRoster, importRosterText, rosterSummary, growthCandidates, modeCandidates } from './roster-core.js';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let families = [];
let ratings = {};
let evolution = {};
let imageByFamily = new Map();
let roster = { version: 1, entries: {}, updatedAt: null };
let attribute = '';

function storageAvailable() {
  try { const key = '__monsaba_roster_check__'; localStorage.setItem(key, '1'); localStorage.removeItem(key); return true; } catch { return false; }
}

function setStatus(selector, message, error = false) {
  const node = $(selector); if (!node) return;
  node.textContent = message; node.classList.toggle('is-error', error);
}

function persist(message = 'この端末に保存しました。') {
  try { roster = saveRoster(localStorage, roster, families); setStatus('#roster-save-state', message); }
  catch (error) { setStatus('#roster-save-state', error.message, true); }
  renderAll();
}

function renderSummary() {
  const summary = rosterSummary(roster, families, ratings);
  $('#roster-summary').innerHTML = [
    ['所持系統', `${summary.owned} / ${families.length}`], ['T3以上', String(summary.t3Plus)], ['T4', String(summary.t4)]
  ].map(([label, value]) => `<div class="roster-summary-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('#roster-attributes').innerHTML = Object.entries(summary.attributes).map(([name, count]) => `<span><b>${name}</b><br>${count}系統</span>`).join('');
}

function renderGrid() {
  const query = $('#roster-search').value;
  const ownedOnly = $('#roster-owned-only').checked;
  const rows = families.filter((family) => (!attribute || family.attribute === attribute)
    && (!ownedOnly || (roster.entries[family.id]?.stage || 0) > 0)
    && familyMatches(family, query, MONSABA_FAMILY.getFamilySearchAliases(family)));
  $('#roster-result-status').textContent = `${rows.length} / ${families.length}系統を表示`;
  $('#roster-grid').innerHTML = rows.map((family) => {
    const entry = roster.entries[family.id] || { stage: 0, favorite: false, training: false };
    const evolutionItem = family.evolutions.find((item) => item.stage === entry.stage) || family.evolutions[0];
    const image = imageByFamily.get(family.id)?.stage1;
    const stages = [{ stage: 0, label: '未所持' }, ...family.evolutions.map((item) => ({ stage: item.stage, label: `T${item.stage}` }))];
    return `<article class="roster-card" data-family-id="${esc(family.id)}"><div class="roster-card-head"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(family.evolutions[0].name)}"><div><h3><a href="/tata/${encodeURIComponent(family.id)}/">${esc(MONSABA_FAMILY.getFamilyDisplayLabel(family))}</a></h3><span class="roster-card-meta">${esc(family.attribute)}属性 / ${entry.stage ? `T${entry.stage} ${esc(evolutionItem.name)}` : '未所持'}</span></div></div><div class="stage-picker" role="group" aria-label="${esc(MONSABA_FAMILY.getFamilyDisplayLabel(family))}の所持段階">${stages.map((item) => `<button type="button" data-stage="${item.stage}" aria-pressed="${entry.stage === item.stage}">${item.label}</button>`).join('')}</div><div class="roster-card-flags"><button type="button" data-flag="favorite" aria-pressed="${entry.favorite}">${entry.favorite ? '★' : '☆'} お気に入り</button><button type="button" data-flag="training" aria-pressed="${entry.training}">${entry.training ? '●' : '○'} 育成中</button></div></article>`;
  }).join('') || '<p>条件に一致する系統がありません。</p>';
}

function renderRoles() {
  const summary = rosterSummary(roster, families, ratings);
  $('#roster-role-analysis').innerHTML = Object.entries(summary.roleStatus).map(([role, value]) => `<div class="role-coverage-item"><span><b>${esc(role)}</b><br><small>${value.count}系統</small></span><span class="coverage-status ${value.status === '十分' ? 'is-enough' : value.status === '少なめ' ? 'is-low' : 'is-empty'}">${value.status}</span></div>`).join('');
}

function renderGrowth() {
  const rows = growthCandidates(roster, families, ratings, evolution);
  $('#roster-growth-candidates').innerHTML = rows.map((item) => `<article class="candidate-card"><span class="candidate-evidence">根拠：${esc(item.evidence)}</span><h3>${esc(MONSABA_FAMILY.getFamilyDisplayLabel(item.family))}</h3><p><b>T${item.currentStage} → T${item.nextStage}</b> / 総合${esc(item.rating.tier || '未評価')}${item.requiredStars ? ` / 必要星数 ${item.requiredStars}` : ''}</p>${item.headline ? `<p>${esc(item.headline)}</p>` : ''}<p>${esc(item.reason)}</p><div class="guide-card-actions"><a href="/tata/${encodeURIComponent(item.family.id)}/">個別ページ</a><a href="/evolution-priority/">進化優先度</a></div></article>`).join('') || '<p>所持段階を登録すると、確認済みデータから候補を表示します。</p>';
}

function renderMode() {
  const mode = $('#roster-mode').value;
  const rows = modeCandidates(roster, families, ratings, mode);
  $('#roster-mode-candidates').innerHTML = rows.map((item) => `<article class="candidate-card"><h3><a href="/tata/${encodeURIComponent(item.family.id)}/">${esc(MONSABA_FAMILY.getFamilyDisplayLabel(item.family))}</a></h3><p>T${item.stage} / 評価：<b>${esc(item.rating)}</b></p><p>${esc(item.roles.join('・') || '役割データなし')}</p></article>`).join('') || '<p>所持タタを登録すると候補を表示します。</p>';
}

function renderAll() { renderSummary(); renderGrid(); renderRoles(); renderGrowth(); renderMode(); }

function bind() {
  $('#roster-search').addEventListener('input', renderGrid);
  $('#roster-owned-only').addEventListener('change', renderGrid);
  $('#roster-mode').addEventListener('change', renderMode);
  $('#roster-attribute-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-attribute]'); if (!button) return;
    attribute = button.dataset.attribute;
    document.querySelectorAll('[data-attribute]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderGrid();
  });
  $('#roster-grid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-family-id]'); if (!card) return;
    const id = card.dataset.familyId;
    const current = roster.entries[id] || { stage: 0, favorite: false, training: false };
    const stageButton = event.target.closest('[data-stage]');
    const flagButton = event.target.closest('[data-flag]');
    if (stageButton) current.stage = Number(stageButton.dataset.stage);
    else if (flagButton) current[flagButton.dataset.flag] = !current[flagButton.dataset.flag];
    else return;
    if (!current.stage && !current.favorite && !current.training) delete roster.entries[id]; else roster.entries[id] = current;
    persist();
    window.MONSABA_TRACK?.event('my_roster_update');
  });
  $('#roster-export').addEventListener('click', () => {
    const blob = new Blob([exportRoster(roster, families)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `monsaba-roster-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0); setStatus('#roster-backup-status', 'バックアップを作成しました。');
  });
  $('#roster-import').addEventListener('change', async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('バックアップファイルが大きすぎます。');
      roster = importRosterText(await file.text(), families); persist('バックアップを復元しました。'); setStatus('#roster-backup-status', 'バックアップを復元しました。');
    } catch (error) { setStatus('#roster-backup-status', error.message, true); }
    event.target.value = '';
  });
  $('#roster-clear').addEventListener('click', () => {
    if (!confirm('マイモンサバの手持ちデータだけを削除します。よろしいですか？')) return;
    try { removeRoster(localStorage); roster = { version: 1, entries: {}, updatedAt: null }; renderAll(); setStatus('#roster-backup-status', 'マイモンサバのデータを削除しました。'); }
    catch (error) { setStatus('#roster-backup-status', error.message, true); }
  });
}

async function boot() {
  const [tatari, tierData, evolutionData, imageData] = await Promise.all(['/data/tatari.json', '/data/tier-ratings.json', '/data/evolution-priority.json', '/data/tata-images.json'].map(async (url) => { const response = await fetch(url); if (!response.ok) throw new Error('データを読み込めませんでした。'); return response.json(); }));
  families = tatari.families || []; ratings = tierData.overall?.byFamily || {}; evolution = evolutionData; imageByFamily = new Map((imageData.families || []).map((item) => [item.familyId, item]));
  roster = loadRoster(localStorage, families); bind(); renderAll();
  if (!storageAvailable()) setStatus('#roster-save-state', 'このブラウザでは保存機能を利用できません。', true);
}

boot().catch((error) => setStatus('#roster-save-state', error.message, true));
