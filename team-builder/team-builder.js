import { familyMatches, loadRoster } from '../my-monsaba/roster-core.js';
import {
  HANDOFF_KEY, MODE_LABELS, TEAM_ROWS, TEAM_COLUMNS, PLAYER_IDS, BASE_LEVEL_LIMIT, MAX_LEVEL_LIMIT,
  emptyTeam, cloneTeam, sanitizeTeam, loadTeams, loadDraft, saveDraft, saveTeamList, upsertTeam,
  placementIssue, placeMember, removeMember, moveMember, setPlayerUnlock, playerCount, playerLimit,
  levelLimit, encodeTeam, decodeTeam, teamText, stage1ImageFor
} from './team-core.js';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const { getFamilyDisplayLabel, getTataDisplayName, getJapaneseSecondaryLabel, getFamilySearchAliases } = MONSABA_FAMILY;
const locale = document.body.dataset.locale || 'ja';
const localePrefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '';
const COPY = {
  ja: {
    empty: '空き', placeholder: '画像確認中', selectFirst: 'Player・Lvと、一覧のタタ・進化段階を選んでください。', selectCell: '選択中：P{player} {name} T{stage} Lv{level}。配置するマスを押してください。',
    placed: '配置しました。', moved: '配置を移動しました。', movePrompt: '移動先を選んでください。配置済みの場合は所属を保ったまま入れ替えます。', removed: '削除しました。', cleared: '盤面をクリアしました。',
    restored: '前回の編成をv3へ移行して復元しました。', shared: 'v3共有URLをコピーしました。編成内容はAnalyticsへ送信しません。', shareFallback: 'コピーできませんでした。下のURLを選択してコピーしてください。',
    saved: 'この端末に編成を保存しました。', imageSaved: 'P1/P2・Lv・Tier付き共有画像を保存しました。', noResults: '条件に一致するタタがありません。', unnamed: '名前なし編成', open: '開く', remove: '削除',
    change: 'タタを変更', changePrompt: '一覧から変更後のタタとTierを選んでください。', move: '移動・入替', detail: '詳細を見る', row: '行', column: '列', board: '6×6 Zombie Rush編成盤', direction: 'こちらからゾンビが来ます ▼',
    clearConfirm: '配置済みのタタをすべて削除しますか？', newConfirm: '現在の未保存状態を空にして、新しい編成を始めますか？', confirmDelete: 'この保存編成を削除しますか？',
    selected: '選択中', attribute: '属性', saveLimit: '保存できる編成は最大10件です。', boardMemo: 'Zombie Rush 6×6編成', imageError: '共有画像を作成できませんでした。', handoffError: '質問掲示板へ編成を引き渡せませんでした。', textCopied: '編成テキストをコピーしました。',
    slotUnlock: '配置上限+1', levelUnlock: 'Lv上限+1', count: '配置', playerFull: 'Player {player}は{limit}体まで配置できます。配置上限+1を取得している場合は設定をONにしてください。', invalidLevel: 'Player {player}はLv{limit}まで選択できます。Lv上限+1を取得している場合は設定をONにしてください。',
    levelOffConfirm: 'Lv8のタタが配置されています。Lv上限解放を解除するとLv7へ変更されます。', slotOffBlocked: '11体配置中は配置上限+1を解除できません。先に1体削除してください。', changed: '設定を変更しました。', player: 'Player', level: 'Zombie Rush Lv'
  },
  en: {
    empty: 'Empty', placeholder: 'Image pending', selectFirst: 'Choose a player, level, Tata family, and tier.', selectCell: 'P{player} {name} T{stage} Lv{level} selected. Tap a cell.',
    placed: 'Placed.', moved: 'Moved.', movePrompt: 'Choose a destination. Occupied cells swap while retaining ownership.', removed: 'Removed.', cleared: 'Board cleared.',
    restored: 'Your previous formation was migrated to v3 and restored.', shared: 'v3 share URL copied. Formation details are not sent to Analytics.', shareFallback: 'Copy failed. Select and copy the URL below.',
    saved: 'Formation saved on this device.', imageSaved: 'Image saved with P1/P2, levels, and tiers.', noResults: 'No Tata matches these filters.', unnamed: 'Unnamed formation', open: 'Open', remove: 'Delete',
    change: 'Change Tata', changePrompt: 'Choose the replacement Tata and tier from the list.', move: 'Move / swap', detail: 'View details', row: ' row ', column: ', column ', board: '6×6 Zombie Rush formation board', direction: 'Zombies come from this direction ▼',
    clearConfirm: 'Remove every Tata from the board?', newConfirm: 'Clear the current draft and start a new formation?', confirmDelete: 'Delete this saved formation?',
    selected: 'Selected', attribute: 'attribute', saveLimit: 'You can save up to 10 formations.', boardMemo: 'Zombie Rush 6×6 formation', imageError: 'Could not create the image.', handoffError: 'Could not send this formation to the board.', textCopied: 'Formation text copied.',
    slotUnlock: 'Placement limit +1', levelUnlock: 'Level cap +1', count: 'Placed', playerFull: 'Player {player} can place up to {limit} Tata. Turn on Placement limit +1 if acquired.', invalidLevel: 'Player {player} can select up to Lv{limit}. Turn on Level cap +1 if acquired.',
    levelOffConfirm: 'Lv8 Tata are placed. Turning off the level cap unlock changes them to Lv7.', slotOffBlocked: 'Placement limit +1 cannot be turned off while 11 Tata are placed. Remove one first.', changed: 'Settings updated.', player: 'Player', level: 'Zombie Rush level'
  },
  'zh-CN': {
    empty: '空位', placeholder: '图片确认中', selectFirst: '请选择玩家、等级、塔塔系列和进化阶段。', selectCell: '已选择P{player} {name} T{stage} Lv{level}，请点击格子。',
    placed: '已放置。', moved: '已移动。', movePrompt: '请选择目标格；已有塔塔时会交换位置并保留玩家归属。', removed: '已删除。', cleared: '已清空棋盘。',
    restored: '已将上次阵容迁移至v3并恢复。', shared: '已复制v3分享链接。阵容内容不会发送至Analytics。', shareFallback: '无法复制，请选择并复制下方链接。',
    saved: '阵容已保存在此设备。', imageSaved: '已保存含P1/P2、等级和Tier的图片。', noResults: '没有符合条件的塔塔。', unnamed: '未命名阵容', open: '打开', remove: '删除',
    change: '更换塔塔', changePrompt: '请从列表选择替换后的塔塔和Tier。', move: '移动/交换', detail: '查看详情', row: '行', column: '列', board: '6×6 Zombie Rush阵容棋盘', direction: '僵尸从这个方向出现 ▼',
    clearConfirm: '删除棋盘上的全部塔塔吗？', newConfirm: '清空当前草稿并创建新阵容吗？', confirmDelete: '删除这个已保存的阵容吗？',
    selected: '当前选择', attribute: '属性', saveLimit: '最多可保存10个阵容。', boardMemo: 'Zombie Rush 6×6阵容', imageError: '无法生成阵容图片。', handoffError: '无法将阵容发送到留言板。', textCopied: '阵容文本已复制。',
    slotUnlock: '上阵上限+1', levelUnlock: '等级上限+1', count: '已放置', playerFull: 'Player {player}最多可放置{limit}只塔塔。如已获得上阵上限+1，请开启设置。', invalidLevel: 'Player {player}最多可选择Lv{limit}。如已获得等级上限+1，请开启设置。',
    levelOffConfirm: '当前有Lv8塔塔。关闭等级上限解锁后，它们会变为Lv7。', slotOffBlocked: '放置11只塔塔时不能关闭上阵上限+1，请先删除1只。', changed: '设置已更新。', player: 'Player', level: 'Zombie Rush等级'
  }
}[locale];
const ATTRIBUTE_LABELS = {
  ja: { all: 'すべて', 草: '草', 水: '水', 火: '火', 雷: '雷', 岩: '岩' },
  en: { all: 'All', 草: 'Grass', 水: 'Water', 火: 'Fire', 雷: 'Thunder', 岩: 'Rock' },
  'zh-CN': { all: '全部', 草: '草', 水: '水', 火: '火', 雷: '雷', 岩: '岩' }
}[locale];

let families = []; let imageByFamily = new Map(); let roster = { entries: {} }; let team = emptyTeam(); let savedTeams = [];
let selected = null; let currentPlayer = 1; let currentLevel = 1; let movingFrom = null; let editingIndex = null; let replacingIndex = null; let attribute = 'all';
let undoStack = []; let redoStack = []; const HISTORY_LIMIT = 50;

const message = (template, values = {}) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
const familyById = (id) => families.find((family) => family.id === id);
const stage1Image = (family) => stage1ImageFor(family, imageByFamily);
const memberFor = (slot) => { const family = familyById(slot?.familyId); return family ? { family, evolution: family.evolutions.find((item) => Number(item.stage) === Number(slot.stage)) || family.evolutions[0] } : null; };
const displayMode = (mode) => ({ ja: MODE_LABELS, en: { free: 'Free', normal: 'Normal', zombie: 'Zombie Rush', dojo: 'Badge Dojo', boss: 'Boss Rally' }, 'zh-CN': { free: '自由阵容', normal: '普通', zombie: 'Zombie Rush', dojo: '徽章道场', boss: '首领集结' } }[locale] || MODE_LABELS)[mode];
const settingId = (player, setting) => `team-p${player}-${setting === 'slotLimitPlusOne' ? 'slot' : 'level'}-unlock`;

function setStatus(text, error = false, target = '#team-action-status') { const node = $(target); if (!node) return; node.textContent = text; node.classList.toggle('is-error', error); }
function track(name) { window.MONSABA_TRACK?.event(name); }
function persistDraft() { team.name = $('#team-name').value; team.mode = $('#team-mode').value; try { saveDraft(localStorage, team, families); } catch { /* private storage */ } }
function commit(next, status = '') { undoStack.push(cloneTeam(team, families)); if (undoStack.length > HISTORY_LIMIT) undoStack.shift(); redoStack = []; team = sanitizeTeam(next, families); persistDraft(); renderAll(); if (status) setStatus(status, false, '#team-message'); }
function undo() { if (!undoStack.length) return; redoStack.push(cloneTeam(team, families)); team = undoStack.pop(); persistDraft(); renderAll(); }
function redo() { if (!redoStack.length) return; undoStack.push(cloneTeam(team, families)); team = redoStack.pop(); persistDraft(); renderAll(); }

function cellLabel(slot, index) {
  const row = Math.floor(index / TEAM_COLUMNS) + 1; const column = index % TEAM_COLUMNS + 1; const member = memberFor(slot);
  const position = locale === 'en' ? `${COPY.row}${row}${COPY.column}${column}` : `${row}${COPY.row}${column}${COPY.column}`;
  return member ? `${position} Player ${slot.playerId} ${getFamilyDisplayLabel(member.family)} T${slot.stage} Lv${slot.level}` : `${position} ${COPY.empty}`;
}

function renderBoard() {
  $('#team-board').innerHTML = team.slots.map((slot, index) => {
    const member = memberFor(slot); const selectedMove = movingFrom === index ? ' is-move-source' : '';
    if (!member) return `<button class="formation-cell is-empty${selectedMove}" type="button" data-cell="${index}" aria-label="${esc(cellLabel(slot, index))}"><span aria-hidden="true">＋</span></button>`;
    const image = stage1Image(member.family); const imageHtml = image ? `<img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(getFamilyDisplayLabel(member.family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`;
    return `<button class="formation-cell is-filled is-player-${slot.playerId}${selectedMove}" type="button" data-cell="${index}" aria-label="${esc(cellLabel(slot, index))}">${imageHtml}<span class="formation-player-badge">P${slot.playerId}</span><span class="formation-level-badge">Lv${slot.level}</span><span class="formation-stage-badge">T${slot.stage}</span></button>`;
  }).join('');
  $('#team-board').setAttribute('aria-label', COPY.board); $('#team-undo').disabled = !undoStack.length; $('#team-redo').disabled = !redoStack.length;
}

function renderPlayerSettings() {
  $('#team-player-settings').innerHTML = PLAYER_IDS.map((id) => `<section class="formation-player-card is-player-${id}"><div class="formation-player-head"><button type="button" data-current-player="${id}" aria-pressed="${currentPlayer === id}"><span class="formation-player-dot" aria-hidden="true"></span><b>Player ${id}</b></button><strong>${playerCount(team, id)} / ${playerLimit(team, id)}</strong></div><label for="${settingId(id, 'slotLimitPlusOne')}"><input id="${settingId(id, 'slotLimitPlusOne')}" type="checkbox" data-player-unlock="${id}" data-setting="slotLimitPlusOne" ${team.playerSettings[id].slotLimitPlusOne ? 'checked' : ''}> ${esc(COPY.slotUnlock)}</label><label for="${settingId(id, 'levelCapPlusOne')}"><input id="${settingId(id, 'levelCapPlusOne')}" type="checkbox" data-player-unlock="${id}" data-setting="levelCapPlusOne" ${team.playerSettings[id].levelCapPlusOne ? 'checked' : ''}> ${esc(COPY.levelUnlock)} <small>(Lv${levelLimit(team, id)})</small></label></section>`).join('');
}

function renderPlacementControls() {
  const max = levelLimit(team, currentPlayer); if (currentLevel > max) currentLevel = max;
  $('#team-placement-controls').innerHTML = `<fieldset><legend>${esc(COPY.player)}</legend><div class="formation-segmented">${PLAYER_IDS.map((id) => `<button type="button" class="is-player-${id}" data-current-player="${id}" aria-pressed="${currentPlayer === id}">P${id}</button>`).join('')}</div></fieldset><fieldset><legend>${esc(COPY.level)}</legend><div class="formation-level-options">${Array.from({ length: max }, (_, index) => index + 1).map((level) => `<button type="button" data-current-level="${level}" aria-pressed="${currentLevel === level}">Lv${level}</button>`).join('')}</div></fieldset>`;
}

function renderSelection() {
  const node = $('#team-selection');
  if (!selected) { node.innerHTML = `<p>${esc(COPY.selectFirst)}</p>`; return; }
  const family = familyById(selected.familyId); const evolution = family?.evolutions.find((item) => Number(item.stage) === selected.stage);
  if (!family || !evolution) { selected = null; renderSelection(); return; }
  const image = stage1Image(family);
  node.innerHTML = `${image ? `<img src="${esc(image.src)}" width="64" height="64" alt="${esc(getFamilyDisplayLabel(family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div><small>${esc(COPY.selected)}</small><b>P${currentPlayer} · ${esc(getFamilyDisplayLabel(family))} · T${selected.stage} · Lv${currentLevel}</b><span>${esc(getTataDisplayName(evolution))}</span></div>`;
  setStatus(message(COPY.selectCell, { player: currentPlayer, name: getFamilyDisplayLabel(family), stage: selected.stage, level: currentLevel }), false, '#team-message');
}

function renderFilters() { $('#team-attribute-filters').innerHTML = Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => `<button type="button" class="attribute-filter${attribute === key ? ' is-active' : ''}" data-attribute="${esc(key)}" aria-pressed="${attribute === key}">${esc(label)}</button>`).join(''); }
function renderPicker() {
  const query = $('#team-picker-search').value; const ownedOnly = $('#team-owned-only').checked;
  const rows = families.filter((family) => (attribute === 'all' || family.attribute === attribute) && (!ownedOnly || (roster.entries[family.id]?.stage || 0) > 0) && familyMatches(family, query, getFamilySearchAliases(family)));
  $('#team-picker-list').innerHTML = rows.map((family) => { const image = stage1Image(family); const original = getJapaneseSecondaryLabel(family.evolutions[0]); return `<article class="formation-pick-card" data-family="${esc(family.id)}">${image ? `<img loading="lazy" decoding="async" src="${esc(image.src)}" width="72" height="72" alt="${esc(getFamilyDisplayLabel(family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div class="formation-pick-info"><div><b>${esc(getFamilyDisplayLabel(family))}</b>${original ? `<small class="dynamic-original-name">${esc(original)}</small>` : ''}<small>${esc(ATTRIBUTE_LABELS[family.attribute] || family.attribute)} ${esc(COPY.attribute)}</small></div><div class="formation-stage-options">${family.evolutions.map((item) => `<button type="button" class="${selected?.familyId === family.id && selected.stage === Number(item.stage) ? 'is-selected' : ''}" data-pick-family="${esc(family.id)}" data-pick-stage="${item.stage}" aria-pressed="${selected?.familyId === family.id && selected.stage === Number(item.stage)}"><span>T${item.stage}</span>${esc(getTataDisplayName(item))}</button>`).join('')}</div><a href="${localePrefix}/tata/${encodeURIComponent(family.id)}/">${esc(COPY.detail)}</a></div></article>`; }).join('') || `<p>${esc(COPY.noResults)}</p>`;
}

function renderSaved() { $('#saved-team-list').innerHTML = savedTeams.map((item, index) => `<article class="saved-team"><div><b>${esc(item.name || COPY.unnamed)}</b><p>${esc(displayMode(item.mode))} / P1 ${playerCount(item, 1)} · P2 ${playerCount(item, 2)} / ${item.updatedAt ? new Date(item.updatedAt).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : locale) : ''}</p></div><div class="tool-actions"><button type="button" class="ghost-button" data-load-team="${index}">${esc(COPY.open)}</button><button type="button" class="ghost-button" data-delete-team="${index}">${esc(COPY.remove)}</button></div></article>`).join('') || `<p>${esc(COPY.saveLimit)}</p>`; }
function renderAll() { renderPlayerSettings(); renderPlacementControls(); renderBoard(); renderSelection(); renderPicker(); renderSaved(); }

function editControls(slot, member) {
  const maxLevel = levelLimit(team, slot.playerId);
  return `<div class="formation-edit-summary">${stage1Image(member.family) ? `<img src="${esc(stage1Image(member.family).src)}" width="80" height="80" alt="${esc(getFamilyDisplayLabel(member.family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div><b>${esc(getFamilyDisplayLabel(member.family))}</b><span>${esc(getTataDisplayName(member.evolution))}</span></div></div><fieldset><legend>${esc(COPY.player)}</legend><div class="formation-segmented">${PLAYER_IDS.map((id) => `<button type="button" class="is-player-${id}" data-edit-player="${id}" aria-pressed="${slot.playerId === id}">P${id}</button>`).join('')}</div></fieldset><fieldset><legend>Tier</legend><div class="formation-stage-options">${member.family.evolutions.map((item) => `<button type="button" class="${Number(item.stage) === slot.stage ? 'is-selected' : ''}" data-edit-stage="${item.stage}" aria-pressed="${Number(item.stage) === slot.stage}"><span>T${item.stage}</span>${esc(getTataDisplayName(item))}</button>`).join('')}</div></fieldset><fieldset><legend>${esc(COPY.level)}</legend><div class="formation-level-options">${Array.from({ length: maxLevel }, (_, index) => index + 1).map((level) => `<button type="button" data-edit-level="${level}" aria-pressed="${slot.level === level}">Lv${level}</button>`).join('')}</div></fieldset><div class="tool-actions"><button type="button" class="ghost-button" data-edit-change>${esc(COPY.change)}</button><button type="button" class="ghost-button" data-edit-move>${esc(COPY.move)}</button><button type="button" class="ghost-button danger-button" data-edit-remove>${esc(COPY.remove)}</button><a class="ghost-button" href="${localePrefix}/tata/${encodeURIComponent(member.family.id)}/">${esc(COPY.detail)}</a></div>`;
}
function openEditor(index) { const slot = team.slots[index]; const member = memberFor(slot); if (!member) return; editingIndex = index; $('#team-edit-content').innerHTML = editControls(slot, member); $('#team-edit-dialog').showModal(); }
function refreshEditor() { if (editingIndex === null || !team.slots[editingIndex]) return; $('#team-edit-content').innerHTML = editControls(team.slots[editingIndex], memberFor(team.slots[editingIndex])); }
async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); const ok = document.execCommand('copy'); area.remove(); return ok; } }
function revealShareFallback(url) { const input = $('#team-share-fallback'); input.hidden = false; input.value = url; input.focus(); input.select(); }

async function exportImage() {
  const canvas = $('#team-share-canvas'); const context = canvas.getContext('2d'); context.fillStyle = '#101522'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f8fafc'; context.font = '700 38px sans-serif'; context.textAlign = 'left'; context.fillText(team.name || COPY.boardMemo, 60, 62);
  PLAYER_IDS.forEach((id, index) => { const x = 62 + index * 570; context.fillStyle = id === 1 ? '#ef5f61' : '#4a91e8'; context.fillRect(x, 88, 20, 20); context.fillStyle = '#f8fafc'; context.font = '700 24px sans-serif'; const settings = team.playerSettings[id]; context.fillText(`P${id}  ${playerCount(team, id)}/${playerLimit(team, id)}  Lv${levelLimit(team, id)}${settings.slotLimitPlusOne ? '  Slot+1' : ''}${settings.levelCapPlusOne ? '  Lv+1' : ''}`, x + 32, 107); });
  context.fillStyle = '#ff8b88'; context.font = '700 26px sans-serif'; context.textAlign = 'center'; context.fillText(COPY.direction, canvas.width / 2, 167);
  const boardX = 90; const boardY = 205; const cell = 168; const gap = 10;
  for (let index = 0; index < team.slots.length; index += 1) {
    const x = boardX + (index % TEAM_COLUMNS) * (cell + gap); const y = boardY + Math.floor(index / TEAM_COLUMNS) * (cell + gap); const slot = team.slots[index]; const member = memberFor(slot);
    context.fillStyle = '#171a25'; context.fillRect(x, y, cell, cell); context.strokeStyle = slot ? (slot.playerId === 1 ? '#ef5f61' : '#4a91e8') : '#30364b'; context.lineWidth = slot ? 6 : 3; context.strokeRect(x, y, cell, cell); if (!member) continue;
    const source = stage1Image(member.family); if (source) { const image = new Image(); image.src = source.src; try { await image.decode(); context.drawImage(image, x + 7, y + 7, cell - 14, cell - 14); } catch { /* badges remain */ } }
    context.font = '700 22px sans-serif'; context.textAlign = 'center'; context.fillStyle = slot.playerId === 1 ? '#ef5f61' : '#4a91e8'; context.fillRect(x + 5, y + 5, 43, 34); context.fillStyle = '#fff'; context.fillText(`P${slot.playerId}`, x + 26, y + 29);
    context.fillStyle = 'rgba(0,0,0,.84)'; context.fillRect(x + 5, y + cell - 42, 64, 37); context.fillRect(x + cell - 62, y + cell - 42, 57, 37); context.fillStyle = '#fff'; context.fillText(`Lv${slot.level}`, x + 37, y + cell - 15); context.fillText(`T${slot.stage}`, x + cell - 34, y + cell - 15);
  }
  context.textAlign = 'left'; context.fillStyle = '#cbd5e1'; context.font = '22px sans-serif'; context.fillText('monster-survival.com', 60, canvas.height - 35);
  const link = document.createElement('a'); link.download = `monsaba-zombie-rush-formation-${new Date().toISOString().slice(0, 10)}.png`; link.href = canvas.toDataURL('image/png'); link.click();
}

function reportIssue(issue, playerId) {
  if (issue === 'player-full') setStatus(message(COPY.playerFull, { player: playerId, limit: playerLimit(team, playerId) }), true, '#team-message');
  else if (issue === 'invalid-level') setStatus(message(COPY.invalidLevel, { player: playerId, limit: levelLimit(team, playerId) }), true, '#team-message');
}
function placeOrMove(index) {
  if (movingFrom !== null) { const from = movingFrom; movingFrom = null; if (from !== index) commit(moveMember(team, from, index, families), COPY.moved); else renderAll(); return; }
  if (team.slots[index]) { openEditor(index); return; }
  if (!selected) { setStatus(COPY.selectFirst, false, '#team-message'); return; }
  const member = { ...selected, playerId: currentPlayer, level: currentLevel }; const issue = placementIssue(team, index, member, families); if (issue) { reportIssue(issue, currentPlayer); return; }
  commit(placeMember(team, index, member, families), COPY.placed); track('formation_place');
}

function changeUnlock(target) {
  const playerId = Number(target.dataset.playerUnlock); const setting = target.dataset.setting; const enabled = target.checked;
  let result = setPlayerUnlock(team, playerId, setting, enabled, families);
  if (!result.ok && result.reason === 'level-eight-present') {
    if (confirm(COPY.levelOffConfirm)) result = setPlayerUnlock(team, playerId, setting, false, families, { downgrade: true });
    else { target.checked = true; return; }
  }
  if (!result.ok) { target.checked = true; setStatus(COPY.slotOffBlocked, true, '#team-message'); return; }
  if (!enabled && currentPlayer === playerId && currentLevel === MAX_LEVEL_LIMIT) currentLevel = BASE_LEVEL_LIMIT;
  commit(result.team, COPY.changed);
}

function bind() {
  $('#team-board').addEventListener('click', (event) => { const cell = event.target.closest('[data-cell]'); if (cell) placeOrMove(Number(cell.dataset.cell)); });
  $('#team-player-settings').addEventListener('click', (event) => { const button = event.target.closest('[data-current-player]'); if (button) { currentPlayer = Number(button.dataset.currentPlayer); currentLevel = Math.min(currentLevel, levelLimit(team, currentPlayer)); renderAll(); } });
  $('#team-player-settings').addEventListener('change', (event) => { if (event.target.matches('[data-player-unlock]')) changeUnlock(event.target); });
  $('#team-placement-controls').addEventListener('click', (event) => { const player = event.target.closest('[data-current-player]'); const level = event.target.closest('[data-current-level]'); if (player) { currentPlayer = Number(player.dataset.currentPlayer); currentLevel = Math.min(currentLevel, levelLimit(team, currentPlayer)); renderAll(); } if (level) { currentLevel = Number(level.dataset.currentLevel); renderPlacementControls(); renderSelection(); } });
  $('#team-picker-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-pick-family]'); if (!button) return; const pick = { familyId: button.dataset.pickFamily, stage: Number(button.dataset.pickStage) };
    if (replacingIndex !== null) { const previous = team.slots[replacingIndex]; const replacement = { ...pick, playerId: previous.playerId, level: previous.level }; const issue = placementIssue(team, replacingIndex, replacement, families); if (!issue) commit(placeMember(team, replacingIndex, replacement, families), COPY.placed); replacingIndex = null; selected = pick; return; }
    selected = pick; renderSelection(); renderPicker();
  });
  $('#team-picker-search').addEventListener('input', renderPicker); $('#team-owned-only').addEventListener('change', renderPicker);
  $('#team-attribute-filters').addEventListener('click', (event) => { const button = event.target.closest('[data-attribute]'); if (!button) return; attribute = button.dataset.attribute; renderFilters(); renderPicker(); });
  $('#team-edit-close').addEventListener('click', () => $('#team-edit-dialog').close());
  $('#team-edit-content').addEventListener('click', (event) => {
    if (editingIndex === null || !team.slots[editingIndex]) return; const slot = team.slots[editingIndex]; let candidate = null;
    const stage = event.target.closest('[data-edit-stage]'); const level = event.target.closest('[data-edit-level]'); const player = event.target.closest('[data-edit-player]');
    if (stage) candidate = { ...slot, stage: Number(stage.dataset.editStage) }; if (level) candidate = { ...slot, level: Number(level.dataset.editLevel) }; if (player) candidate = { ...slot, playerId: Number(player.dataset.editPlayer) };
    if (candidate) { const issue = placementIssue(team, editingIndex, candidate, families); if (issue) { reportIssue(issue, candidate.playerId); return; } commit(placeMember(team, editingIndex, candidate, families), COPY.changed); refreshEditor(); return; }
    if (event.target.closest('[data-edit-remove]')) { commit(removeMember(team, editingIndex, families), COPY.removed); track('formation_remove'); $('#team-edit-dialog').close(); }
    if (event.target.closest('[data-edit-move]')) { movingFrom = editingIndex; $('#team-edit-dialog').close(); renderBoard(); setStatus(COPY.movePrompt, false, '#team-message'); }
    if (event.target.closest('[data-edit-change]')) { replacingIndex = editingIndex; $('#team-edit-dialog').close(); $('#team-picker-search').focus(); setStatus(COPY.changePrompt, false, '#team-message'); }
  });
  $('#team-edit-dialog').addEventListener('close', () => { editingIndex = null; });
  $('#team-undo').addEventListener('click', undo); $('#team-redo').addEventListener('click', redo);
  $('#team-clear').addEventListener('click', () => { if (team.slots.some(Boolean) && !confirm(COPY.clearConfirm)) return; const next = emptyTeam(); next.mode = team.mode; commit(next, COPY.cleared); $('#team-name').value = ''; });
  $('#team-new').addEventListener('click', () => { if ((team.slots.some(Boolean) || team.name) && !confirm(COPY.newConfirm)) return; commit(emptyTeam(), COPY.cleared); $('#team-name').value = ''; $('#team-mode').value = 'zombie'; selected = null; currentPlayer = 1; currentLevel = 1; });
  $('#team-mode').addEventListener('change', () => { team.mode = $('#team-mode').value; persistDraft(); }); $('#team-name').addEventListener('input', () => { team.name = $('#team-name').value; persistDraft(); });
  $('#team-save').addEventListener('click', () => { try { persistDraft(); const result = upsertTeam(localStorage, savedTeams, team, families); team = result.team; savedTeams = result.teams; renderSaved(); setStatus(COPY.saved); track('formation_save'); } catch (error) { setStatus(error.message, true); } });
  $('#saved-team-list').addEventListener('click', (event) => { const load = event.target.closest('[data-load-team]'); const remove = event.target.closest('[data-delete-team]'); if (load) { undoStack.push(cloneTeam(team, families)); team = sanitizeTeam(savedTeams[Number(load.dataset.loadTeam)], families); $('#team-name').value = team.name; $('#team-mode').value = team.mode; persistDraft(); renderAll(); } if (remove && confirm(COPY.confirmDelete)) { savedTeams.splice(Number(remove.dataset.deleteTeam), 1); saveTeamList(localStorage, savedTeams, families); renderSaved(); } });
  $('#team-share').addEventListener('click', async () => { const encoded = encodeTeam(team, families); const url = `${location.origin}${localePrefix}/team-builder/#build=${encoded}`; history.replaceState(null, '', `#build=${encoded}`); const copied = await copyText(url); if (!copied) revealShareFallback(url); setStatus(copied ? COPY.shared : COPY.shareFallback, !copied); track('formation_share'); });
  $('#team-text').addEventListener('click', async () => { await copyText(teamText(team, families, locale)); setStatus(COPY.textCopied); });
  $('#team-image').addEventListener('click', async () => { try { await exportImage(); setStatus(COPY.imageSaved); track('formation_export_image'); } catch { setStatus(COPY.imageError, true); } });
  $('#team-board-consult').addEventListener('click', () => { try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ version: 1, content: teamText(team, families, locale), createdAt: new Date().toISOString() })); location.href = `${localePrefix}/board/#question`; } catch { setStatus(COPY.handoffError, true); } });
}

async function boot() {
  const [tatari, imageData] = await Promise.all(['/data/tatari.json', '/data/tata-images.json'].map(async (url) => { const response = await fetch(url); if (!response.ok) throw new Error('Data load failed.'); return response.json(); }));
  families = tatari.families || []; imageByFamily = new Map((imageData.families || []).map((item) => [item.familyId, item])); roster = loadRoster(localStorage, families); savedTeams = loadTeams(localStorage, families);
  const shared = location.hash.match(/^#build=([A-Za-z0-9_-]+)$/)?.[1]; if (shared) { try { team = decodeTeam(shared, families); setStatus(COPY.shared); } catch (error) { setStatus(error.message, true); } } else { const draft = loadDraft(localStorage, families); if (draft) { team = draft; setStatus(COPY.restored, false, '#team-message'); } }
  $('#team-name').value = team.name; $('#team-mode').value = team.mode; $('#team-owned-only').checked = new URLSearchParams(location.search).get('roster') === '1'; renderFilters(); bind(); renderAll(); track('formation_open');
}

boot().catch((error) => setStatus(error.message, true));
