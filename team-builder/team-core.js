import { groupedRoles } from '../my-monsaba/roster-core.js';

export const TEAM_KEY = 'monsabaTeamBuilds:v1';
export const HANDOFF_KEY = 'monsabaBoardTeamHandoff:v1';
export const TEAM_VERSION = 1;
export const TEAM_SLOTS = 15;
export const MAX_SAVED_TEAMS = 10;
export const TEAM_MODES = Object.freeze(['free', 'normal', 'zombie', 'dojo', 'boss']);
export const MODE_LABELS = Object.freeze({ free: '自由編成', normal: '通常', zombie: 'Zombie Rush', dojo: 'バッジ道場', boss: 'ボスラリー' });
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function emptyTeam() {
  return { version: TEAM_VERSION, name: '', mode: 'free', slots: Array(TEAM_SLOTS).fill(null), createdAt: null, updatedAt: null };
}

export function sanitizeTeam(value, families) {
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const slots = Array.from({ length: TEAM_SLOTS }, (_, index) => {
    const raw = Array.isArray(value?.slots) ? value.slots[index] : null;
    if (!isRecord(raw) || !familyMap.has(raw.familyId)) return null;
    const maxStage = Math.max(...familyMap.get(raw.familyId).evolutions.map((item) => item.stage));
    const stage = Number(raw.stage);
    return Number.isInteger(stage) && stage >= 1 && stage <= maxStage ? { familyId: raw.familyId, stage } : null;
  });
  const name = String(value?.name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  const mode = TEAM_MODES.includes(value?.mode) ? value.mode : 'free';
  const validDate = (item) => typeof item === 'string' && Number.isFinite(Date.parse(item)) ? item : null;
  return { version: TEAM_VERSION, name, mode, slots, createdAt: validDate(value?.createdAt), updatedAt: validDate(value?.updatedAt) };
}

export function loadTeams(storage, families) {
  try {
    const parsed = JSON.parse(storage?.getItem(TEAM_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED_TEAMS).map((item) => sanitizeTeam(item, families)) : [];
  } catch { return []; }
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
  const compact = { v: TEAM_VERSION, m: clean.mode, s: clean.slots.map((slot) => slot ? [slot.familyId, slot.stage] : null) };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeTeam(value, families) {
  if (typeof value !== 'string' || !value || value.length > 4096) throw new Error('共有データを読み込めませんでした。');
  try {
    const parsed = JSON.parse(fromBase64Url(value));
    if (!isRecord(parsed) || parsed.v !== TEAM_VERSION || !Array.isArray(parsed.s) || parsed.s.length !== TEAM_SLOTS) throw new Error();
    return sanitizeTeam({ version: TEAM_VERSION, mode: parsed.m, slots: parsed.s.map((slot) => Array.isArray(slot) ? { familyId: slot[0], stage: slot[1] } : null) }, families);
  } catch { throw new Error('共有データを読み込めませんでした。'); }
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

export function teamText(team, families) {
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const rows = [0, 1, 2].map((row) => team.slots.slice(row * 5, row * 5 + 5).map((slot) => {
    if (!slot) return '空き';
    const family = familyMap.get(slot.familyId);
    return family ? `${family.evolutions.find((item) => item.stage === slot.stage)?.name || family.evolutions[0].name}（T${slot.stage}）` : '空き';
  }).join(' / '));
  return `【${MODE_LABELS[team.mode]} 編成メモ】\n${team.name ? `${team.name}\n` : ''}1列目：${rows[0]}\n2列目：${rows[1]}\n3列目：${rows[2]}\n\nmonster-survival.com（非公式攻略サイト）`;
}
