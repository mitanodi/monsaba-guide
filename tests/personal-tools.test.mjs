import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROSTER_KEY, ROSTER_VERSION, MAX_IMPORT_BYTES, emptyRoster, sanitizeRoster, loadRoster, saveRoster,
  removeRoster, exportRoster, importRosterText, familyMatches, rosterSummary, growthCandidates, modeCandidates
} from '../my-monsaba/roster-core.js';
import {
  TEAM_KEY, DRAFT_KEY, TEAM_ROWS, TEAM_COLUMNS, TEAM_SLOTS, MAX_SAVED_TEAMS, emptyTeam, sanitizeTeam,
  loadTeams, loadDraft, saveDraft, saveTeamList, upsertTeam, placeMember, removeMember, moveMember,
  encodeTeam, decodeTeam, analyzeTeam, teamText, stage1ImageFor
} from '../team-builder/team-core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const families = json('data/tatari.json').families;
const ratings = json('data/tier-ratings.json').overall.byFamily;
const evolution = json('data/evolution-priority.json');
const first = families[0];
const second = families[1];

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key)
  };
}

test('データIntegrityは64系統・230体', () => {
  assert.equal(families.length, 64);
  assert.equal(families.flatMap((family) => family.evolutions).length, 230);
  assert.deepEqual(new Set(families.map((family) => family.attribute)), new Set(['草', '水', '火', '雷', '岩']));
});

test('手持ちはT1〜T4と未所持を安全に正規化する', () => {
  for (const stage of [1, 2, 3, 4]) assert.equal(sanitizeRoster({ entries: { [first.id]: { stage } } }, families).entries[first.id].stage, stage);
  assert.equal(sanitizeRoster({ entries: { [first.id]: { stage: 0 } } }, families).entries[first.id], undefined);
  assert.equal(sanitizeRoster({ entries: { unknown: { stage: 4 }, [first.id]: { stage: 99 } } }, families).entries[first.id], undefined);
});

test('手持ちschema versionとreload復元', () => {
  const box = storage();
  const saved = saveRoster(box, { ...emptyRoster(), entries: { [first.id]: { stage: 3, favorite: true } } }, families, new Date('2026-08-28T00:00:00Z'));
  assert.equal(saved.version, ROSTER_VERSION);
  assert.equal(loadRoster(box, families).entries[first.id].stage, 3);
});

test('全削除は専用keyだけを削除する', () => {
  const box = storage({ [ROSTER_KEY]: '{}', monsabaBoardThreadTokens: 'keep', monsabaFriendsToken: 'keep' });
  removeRoster(box);
  assert.equal(box.getItem(ROSTER_KEY), null);
  assert.equal(box.getItem('monsabaBoardThreadTokens'), 'keep');
  assert.equal(box.getItem('monsabaFriendsToken'), 'keep');
});

test('JSON backup export/importと未知ID除外', () => {
  const source = { version: 1, entries: { [first.id]: { stage: 2, training: true } } };
  const exported = exportRoster(source, families, new Date('2026-08-28T00:00:00Z'));
  const restored = importRosterText(exported, families);
  assert.equal(restored.entries[first.id].stage, 2);
  const unknown = importRosterText(JSON.stringify({ version: 1, entries: { unknown: { stage: 4 }, [second.id]: { stage: 1 } } }), families);
  assert.deepEqual(Object.keys(unknown.entries), [second.id]);
});

test('不正JSON・oversized importを拒否する', () => {
  assert.throws(() => importRosterText('{', families));
  assert.throws(() => importRosterText(JSON.stringify({ version: 999, entries: {} }), families));
  assert.throws(() => importRosterText('x'.repeat(MAX_IMPORT_BYTES + 1), families));
});

test('fuzzy searchは進化名・alias・表記揺れを扱う', () => {
  assert.equal(familyMatches(first, first.evolutions[2].name), true);
  assert.equal(familyMatches(first, '旧コパンダ', ['旧コパンダ']), true);
  assert.equal(familyMatches(first, first.familyName.slice(0, -1)), true);
  assert.equal(familyMatches(first, '絶対に一致しない検索'), false);
});

test('ダッシュボードと属性・役割集計はlocal rosterだけから計算', () => {
  const roster = { entries: { [first.id]: { stage: 4 }, [second.id]: { stage: 3 } } };
  const summary = rosterSummary(roster, families, ratings);
  assert.equal(summary.owned, 2);
  assert.equal(summary.t3Plus, 2);
  assert.equal(summary.t4, 1);
  assert.equal(Object.values(summary.attributes).reduce((a, b) => a + b, 0), 2);
  assert.ok(Object.keys(summary.roleStatus).includes('回復'));
});

test('育成候補とモード候補は既存評価だけを返す', () => {
  const roster = { entries: Object.fromEntries(families.slice(0, 8).map((family) => [family.id, { stage: 1 }])) };
  assert.ok(growthCandidates(roster, families, ratings, evolution).length <= 5);
  assert.ok(modeCandidates(roster, families, ratings, 'zombie').every((item) => item.rating));
  assert.ok(modeCandidates(roster, families, ratings, 'boss').every((item) => item.rating === '評価データ不足'));
});

test('編成は常に6×6の36枠、許可IDと実在進化段階だけを保持', () => {
  const team = sanitizeTeam({ name: '<b>編成</b>\u0000', mode: 'zombie', slots: [{ familyId: first.id, stage: 2 }, { familyId: 'unknown', stage: 4 }] }, families);
  assert.equal(team.slots.length, TEAM_SLOTS);
  assert.deepEqual(team.slots[0], { familyId: first.id, stage: 2 });
  assert.equal(team.slots[1], null);
  assert.equal(team.mode, 'zombie');
  assert.ok(team.name.length <= 40);
  assert.equal(TEAM_ROWS, 6);
  assert.equal(TEAM_COLUMNS, 6);
  assert.equal(TEAM_SLOTS, 36);
});

test('編成の配置・stage変更・削除・入替はデータ構造で保持', () => {
  let team = placeMember(emptyTeam(), 0, { familyId: first.id, stage: 1 }, families);
  team = placeMember(team, 0, { familyId: first.id, stage: 4 }, families);
  team = placeMember(team, 1, { familyId: second.id, stage: 2 }, families);
  team = moveMember(team, 0, 1, families);
  const clean = removeMember(team, 1, families);
  assert.equal(clean.slots[0].familyId, second.id);
  assert.equal(clean.slots[1], null);
});

test('T4が存在しない系統へT4を配置できない', () => {
  const shortFamily = families.find((family) => !family.evolutions.some((item) => item.stage === 4));
  assert.ok(shortFamily);
  const team = placeMember(emptyTeam(), 0, { familyId: shortFamily.id, stage: 4 }, families);
  assert.equal(team.slots[0], null);
});

test('自動保存draftは専用keyへ保存・復元する', () => {
  const box = storage();
  const team = placeMember(emptyTeam(), 35, { familyId: first.id, stage: 3 }, families);
  saveDraft(box, team, families);
  assert.ok(box.getItem(DRAFT_KEY));
  assert.equal(loadDraft(box, families).slots[35].stage, 3);
});

test('保存編成はreload復元し10件を超えない', () => {
  const box = storage();
  const teams = Array.from({ length: MAX_SAVED_TEAMS }, (_, index) => ({ ...emptyTeam(), name: `編成${index}`, createdAt: new Date(2026, 0, index + 1).toISOString() }));
  saveTeamList(box, teams, families);
  assert.equal(loadTeams(box, families).length, 10);
  assert.throws(() => upsertTeam(box, teams, { ...emptyTeam(), name: '11件目' }, families, new Date('2027-01-01')));
  assert.ok(box.getItem(TEAM_KEY));
});

test('共有hashはfamily ID・stage・slot・modeだけを往復', () => {
  const team = emptyTeam(); team.name = 'URLへ含めない名前'; team.mode = 'normal'; team.slots[7] = { familyId: first.id, stage: 3 };
  const encoded = encodeTeam(team, families);
  assert.doesNotMatch(encoded, /URL|名前/);
  const decoded = decodeTeam(encoded, families);
  assert.equal(decoded.name, '');
  assert.equal(decoded.slots[7].familyId, first.id);
  assert.equal(decoded.slots[7].stage, 3);
  assert.throws(() => decodeTeam('broken!!!', families));
});

test('旧15枠の保存・共有は6×6左上へ移行する', () => {
  const legacySlots = Array(15).fill(null); legacySlots[14] = { familyId: first.id, stage: 2 };
  const migrated = sanitizeTeam({ version: 1, slots: legacySlots }, families);
  assert.equal(migrated.slots[16].familyId, first.id);
  const compact = { v: 1, m: 'free', s: legacySlots.map((slot) => slot ? [slot.familyId, slot.stage] : null) };
  const encoded = Buffer.from(JSON.stringify(compact)).toString('base64url');
  assert.equal(decodeTeam(encoded, families).slots[16].stage, 2);
});

test('T2〜T4を選んでも盤面画像resolverはverified T1だけを返す', () => {
  const images = json('data/tata-images.json');
  const imageMap = new Map(images.families.map((item) => [item.familyId, item]));
  const image = stage1ImageFor(first, imageMap);
  assert.equal(image.status, 'verified');
  assert.match(image.src, /stage1/);
  assert.equal(stage1ImageFor(first, new Map([[first.id, { stage1: { status: 'pending' } }]])), null);
});

test('役割診断・Tier分布・重複警告は既存評価を利用', () => {
  const team = emptyTeam(); team.mode = 'zombie'; team.slots[0] = { familyId: first.id, stage: 4 }; team.slots[1] = { familyId: first.id, stage: 3 };
  const analysis = analyzeTeam(team, families, ratings);
  assert.equal(analysis.members.length, 2);
  assert.equal(analysis.duplicateCount, 1);
  assert.equal(Object.values(analysis.tiers).reduce((a, b) => a + b, 0), 2);
});

test('コピー用テキストは6行の36枠を持つ', () => {
  const text = teamText(emptyTeam(), families);
  assert.match(text, /1行目/);
  assert.match(text, /6行目/);
  assert.match(text, /monster-survival\.com/);
});

test('マイモンサバ・編成メーカーのUIと連携を静的検証', () => {
  const rosterPage = read('my-monsaba/index.html');
  const builder = read('team-builder/index.html');
  const builderJs = read('team-builder/team-builder.js');
  assert.match(rosterPage, /id="roster-grid"/);
  assert.match(rosterPage, /id="roster-import"/);
  assert.match(builder, /id="team-board"/);
  assert.match(builder, /width="1258" height="1300"/);
  assert.match(builder, /6×6/);
  assert.match(builderJs, /formation-stage-badge/);
  assert.match(builderJs, /sessionStorage\.setItem\(HANDOFF_KEY/);
  assert.doesNotMatch(builderJs, /fetch\([^\n]*board|action:\s*['"]create_thread/);
  assert.match(read('board/board.js'), /TEAM_HANDOFF_KEY/);
});

test('個別タタ登録・TOP・PC/スマホナビ導線を持つ', () => {
  assert.match(read('scripts/generate-tata-pages.mjs'), /tata-roster-button/);
  assert.match(read('index.html'), /href="\/my-monsaba\/"/);
  assert.match(read('index.html'), /href="\/team-builder\/"/);
  const nav = read('scripts/shared-layout.mjs');
  assert.match(nav, /href: '\/my-monsaba\/'/);
  assert.match(nav, /href: '\/team-builder\/'/);
});

test('Analyticsは手持ち・編成内容をpropertiesへ送らない', () => {
  const source = read('team-builder/team-builder.js') + read('my-monsaba/my-monsaba.js') + read('tata-roster.js');
  const calls = source.match(/MONSABA_TRACK[^\n]+/g) || [];
  for (const call of calls) assert.doesNotMatch(call, /\{[^}]*\b(familyId|family_id|tata_name|name|build|content|uid|query)\s*:/i);
  for (const name of ['formation_open', 'formation_place', 'formation_remove', 'formation_share', 'formation_save', 'formation_export_image']) assert.match(source, new RegExp(name));
  assert.match(read('growth.js'), /'formation_share'/);
});

test('SEO・広告・Privacy方針を維持する', () => {
  assert.match(read('my-monsaba/index.html'), /noindex,follow/);
  assert.match(read('team-builder/index.html'), /index,follow/);
  const adsense = json('data/adsense-config.json');
  assert.equal(adsense.enabled, false); assert.equal(adsense.autoAds, false);
  assert.ok(adsense.excludedPages.includes('/my-monsaba/'));
  assert.ok(adsense.excludedPages.includes('/team-builder/'));
  assert.doesNotMatch(read('my-monsaba/index.html') + read('team-builder/index.html'), /data-affiliate-offer|a8mat|adsbygoogle/i);
  assert.match(read('privacy/index.html'), /マイモンサバ/);
});

test('レスポンシブ・キーボード操作・保存不能時の表示を備える', () => {
  const css = read('my-tools.css');
  for (const width of ['1024', '820', '430', '340']) assert.match(css, new RegExp(`max-width:${width}px`));
  assert.doesNotMatch(css, /min-width:\s*[5-9]\d\dpx/);
  assert.match(read('team-builder/team-builder.js'), /data-cell/);
  assert.match(read('my-monsaba/my-monsaba.js'), /このブラウザでは保存機能を利用できません/);
});
