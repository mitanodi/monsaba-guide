export const ROSTER_KEY = 'monsabaMyRoster:v1';
export const ROSTER_VERSION = 1;
export const MAX_IMPORT_BYTES = 256 * 1024;

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const stageLimit = (family) => Math.max(1, ...((family?.evolutions || []).map((item) => Number(item.stage) || 0)));

export function normalizeSearch(value) {
  let text = String(value ?? '').toLowerCase().normalize('NFKC').trim();
  return text.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60)).replace(/[\s　・ーｰ]/g, '');
}

export function editDistance(a, b) {
  const left = [...normalizeSearch(a)];
  const right = [...normalizeSearch(b)];
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return row[right.length];
}

export function familyMatches(family, rawQuery, aliases = []) {
  const query = normalizeSearch(rawQuery);
  if (!query) return true;
  const candidates = [family?.id, family?.familyName, ...(family?.searchAliases || []), ...(family?.evolutions || []).map((item) => item.name), ...aliases]
    .filter(Boolean).map(normalizeSearch);
  return candidates.some((candidate) => candidate.includes(query) || query.includes(candidate)
    || (query.length >= 3 && editDistance(query, candidate.slice(0, Math.max(query.length, candidate.length))) <= Math.max(1, Math.floor(query.length / 6))));
}

export function emptyRoster() {
  return { version: ROSTER_VERSION, entries: {}, updatedAt: null };
}

export function sanitizeRoster(value, families) {
  const familyMap = new Map((families || []).map((family) => [family.id, family]));
  const source = isRecord(value) && isRecord(value.entries) ? value.entries : {};
  const entries = Object.create(null);
  for (const [id, raw] of Object.entries(source)) {
    const family = familyMap.get(id);
    if (!family || !isRecord(raw)) continue;
    const stage = Number(raw.stage);
    if (!Number.isInteger(stage) || stage < 0 || stage > stageLimit(family)) continue;
    if (!stage && !raw.favorite && !raw.training) continue;
    entries[id] = { stage, favorite: raw.favorite === true, training: raw.training === true };
  }
  const updatedAt = typeof value?.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : null;
  return { version: ROSTER_VERSION, entries, updatedAt };
}

export function loadRoster(storage, families) {
  try {
    const raw = storage?.getItem(ROSTER_KEY);
    return raw ? sanitizeRoster(JSON.parse(raw), families) : emptyRoster();
  } catch {
    return emptyRoster();
  }
}

export function saveRoster(storage, roster, families, now = new Date()) {
  if (!storage?.setItem) throw new Error('このブラウザでは保存機能を利用できません。');
  const clean = sanitizeRoster({ ...roster, updatedAt: now.toISOString() }, families);
  clean.updatedAt = now.toISOString();
  storage.setItem(ROSTER_KEY, JSON.stringify(clean));
  return clean;
}

export function removeRoster(storage) {
  if (!storage?.removeItem) throw new Error('このブラウザでは保存機能を利用できません。');
  storage.removeItem(ROSTER_KEY);
}

export function exportRoster(roster, families, now = new Date()) {
  const clean = sanitizeRoster(roster, families);
  return JSON.stringify({ ...clean, exportedAt: now.toISOString() }, null, 2);
}

export function importRosterText(text, families) {
  const bytes = new TextEncoder().encode(String(text ?? '')).byteLength;
  if (bytes > MAX_IMPORT_BYTES) throw new Error('バックアップファイルが大きすぎます。');
  let parsed;
  try { parsed = JSON.parse(String(text)); } catch { throw new Error('JSON形式のバックアップを読み込めません。'); }
  if (!isRecord(parsed) || parsed.version !== ROSTER_VERSION || !isRecord(parsed.entries)) throw new Error('対応していないバックアップ形式です。');
  return sanitizeRoster(parsed, families);
}

export const ROLE_GROUPS = Object.freeze([
  ['回復', ['回復']], ['タンク', ['タンク', '前衛']], ['シールド', ['シールド']],
  ['CC', ['CC', '麻痺', 'スタン', '睡眠', '減速', '妨害']], ['麻痺', ['麻痺']], ['スタン', ['スタン']],
  ['減速', ['減速', '攻撃速度低下']], ['貫通', ['貫通']], ['範囲火力', ['範囲火力', '広範囲火力', '範囲持続火力']],
  ['バフ', ['バフ', '支援']], ['デバフ', ['デバフ', '被ダメ増加', '攻撃速度低下']]
]);

export function groupedRoles(roles = []) {
  return ROLE_GROUPS.filter(([, terms]) => roles.some((role) => terms.some((term) => role.includes(term)))).map(([label]) => label);
}

export function rosterSummary(roster, families, ratings) {
  const owned = (families || []).filter((family) => (roster.entries[family.id]?.stage || 0) > 0);
  const attributes = Object.fromEntries(['草', '水', '火', '雷', '岩'].map((attribute) => [attribute, owned.filter((family) => family.attribute === attribute).length]));
  const roleCounts = Object.fromEntries(ROLE_GROUPS.map(([label]) => [label, 0]));
  for (const family of owned) for (const role of groupedRoles(ratings?.[family.id]?.roles || [])) roleCounts[role] += 1;
  const roleStatus = Object.fromEntries(Object.entries(roleCounts).map(([role, count]) => [role, { count, status: count === 0 ? '不足' : count === 1 ? '少なめ' : '十分' }]));
  return { owned: owned.length, t3Plus: owned.filter((family) => roster.entries[family.id].stage >= 3).length, t4: owned.filter((family) => roster.entries[family.id].stage >= 4).length, attributes, roleStatus };
}

const tierOrder = new Map(['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', '保留', '未評価'].map((tier, index) => [tier, index]));
const roadmapEntries = (evolution) => [...(evolution?.t3Roadmap?.firstPriority || []), ...(evolution?.t3Roadmap?.secondPriority || [])];

export function growthCandidates(roster, families, ratings, evolution) {
  const roadmap = new Map(roadmapEntries(evolution).map((item) => [item.familyId, item]));
  const longTerm = new Map((evolution?.longTermRecommended || []).map((item) => [item.familyId, item]));
  return (families || []).flatMap((family) => {
    const currentStage = roster.entries[family.id]?.stage || 0;
    const maxStage = stageLimit(family);
    if (!currentStage || currentStage >= maxStage) return [];
    const nextStage = currentStage + 1;
    const transition = (evolution?.highImpactTransitions || []).find((item) => item.familyId === family.id && item.fromStage === currentStage && item.toStage === nextStage);
    const roadmapItem = nextStage === 3 ? roadmap.get(family.id) : null;
    const longItem = longTerm.get(family.id);
    const rating = ratings?.[family.id] || {};
    const reason = transition?.reason || roadmapItem?.reason || longItem?.reason || rating.comment || '既存評価と個別ページを確認して判断してください。';
    const evidence = transition ? '確認済み進化差分' : roadmapItem ? '進化優先度' : longItem ? '長期育成候補' : '総合Tier';
    return [{ family, currentStage, nextStage, rating, reason, evidence, headline: transition?.headline || '', requiredStars: roadmapItem?.requiredStars ?? (nextStage === 3 ? evolution?.t3Roadmap?.defaultRequiredStars : null) }];
  }).sort((a, b) => {
    const priority = (item) => item.evidence === '確認済み進化差分' ? 0 : item.evidence === '進化優先度' ? 1 : item.evidence === '長期育成候補' ? 2 : 3;
    return priority(a) - priority(b) || (tierOrder.get(a.rating.tier) ?? 99) - (tierOrder.get(b.rating.tier) ?? 99);
  }).slice(0, 5);
}

export function modeCandidates(roster, families, ratings, mode) {
  const keys = { normal: 'normal', zombie: 'zombie', dojo: 'dojo', beginner: 'beginner', boss: null };
  const key = Object.prototype.hasOwnProperty.call(keys, mode) ? keys[mode] : 'tier';
  return (families || []).filter((family) => (roster.entries[family.id]?.stage || 0) > 0).map((family) => ({ family, stage: roster.entries[family.id].stage, rating: key ? (ratings?.[family.id]?.[key] || '評価データ不足') : '評価データ不足', roles: ratings?.[family.id]?.roles || [] }))
    .sort((a, b) => (tierOrder.get(a.rating) ?? 99) - (tierOrder.get(b.rating) ?? 99)).slice(0, 5);
}
