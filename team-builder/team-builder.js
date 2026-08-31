import { familyMatches, loadRoster } from '../my-monsaba/roster-core.js';
import { HANDOFF_KEY, MODE_LABELS, emptyTeam, sanitizeTeam, loadTeams, saveTeamList, upsertTeam, encodeTeam, decodeTeam, analyzeTeam, teamText } from './team-core.js';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let families = [];
let ratings = {};
let imageByFamily = new Map();
let roster = { entries: {} };
let team = emptyTeam();
let savedTeams = [];
let activeSlot = null;
let swapSlot = null;

function setStatus(message, error = false) { $('#team-action-status').textContent = message; $('#team-action-status').classList.toggle('is-error', error); }
function familyById(id) { return families.find((family) => family.id === id); }
function memberFor(slot) { const family = familyById(slot?.familyId); return family ? { family, evolution: family.evolutions.find((item) => item.stage === slot.stage) || family.evolutions[0] } : null; }
function stage1Image(family) { return imageByFamily.get(family.id)?.stage1; }

function renderBoard() {
  $('#team-board').innerHTML = team.slots.map((slot, index) => {
    const member = memberFor(slot);
    if (!member) return `<div class="team-slot${swapSlot === index ? ' is-swap-source' : ''}" data-slot="${index}"><button class="team-slot-open" type="button" data-open-slot aria-label="枠${index + 1}にタタを配置"><span>＋<br><small>${index + 1}</small></span></button></div>`;
    const ownedStage = roster.entries[member.family.id]?.stage || 0;
    const image = stage1Image(member.family);
    return `<div class="team-slot is-filled${swapSlot === index ? ' is-swap-source' : ''}" data-slot="${index}"><button class="team-slot-open" type="button" data-open-slot aria-label="枠${index + 1}の${esc(member.evolution.name)}を変更"><span><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(member.family.evolutions[0].name)}"><span class="team-slot-name">${esc(member.evolution.name)}</span>${ownedStage < slot.stage ? '<small>登録上は未所持</small>' : ''}</span></button><div class="team-slot-controls"><select data-stage aria-label="進化段階">${member.family.evolutions.map((item) => `<option value="${item.stage}"${item.stage === slot.stage ? ' selected' : ''}>T${item.stage}</option>`).join('')}</select><button class="team-slot-remove" type="button" data-remove aria-label="枠${index + 1}を空にする">×</button><button class="team-slot-swap" type="button" data-swap>${swapSlot === index ? '入替先を選ぶ' : '入替'}</button></div></div>`;
  }).join('');
  renderDiagnosis();
}

function renderDiagnosis() {
  const analysis = analyzeTeam(team, families, ratings);
  $('#team-role-counts').innerHTML = Object.entries(analysis.roles).map(([role, count]) => `<span>${esc(role)} <b>${count}</b></span>`).join('') || '<span>配置後に表示</span>';
  $('#team-tier-counts').innerHTML = Object.entries(analysis.tiers).map(([tier, count]) => `<span>${esc(tier)} <b>${count}</b></span>`).join('') || '<span>配置後に表示</span>';
  $('#team-notes').innerHTML = analysis.notes.map((note) => `<li>${esc(note)}</li>`).join('') || '<li>配置すると参考情報を表示します。</li>';
}

function renderPicker() {
  const query = $('#team-picker-search').value;
  const ownedOnly = $('#team-owned-only').checked;
  const rows = families.filter((family) => (!ownedOnly || (roster.entries[family.id]?.stage || 0) > 0) && familyMatches(family, query, MONSABA_FAMILY.getFamilySearchAliases(family)));
  $('#team-picker-list').innerHTML = rows.map((family) => {
    const rosterStage = roster.entries[family.id]?.stage || 0;
    const initial = family.evolutions.find((item) => item.stage === rosterStage) || family.evolutions[0];
    const image = stage1Image(family);
    return `<article class="team-pick-card"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(family.evolutions[0].name)}"><div><b>${esc(MONSABA_FAMILY.getFamilyDisplayLabel(family))}</b><small> ${esc(family.attribute)}属性</small><div class="team-pick-stages">${family.evolutions.map((item) => `<button type="button" data-pick-family="${esc(family.id)}" data-pick-stage="${item.stage}">T${item.stage} ${esc(item.name)}</button>`).join('')}</div></div></article>`;
  }).join('') || '<p>条件に一致するタタがありません。</p>';
}

function openPicker(index) {
  if (swapSlot !== null && swapSlot !== index) {
    [team.slots[swapSlot], team.slots[index]] = [team.slots[index], team.slots[swapSlot]];
    swapSlot = null; renderBoard(); $('#team-message').textContent = '配置を入れ替えました。'; return;
  }
  activeSlot = index; $('#team-picker-slot-label').textContent = `枠${index + 1}へ配置`;
  $('#team-picker-search').value = ''; renderPicker(); $('#team-picker-dialog').showModal(); $('#team-picker-search').focus();
}

function renderSaved() {
  $('#saved-team-list').innerHTML = savedTeams.map((item, index) => `<article class="saved-team"><div><b>${esc(item.name || '名前なし編成')}</b><p>${esc(MODE_LABELS[item.mode])} / ${item.slots.filter(Boolean).length}枠 / ${item.updatedAt ? new Date(item.updatedAt).toLocaleString('ja-JP') : ''}</p></div><div class="tool-actions"><button type="button" class="ghost-button" data-load-team="${index}">開く</button><button type="button" class="ghost-button" data-delete-team="${index}">削除</button></div></article>`).join('') || '<p>保存した編成はありません。</p>';
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); const ok = document.execCommand('copy'); area.remove(); return ok;
  }
}

async function exportImage() {
  const canvas = $('#team-share-canvas'); const context = canvas.getContext('2d');
  context.fillStyle = '#eef5fb'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#173b5f'; context.font = 'bold 42px sans-serif'; context.fillText('モンサバ攻略DB', 55, 65);
  context.font = '24px sans-serif'; context.fillText(`${team.name || '15枠編成メモ'} ｜ ${MODE_LABELS[team.mode]}`, 55, 105);
  const cells = team.slots.map(async (slot, index) => {
    const x = 55 + (index % 5) * 218; const y = 135 + Math.floor(index / 5) * 155;
    context.fillStyle = '#fff'; context.fillRect(x, y, 196, 135); context.strokeStyle = '#c9d5e2'; context.strokeRect(x, y, 196, 135);
    const member = memberFor(slot); if (!member) { context.fillStyle = '#8290a0'; context.font = '18px sans-serif'; context.fillText('空き', x + 78, y + 72); return; }
    const image = new Image(); image.src = stage1Image(member.family).src; try { await image.decode(); context.drawImage(image, x + 60, y + 8, 76, 76); } catch { /* テキストは描画する */ }
    context.fillStyle = '#243649'; context.font = 'bold 15px sans-serif'; context.textAlign = 'center'; context.fillText(member.evolution.name.slice(0, 12), x + 98, y + 101); context.font = '14px sans-serif'; context.fillText(`T${slot.stage}`, x + 98, y + 122); context.textAlign = 'start';
  });
  await Promise.all(cells); context.fillStyle = '#52606f'; context.font = '18px sans-serif'; context.fillText('monster-survival.com ｜ 非公式攻略サイト', 55, 635);
  const link = document.createElement('a'); link.download = `monsaba-team-${new Date().toISOString().slice(0, 10)}.png`; link.href = canvas.toDataURL('image/png'); link.click();
}

function bind() {
  $('#team-board').addEventListener('click', (event) => {
    const root = event.target.closest('[data-slot]'); if (!root) return; const index = Number(root.dataset.slot);
    if (event.target.closest('[data-open-slot]')) openPicker(index);
    if (event.target.closest('[data-remove]')) { team.slots[index] = null; if (swapSlot === index) swapSlot = null; renderBoard(); }
    if (event.target.closest('[data-swap]')) { swapSlot = swapSlot === index ? null : index; renderBoard(); $('#team-message').textContent = swapSlot === null ? '入替を解除しました。' : '入れ替える別の枠を選んでください。'; }
  });
  $('#team-board').addEventListener('change', (event) => { if (!event.target.matches('[data-stage]')) return; const index = Number(event.target.closest('[data-slot]').dataset.slot); team.slots[index].stage = Number(event.target.value); renderBoard(); });
  $('#team-picker-list').addEventListener('click', (event) => { const button = event.target.closest('[data-pick-family]'); if (!button || activeSlot === null) return; team.slots[activeSlot] = { familyId: button.dataset.pickFamily, stage: Number(button.dataset.pickStage) }; $('#team-picker-dialog').close(); renderBoard(); });
  $('#team-picker-search').addEventListener('input', renderPicker); $('#team-owned-only').addEventListener('change', renderPicker);
  $('#team-picker-close').addEventListener('click', () => $('#team-picker-dialog').close());
  $('#team-mode').addEventListener('change', () => { team.mode = $('#team-mode').value; renderDiagnosis(); });
  $('#team-name').addEventListener('input', () => { team.name = $('#team-name').value; });
  $('#team-clear').addEventListener('click', () => { if (!confirm('現在の15枠を空にしますか？')) return; const mode = team.mode; team = emptyTeam(); team.mode = mode; $('#team-name').value = ''; renderBoard(); });
  $('#team-save').addEventListener('click', () => { try { team.name = $('#team-name').value; team.mode = $('#team-mode').value; const result = upsertTeam(localStorage, savedTeams, team, families); team = result.team; savedTeams = result.teams; renderSaved(); setStatus('この端末に編成を保存しました。'); const analysis = analyzeTeam(team, families, ratings); window.MONSABA_TRACK?.event('team_builder_save', { mode: team.mode, slot_count: analysis.members.length, role_count: Object.keys(analysis.roles).length }); } catch (error) { setStatus(error.message, true); } });
  $('#saved-team-list').addEventListener('click', (event) => { const load = event.target.closest('[data-load-team]'); const remove = event.target.closest('[data-delete-team]'); if (load) { team = sanitizeTeam(savedTeams[Number(load.dataset.loadTeam)], families); $('#team-name').value = team.name; $('#team-mode').value = team.mode; renderBoard(); } if (remove) { savedTeams.splice(Number(remove.dataset.deleteTeam), 1); saveTeamList(localStorage, savedTeams, families); renderSaved(); } });
  $('#team-share').addEventListener('click', async () => { const encoded = encodeTeam(team, families); const url = `${location.origin}/team-builder/#build=${encoded}`; await copyText(url); history.replaceState(null, '', `#build=${encoded}`); const analysis = analyzeTeam(team, families, ratings); window.MONSABA_TRACK?.event('team_builder_share', { mode: team.mode, slot_count: analysis.members.length, role_count: Object.keys(analysis.roles).length }); setStatus('共有URLをコピーしました。編成名などの自由入力はURLに含めていません。'); });
  $('#team-text').addEventListener('click', async () => { await copyText(teamText(team, families)); setStatus('編成テキストをコピーしました。'); });
  $('#team-image').addEventListener('click', async () => { try { await exportImage(); const analysis = analyzeTeam(team, families, ratings); window.MONSABA_TRACK?.event('team_builder_export_image', { mode: team.mode, slot_count: analysis.members.length, role_count: Object.keys(analysis.roles).length }); setStatus('1200×675の共有画像を作成しました。'); } catch { setStatus('共有画像を作成できませんでした。', true); } });
  $('#team-board-consult').addEventListener('click', () => { try { const content = `この編成についてアドバイスが欲しいです。\n\n${teamText(team, families)}`; sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ version: 1, content, createdAt: new Date().toISOString() })); location.href = '/board/#question'; } catch { setStatus('質問掲示板へ編成を引き渡せませんでした。', true); } });
}

async function boot() {
  const [tatari, tierData, imageData] = await Promise.all(['/data/tatari.json', '/data/tier-ratings.json', '/data/tata-images.json'].map(async (url) => { const response = await fetch(url); if (!response.ok) throw new Error('データを読み込めませんでした。'); return response.json(); }));
  families = tatari.families || []; ratings = tierData.overall?.byFamily || {}; imageByFamily = new Map((imageData.families || []).map((item) => [item.familyId, item])); roster = loadRoster(localStorage, families); savedTeams = loadTeams(localStorage, families);
  const shared = location.hash.match(/^#build=([A-Za-z0-9_-]+)$/)?.[1];
  if (shared) { try { team = decodeTeam(shared, families); setStatus('共有編成を読み込みました。'); } catch (error) { setStatus(error.message, true); } }
  $('#team-name').value = team.name; $('#team-mode').value = team.mode; $('#team-owned-only').checked = new URLSearchParams(location.search).get('roster') === '1';
  bind(); renderBoard(); renderSaved(); window.MONSABA_TRACK?.event('team_builder_open');
}

boot().catch((error) => setStatus(error.message, true));
