import { groupedRoles } from '../my-monsaba/roster-core.js';
import '../family-display.js';

export const TEAM_KEY = 'monsabaTeamBuilds:v1';
export const DRAFT_KEY = 'monsabaFormationDraft:v2';
export const HANDOFF_KEY = 'monsabaBoardTeamHandoff:v1';
export const TEAM_VERSION = 3;
export const TEAM_ROWS = 6;
export const TEAM_COLUMNS = 6;
export const TEAM_SLOTS = TEAM_ROWS * TEAM_COLUMNS;
export const LEGACY_TEAM_SLOTS = 15;
export const MAX_SAVED_TEAMS = 10;
export const PLAYER_IDS = Object.freeze([1, 2]);
export const BASE_PLAYER_LIMIT = 10;
export const MAX_PLAYER_LIMIT = 11;
export const BASE_LEVEL_LIMIT = 7;
export const MAX_LEVEL_LIMIT = 8;
export const TEAM_MODES = Object.freeze(['free', 'normal', 'zombie', 'dojo', 'boss']);
export const MODE_LABELS = Object.freeze({ free: '自由編成', normal: '通常', zombie: 'ゾンビラッシュ', dojo: 'バッジ道場', boss: 'ボスラリー' });
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const blankPlayerSettings = () => ({ 1: { slotLimitPlusOne: false, levelCapPlusOne: false }, 2: { slotLimitPlusOne: false, levelCapPlusOne: false } });

export function emptyTeam() {
  return { version: TEAM_VERSION, name: '', mode: 'zombie', slots: Array(TEAM_SLOTS).fill(null), playerSettings: blankPlayerSettings(), challenge: { difficulty: null, seasonId: null, highestRound: null, cleared: null, tags: [] }, createdAt: null, updatedAt: null };
}

function migratedSlots(value) {
  const source = Array.isArray(value?.slots) ? value.slots : Array.isArray(value?.cells) ? value.cells : [];
  if (source.length !== LEGACY_TEAM_SLOTS) return Array.from({ length: TEAM_SLOTS }, (_, index) => source[index] || null);
  const slots = Array(TEAM_SLOTS).fill(null);
  source.forEach((slot, index) => { slots[Math.floor(index / 5) * TEAM_COLUMNS + (index % 5)] = slot; });
  return slots;
}

function sanitizePlayerSettings(value) {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(PLAYER_IDS.map((playerId) => {
    const setting = isRecord(source[playerId]) ? source[playerId] : {};
    return [playerId, { slotLimitPlusOne: setting.slotLimitPlusOne === true, levelCapPlusOne: setting.levelCapPlusOne === true }];
  }));
}

function sanitizeChallenge(value) {
  const source = isRecord(value) ? value : {};
  const difficulty = [1, 2, 3, 4].includes(Number(source.difficulty)) ? Number(source.difficulty) : null;
  const seasonId = typeof source.seasonId === 'string' ? source.seasonId.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 48) || null : null;
  const highestRound = source.highestRound !== null && source.highestRound !== undefined && source.highestRound !== '' && Number.isInteger(Number(source.highestRound)) && Number(source.highestRound) >= 0 ? Math.min(Number(source.highestRound), 9999) : null;
  const cleared = typeof source.cleared === 'boolean' ? source.cleared : null;
  const tags = Array.isArray(source.tags) ? [...new Set(source.tags.map((tag) => String(tag).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24)).filter(Boolean))].slice(0, 8) : [];
  return { difficulty, seasonId, highestRound, cleared, tags };
}

export function playerLimit(team, playerId) { return BASE_PLAYER_LIMIT + (team?.playerSettings?.[playerId]?.slotLimitPlusOne === true ? 1 : 0); }
export function levelLimit(team, playerId) { return BASE_LEVEL_LIMIT + (team?.playerSettings?.[playerId]?.levelCapPlusOne === true ? 1 : 0); }
export function playerCount(team, playerId, excludeIndex = -1) { return (team?.slots || []).reduce((count, slot, index) => count + (index !== excludeIndex && slot?.playerId === playerId ? 1 : 0), 0); }

export function sanitizeTeam(value, families) {
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const source = migratedSlots(value);
  const playerSettings = sanitizePlayerSettings(value?.playerSettings);
  const strictCurrent = Number(value?.version) >= TEAM_VERSION;
  const counts = { 1: 0, 2: 0 };
  const usedFamilies = { 1: new Set(), 2: new Set() };
  const slots = Array.from({ length: TEAM_SLOTS }, (_, index) => {
    const raw = source[index];
    if (!isRecord(raw) || !familyMap.has(raw.familyId)) return null;
    const stages = new Set(familyMap.get(raw.familyId).evolutions.map((item) => Number(item.stage)));
    const stage = Number(raw.stage);
    if (!Number.isInteger(stage) || !stages.has(stage)) return null;
    if (strictCurrent && !PLAYER_IDS.includes(Number(raw.playerId))) return null;
    const playerId = PLAYER_IDS.includes(Number(raw.playerId)) ? Number(raw.playerId) : 1;
    const rawLevel = Number(raw.level ?? 1);
    if (strictCurrent && (!Number.isInteger(rawLevel) || rawLevel < 1 || rawLevel > levelLimit({ playerSettings }, playerId))) return null;
    const level = Number.isInteger(rawLevel) && rawLevel >= 1 ? Math.min(rawLevel, levelLimit({ playerSettings }, playerId)) : 1;
    if (usedFamilies[playerId].has(raw.familyId)) return null;
    if (strictCurrent && counts[playerId] >= playerLimit({ playerSettings }, playerId)) return null;
    usedFamilies[playerId].add(raw.familyId);
    counts[playerId] += 1;
    return { familyId: raw.familyId, stage, playerId, level };
  });
  const name = String(value?.name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  const mode = TEAM_MODES.includes(value?.mode) ? value.mode : 'zombie';
  const validDate = (item) => typeof item === 'string' && Number.isFinite(Date.parse(item)) ? item : null;
  return { version: TEAM_VERSION, name, mode, slots, playerSettings, challenge: sanitizeChallenge(value?.challenge), createdAt: validDate(value?.createdAt), updatedAt: validDate(value?.updatedAt) };
}

export function cloneTeam(team, families) { return sanitizeTeam(JSON.parse(JSON.stringify(team)), families); }
export function loadTeams(storage, families) { try { const parsed = JSON.parse(storage?.getItem(TEAM_KEY) || '[]'); return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED_TEAMS).map((item) => sanitizeTeam(item, families)) : []; } catch { return []; } }
export function loadDraft(storage, families) { try { const raw = storage?.getItem(DRAFT_KEY); return raw ? sanitizeTeam(JSON.parse(raw), families) : null; } catch { return null; } }
export function saveDraft(storage, team, families) { if (!storage?.setItem) return null; const clean = sanitizeTeam(team, families); storage.setItem(DRAFT_KEY, JSON.stringify(clean)); return clean; }
export function saveTeamList(storage, teams, families) { if (!storage?.setItem) throw new Error('このブラウザでは保存機能を利用できません。'); const clean = teams.slice(0, MAX_SAVED_TEAMS).map((item) => sanitizeTeam(item, families)); storage.setItem(TEAM_KEY, JSON.stringify(clean)); return clean; }

export function upsertTeam(storage, teams, team, families, now = new Date()) {
  const clean = sanitizeTeam(team, families); const timestamp = now.toISOString(); clean.createdAt ||= timestamp; clean.updatedAt = timestamp;
  const match = teams.findIndex((item) => item.createdAt && item.createdAt === clean.createdAt);
  const next = match >= 0 ? teams.map((item, index) => index === match ? clean : item) : [clean, ...teams];
  if (match < 0 && next.length > MAX_SAVED_TEAMS) throw new Error('保存できる編成は最大10件です。');
  saveTeamList(storage, next, families); return { team: clean, teams: next };
}

export function placementIssue(team, index, member, families) {
  if (!Number.isInteger(index) || index < 0 || index >= TEAM_SLOTS) return 'invalid-slot';
  const family = (families || []).find((item) => item.id === member?.familyId);
  if (!family) return 'invalid-family';
  if (!family.evolutions.some((item) => Number(item.stage) === Number(member.stage))) return 'invalid-stage';
  const playerId = Number(member.playerId); if (!PLAYER_IDS.includes(playerId)) return 'invalid-player';
  const level = Number(member.level); if (!Number.isInteger(level) || level < 1 || level > levelLimit(team, playerId)) return 'invalid-level';
  if ((team?.slots || []).some((slot, slotIndex) => slotIndex !== index && slot?.playerId === playerId && slot.familyId === member.familyId)) return 'duplicate-family';
  const current = team?.slots?.[index]; if (current?.playerId !== playerId && playerCount(team, playerId) >= playerLimit(team, playerId)) return 'player-full';
  return null;
}

export function placeMember(team, index, member, families) {
  const next = cloneTeam(team, families); if (placementIssue(next, index, member, families)) return next;
  next.slots[index] = { familyId: member.familyId, stage: Number(member.stage), playerId: Number(member.playerId), level: Number(member.level) }; return next;
}
export function removeMember(team, index, families) { const next = cloneTeam(team, families); if (Number.isInteger(index) && index >= 0 && index < TEAM_SLOTS) next.slots[index] = null; return next; }
export function moveMember(team, from, to, families) { const next = cloneTeam(team, families); if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < TEAM_SLOTS) || from === to) return next; [next.slots[from], next.slots[to]] = [next.slots[to], next.slots[from]]; return next; }

export function setPlayerUnlock(team, playerId, setting, enabled, families, options = {}) {
  const next = cloneTeam(team, families);
  if (!PLAYER_IDS.includes(Number(playerId)) || !['slotLimitPlusOne', 'levelCapPlusOne'].includes(setting)) return { ok: false, reason: 'invalid-setting', team: next };
  const id = Number(playerId);
  if (!enabled && setting === 'slotLimitPlusOne' && playerCount(next, id) > BASE_PLAYER_LIMIT) return { ok: false, reason: 'player-over-limit', team: next };
  const levelEight = next.slots.some((slot) => slot?.playerId === id && slot.level === MAX_LEVEL_LIMIT);
  if (!enabled && setting === 'levelCapPlusOne' && levelEight && options.downgrade !== true) return { ok: false, reason: 'level-eight-present', team: next };
  next.playerSettings[id][setting] = enabled === true;
  if (!enabled && setting === 'levelCapPlusOne' && levelEight) next.slots = next.slots.map((slot) => slot?.playerId === id && slot.level === MAX_LEVEL_LIMIT ? { ...slot, level: BASE_LEVEL_LIMIT } : slot);
  return { ok: true, reason: null, team: next };
}

const toBase64Url = (text) => { const bytes = new TextEncoder().encode(text); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, ''); };
const fromBase64Url = (value) => { const normalized = value.replaceAll('-', '+').replaceAll('_', '/'); const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4)); return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))); };

export function encodeTeam(team, families) {
  const clean = sanitizeTeam(team, families);
  const compact = { v: TEAM_VERSION, r: TEAM_ROWS, c: TEAM_COLUMNS, m: clean.mode, s: clean.slots.map((slot) => slot ? [slot.familyId, slot.stage, slot.playerId, slot.level] : null), u: PLAYER_IDS.map((id) => [clean.playerSettings[id].slotLimitPlusOne ? 1 : 0, clean.playerSettings[id].levelCapPlusOne ? 1 : 0]), x: clean.challenge };
  return toBase64Url(JSON.stringify(compact));
}

function decodeLegacySlots(values) { let occupied = 0; return values.map((slot) => { if (!Array.isArray(slot)) return null; occupied += 1; return { familyId: slot[0], stage: slot[1], playerId: occupied <= BASE_PLAYER_LIMIT ? 1 : 2, level: 1 }; }); }
function assertValidV3(parsed, families) {
  if (!Array.isArray(parsed.s) || parsed.s.length !== TEAM_SLOTS || !Array.isArray(parsed.u) || parsed.u.length !== 2) throw new Error();
  if (!parsed.u.every((settings) => Array.isArray(settings) && settings.length === 2 && settings.every((value) => value === 0 || value === 1))) throw new Error();
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const limits = { 1: BASE_PLAYER_LIMIT + parsed.u[0][0], 2: BASE_PLAYER_LIMIT + parsed.u[1][0] }; const levelCaps = { 1: BASE_LEVEL_LIMIT + parsed.u[0][1], 2: BASE_LEVEL_LIMIT + parsed.u[1][1] }; const counts = { 1: 0, 2: 0 }; const usedFamilies = { 1: new Set(), 2: new Set() };
  for (const slot of parsed.s) {
    if (slot === null) continue;
    if (!Array.isArray(slot) || slot.length !== 4 || !familyMap.has(slot[0])) throw new Error();
    const family = familyMap.get(slot[0]); const stage = Number(slot[1]); const playerId = Number(slot[2]); const level = Number(slot[3]);
    if (!family.evolutions.some((item) => Number(item.stage) === stage) || !PLAYER_IDS.includes(playerId) || !Number.isInteger(level) || level < 1 || level > levelCaps[playerId]) throw new Error();
    if (usedFamilies[playerId].has(slot[0])) throw new Error();
    usedFamilies[playerId].add(slot[0]);
    counts[playerId] += 1;
  }
  if (PLAYER_IDS.some((id) => counts[id] > limits[id])) throw new Error();
}

export function decodeTeam(value, families) {
  if (typeof value !== 'string' || !value || value.length > 8192) throw new Error('共有データを読み込めませんでした。');
  try {
    const parsed = JSON.parse(fromBase64Url(value)); if (!isRecord(parsed)) throw new Error();
    const legacyV1 = parsed.v === 1 && Array.isArray(parsed.s) && parsed.s.length === LEGACY_TEAM_SLOTS;
    const legacyV2 = parsed.v === 2 && parsed.r === TEAM_ROWS && parsed.c === TEAM_COLUMNS && Array.isArray(parsed.s) && parsed.s.length === TEAM_SLOTS;
    const current = parsed.v === TEAM_VERSION && parsed.r === TEAM_ROWS && parsed.c === TEAM_COLUMNS;
    if (!legacyV1 && !legacyV2 && !current) throw new Error();
    if (current) {
      assertValidV3(parsed, families);
      return sanitizeTeam({ version: parsed.v, mode: parsed.m, slots: parsed.s.map((slot) => slot ? { familyId: slot[0], stage: slot[1], playerId: slot[2], level: slot[3] } : null), playerSettings: { 1: { slotLimitPlusOne: !!parsed.u[0][0], levelCapPlusOne: !!parsed.u[0][1] }, 2: { slotLimitPlusOne: !!parsed.u[1][0], levelCapPlusOne: !!parsed.u[1][1] } }, challenge: parsed.x }, families);
    }
    return sanitizeTeam({ version: parsed.v, mode: parsed.m, slots: decodeLegacySlots(parsed.s) }, families);
  } catch { throw new Error('共有データを読み込めませんでした。'); }
}

export function stage1ImageFor(family, imageByFamily) { const image = imageByFamily?.get?.(family?.id)?.stage1; return image?.status === 'verified' && image.src ? image : null; }

// Kept for compatibility with existing imports. The Zombie Rush UI does not render automated ratings.
export function analyzeTeam(team, families, ratings) {
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const members = team.slots.filter(Boolean).map((slot) => ({ ...slot, family: familyMap.get(slot.familyId), rating: ratings?.[slot.familyId] || {} })).filter((item) => item.family);
  const roles = Object.create(null); for (const member of members) for (const role of groupedRoles(member.rating.roles || [])) roles[role] = (roles[role] || 0) + 1;
  const tierKey = { normal: 'normal', zombie: 'zombie', dojo: 'dojo' }[team.mode] || null; const tiers = Object.create(null);
  for (const member of members) { const tier = tierKey ? (member.rating[tierKey] || '保留') : '評価データ不足'; tiers[tier] = (tiers[tier] || 0) + 1; }
  const duplicateCount = members.length - new Set(members.map((item) => `${item.playerId}:${item.familyId}`)).size;
  return { members, roles, tiers, duplicateCount, notes: [] };
}

export function teamText(team, families, locale = globalThis.document?.body?.dataset?.locale || 'ja') {
  const familyMap = new Map((families || []).map((family) => [family.id, family])); const empty = locale === 'en' ? 'Empty' : locale === 'zh-CN' ? '空位' : '空き';
  const rows = Array.from({ length: TEAM_ROWS }, (_, row) => team.slots.slice(row * TEAM_COLUMNS, row * TEAM_COLUMNS + TEAM_COLUMNS).map((slot) => {
    if (!slot) return empty; const family = familyMap.get(slot.familyId); const evolution = family?.evolutions.find((item) => Number(item.stage) === slot.stage) || family?.evolutions[0];
    return evolution ? `P${slot.playerId} ${globalThis.MONSABA_FAMILY.getTataDisplayName(evolution)} (T${slot.stage} Lv${slot.level})` : empty;
  }).join(' / '));
  const rowLines = rows.map((value, index) => locale === 'en' ? `Row ${index + 1}: ${value}` : locale === 'zh-CN' ? `第${index + 1}行：${value}` : `${index + 1}行目：${value}`).join('\n');
  const summary = PLAYER_IDS.map((id) => `P${id} ${playerCount(team, id)}/${playerLimit(team, id)}${team.playerSettings[id].levelCapPlusOne ? ' Lv8' : ' Lv7'}`).join(' · ');
  return `${team.name ? `${team.name}\n` : ''}${summary}\n${rowLines}\n\nmonster-survival.com`;
}
