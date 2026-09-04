import { familyMatches, loadRoster } from '../my-monsaba/roster-core.js';
import {
  HANDOFF_KEY, MODE_LABELS, TEAM_ROWS, TEAM_COLUMNS, PLAYER_IDS, BASE_LEVEL_LIMIT, MAX_LEVEL_LIMIT,
  emptyTeam, cloneTeam, sanitizeTeam, loadTeams, loadDraft, saveDraft, saveTeamList, upsertTeam,
  placementIssue, placeMember, copyMemberToPlayer, togglePlayerChip, removeMember, moveMember, setPlayerUnlock, playerCount, playerLimit,
  levelLimit, encodeTeam, decodeTeam, teamText, stage1ImageFor
} from './team-core.js';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const { getFamilyDisplayLabel, getTataDisplayName, getJapaneseSecondaryLabel, getFamilySearchAliases } = MONSABA_FAMILY;
const locale = document.body.dataset.locale || 'ja';
const localePrefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '';
const COPY = {
  ja: {
    empty: '空き', placeholder: '画像確認中', selectFirst: 'Player・Lvと、一覧のタタ・進化段階を選んでください。', selectFirstBasic: 'Playerと一覧のタタ・進化段階を選んでください。', selectCell: '選択中：P{player} {name} T{stage} Lv{level}。配置するマスを押してください。',
    placed: '配置しました。', moved: '配置を移動しました。', movePrompt: '移動先を選んでください。配置済みの場合は所属を保ったまま入れ替えます。', removed: '削除しました。', cleared: '盤面をクリアしました。',
    restored: '前回の編成を復元しました。', shared: '短い共有URLをコピーしました。編成内容はAnalyticsへ送信しません。', shareFallback: 'コピーできませんでした。下のURLを選択してコピーしてください。',
    saved: 'この端末に編成を保存しました。', imageSaved: '編成の共有画像を保存しました。', noResults: '条件に一致するタタがありません。', unnamed: '名前なし編成', open: '開く', remove: '削除',
    change: 'タタを変更', changePrompt: '一覧から変更後のタタとTierを選んでください。', move: '移動・入替', detail: '詳細を見る', row: '行', column: '列', board: 'ゾンビラッシュ編成盤',
    clearConfirm: '配置済みのタタをすべて削除しますか？', newConfirm: '現在の未保存状態を空にして、新しい編成を始めますか？', confirmDelete: 'この保存編成を削除しますか？',
    selected: '選択中', attribute: '属性', saveLimit: '保存できる編成は最大10件です。', boardMemo: 'ゾンビラッシュ編成', imageError: '共有画像を作成できませんでした。', handoffError: '質問掲示板へ編成を引き渡せませんでした。', textCopied: '編成テキストをコピーしました。',
    slotUnlock: '配置上限+1', levelUnlock: 'Lv上限+1', count: '配置', playerFull: 'Player {player}は{limit}体まで配置できます。配置上限+1を取得している場合は設定をONにしてください。', invalidLevel: 'Player {player}はLv{limit}まで選択できます。Lv上限+1を取得している場合は設定をONにしてください。',
    levelOffConfirm: 'Lv8のタタが配置されています。Lv上限解放を解除するとLv7へ変更されます。', slotOffBlocked: '11体配置中は配置上限+1を解除できません。先に1体削除してください。', duplicateFamily: 'Player {player}には同じタタ系統を1体まで配置できます。', quickRemove: 'P{player} {name}を削除', changed: '設定を変更しました。', player: 'Player', level: 'ゾンビラッシュ Lv',
    copyToPlayer: 'Player {player}にもコピー', copiedToPlayer: 'Player {player}にもコピーしました。', dragToBoard: '盤面へドラッグして配置', dropOccupied: '一覧のタタは空きマスへドロップしてください。',
    chips: 'チップ', chipsForPlayer: 'Player {player}のチップ', chipCount: '{count} / 3種類', chipSearch: 'チップを検索', chipSearchPlaceholder: 'チップ名・効果', chipFull: 'Player {player}のチップは3種類まで選べます。', chipSelected: 'チップを選択しました。', chipRemoved: 'チップを外しました。', chipRemove: '{name}を外す', noChips: '一致するチップがありません。', showLevels: 'タタLvを表示'
  },
  en: {
    empty: 'Empty', placeholder: 'Image pending', selectFirst: 'Choose a player, level, Tata family, and tier.', selectFirstBasic: 'Choose a player, Tata family, and tier.', selectCell: 'P{player} {name} T{stage} Lv{level} selected. Tap a cell.',
    placed: 'Placed.', moved: 'Moved.', movePrompt: 'Choose a destination. Occupied cells swap while retaining ownership.', removed: 'Removed.', cleared: 'Board cleared.',
    restored: 'Your previous formation was restored.', shared: 'Short share URL copied. Formation details are not sent to Analytics.', shareFallback: 'Copy failed. Select and copy the URL below.',
    saved: 'Formation saved on this device.', imageSaved: 'Formation image saved.', noResults: 'No Tata matches these filters.', unnamed: 'Unnamed formation', open: 'Open', remove: 'Delete',
    change: 'Change Tata', changePrompt: 'Choose the replacement Tata and tier from the list.', move: 'Move / swap', detail: 'View details', row: ' row ', column: ', column ', board: 'Zombie Rush formation board',
    clearConfirm: 'Remove every Tata from the board?', newConfirm: 'Clear the current draft and start a new formation?', confirmDelete: 'Delete this saved formation?',
    selected: 'Selected', attribute: 'attribute', saveLimit: 'You can save up to 10 formations.', boardMemo: 'Zombie Rush formation', imageError: 'Could not create the image.', handoffError: 'Could not send this formation to the board.', textCopied: 'Formation text copied.',
    slotUnlock: 'Placement limit +1', levelUnlock: 'Level cap +1', count: 'Placed', playerFull: 'Player {player} can place up to {limit} Tata. Turn on Placement limit +1 if acquired.', invalidLevel: 'Player {player} can select up to Lv{limit}. Turn on Level cap +1 if acquired.',
    levelOffConfirm: 'Lv8 Tata are placed. Turning off the level cap unlock changes them to Lv7.', slotOffBlocked: 'Placement limit +1 cannot be turned off while 11 Tata are placed. Remove one first.', duplicateFamily: 'Player {player} can place only one Tata from the same family.', quickRemove: 'Remove P{player} {name}', changed: 'Settings updated.', player: 'Player', level: 'Zombie Rush level',
    copyToPlayer: 'Copy to Player {player}', copiedToPlayer: 'Copied to Player {player}.', dragToBoard: 'Drag onto the board to place', dropOccupied: 'Drop a Tata from the list onto an empty cell.',
    chips: 'Chips', chipsForPlayer: 'Player {player} chips', chipCount: '{count} / 3 types', chipSearch: 'Search chips', chipSearchPlaceholder: 'Chip name or effect', chipFull: 'Player {player} can select up to 3 chip types.', chipSelected: 'Chip selected.', chipRemoved: 'Chip removed.', chipRemove: 'Remove {name}', noChips: 'No chips match your search.', showLevels: 'Show Tata levels'
  },
  'zh-CN': {
    empty: '空位', placeholder: '图片确认中', selectFirst: '请选择玩家、等级、塔塔系列和进化阶段。', selectFirstBasic: '请选择玩家、塔塔系列和进化阶段。', selectCell: '已选择P{player} {name} T{stage} Lv{level}，请点击格子。',
    placed: '已放置。', moved: '已移动。', movePrompt: '请选择目标格；已有塔塔时会交换位置并保留玩家归属。', removed: '已删除。', cleared: '已清空棋盘。',
    restored: '已恢复上次阵容。', shared: '已复制短分享链接。阵容内容不会发送至Analytics。', shareFallback: '无法复制，请选择并复制下方链接。',
    saved: '阵容已保存在此设备。', imageSaved: '已保存阵容图片。', noResults: '没有符合条件的塔塔。', unnamed: '未命名阵容', open: '打开', remove: '删除',
    change: '更换塔塔', changePrompt: '请从列表选择替换后的塔塔和Tier。', move: '移动/交换', detail: '查看详情', row: '行', column: '列', board: 'Zombie Rush阵容棋盘',
    clearConfirm: '删除棋盘上的全部塔塔吗？', newConfirm: '清空当前草稿并创建新阵容吗？', confirmDelete: '删除这个已保存的阵容吗？',
    selected: '当前选择', attribute: '属性', saveLimit: '最多可保存10个阵容。', boardMemo: 'Zombie Rush阵容', imageError: '无法生成阵容图片。', handoffError: '无法将阵容发送到留言板。', textCopied: '阵容文本已复制。',
    slotUnlock: '上阵上限+1', levelUnlock: '等级上限+1', count: '已放置', playerFull: 'Player {player}最多可放置{limit}只塔塔。如已获得上阵上限+1，请开启设置。', invalidLevel: 'Player {player}最多可选择Lv{limit}。如已获得等级上限+1，请开启设置。',
    levelOffConfirm: '当前有Lv8塔塔。关闭等级上限解锁后，它们会变为Lv7。', slotOffBlocked: '放置11只塔塔时不能关闭上阵上限+1，请先删除1只。', duplicateFamily: 'Player {player}的同一塔塔系列最多只能放置1只。', quickRemove: '删除P{player} {name}', changed: '设置已更新。', player: 'Player', level: 'Zombie Rush等级',
    copyToPlayer: '复制到Player {player}', copiedToPlayer: '已复制到Player {player}。', dragToBoard: '拖到棋盘上放置', dropOccupied: '请将列表中的塔塔拖到空位。',
    chips: '芯片', chipsForPlayer: 'Player {player}的芯片', chipCount: '{count} / 3种', chipSearch: '搜索芯片', chipSearchPlaceholder: '芯片名称或效果', chipFull: 'Player {player}最多可选择3种芯片。', chipSelected: '已选择芯片。', chipRemoved: '已移除芯片。', chipRemove: '移除{name}', noChips: '没有符合条件的芯片。', showLevels: '显示塔塔等级'
  }
}[locale];
const ATTRIBUTE_LABELS = {
  ja: { all: 'すべて', 草: '草', 水: '水', 火: '火', 雷: '雷', 岩: '岩' },
  en: { all: 'All', 草: 'Grass', 水: 'Water', 火: 'Fire', 雷: 'Thunder', 岩: 'Rock' },
  'zh-CN': { all: '全部', 草: '草', 水: '水', 火: '火', 雷: '雷', 岩: '岩' }
}[locale];

let families = []; let chips = []; let chipById = new Map(); let validChipIds = new Set(); let imageByFamily = new Map(); let roster = { entries: {} }; let team = emptyTeam(); let savedTeams = [];
let selected = null; let currentPlayer = 1; let currentLevel = 1; let movingFrom = null; let editingIndex = null; let replacingIndex = null; let attribute = 'all'; let chipQuery = ''; let dragPayload = null; let pointerDrag = null; let suppressClickUntil = 0;
let undoStack = []; let redoStack = []; const HISTORY_LIMIT = 50;

const message = (template, values = {}) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
const familyById = (id) => families.find((family) => family.id === id);
const stage1Image = (family) => stage1ImageFor(family, imageByFamily);
const responsiveAttrs = (image) => image?.srcset ? ` srcset="${esc(image.srcset)}" sizes="72px"` : '';
const memberFor = (slot) => { const family = familyById(slot?.familyId); return family ? { family, evolution: family.evolutions.find((item) => Number(item.stage) === Number(slot.stage)) || family.evolutions[0] } : null; };
const displayMode = (mode) => ({ ja: MODE_LABELS, en: { free: 'Free', normal: 'Normal', zombie: 'Zombie Rush', dojo: 'Badge Dojo', boss: 'Boss Rally' }, 'zh-CN': { free: '自由阵容', normal: '普通', zombie: 'Zombie Rush', dojo: '徽章道场', boss: '首领集结' } }[locale] || MODE_LABELS)[mode];
const settingId = (player, setting) => `team-p${player}-${setting === 'slotLimitPlusOne' ? 'slot' : 'level'}-unlock`;
const levelsVisible = () => team.mode === 'zombie' && team.showLevels;
const chipName = (chip) => chip?.name?.[locale] || chip?.name?.ja || chip?.id || '';
const chipEffect = (chip) => chip?.effect?.[locale] || chip?.effect?.ja || '';

function setStatus(text, error = false, target = '#team-action-status') { const node = $(target); if (!node) return; node.textContent = text; node.classList.toggle('is-error', error); }
function track(name) { window.MONSABA_TRACK?.event(name); }
function persistDraft() { team.name = $('#team-name').value; team.mode = $('#team-mode').value; try { saveDraft(localStorage, team, families); } catch { /* private storage */ } }
function commit(next, status = '') { undoStack.push(cloneTeam(team, families)); if (undoStack.length > HISTORY_LIMIT) undoStack.shift(); redoStack = []; team = sanitizeTeam(next, families); persistDraft(); renderAll(); if (status) setStatus(status, false, '#team-message'); }
function undo() { if (!undoStack.length) return; redoStack.push(cloneTeam(team, families)); team = undoStack.pop(); persistDraft(); renderAll(); }
function redo() { if (!redoStack.length) return; undoStack.push(cloneTeam(team, families)); team = redoStack.pop(); persistDraft(); renderAll(); }

function cellLabel(slot, index) {
  const row = Math.floor(index / TEAM_COLUMNS) + 1; const column = index % TEAM_COLUMNS + 1; const member = memberFor(slot);
  const position = locale === 'en' ? `${COPY.row}${row}${COPY.column}${column}` : `${row}${COPY.row}${column}${COPY.column}`;
  const level = levelsVisible() ? ` Lv${slot?.level}` : '';
  return member ? `${position} Player ${slot.playerId} ${getFamilyDisplayLabel(member.family)} T${slot.stage}${level}` : `${position} ${COPY.empty}`;
}

function renderBoard() {
  $('#team-board').innerHTML = team.slots.map((slot, index) => {
    const member = memberFor(slot); const selectedMove = movingFrom === index ? ' is-move-source' : '';
    if (!member) return `<button class="formation-cell is-empty${selectedMove}" type="button" data-cell="${index}" data-drop-cell="${index}" aria-label="${esc(cellLabel(slot, index))}"><span aria-hidden="true">＋</span></button>`;
    const image = stage1Image(member.family); const imageHtml = image ? `<img loading="lazy" decoding="async" src="${esc(image.src)}"${responsiveAttrs(image)} width="${image.width}" height="${image.height}" alt="${esc(getFamilyDisplayLabel(member.family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`;
    const removeLabel = message(COPY.quickRemove, { player: slot.playerId, name: getFamilyDisplayLabel(member.family) });
    const levelBadge = levelsVisible() ? `<span class="formation-level-badge">Lv${slot.level}</span>` : '';
    return `<div class="formation-cell is-filled is-player-${slot.playerId}${selectedMove}" data-drop-cell="${index}"><button class="formation-cell-main" type="button" draggable="true" data-cell="${index}" data-drag-cell="${index}" aria-label="${esc(cellLabel(slot, index))}">${imageHtml}<span class="formation-player-badge">P${slot.playerId}</span>${levelBadge}<span class="formation-stage-badge">T${slot.stage}</span></button><button class="formation-quick-remove" type="button" data-quick-remove="${index}" aria-label="${esc(removeLabel)}" title="${esc(removeLabel)}"><span aria-hidden="true">−</span></button></div>`;
  }).join('');
  $('#team-board').setAttribute('aria-label', COPY.board); $('#team-undo').disabled = !undoStack.length; $('#team-redo').disabled = !redoStack.length;
}

function renderPlayerSettings() {
  $('#team-player-settings').innerHTML = PLAYER_IDS.map((id) => {
    const levelSetting = levelsVisible() ? `<label for="${settingId(id, 'levelCapPlusOne')}"><input id="${settingId(id, 'levelCapPlusOne')}" type="checkbox" data-player-unlock="${id}" data-setting="levelCapPlusOne" ${team.playerSettings[id].levelCapPlusOne ? 'checked' : ''}> ${esc(COPY.levelUnlock)} <small>(Lv${levelLimit(team, id)})</small></label>` : '';
    return `<section class="formation-player-card is-player-${id}"><div class="formation-player-head"><button type="button" data-current-player="${id}" aria-pressed="${currentPlayer === id}"><span class="formation-player-dot" aria-hidden="true"></span><b>Player ${id}</b></button><strong>${playerCount(team, id)} / ${playerLimit(team, id)}</strong></div><label for="${settingId(id, 'slotLimitPlusOne')}"><input id="${settingId(id, 'slotLimitPlusOne')}" type="checkbox" data-player-unlock="${id}" data-setting="slotLimitPlusOne" ${team.playerSettings[id].slotLimitPlusOne ? 'checked' : ''}> ${esc(COPY.slotUnlock)}</label>${levelSetting}</section>`;
  }).join('');
}

function renderPlacementControls() {
  const max = levelLimit(team, currentPlayer); if (currentLevel > max) currentLevel = max;
  const levels = levelsVisible() ? `<fieldset><legend>${esc(COPY.level)}</legend><div class="formation-level-options">${Array.from({ length: max }, (_, index) => index + 1).map((level) => `<button type="button" data-current-level="${level}" aria-pressed="${currentLevel === level}">Lv${level}</button>`).join('')}</div></fieldset>` : '';
  $('#team-placement-controls').innerHTML = `<fieldset><legend>${esc(COPY.player)}</legend><div class="formation-segmented">${PLAYER_IDS.map((id) => `<button type="button" class="is-player-${id}" data-current-player="${id}" aria-pressed="${currentPlayer === id}">P${id}</button>`).join('')}</div></fieldset>${levels}`;
}

function renderSelection() {
  const node = $('#team-selection');
  if (!selected) { node.innerHTML = `<p>${esc(levelsVisible() ? COPY.selectFirst : COPY.selectFirstBasic)}</p>`; return; }
  const family = familyById(selected.familyId); const evolution = family?.evolutions.find((item) => Number(item.stage) === selected.stage);
  if (!family || !evolution) { selected = null; renderSelection(); return; }
  const image = stage1Image(family);
  const level = levelsVisible() ? ` · Lv${currentLevel}` : '';
  node.innerHTML = `${image ? `<img src="${esc(image.src)}"${responsiveAttrs(image)} width="64" height="64" alt="${esc(getFamilyDisplayLabel(family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div><small>${esc(COPY.selected)}</small><b>P${currentPlayer} · ${esc(getFamilyDisplayLabel(family))} · T${selected.stage}${level}</b><span>${esc(getTataDisplayName(evolution))}</span></div>`;
  const selectionStatus = levelsVisible() ? message(COPY.selectCell, { player: currentPlayer, name: getFamilyDisplayLabel(family), stage: selected.stage, level: currentLevel }) : message(COPY.selectCell.replace(/ Lv\{level\}/, ''), { player: currentPlayer, name: getFamilyDisplayLabel(family), stage: selected.stage, level: currentLevel });
  setStatus(selectionStatus, false, '#team-message');
}

function renderModeControls() {
  const zombie = team.mode === 'zombie'; const wrapper = $('#team-show-levels-wrap'); const toggle = $('#team-show-levels'); const chipSection = $('#team-chip-settings');
  wrapper.hidden = !zombie; toggle.checked = team.showLevels; chipSection.hidden = !zombie;
}

function renderChipResults() {
  const node = $('#team-chip-results'); if (!node) return;
  const query = chipQuery.trim().toLocaleLowerCase(); const selectedIds = new Set(team.chips[currentPlayer]);
  const rows = chips.filter((chip) => !query || `${chipName(chip)} ${chip.name?.ja || ''} ${chipEffect(chip)}`.toLocaleLowerCase().includes(query));
  node.innerHTML = rows.map((chip) => `<button type="button" class="formation-chip-option${selectedIds.has(chip.id) ? ' is-selected' : ''}" data-chip-id="${esc(chip.id)}" aria-pressed="${selectedIds.has(chip.id)}" title="${esc(chipEffect(chip))}"><img loading="lazy" decoding="async" src="${esc(chip.icon)}" width="48" height="48" alt=""><span>${esc(chipName(chip))}</span></button>`).join('') || `<p>${esc(COPY.noChips)}</p>`;
}

function renderChipSettings() {
  const node = $('#team-chip-settings'); if (team.mode !== 'zombie') { node.hidden = true; node.innerHTML = ''; return; }
  node.hidden = false;
  const players = PLAYER_IDS.map((id) => {
    const selectedChips = team.chips[id].map((chipId) => chipById.get(chipId)).filter(Boolean);
    const items = selectedChips.map((chip) => `<button type="button" class="formation-chip-selected" data-chip-id="${esc(chip.id)}" data-chip-player="${id}" aria-label="${esc(message(COPY.chipRemove, { name: chipName(chip) }))}"><img src="${esc(chip.icon)}" width="40" height="40" alt=""><span>${esc(chipName(chip))}</span><b aria-hidden="true">−</b></button>`).join('');
    return `<section class="formation-chip-player is-player-${id}${currentPlayer === id ? ' is-current' : ''}"><div class="formation-chip-player-head"><button type="button" data-current-player="${id}" aria-pressed="${currentPlayer === id}"><b>${esc(message(COPY.chipsForPlayer, { player: id }))}</b></button><span>${esc(message(COPY.chipCount, { count: selectedChips.length }))}</span></div><div class="formation-chip-selected-list">${items}</div></section>`;
  }).join('');
  node.innerHTML = `<div class="formation-chip-heading"><h3>${esc(COPY.chips)}</h3><p>${esc(message(COPY.chipCount, { count: team.chips[currentPlayer].length }))}</p></div><div class="formation-chip-player-grid">${players}</div><label class="formation-chip-search">${esc(COPY.chipSearch)}<input id="team-chip-search" type="search" autocomplete="off" value="${esc(chipQuery)}" placeholder="${esc(COPY.chipSearchPlaceholder)}"></label><div id="team-chip-results" class="formation-chip-options"></div>`;
  renderChipResults();
}

function renderFilters() { $('#team-attribute-filters').innerHTML = Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => `<button type="button" class="attribute-filter${attribute === key ? ' is-active' : ''}" data-attribute="${esc(key)}" aria-pressed="${attribute === key}">${esc(label)}</button>`).join(''); }
function renderPicker() {
  const query = $('#team-picker-search').value; const ownedOnly = $('#team-owned-only').checked;
  const rows = families.filter((family) => (attribute === 'all' || family.attribute === attribute) && (!ownedOnly || (roster.entries[family.id]?.stage || 0) > 0) && familyMatches(family, query, getFamilySearchAliases(family)));
  $('#team-picker-list').innerHTML = rows.map((family) => { const image = stage1Image(family); const original = getJapaneseSecondaryLabel(family.evolutions[0]); const dragStage = selected?.familyId === family.id ? selected.stage : 1; return `<article class="formation-pick-card" data-family="${esc(family.id)}">${image ? `<img loading="lazy" decoding="async" src="${esc(image.src)}"${responsiveAttrs(image)} width="72" height="72" alt="${esc(getFamilyDisplayLabel(family))}" draggable="true" data-drag-family="${esc(family.id)}" data-drag-stage="${dragStage}" title="${esc(COPY.dragToBoard)}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div class="formation-pick-info"><div><b>${esc(getFamilyDisplayLabel(family))}</b>${original ? `<small class="dynamic-original-name">${esc(original)}</small>` : ''}<small>${esc(ATTRIBUTE_LABELS[family.attribute] || family.attribute)} ${esc(COPY.attribute)}</small></div><div class="formation-stage-options">${family.evolutions.map((item) => `<button type="button" draggable="true" class="${selected?.familyId === family.id && selected.stage === Number(item.stage) ? 'is-selected' : ''}" data-pick-family="${esc(family.id)}" data-pick-stage="${item.stage}" data-drag-family="${esc(family.id)}" data-drag-stage="${item.stage}" aria-pressed="${selected?.familyId === family.id && selected.stage === Number(item.stage)}" title="${esc(COPY.dragToBoard)}"><span>T${item.stage}</span>${esc(getTataDisplayName(item))}</button>`).join('')}</div><a href="${localePrefix}/tata/${encodeURIComponent(family.id)}/">${esc(COPY.detail)}</a></div></article>`; }).join('') || `<p>${esc(COPY.noResults)}</p>`;
}

function renderSaved() { $('#saved-team-list').innerHTML = savedTeams.map((item, index) => `<article class="saved-team"><div><b>${esc(item.name || COPY.unnamed)}</b><p>${esc(displayMode(item.mode))} / P1 ${playerCount(item, 1)} · P2 ${playerCount(item, 2)} / ${item.updatedAt ? new Date(item.updatedAt).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : locale) : ''}</p></div><div class="tool-actions"><button type="button" class="ghost-button" data-load-team="${index}">${esc(COPY.open)}</button><button type="button" class="ghost-button" data-delete-team="${index}">${esc(COPY.remove)}</button></div></article>`).join('') || `<p>${esc(COPY.saveLimit)}</p>`; }
function renderAll() { renderModeControls(); renderPlayerSettings(); renderPlacementControls(); renderChipSettings(); renderBoard(); renderSelection(); renderPicker(); renderSaved(); }

function editControls(slot, member) {
  const maxLevel = levelLimit(team, slot.playerId); const otherPlayer = slot.playerId === 1 ? 2 : 1;
  const levels = levelsVisible() ? `<fieldset><legend>${esc(COPY.level)}</legend><div class="formation-level-options">${Array.from({ length: maxLevel }, (_, index) => index + 1).map((level) => `<button type="button" data-edit-level="${level}" aria-pressed="${slot.level === level}">Lv${level}</button>`).join('')}</div></fieldset>` : '';
  return `<div class="formation-edit-summary">${stage1Image(member.family) ? `<img src="${esc(stage1Image(member.family).src)}" width="80" height="80" alt="${esc(getFamilyDisplayLabel(member.family))}">` : `<span class="formation-image-placeholder">${esc(COPY.placeholder)}</span>`}<div><b>${esc(getFamilyDisplayLabel(member.family))}</b><span>${esc(getTataDisplayName(member.evolution))}</span></div></div><fieldset><legend>${esc(COPY.player)}</legend><div class="formation-segmented">${PLAYER_IDS.map((id) => `<button type="button" class="is-player-${id}" data-edit-player="${id}" aria-pressed="${slot.playerId === id}">P${id}</button>`).join('')}</div></fieldset><fieldset><legend>Tier</legend><div class="formation-stage-options">${member.family.evolutions.map((item) => `<button type="button" class="${Number(item.stage) === slot.stage ? 'is-selected' : ''}" data-edit-stage="${item.stage}" aria-pressed="${Number(item.stage) === slot.stage}"><span>T${item.stage}</span>${esc(getTataDisplayName(item))}</button>`).join('')}</div></fieldset>${levels}<div class="tool-actions"><button type="button" class="ghost-button" data-copy-player="${otherPlayer}">${esc(message(COPY.copyToPlayer, { player: otherPlayer }))}</button><button type="button" class="ghost-button" data-edit-change>${esc(COPY.change)}</button><button type="button" class="ghost-button" data-edit-move>${esc(COPY.move)}</button><button type="button" class="ghost-button danger-button" data-edit-remove>${esc(COPY.remove)}</button><a class="ghost-button" href="${localePrefix}/tata/${encodeURIComponent(member.family.id)}/">${esc(COPY.detail)}</a></div>`;
}
function openEditor(index) { const slot = team.slots[index]; const member = memberFor(slot); if (!member) return; editingIndex = index; $('#team-edit-content').innerHTML = editControls(slot, member); $('#team-edit-dialog').showModal(); }
function refreshEditor() { if (editingIndex === null || !team.slots[editingIndex]) return; $('#team-edit-content').innerHTML = editControls(team.slots[editingIndex], memberFor(team.slots[editingIndex])); }
async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); const ok = document.execCommand('copy'); area.remove(); return ok; } }
function revealShareFallback(url) { const input = $('#team-share-fallback'); input.hidden = false; input.value = url; input.focus(); input.select(); }

async function exportImage() {
  const canvas = $('#team-share-canvas'); const context = canvas.getContext('2d'); context.fillStyle = '#101522'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f8fafc'; context.font = '700 38px sans-serif'; context.textAlign = 'left'; context.fillText(team.name || COPY.boardMemo, 60, 62);
  PLAYER_IDS.forEach((id, index) => { const x = 62 + index * 570; context.fillStyle = id === 1 ? '#ef5f61' : '#4a91e8'; context.fillRect(x, 88, 20, 20); context.fillStyle = '#f8fafc'; context.font = '700 24px sans-serif'; const settings = team.playerSettings[id]; context.fillText(`P${id}  ${playerCount(team, id)}/${playerLimit(team, id)}${settings.slotLimitPlusOne ? '  Slot+1' : ''}`, x + 32, 107); });
  if (team.mode === 'zombie') {
    for (const [playerIndex, id] of PLAYER_IDS.entries()) {
      const baseX = 94 + playerIndex * 570;
      for (const [chipIndex, chipId] of team.chips[id].entries()) {
        const chip = chipById.get(chipId); if (!chip?.icon) continue; const image = new Image(); image.src = chip.icon;
        try { await image.decode(); context.drawImage(image, baseX + chipIndex * 42, 119, 34, 34); } catch { /* omit unavailable chip image */ }
      }
    }
  }
  const boardX = 90; const boardY = 170; const cell = 168; const gap = 10;
  for (let index = 0; index < team.slots.length; index += 1) {
    const x = boardX + (index % TEAM_COLUMNS) * (cell + gap); const y = boardY + Math.floor(index / TEAM_COLUMNS) * (cell + gap); const slot = team.slots[index]; const member = memberFor(slot);
    context.fillStyle = '#171a25'; context.fillRect(x, y, cell, cell); context.strokeStyle = slot ? (slot.playerId === 1 ? '#ef5f61' : '#4a91e8') : '#30364b'; context.lineWidth = slot ? 6 : 3; context.strokeRect(x, y, cell, cell); if (!member) continue;
    const source = stage1Image(member.family); if (source) { const image = new Image(); image.src = source.src; try { await image.decode(); context.drawImage(image, x + 7, y + 7, cell - 14, cell - 14); } catch { /* badges remain */ } }
    context.font = '700 22px sans-serif'; context.textAlign = 'center'; context.fillStyle = slot.playerId === 1 ? '#ef5f61' : '#4a91e8'; context.fillRect(x + 5, y + 5, 43, 34); context.fillStyle = '#fff'; context.fillText(`P${slot.playerId}`, x + 26, y + 29);
    context.fillStyle = 'rgba(0,0,0,.84)'; if (levelsVisible()) context.fillRect(x + 5, y + cell - 42, 64, 37); context.fillRect(x + cell - 62, y + cell - 42, 57, 37); context.fillStyle = '#fff'; if (levelsVisible()) context.fillText(`Lv${slot.level}`, x + 37, y + cell - 15); context.fillText(`T${slot.stage}`, x + cell - 34, y + cell - 15);
  }
  context.textAlign = 'left'; context.fillStyle = '#cbd5e1'; context.font = '22px sans-serif'; context.fillText('monster-survival.com', 60, canvas.height - 35);
  const link = document.createElement('a'); link.download = `monsaba-zombie-rush-formation-${new Date().toISOString().slice(0, 10)}.png`; link.href = canvas.toDataURL('image/png'); link.click();
}

function reportIssue(issue, playerId) {
  if (issue === 'player-full') setStatus(message(COPY.playerFull, { player: playerId, limit: playerLimit(team, playerId) }), true, '#team-message');
  else if (issue === 'invalid-level') setStatus(message(COPY.invalidLevel, { player: playerId, limit: levelLimit(team, playerId) }), true, '#team-message');
  else if (issue === 'duplicate-family') setStatus(message(COPY.duplicateFamily, { player: playerId }), true, '#team-message');
  else if (issue === 'chip-full') setStatus(message(COPY.chipFull, { player: playerId }), true, '#team-message');
}
function clearDragState() { dragPayload = null; pointerDrag = null; document.querySelectorAll('.is-dragging,.is-drop-target').forEach((node) => node.classList.remove('is-dragging', 'is-drop-target')); }
function dropCell(event) { return event.target.closest('[data-drop-cell]'); }
function applyDrop(index, payload) {
  if (payload.type === 'board') {
    if (payload.index !== index) { commit(moveMember(team, payload.index, index, families), COPY.moved); track('formation_place'); }
    clearDragState(); return;
  }
  if (team.slots[index]) { setStatus(COPY.dropOccupied, true, '#team-message'); clearDragState(); return; }
  const member = { familyId: payload.familyId, stage: payload.stage, playerId: payload.playerId, level: payload.level }; const issue = placementIssue(team, index, member, families);
  if (issue) reportIssue(issue, member.playerId); else { commit(placeMember(team, index, member, families), COPY.placed); track('formation_place'); }
  clearDragState();
}
function dropFormation(event) { const cell = dropCell(event); if (!cell || !dragPayload) return; event.preventDefault(); applyDrop(Number(cell.dataset.dropCell), dragPayload); }
function beginPointerDrag(event, payload, source) { if (event.button !== 0 || pointerDrag) return; pointerDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, payload, source, active: false }; }
function bindPointerDrag() {
  document.addEventListener('pointermove', (event) => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
    if (!pointerDrag.active && Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY) < 8) return;
    if (!pointerDrag.active) { pointerDrag.active = true; dragPayload = pointerDrag.payload; pointerDrag.source.classList.add('is-dragging'); pointerDrag.source.setPointerCapture?.(event.pointerId); }
    event.preventDefault(); const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-cell]');
    document.querySelectorAll('.is-drop-target').forEach((node) => node.classList.remove('is-drop-target')); if (cell) cell.classList.add('is-drop-target');
  }, { passive: false });
  document.addEventListener('pointerup', (event) => {
    if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return; const active = pointerDrag.active; pointerDrag = null;
    if (!active) return; event.preventDefault(); suppressClickUntil = Date.now() + 400; const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop-cell]');
    if (cell && dragPayload) applyDrop(Number(cell.dataset.dropCell), dragPayload); else clearDragState();
  });
  document.addEventListener('pointercancel', () => { pointerDrag = null; clearDragState(); });
}
function placeOrMove(index) {
  if (movingFrom !== null) { const from = movingFrom; movingFrom = null; if (from !== index) commit(moveMember(team, from, index, families), COPY.moved); else renderAll(); return; }
  if (team.slots[index]) { openEditor(index); return; }
  if (!selected) { setStatus(levelsVisible() ? COPY.selectFirst : COPY.selectFirstBasic, false, '#team-message'); return; }
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
  $('#team-board').addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    const remove = event.target.closest('[data-quick-remove]');
    if (remove) { const index = Number(remove.dataset.quickRemove); commit(removeMember(team, index, families), COPY.removed); track('formation_remove'); return; }
    const cell = event.target.closest('[data-cell]'); if (cell) placeOrMove(Number(cell.dataset.cell));
  });
  $('#team-board').addEventListener('pointerdown', (event) => { const source = event.target.closest('[data-drag-cell]'); if (source) beginPointerDrag(event, { type: 'board', index: Number(source.dataset.dragCell) }, source.closest('.formation-cell')); });
  $('#team-board').addEventListener('dragstart', (event) => { const source = event.target.closest('[data-drag-cell]'); if (!source) return; pointerDrag = null; dragPayload = { type: 'board', index: Number(source.dataset.dragCell) }; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', 'monsaba-formation'); source.closest('.formation-cell')?.classList.add('is-dragging'); });
  $('#team-board').addEventListener('dragover', (event) => { const cell = dropCell(event); if (!cell || !dragPayload) return; event.preventDefault(); event.dataTransfer.dropEffect = dragPayload.type === 'board' ? 'move' : 'copy'; document.querySelectorAll('.is-drop-target').forEach((node) => node.classList.remove('is-drop-target')); cell.classList.add('is-drop-target'); });
  $('#team-board').addEventListener('dragleave', (event) => { const cell = dropCell(event); if (cell && !cell.contains(event.relatedTarget)) cell.classList.remove('is-drop-target'); });
  $('#team-board').addEventListener('drop', dropFormation); $('#team-board').addEventListener('dragend', clearDragState);
  $('#team-player-settings').addEventListener('click', (event) => { const button = event.target.closest('[data-current-player]'); if (button) { currentPlayer = Number(button.dataset.currentPlayer); currentLevel = Math.min(currentLevel, levelLimit(team, currentPlayer)); renderAll(); } });
  $('#team-player-settings').addEventListener('change', (event) => { if (event.target.matches('[data-player-unlock]')) changeUnlock(event.target); });
  $('#team-placement-controls').addEventListener('click', (event) => { const player = event.target.closest('[data-current-player]'); const level = event.target.closest('[data-current-level]'); if (player) { currentPlayer = Number(player.dataset.currentPlayer); currentLevel = Math.min(currentLevel, levelLimit(team, currentPlayer)); renderAll(); } if (level) { currentLevel = Number(level.dataset.currentLevel); renderPlacementControls(); renderSelection(); } });
  $('#team-picker-list').addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    const button = event.target.closest('[data-pick-family]'); if (!button) return; const pick = { familyId: button.dataset.pickFamily, stage: Number(button.dataset.pickStage) };
    if (replacingIndex !== null) { const previous = team.slots[replacingIndex]; const replacement = { ...pick, playerId: previous.playerId, level: previous.level }; const issue = placementIssue(team, replacingIndex, replacement, families); if (!issue) commit(placeMember(team, replacingIndex, replacement, families), COPY.placed); else reportIssue(issue, replacement.playerId); replacingIndex = null; selected = pick; return; }
    selected = pick; renderSelection(); renderPicker();
  });
  $('#team-picker-list').addEventListener('pointerdown', (event) => { const source = event.target.closest('[data-drag-family]'); if (source) beginPointerDrag(event, { type: 'picker', familyId: source.dataset.dragFamily, stage: Number(source.dataset.dragStage), playerId: currentPlayer, level: currentLevel }, source); });
  $('#team-picker-list').addEventListener('dragstart', (event) => { const source = event.target.closest('[data-drag-family]'); if (!source) return; pointerDrag = null; dragPayload = { type: 'picker', familyId: source.dataset.dragFamily, stage: Number(source.dataset.dragStage), playerId: currentPlayer, level: currentLevel }; event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('text/plain', 'monsaba-tata'); source.classList.add('is-dragging'); });
  $('#team-picker-list').addEventListener('dragend', clearDragState);
  $('#team-picker-search').addEventListener('input', renderPicker); $('#team-owned-only').addEventListener('change', renderPicker);
  $('#team-show-levels').addEventListener('change', (event) => { const next = cloneTeam(team, families); next.showLevels = event.target.checked; commit(next, COPY.changed); });
  $('#team-chip-settings').addEventListener('input', (event) => { if (!event.target.matches('#team-chip-search')) return; chipQuery = event.target.value; renderChipResults(); });
  $('#team-chip-settings').addEventListener('click', (event) => {
    const player = event.target.closest('[data-current-player]'); if (player) { currentPlayer = Number(player.dataset.currentPlayer); renderAll(); return; }
    const button = event.target.closest('[data-chip-id]'); if (!button) return; const playerId = Number(button.dataset.chipPlayer || currentPlayer); const result = togglePlayerChip(team, playerId, button.dataset.chipId, families, validChipIds);
    if (!result.ok) { reportIssue(result.reason, playerId); return; } currentPlayer = playerId; commit(result.team, result.selected ? COPY.chipSelected : COPY.chipRemoved);
  });
  $('#team-attribute-filters').addEventListener('click', (event) => { const button = event.target.closest('[data-attribute]'); if (!button) return; attribute = button.dataset.attribute; renderFilters(); renderPicker(); });
  $('#team-edit-close').addEventListener('click', () => $('#team-edit-dialog').close());
  $('#team-edit-content').addEventListener('click', (event) => {
    if (editingIndex === null || !team.slots[editingIndex]) return; const slot = team.slots[editingIndex]; let candidate = null;
    const stage = event.target.closest('[data-edit-stage]'); const level = event.target.closest('[data-edit-level]'); const player = event.target.closest('[data-edit-player]');
    if (stage) candidate = { ...slot, stage: Number(stage.dataset.editStage) }; if (level) candidate = { ...slot, level: Number(level.dataset.editLevel) }; if (player) candidate = { ...slot, playerId: Number(player.dataset.editPlayer) };
    if (candidate) { const issue = placementIssue(team, editingIndex, candidate, families); if (issue) { reportIssue(issue, candidate.playerId); return; } commit(placeMember(team, editingIndex, candidate, families), COPY.changed); refreshEditor(); return; }
    const copy = event.target.closest('[data-copy-player]');
    if (copy) { const targetPlayer = Number(copy.dataset.copyPlayer); const result = copyMemberToPlayer(team, editingIndex, targetPlayer, families); if (!result.ok) { reportIssue(result.reason, targetPlayer); return; } commit(result.team, message(COPY.copiedToPlayer, { player: targetPlayer })); track('formation_place'); $('#team-edit-dialog').close(); return; }
    if (event.target.closest('[data-edit-remove]')) { commit(removeMember(team, editingIndex, families), COPY.removed); track('formation_remove'); $('#team-edit-dialog').close(); }
    if (event.target.closest('[data-edit-move]')) { movingFrom = editingIndex; $('#team-edit-dialog').close(); renderBoard(); setStatus(COPY.movePrompt, false, '#team-message'); }
    if (event.target.closest('[data-edit-change]')) { replacingIndex = editingIndex; $('#team-edit-dialog').close(); $('#team-picker-search').focus(); setStatus(COPY.changePrompt, false, '#team-message'); }
  });
  $('#team-edit-dialog').addEventListener('close', () => { editingIndex = null; });
  $('#team-undo').addEventListener('click', undo); $('#team-redo').addEventListener('click', redo);
  $('#team-clear').addEventListener('click', () => { if (team.slots.some(Boolean) && !confirm(COPY.clearConfirm)) return; const next = emptyTeam(); next.mode = team.mode; commit(next, COPY.cleared); $('#team-name').value = ''; });
  $('#team-new').addEventListener('click', () => { if ((team.slots.some(Boolean) || team.name) && !confirm(COPY.newConfirm)) return; commit(emptyTeam(), COPY.cleared); $('#team-name').value = ''; $('#team-mode').value = 'zombie'; selected = null; currentPlayer = 1; currentLevel = 1; });
  $('#team-mode').addEventListener('change', () => { const next = cloneTeam(team, families); next.mode = $('#team-mode').value; commit(next, COPY.changed); }); $('#team-name').addEventListener('input', () => { team.name = $('#team-name').value; persistDraft(); });
  $('#team-save').addEventListener('click', () => { try { persistDraft(); const result = upsertTeam(localStorage, savedTeams, team, families); team = result.team; savedTeams = result.teams; renderSaved(); setStatus(COPY.saved); track('formation_save'); } catch (error) { setStatus(error.message, true); } });
  $('#saved-team-list').addEventListener('click', (event) => { const load = event.target.closest('[data-load-team]'); const remove = event.target.closest('[data-delete-team]'); if (load) { undoStack.push(cloneTeam(team, families)); team = sanitizeTeam(savedTeams[Number(load.dataset.loadTeam)], families); $('#team-name').value = team.name; $('#team-mode').value = team.mode; persistDraft(); renderAll(); } if (remove && confirm(COPY.confirmDelete)) { savedTeams.splice(Number(remove.dataset.deleteTeam), 1); saveTeamList(localStorage, savedTeams, families); renderSaved(); } });
  $('#team-share').addEventListener('click', async () => { const encoded = encodeTeam(team, families, chips); const url = `${location.origin}${localePrefix}/team-builder/#build=${encoded}`; history.replaceState(null, '', `#build=${encoded}`); const copied = await copyText(url); if (!copied) revealShareFallback(url); setStatus(copied ? COPY.shared : COPY.shareFallback, !copied); track('formation_share'); });
  $('#team-text').addEventListener('click', async () => { await copyText(teamText(team, families, locale, chips)); setStatus(COPY.textCopied); });
  $('#team-image').addEventListener('click', async () => { try { await exportImage(); setStatus(COPY.imageSaved); track('formation_export_image'); } catch { setStatus(COPY.imageError, true); } });
  $('#team-board-consult').addEventListener('click', () => { try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ version: 1, content: teamText(team, families, locale, chips), createdAt: new Date().toISOString() })); location.href = `${localePrefix}/board/#question`; } catch { setStatus(COPY.handoffError, true); } });
  bindPointerDrag();
}

async function boot() {
  const [tatari, imageData, chipData] = await Promise.all(['/data/tatari.json', '/data/tata-images.json', '/data/zombie-rush/chips.json'].map(async (url) => { const response = await fetch(url); if (!response.ok) throw new Error('Data load failed.'); return response.json(); }));
  families = tatari.families || []; chips = chipData.chips || []; chipById = new Map(chips.map((chip) => [chip.id, chip])); validChipIds = new Set(chipById.keys()); imageByFamily = new Map((imageData.families || []).map((item) => [item.familyId, item])); roster = loadRoster(localStorage, families); savedTeams = loadTeams(localStorage, families);
  const shared = location.hash.match(/^#build=([A-Za-z0-9_-]+)$/)?.[1]; if (shared) { try { team = decodeTeam(shared, families, chips); setStatus(COPY.shared); } catch (error) { setStatus(error.message, true); } } else { const draft = loadDraft(localStorage, families); if (draft) { team = draft; setStatus(COPY.restored, false, '#team-message'); } }
  $('#team-name').value = team.name; $('#team-mode').value = team.mode; $('#team-owned-only').checked = new URLSearchParams(location.search).get('roster') === '1'; renderFilters(); bind(); renderAll(); track('formation_open');
}

boot().catch((error) => setStatus(error.message, true));
