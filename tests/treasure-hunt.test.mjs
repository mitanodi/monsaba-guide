import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  STATES,
  createDefaultModel,
  normalizeModel,
  parseSpec,
  solveTreasureModel
} from '../events/treasure-hunt/solver.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('events/treasure-hunt/index.html');
const js = read('events/treasure-hunt/solver.js');
const css = read('events/treasure-hunt/solver.css');

test('4つの入力モードを公開する', () => {
  assert.deepEqual(STATES, ['unknown', 'miss', 'hit', 'found']);
  for (const state of STATES) assert.match(html, new RegExp(`data-input-mode="${state}"`));
});

test('循環タップではなく選択状態を直接設定する', () => {
  assert.match(js, /model\.cells\[index\] = state/);
  assert.doesNotMatch(js, /states\.indexOf|STATES\[\(STATES\.indexOf/);
});

test('入力モードはaria-pressedと選択中表示を持つ', () => {
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /✓ 選択中/);
  assert.match(js, /setAttribute\('aria-pressed'/);
});

test('既存v1保存データをv2へ後方互換変換する', () => {
  const old = { size: 5, spec: '1x2:1', cells: Array(25).fill('miss') };
  const restored = normalizeModel(old);
  assert.equal(restored.version, STORAGE_VERSION);
  assert.equal(restored.size, 5);
  assert.equal(restored.cells[0], 'miss');
  assert.equal(restored.preferences.inputMode, 'miss');
  assert.equal(STORAGE_KEY, 'monsaba-treasure-solver-v1');
});

test('不正な旧セル状態は未確認へ安全に戻す', () => {
  const value = createDefaultModel(6);
  value.cells[0] = 'invalid';
  assert.equal(normalizeModel(value).cells[0], 'unknown');
});

test('表示設定と自動再計算設定を保存構造に保持する', () => {
  const value = createDefaultModel(6);
  value.preferences = { inputMode: 'found', showProbability: false, showRecommendations: false, autoCalculate: true };
  assert.deepEqual(normalizeModel(value).preferences, value.preferences);
});

test('宝specを従来形式で解釈する', () => {
  const shapes = parseSpec('2x2:1, 1x3:1', 6);
  assert.equal(shapes.length, 2);
  assert.deepEqual(shapes.map(({ w, h }) => [w, h]), [[2, 2], [1, 3]]);
});

test('不正specと盤面外specを拒否する', () => {
  assert.throws(() => parseSpec('unknown', 6), /形式/);
  assert.throws(() => parseSpec('7x1:1', 6), /範囲外/);
});

test('既存の既定計算は460候補を維持する', () => {
  assert.equal(solveTreasureModel(createDefaultModel(6)).configurations, 460);
});

test('既存418候補ケースを維持する', () => {
  const model = createDefaultModel(6);
  model.cells[0] = 'miss';
  const result = solveTreasureModel(model);
  assert.equal(result.configurations, 418);
  assert.equal(result.topCandidates[0].index, 13);
});

test('空白マスを宝配置から除外する', () => {
  const model = createDefaultModel(6);
  model.cells[0] = 'miss';
  assert.equal(solveTreasureModel(model).probabilities[0], 0);
});

test('宝ヒットを全有効候補へ含める', () => {
  const model = createDefaultModel(6);
  model.cells[0] = 'hit';
  assert.equal(solveTreasureModel(model).probabilities[0], 1);
});

test('発見済みを全有効候補へ含め残り概算から除く', () => {
  const hit = createDefaultModel(6);
  hit.cells[0] = 'hit';
  const found = createDefaultModel(6);
  found.cells[0] = 'found';
  assert.ok(solveTreasureModel(found).remainingPickaxes <= solveTreasureModel(hit).remainingPickaxes);
});

test('矛盾入力は候補0件になる', () => {
  const model = createDefaultModel(5);
  model.cells.fill('miss');
  model.cells[0] = 'hit';
  assert.equal(solveTreasureModel(model).configurations, 0);
});

test('探索上限に達した場合は概算フラグを返す', () => {
  const result = solveTreasureModel(createDefaultModel(6), 10);
  assert.equal(result.configurations, 10);
  assert.equal(result.capped, true);
});

test('おすすめ候補は最大5件', () => {
  assert.equal(solveTreasureModel(createDefaultModel(6)).topCandidates.length, 5);
});

test('同率最高候補をすべて保持する', () => {
  const result = solveTreasureModel(createDefaultModel(6));
  assert.ok(result.bestIndices.length > 1);
  assert.ok(result.topCandidates.every((candidate) => candidate.rank === 1));
  assert.match(js, /bestIndices\.includes\(index\)/);
});

test('候補順位は確率降順になる', () => {
  const model = createDefaultModel(6);
  model.cells[0] = 'miss';
  const candidates = solveTreasureModel(model).topCandidates;
  assert.deepEqual([...candidates].sort((a, b) => b.probability - a.probability), candidates);
});

test('TOP5選択は盤面状態を変更しない説明を持つ', () => {
  assert.match(html, /候補を選んでも盤面状態は変わりません/);
  assert.match(js, /selectedCandidateIndex = index/);
});

test('確率・おすすめ・自動再計算の切替を持つ', () => {
  for (const id of ['showProbability', 'showRecommendations', 'autoCalculate']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(js, /scheduleCalculate/);
});

test('Undoは1操作分の盤面snapshotを復元する', () => {
  assert.match(js, /history\.push\(\{ size: model\.size, spec: model\.spec, cells: \[\.\.\.model\.cells\] \}\)/);
  assert.match(html, /直前の入力を戻す/);
});

test('Resetは確認後に履歴と計算結果を消す', () => {
  assert.match(js, /confirm\('本当に盤面をリセットしますか？'\)/);
  assert.match(js, /history = \[\]/);
  assert.match(js, /clearResult\(\)/);
});

test('矛盾時は入力見直しとUndoを案内する', () => {
  assert.match(js, /空白・宝ヒット・発見済み/);
  assert.match(js, /is-attention/);
});

test('詳細設定へ既存カスタムspecを残す', () => {
  assert.match(html, /<details class="solver-advanced">/);
  assert.match(html, /id="treasureSpec"/);
  assert.match(html, /2x2:1, 1x3:1/);
});

test('5〜8盤面サイズを維持する', () => {
  for (const size of [5, 6, 7, 8]) assert.match(html, new RegExp(`value="${size}"`));
});

test('計算中表示とbutton無効化を持つ', () => {
  assert.match(js, /button\.disabled = value/);
  assert.match(js, /計算中…/);
  assert.match(js, /aria-busy/);
});

test('Analyticsへ盤面・宝位置・specを送らない', () => {
  const calls = [...js.matchAll(/monsabaTrack\?\.\(([^\n]+)\)/g)].map((match) => match[1]);
  assert.ok(calls.length > 0);
  for (const call of calls) assert.doesNotMatch(call, /cells|model|spec|probabilities|index/);
});

test('スマホsticky paletteと320px縮小を定義する', () => {
  assert.match(css, /\.input-palette\{position:sticky/);
  assert.match(css, /@media\(max-width:340px\)/);
  assert.match(css, /grid-template-columns:repeat\(var\(--board-size\),minmax\(0,1fr\)\)/);
});

test('表示は色だけでなく状態記号と順位記号を使う', () => {
  assert.match(js, /STATE_MARKS/);
  assert.match(js, /rankMark/);
});

test('モジュールscriptは1件だけ読み込む', () => {
  const matches = html.match(/events\/treasure-hunt\/solver\.js/g) || [];
  assert.equal(matches.length, 1);
  assert.match(html, /<script type="module" src="\/events\/treasure-hunt\/solver\.js/);
});

test('盤面は実行時に不正なgridcell直下構造を解消する', () => {
  assert.match(js, /board\.setAttribute\('role', 'group'\)/);
  assert.doesNotMatch(js, /setAttribute\('role', 'gridcell'\)/);
});
