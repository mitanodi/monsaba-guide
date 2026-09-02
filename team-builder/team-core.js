import { groupedRoles } from '../my-monsaba/roster-core.js';
import '../family-display.js';

export const TEAM_KEY = 'monsabaTeamBuilds:v1';
export const DRAFT_KEY = 'monsabaFormationDraft:v2';
export const HANDOFF_KEY = 'monsabaBoardTeamHandoff:v1';
export const TEAM_VERSION = 2;
export const TEAM_ROWS = 6;
export const TEAM_COLUMNS = 6;
export const TEAM_SLOTS = TEAM_ROWS * TEAM_COLUMNS;
export const LEGACY_TEAM_SLOTS = 15;
export const MAX_SAVED_TEAMS = 10;
export const TEAM_MODES = Object.freeze(['free', 'normal', 'zombie', 'dojo', 'boss']);
export const MODE_LABELS = Object.freeze({ free: '自由編成', normal: '通常', zombie: 'Zombie Rush', dojo: 'バッジ道場', boss: 'ボスラリー' });
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function emptyTeam() {
  return { version: TEAM_VERSION, name: '', mode: 'free', slots: Array(TEAM_SLOTS).fill(null), createdAt: null, updatedAt: null };
}

function migratedSlots(value) {
  const source = Array.isArray(value?.slots) ? value.slots : Array.isArray(value?.cells) ? value.cells : [];
  if (source.length !== LEGACY_TEAM_SLOTS) return Array.from({ length: TEAM_SLOTS }, (_, index) => source[index] || null);
  const slots = Array(TEAM_SLOTS).fill(null);
  source.forEach((slot, index) => { slots[Math.floor(index / 5) * TEAM_COLUMNS + (index % 5)] = slot; });
  return slots;
}

export function sanitizeTeam(value, families) {
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const source = migratedSlots(value);
  const slots = Array.from({ length: TEAM_SLOTS }, (_, index) => {
    const raw = source[index];
    if (!isRecord(raw) || !familyMap.has(raw.familyId)) return null;
    const stages = new Set(familyMap.get(raw.familyId).evolutions.map((item) => Number(item.stage)));
    const stage = Number(raw.stage);
    return Number.isInteger(stage) && stages.has(stage) ? { familyId: raw.familyId, stage } : null;
  });
  const name = String(value?.name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  const mode = TEAM_MODES.includes(value?.mode) ? value.mode : 'free';
  const validDate = (item) => typeof item === 'string' && Number.isFinite(Date.parse(item)) ? item : null;
  return { version: TEAM_VERSION, name, mode, slots, createdAt: validDate(value?.createdAt), updatedAt: validDate(value?.updatedAt) };
}

export function cloneTeam(team, families) { return sanitizeTeam(JSON.parse(JSON.stringify(team)), families); }

export function loadTeams(storage, families) {
  try {
    const parsed = JSON.parse(storage?.getItem(TEAM_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED_TEAMS).map((item) => sanitizeTeam(item, families)) : [];
  } catch { return []; }
}

export function loadDraft(storage, families) {
  try {
    const raw = storage?.getItem(DRAFT_KEY);
    return raw ? sanitizeTeam(JSON.parse(raw), families) : null;
  } catch { return null; }
}

export function saveDraft(storage, team, families) {
  if (!storage?.setItem) return null;
  const clean = sanitizeTeam(team, families);
  storage.setItem(DRAFT_KEY, JSON.stringify(clean));
  return clean;
}

export function saveTeamList(storage, teams, families) {
  if (!storage?.setItem) throw new Error('このブラウザでは保存機能を利用できません。');
  const clean = teams.slice(0, MAX_SAVED_TEAMS).map((item) => sanitizeTeam(item, families));
  storage.setItem(TEAM_KEY, JSON.stringify(clean));
  return clean;
}

export function upsertTeam(storage, teams, team, families, now = new Date()) {
  const clean = sanitizeTeam(team, families);
  const timestamp = now.toISOString();
  clean.createdAt ||= timestamp;
  clean.updatedAt = timestamp;
  const match = teams.findIndex((item) => item.createdAt && item.createdAt === clean.createdAt);
  const next = match >= 0 ? teams.map((item, index) => index === match ? clean : item) : [clean, ...teams];
  if (match < 0 && next.length > MAX_SAVED_TEAMS) throw new Error('保存できる編成は最大10件です。');
  saveTeamList(storage, next, families);
  return { team: clean, teams: next };
}

export function placeMember(team, index, member, families) {
  const next = cloneTeam(team, families);
  if (!Number.isInteger(index) || index < 0 || index >= TEAM_SLOTS) return next;
  const family = (families || []).find((item) => item.id === member?.familyId);
  if (!family || !family.evolutions.some((item) => Number(item.stage) === Number(member.stage))) return next;
  next.slots[index] = { familyId: member.familyId, stage: Number(member.stage) };
  return next;
}

export function removeMember(team, index, families) {
  const next = cloneTeam(team, families);
  if (Number.isInteger(index) && index >= 0 && index < TEAM_SLOTS) next.slots[index] = null;
  return next;
}

export function moveMember(team, from, to, families) {
  const next = cloneTeam(team, families);
  if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < TEAM_SLOTS) || from === to) return next;
  [next.slots[from], next.slots[to]] = [next.slots[to], next.slots[from]];
  return next;
}

const toBase64Url = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
};
const fromBase64Url = (value) => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

export function encodeTeam(team, families) {
  const clean = sanitizeTeam(team, families);
  const compact = { v: TEAM_VERSION, r: TEAM_ROWS, c: TEAM_COLUMNS, m: clean.mode, s: clean.slots.map((slot) => slot ? [slot.familyId, slot.stage] : null) };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeTeam(value, families) {
  if (typeof value !== 'string' || !value || value.length > 8192) throw new Error('共有データを読み込めませんでした。');
  try {
    const parsed = JSON.parse(fromBase64Url(value));
    const legacy = parsed?.v === 1 && Array.isArray(parsed.s) && parsed.s.length === LEGACY_TEAM_SLOTS;
    const current = parsed?.v === TEAM_VERSION && parsed.r === TEAM_ROWS && parsed.c === TEAM_COLUMNS && Array.isArray(parsed.s) && parsed.s.length === TEAM_SLOTS;
    if (!isRecord(parsed) || (!legacy && !current)) throw new Error();
    return sanitizeTeam({ version: parsed.v, mode: parsed.m, slots: parsed.s.map((slot) => Array.isArray(slot) ? { familyId: slot[0], stage: slot[1] } : null) }, families);
  } catch { throw new Error('共有データを読み込めませんでした。'); }
}

export function stage1ImageFor(family, imageByFamily) {
  const image = imageByFamily?.get?.(family?.id)?.stage1;
  return image?.status === 'verified' && image.src ? image : null;
}

export function analyzeTeam(team, families, ratings) {
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const members = team.slots.filter(Boolean).map((slot) => ({ ...slot, family: familyMap.get(slot.familyId), rating: ratings?.[slot.familyId] || {} })).filter((item) => item.family);
  const roles = Object.create(null);
  for (const member of members) for (const role of groupedRoles(member.rating.roles || [])) roles[role] = (roles[role] || 0) + 1;
  const tierKey = { normal: 'normal', zombie: 'zombie', dojo: 'dojo' }[team.mode] || null;
  const tiers = Object.create(null);
  for (const member of members) {
    const tier = tierKey ? (member.rating[tierKey] || '保留') : '評価データ不足';
    tiers[tier] = (tiers[tier] || 0) + 1;
  }
  const duplicateCount = members.length - new Set(members.map((item) => item.familyId)).size;
  const notes = [];
  if (!roles['回復']) notes.push('回復役が確認できません。');
  if (!roles['タンク']) notes.push('前衛・タンク候補が確認できません。');
  if ((roles.CC || 0) >= 2) notes.push('CC候補が複数います。');
  if (duplicateCount) notes.push('同一系統が複数配置されています。');
  return { members, roles, tiers, duplicateCount, notes };
}

export function teamText(team, families, locale = globalThis.document?.body?.dataset?.locale || 'ja') {
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const empty = locale === 'en' ? 'Empty' : locale === 'zh-CN' ? '空位' : '空き';
  const rowWord = locale === 'en' ? 'Row' : locale === 'zh-CN' ? '第' : '';
  const rows = Array.from({ length: TEAM_ROWS }, (_, row) => team.slots.slice(row * TEAM_COLUMNS, row * TEAM_COLUMNS + TEAM_COLUMNS).map((slot) => {
    if (!slot) return empty;
    const family = familyMap.get(slot.familyId);
    const evolution = family?.evolutions.find((item) => item.stage === slot.stage) || family?.evolutions[0];
    return evolution ? `${globalThis.MONSABA_FAMILY.getTataDisplayName(evolution)} (T${slot.stage})` : empty;
  }).join(' / '));
  const rowLines = rows.map((value, index) => locale === 'en' ? `${rowWord} ${index + 1}: ${value}` : locale === 'zh-CN' ? `${rowWord}${index + 1}行：${value}` : `${index + 1}行目：${value}`).join('\n');
  return `${team.name ? `${team.name}\n` : ''}${rowLines}\n\nmonster-survival.com`;
}
