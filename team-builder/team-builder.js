import { familyMatches, loadRoster } from '../my-monsaba/roster-core.js';
import {
  HANDOFF_KEY, MODE_LABELS, TEAM_ROWS, TEAM_COLUMNS, emptyTeam, cloneTeam, sanitizeTeam,
  loadTeams, loadDraft, saveDraft, saveTeamList, upsertTeam, placeMember, removeMember,
  moveMember, encodeTeam, decodeTeam, analyzeTeam, teamText, stage1ImageFor
} from './team-core.js';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const { getFamilyDisplayLabel, getTataDisplayName, getJapaneseSecondaryLabel, getFamilySearchAliases } = MONSABA_FAMILY;
const locale = document.body.dataset.locale || 'ja';
const localePrefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '';
const COPY = {
  ja: {
    empty: '空き', placeholder: '画像確認中', selectFirst: '左の一覧からタタと進化段階を選んでください。', selectCell: '選択中：{name} T{stage}。配置するマスを押してください。',
    placed: '配置しました。', moved: '配置を移動しました。', movePrompt: '移動先のマスを選んでください。配置済みの場合は入れ替えます。', removed: '削除しました。', cleared: '盤面をクリアしました。',
    restored: '前回の編成を復元しました。', shared: '共有URLをコピーしました。編成内容はAnalyticsへ送信しません。', shareFallback: 'コピーできませんでした。下のURLを選択してコピーしてください。',
    saved: 'この端末に編成を保存しました。', imageSaved: '共有画像を保存しました。', noResults: '条件に一致するタタがありません。', unnamed: '名前なし編成', open: '開く', remove: '削除',
    edit: '配置済みタタを編集', change: 'タタを変更', move: '移動', detail: '詳細を見る', close: '閉じる', row: '行', column: '列', board: '6×6編成盤', direction: 'こちらからゾンビが来ます ▼',
    clearConfirm: '配置済みのタタをすべて削除しますか？', newConfirm: '現在の未保存状態を空にして、新しい編成を始めますか？', confirmDelete: 'この保存編成を削除しますか？',
    selected: '選択中', ownedMissing: '登録上は未所持', attribute: '属性', saveLimit: '保存できる編成は最大10件です。', boardMemo: '6×6編成',
    rolesEmpty: '配置後に表示', notesEmpty: '配置すると参考情報を表示します。', imageError: '共有画像を作成できませんでした。', handoffError: '質問掲示板へ編成を引き渡せませんでした。', textCopied: '編成テキストをコピーしました。'
  },
  en: {
    empty: 'Empty', placeholder: 'Image pending', selectFirst: 'Choose a Tata family and stage from the list.', selectCell: '{name} T{stage} selected. Tap a cell to place it.',
    placed: 'Placed.', moved: 'Moved.', movePrompt: 'Choose a destination cell. Occupied cells will be swapped.', removed: 'Removed.', cleared: 'Board cleared.',
    restored: 'Your previous formation was restored.', shared: 'Share URL copied. Formation details are not sent to Analytics.', shareFallback: 'Copy failed. Select and copy the URL below.',
    saved: 'Formation saved on this device.', imageSaved: 'Formation image saved.', noResults: 'No Tata matches these filters.', unnamed: 'Unnamed formation', open: 'Open', remove: 'Delete',
    edit: 'Edit placed Tata', change: 'Change Tata', move: 'Move', detail: 'View details', close: 'Close', row: 'row', column: 'column', board: '6×6 formation board', direction: 'Zombies come from this direction ▼',
    clearConfirm: 'Remove every Tata from the board?', newConfirm: 'Clear the current draft and start a new formation?', confirmDelete: 'Delete this saved formation?',
    selected: 'Selected', ownedMissing: 'Not in My Clash of Critters', attribute: 'attribute', saveLimit: 'You can save up to 10 formations.', boardMemo: '6×6 formation',
    rolesEmpty: 'Shown after placement', notesEmpty: 'Place Tata to see reference information.', imageError: 'Could not create the image.', handoffError: 'Could not send this formation to the board.', textCopied: 'Formation text copied.'
  },
  'zh-CN': {
    empty: '空位', placeholder: '图片确认中', selectFirst: '请从列表选择塔塔系列和进化阶段。', selectCell: '已选择{name} T{stage}，请点击要放置的格子。',
    placed: '已放置。', moved: '已移动。', movePrompt: '请选择目标格；若已有塔塔则会交换位置。', removed: '已删除。', cleared: '已清空棋盘。',
    restored: '已恢复上次的阵容。', shared: '分享链接已复制。阵容内容不会发送至 Analytics。', shareFallback: '无法自动复制，请选择并复制下方链接。',
    saved: '阵容已保存在此设备。', imageSaved: '阵容图片已保存。', noResults: '没有符合条件的塔塔。', unnamed: '未命名阵容', open: '打开', remove: '删除',
    edit: '编辑已放置的塔塔', change: '更换塔塔', move: '移动', detail: '查看详情', close: '关闭', row: '行', column: '列', board: '6×6阵容棋盘', direction: '僵尸从这个方向出现 ▼',
    clearConfirm: '删除棋盘上的全部塔塔吗？', newConfirm: '清空当前草稿并创建新阵容吗？', confirmDelete: '删除这个已保存的阵容吗？',
    selected: '当前选择', ownedMissing: '未在我的塔塔中登记', attribute: '属性', saveLimit: '最多可保存10个阵容。', boardMemo: '6×6阵容',
    rolesEmpty: '放置后显示', notesEmpty: '放置塔塔后将显示参考信息。', imageError: '无法生成阵容图片。', handoffError: '无法将阵容发送到留言板。', textCopied: '阵容文本已复制。'
  }
}[locale] || null;
const ATTRIBUTE_LABELS = {
  ja: { all: 'すべて', 草: '草', 水: '水', 火: '火', 雷: '雷', 岩: '岩' },
  en: { all: 'All', 草: 'Grass', 水: 'Water', 火: 'Fire', 雷: 'Thunder', 岩: 'Rock' },
  'zh-CN': { all: '全部', 草: '草', 水: '水', 火: '火', 雷: '雷', 岩: '岩' }
}[locale];

let families = [];
let ratings = {};
let imageByFamily = new Map();
let roster = { entries: {} };
let team = emptyTeam();
let savedTeams = [];
let selected = null;
let movingFrom = null;
let editingIndex = null;
let attribute = 'all';
let undoStack = [];
let redoStack = [];
const HISTORY_LIMIT = 50;

const message = (template, values = {}) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
const familyById = (id) => families.find((family) => family.id === id);
const stage1Image = (family) => stage1ImageFor(family, imageByFamily);
const memberFor = (slot) => {
  const family = familyById(slot?.familyId);
  return family ? { family, evolution: family.evolutions.find((item) => Number(item.stage) === Number(slot.stage)) || family.evolutions[0] } : null;
};
const displayMode = (mode) => ({
  ja: MODE_LABELS,
  en: { free: 'Free', normal: 'Normal', zombie: 'Zombie Rush', dojo: 'Badge Dojo', boss: 'Boss Rally' },
  'zh-CN': { free: '自由阵容', normal: '普通', zombie: '僵尸冲刺', dojo: '徽章道场', boss: '首领集结' }
}[locale] || MODE_LABELS)[mode];

function setStatus(text, error = false, target = '#team-action-status') {
  const node = $(target); if (!node) return;
  node.textContent = text; node.classList.toggle('is-error', error);
}

function track(name) { window.MONSABA_TRACK?.event(name); }

function persistDraft() {
  team.name = $('#team-name').value;
  team.mode = $('#team-mode').value;
  try { saveDraft(localStorage, team, families); } catch { /* private mode may reject storage */ }
}

function commit(next, status = '') {
  undoStack.push(cloneTeam(team, families));
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  team = sanitizeTeam(next, families);
  persistDraft();
  renderAll();
  if (status) setStatus(status, false, '#team-message');
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(cloneTeam(team, families));
  team = undoStack.pop(); persistDraft(); renderAll();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(cloneTeam(team, families));
  team = redoStack.pop(); persistDraft(); renderAll();
}

function cellLabel(slot, index) {
  const row = Math.floor(index / TEAM_COLUMNS) + 1;
  const column = index % TEAM_COLUMNS + 1;
  const member = memberFor(slot);
  const position = locale === 'en' ? `${COPY.row} ${row}, ${COPY.column} ${column}` : `${row}${COPY.row}${column}${COPY.column}`;
  return member ? `${position} ${getFamilyDisplayLabel(member.family)} T${slot.stage}` : `${position} ${COPY.empty}`;
}

function renderBoard() {
  $('#team-board').innerHTML = team.slots.map((slot, index) => {
    const member = memberFor(slot);
    const selectedMove = movingFrom === index ? ' is-move-source' : '';
    if (!member) return `<button class="formation-cell is-empty${selectedMove}" type="button" data-cell="${index}" aria-label="${esc(cellLabel(slot, index))}"><span aria-hidden="true">＋</span></button>`;
    const image = stage1Image(member.family);
    const imageHtml = image ? `<img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(getFamilyDisplayLabel(member.family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`;
    return `<button class="formation-cell is-filled${selectedMove}" type="button" data-cell="${index}" aria-label="${esc(cellLabel(slot, index))}">${imageHtml}<span class="formation-stage-badge">T${slot.stage}</span></button>`;
  }).join('');
  $('#team-board').setAttribute('aria-label', COPY.board);
  $('#team-undo').disabled = !undoStack.length;
  $('#team-redo').disabled = !redoStack.length;
}

function renderSelection() {
  const node = $('#team-selection');
  if (!selected) { node.innerHTML = `<p>${esc(COPY.selectFirst)}</p>`; return; }
  const family = familyById(selected.familyId);
  const evolution = family?.evolutions.find((item) => Number(item.stage) === selected.stage);
  if (!family || !evolution) { selected = null; renderSelection(); return; }
  const image = stage1Image(family);
  node.innerHTML = `${image ? `<img src="${esc(image.src)}" width="64" height="64" alt="${esc(getFamilyDisplayLabel(family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div><small>${esc(COPY.selected)}</small><b>${esc(getFamilyDisplayLabel(family))} · T${selected.stage}</b><span>${esc(getTataDisplayName(evolution))}</span></div>`;
  setStatus(message(COPY.selectCell, { name: getFamilyDisplayLabel(family), stage: selected.stage }), false, '#team-message');
}

function renderFilters() {
  $('#team-attribute-filters').innerHTML = Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => `<button type="button" class="attribute-filter${attribute === key ? ' is-active' : ''}" data-attribute="${esc(key)}" aria-pressed="${attribute === key}">${esc(label)}</button>`).join('');
}

function renderPicker() {
  const query = $('#team-picker-search').value;
  const ownedOnly = $('#team-owned-only').checked;
  const rows = families.filter((family) => (attribute === 'all' || family.attribute === attribute) && (!ownedOnly || (roster.entries[family.id]?.stage || 0) > 0) && familyMatches(family, query, getFamilySearchAliases(family)));
  $('#team-picker-list').innerHTML = rows.map((family) => {
    const image = stage1Image(family);
    const original = getJapaneseSecondaryLabel(family.evolutions[0]);
    return `<article class="formation-pick-card" data-family="${esc(family.id)}">${image ? `<img loading="lazy" decoding="async" src="${esc(image.src)}" width="72" height="72" alt="${esc(getFamilyDisplayLabel(family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div class="formation-pick-info"><div><b>${esc(getFamilyDisplayLabel(family))}</b>${original ? `<small class="dynamic-original-name">${esc(original)}</small>` : ''}<small>${esc(ATTRIBUTE_LABELS[family.attribute] || family.attribute)} ${esc(COPY.attribute)}</small></div><div class="formation-stage-options">${family.evolutions.map((item) => `<button type="button" class="${selected?.familyId === family.id && selected.stage === Number(item.stage) ? 'is-selected' : ''}" data-pick-family="${esc(family.id)}" data-pick-stage="${item.stage}" aria-pressed="${selected?.familyId === family.id && selected.stage === Number(item.stage)}"><span>T${item.stage}</span>${esc(getTataDisplayName(item))}</button>`).join('')}</div><a href="${localePrefix}/tata/${encodeURIComponent(family.id)}/">${esc(COPY.detail)}</a></div></article>`;
  }).join('') || `<p>${esc(COPY.noResults)}</p>`;
}

function renderDiagnosis() {
  const analysis = analyzeTeam(team, families, ratings);
  $('#team-role-counts').innerHTML = Object.entries(analysis.roles).map(([role, count]) => `<span>${esc(role)} <b>${count}</b></span>`).join('') || `<span>${esc(COPY.rolesEmpty)}</span>`;
  $('#team-tier-counts').innerHTML = Object.entries(analysis.tiers).map(([tier, count]) => `<span>${esc(tier)} <b>${count}</b></span>`).join('') || `<span>${esc(COPY.rolesEmpty)}</span>`;
  $('#team-notes').innerHTML = analysis.notes.map((note) => `<li>${esc(note)}</li>`).join('') || `<li>${esc(COPY.notesEmpty)}</li>`;
}

function renderSaved() {
  $('#saved-team-list').innerHTML = savedTeams.map((item, index) => `<article class="saved-team"><div><b>${esc(item.name || COPY.unnamed)}</b><p>${esc(displayMode(item.mode))} / ${item.slots.filter(Boolean).length}/36 / ${item.updatedAt ? new Date(item.updatedAt).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : locale) : ''}</p></div><div class="tool-actions"><button type="button" class="ghost-button" data-load-team="${index}">${esc(COPY.open)}</button><button type="button" class="ghost-button" data-delete-team="${index}">${esc(COPY.remove)}</button></div></article>`).join('') || `<p>${esc(COPY.saveLimit)}</p>`;
}

function renderAll() { renderBoard(); renderSelection(); renderPicker(); renderDiagnosis(); renderSaved(); }

function openEditor(index) {
  const member = memberFor(team.slots[index]); if (!member) return;
  editingIndex = index;
  const image = stage1Image(member.family);
  $('#team-edit-content').innerHTML = `<div class="formation-edit-summary">${image ? `<img src="${esc(image.src)}" width="80" height="80" alt="${esc(getFamilyDisplayLabel(member.family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div><b>${esc(getFamilyDisplayLabel(member.family))}</b><span>${esc(getTataDisplayName(member.evolution))}</span></div></div><div class="formation-stage-options">${member.family.evolutions.map((item) => `<button type="button" class="${Number(item.stage) === team.slots[index].stage ? 'is-selected' : ''}" data-edit-stage="${item.stage}"><span>T${item.stage}</span>${esc(getTataDisplayName(item))}</button>`).join('')}</div><div class="tool-actions"><button type="button" class="ghost-button" data-edit-change>${esc(COPY.change)}</button><button type="button" class="ghost-button" data-edit-move>${esc(COPY.move)}</button><button type="button" class="ghost-button danger-button" data-edit-remove>${esc(COPY.remove)}</button><a class="ghost-button" href="${localePrefix}/tata/${encodeURIComponent(member.family.id)}/">${esc(COPY.detail)}</a></div>`;
  $('#team-edit-dialog').showModal();
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); const ok = document.execCommand('copy'); area.remove(); return ok;
  }
}

function revealShareFallback(url) {
  const input = $('#team-share-fallback'); input.hidden = false; input.value = url; input.focus(); input.select();
}

async function exportImage() {
  const canvas = $('#team-share-canvas'); const context = canvas.getContext('2d');
  context.fillStyle = '#101522'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f8fafc'; context.font = '700 38px sans-serif'; context.fillText(team.name || COPY.boardMemo, 60, 64);
  context.fillStyle = '#ff8b88'; context.font = '700 26px sans-serif'; context.textAlign = 'center'; context.fillText(COPY.direction, canvas.width / 2, 116);
  const boardX = 90, boardY = 150, cell = 168, gap = 10;
  for (let index = 0; index < team.slots.length; index += 1) {
    const x = boardX + (index % TEAM_COLUMNS) * (cell + gap); const y = boardY + Math.floor(index / TEAM_COLUMNS) * (cell + gap);
    context.fillStyle = '#171a25'; context.fillRect(x, y, cell, cell); context.strokeStyle = '#30364b'; context.lineWidth = 3; context.strokeRect(x, y, cell, cell);
    const slot = team.slots[index]; const member = memberFor(slot); if (!member) continue;
    const source = stage1Image(member.family);
    if (source) { const image = new Image(); image.src = source.src; try { await image.decode(); context.drawImage(image, x + 7, y + 7, cell - 14, cell - 14); } catch { /* badge still identifies the slot */ } }
    context.fillStyle = 'rgba(0,0,0,.82)'; context.fillRect(x + cell - 62, y + cell - 42, 57, 37); context.fillStyle = '#fff'; context.font = '700 24px sans-serif'; context.textAlign = 'center'; context.fillText(`T${slot.stage}`, x + cell - 34, y + cell - 15);
  }
  context.textAlign = 'left'; context.fillStyle = '#cbd5e1'; context.font = '22px sans-serif'; context.fillText('monster-survival.com', 60, canvas.height - 35);
  const link = document.createElement('a'); link.download = `monsaba-formation-${new Date().toISOString().slice(0, 10)}.png`; link.href = canvas.toDataURL('image/png'); link.click();
}

function placeOrMove(index) {
  if (movingFrom !== null) {
    const from = movingFrom; movingFrom = null;
    if (from !== index) commit(moveMember(team, from, index, families), COPY.moved);
    else renderAll();
    return;
  }
  if (team.slots[index]) { openEditor(index); return; }
  if (!selected) { setStatus(COPY.selectFirst, false, '#team-message'); return; }
  commit(placeMember(team, index, selected, families), COPY.placed); track('formation_place');
}

function bind() {
  $('#team-board').addEventListener('click', (event) => { const cell = event.target.closest('[data-cell]'); if (cell) placeOrMove(Number(cell.dataset.cell)); });
  $('#team-picker-list').addEventListener('click', (event) => { const button = event.target.closest('[data-pick-family]'); if (!button) return; selected = { familyId: button.dataset.pickFamily, stage: Number(button.dataset.pickStage) }; renderSelection(); renderPicker(); });
  $('#team-picker-search').addEventListener('input', renderPicker);
  $('#team-owned-only').addEventListener('change', renderPicker);
  $('#team-attribute-filters').addEventListener('click', (event) => { const button = event.target.closest('[data-attribute]'); if (!button) return; attribute = button.dataset.attribute; renderFilters(); renderPicker(); });
  $('#team-edit-close').addEventListener('click', () => $('#team-edit-dialog').close());
  $('#team-edit-content').addEventListener('click', (event) => {
    if (editingIndex === null) return;
    const stage = event.target.closest('[data-edit-stage]');
    if (stage) { const member = team.slots[editingIndex]; commit(placeMember(team, editingIndex, { familyId: member.familyId, stage: Number(stage.dataset.editStage) }, families), COPY.placed); $('#team-edit-dialog').close(); }
    if (event.target.closest('[data-edit-remove]')) { commit(removeMember(team, editingIndex, families), COPY.removed); track('formation_remove'); $('#team-edit-dialog').close(); }
    if (event.target.closest('[data-edit-move]')) { movingFrom = editingIndex; $('#team-edit-dialog').close(); renderBoard(); setStatus(COPY.movePrompt, false, '#team-message'); }
    if (event.target.closest('[data-edit-change]')) { selected = null; $('#team-edit-dialog').close(); renderSelection(); $('#team-picker-search').focus(); }
  });
  $('#team-undo').addEventListener('click', undo); $('#team-redo').addEventListener('click', redo);
  $('#team-clear').addEventListener('click', () => { if (team.slots.some(Boolean) && !confirm(COPY.clearConfirm)) return; const next = emptyTeam(); next.mode = team.mode; commit(next, COPY.cleared); $('#team-name').value = ''; });
  $('#team-new').addEventListener('click', () => { if ((team.slots.some(Boolean) || team.name) && !confirm(COPY.newConfirm)) return; commit(emptyTeam(), COPY.cleared); $('#team-name').value = ''; $('#team-mode').value = 'free'; selected = null; });
  $('#team-mode').addEventListener('change', () => { team.mode = $('#team-mode').value; persistDraft(); renderDiagnosis(); });
  $('#team-name').addEventListener('input', () => { team.name = $('#team-name').value; persistDraft(); });
  $('#team-save').addEventListener('click', () => { try { persistDraft(); const result = upsertTeam(localStorage, savedTeams, team, families); team = result.team; savedTeams = result.teams; renderSaved(); setStatus(COPY.saved); track('formation_save'); } catch (error) { setStatus(error.message, true); } });
  $('#saved-team-list').addEventListener('click', (event) => {
    const load = event.target.closest('[data-load-team]'); const remove = event.target.closest('[data-delete-team]');
    if (load) { undoStack.push(cloneTeam(team, families)); team = sanitizeTeam(savedTeams[Number(load.dataset.loadTeam)], families); $('#team-name').value = team.name; $('#team-mode').value = team.mode; persistDraft(); renderAll(); }
    if (remove && confirm(COPY.confirmDelete)) { savedTeams.splice(Number(remove.dataset.deleteTeam), 1); saveTeamList(localStorage, savedTeams, families); renderSaved(); }
  });
  $('#team-share').addEventListener('click', async () => { const encoded = encodeTeam(team, families); const url = `${location.origin}${localePrefix}/team-builder/#build=${encoded}`; history.replaceState(null, '', `#build=${encoded}`); const copied = await copyText(url); if (!copied) revealShareFallback(url); setStatus(copied ? COPY.shared : COPY.shareFallback, !copied); track('formation_share'); });
  $('#team-text').addEventListener('click', async () => { await copyText(teamText(team, families, locale)); setStatus(COPY.textCopied); });
  $('#team-image').addEventListener('click', async () => { try { await exportImage(); setStatus(COPY.imageSaved); track('formation_export_image'); } catch { setStatus(COPY.imageError, true); } });
  $('#team-board-consult').addEventListener('click', () => { try { const content = `${teamText(team, families, locale)}`; sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ version: 1, content, createdAt: new Date().toISOString() })); location.href = `${localePrefix}/board/#question`; } catch { setStatus(COPY.handoffError, true); } });
}

async function boot() {
  const [tatari, tierData, imageData] = await Promise.all(['/data/tatari.json', '/data/tier-ratings.json', '/data/tata-images.json'].map(async (url) => { const response = await fetch(url); if (!response.ok) throw new Error('Data load failed.'); return response.json(); }));
  families = tatari.families || []; ratings = tierData.overall?.byFamily || {}; imageByFamily = new Map((imageData.families || []).map((item) => [item.familyId, item])); roster = loadRoster(localStorage, families); savedTeams = loadTeams(localStorage, families);
  const shared = location.hash.match(/^#build=([A-Za-z0-9_-]+)$/)?.[1];
  if (shared) { try { team = decodeTeam(shared, families); setStatus(COPY.shared); } catch (error) { setStatus(error.message, true); } }
  else { const draft = loadDraft(localStorage, families); if (draft) { team = draft; setStatus(COPY.restored, false, '#team-message'); } }
  $('#team-name').value = team.name; $('#team-mode').value = team.mode; $('#team-owned-only').checked = new URLSearchParams(location.search).get('roster') === '1';
  renderFilters(); bind(); renderAll(); track('formation_open');
}

boot().catch((error) => setStatus(error.message, true));
