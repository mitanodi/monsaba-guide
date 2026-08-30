import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  STATES,
  SHAPE_KEYS,
  adjustShapeCount,
  canonicalShapeKey,
  createDefaultShapeCounts,
  createDefaultModel,
  normalizeModel,
  normalizeShapeCounts,
  orientationsForShape,
  parseSpec,
  parseShapeCountsSpec,
  shapeCountsToSpec,
  solveTreasureModel
} from '../events/treasure-hunt/solver.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('events/treasure-hunt/index.html');
const js = read('events/treasure-hunt/solver.js');
const css = read('events/treasure-hunt/solver.css');

function bruteForceOracle(rawModel) {
  const model = normalizeModel(rawModel);
  const shapes = parseSpec(model.spec, model.size);
  const placements = shapes.map((shape) => {
    const seen = new Set();
    const candidates = [];
    for (const orientation of shape.orientations) {
      for (let row = 0; row <= model.size - orientation.h; row += 1) {
        for (let column = 0; column <= model.size - orientation.w; column += 1) {
          const cells = [];
          for (let dy = 0; dy < orientation.h; dy += 1) {
            for (let dx = 0; dx < orientation.w; dx += 1) cells.push((row + dy) * model.size + column + dx);
          }
          const key = cells.join('.');
          if (!seen.has(key) && !cells.some((cell) => model.cells[cell] === 'miss')) {
            seen.add(key);
            candidates.push(cells);
          }
        }
      }
    }
    return candidates;
  });
  const required = new Set(model.cells.flatMap((state, index) => state === 'hit' || state === 'found' ? [index] : []));
  const selectedIndices = Array(shapes.length).fill(-1);
  const tally = Array(model.cells.length).fill(0);
  let configurations = 0;

  function visit(depth, used) {
    if (depth === shapes.length) {
      if (![...required].every((cell) => used.has(cell))) return;
      configurations += 1;
      used.forEach((cell) => { tally[cell] += 1; });
      return;
    }
    const sameShape = depth > 0 && shapes[depth].key === shapes[depth - 1].key;
    const start = sameShape ? selectedIndices[depth - 1] + 1 : 0;
    for (let index = start; index < placements[depth].length; index += 1) {
      const placement = placements[depth][index];
      if (placement.some((cell) => used.has(cell))) continue;
      const next = new Set(used);
      placement.forEach((cell) => next.add(cell));
      selectedIndices[depth] = index;
      visit(depth + 1, next);
    }
  }

  visit(0, new Set());
  return {
    configurations,
    probabilities: configurations ? tally.map((count) => count / configurations) : []
  };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state, 1664525) + 1013904223 >>> 0;
    return state / 4294967296;
  };
}

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

test('既存v1〜v3保存データをv4へ後方互換変換する', () => {
  const old = { size: 5, spec: '1x2:1', cells: Array(25).fill('miss') };
  const restored = normalizeModel(old);
  assert.equal(restored.version, STORAGE_VERSION);
  assert.equal(restored.size, 5);
  assert.equal(restored.cells[0], 'miss');
  assert.equal(restored.preferences.inputMode, 'miss');
  assert.equal(restored.shapeCounts['1x2'], 1);
  assert.equal(Object.keys(restored.shapeCounts).length, 10);
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
  assert.deepEqual(shapes.map((shape) => shape.orientations.length), [1, 2]);
});

test('不正specを拒否し盤面より大きい形状は候補0で安全処理する', () => {
  assert.throws(() => parseSpec('unknown', 6), /形式/);
  const model = createDefaultModel(5);
  model.spec = '7x1:1';
  assert.equal(solveTreasureModel(model).configurations, 0);
});

test('同一canonical形状の複数指定を物理個数として統合する', () => {
  const shapes = parseSpec('1x3:1, 3x1:1', 6);
  assert.equal(shapes.length, 2);
  assert.ok(shapes.every((shape) => shape.key === '1x3'));
});

test('既定計算は長方形の両orientationを含む920候補になる', () => {
  assert.equal(solveTreasureModel(createDefaultModel(6)).configurations, 920);
});

test('空白を含む既定ケースも長方形の両orientationを使う', () => {
  const model = createDefaultModel(6);
  model.cells[0] = 'miss';
  const result = solveTreasureModel(model);
  assert.equal(result.configurations, 836);
  assert.equal(result.topCandidates[0].index, 14);
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

test('exact探索上限後は先頭N件でなく決定的な分岐重み付き概算へ移る', () => {
  const result = solveTreasureModel(createDefaultModel(6), { sampleBudget: 500, exactNodeLimit: 1 });
  assert.equal(result.approximate, true);
  assert.equal(result.capped, true);
  assert.equal(result.sampleSize, 500);
  assert.ok(result.acceptedSamples > 0);
  assert.doesNotMatch(js, /configurations\.length\s*>=|configurations\.push\(/);
  assert.match(js, /collectWeightedSample/);
  assert.match(js, /createDeterministicRandom/);
});

test('おすすめ候補は最大5件', () => {
  assert.equal(solveTreasureModel(createDefaultModel(6)).topCandidates.length, 5);
});

test('同率最高候補をすべて保持する', () => {
  const result = solveTreasureModel(createDefaultModel(6));
  assert.ok(result.bestIndices.length > 1);
  assert.ok(result.topCandidates.filter((candidate) => result.bestIndices.includes(candidate.index)).every((candidate) => candidate.rank === 1));
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

test('10種類のcanonical宝形状pickerと宝設定だけのclear操作を公開する', () => {
  assert.equal(SHAPE_KEYS.length, 10);
  assert.deepEqual(SHAPE_KEYS, [
    '1x1', '1x2', '1x3', '1x4',
    '2x2', '2x3', '2x4',
    '3x3', '3x4', '4x4'
  ]);
  assert.match(html, /id="shapeGrid"/);
  assert.match(html, /id="clearTreasureSettings"/);
  assert.match(html, /宝設定をクリア/);
  assert.match(html, /id="currentTreasures"/);
  assert.match(html, /id="treasureTotal"/);
  assert.match(js, /createShapePreview/);
});

for (const key of SHAPE_KEYS) {
  test(`${key}はカード操作で0→1→2→3、4回目は3、minusで0まで減る`, () => {
    let counts = normalizeShapeCounts();
    counts = adjustShapeCount(counts, key, 1);
    assert.equal(counts[key], 1);
    counts = adjustShapeCount(counts, key, 1);
    assert.equal(counts[key], 2);
    counts = adjustShapeCount(counts, key, 1);
    assert.equal(counts[key], 3);
    counts = adjustShapeCount(counts, key, 1);
    assert.equal(counts[key], 3);
    counts = adjustShapeCount(counts, key, -1);
    assert.equal(counts[key], 2);
    counts = adjustShapeCount(counts, key, -1);
    assert.equal(counts[key], 1);
    counts = adjustShapeCount(counts, key, -1);
    assert.equal(counts[key], 0);
  });
}

test('逆向き入力をcanonical形状へ統合する', () => {
  const counts = normalizeShapeCounts({ '4x2': 1, '2x4': 2, '1x4': 3, '4x1': 1, '3x4': 2, '4x3': 3 });
  const spec = shapeCountsToSpec(counts);
  const restored = parseShapeCountsSpec(spec);
  assert.equal(spec, '1x4:3, 2x4:3, 3x4:3');
  assert.equal(restored['1x4'], 3);
  assert.equal(restored['2x4'], 3);
  assert.equal(restored['3x4'], 3);
  const shapes = parseSpec('4x2:1, 2x4:1', 6);
  assert.equal(shapes.length, 2);
  assert.ok(shapes.every(({ w, h }) => w === 2 && h === 4));
});

test('picker specは0〜3を同期し0個を内部specから省く', () => {
  const parsed = parseShapeCountsSpec('4x2:2, 3x1:1, 1x1:0');
  assert.equal(parsed['2x4'], 2);
  assert.equal(parsed['1x3'], 1);
  assert.equal(parsed['1x1'], 0);
  assert.equal(shapeCountsToSpec(parsed), '1x3:1, 2x4:2');
  assert.equal(parseShapeCountsSpec('4x2:4'), null);
  assert.equal(parseShapeCountsSpec('4x2:1, 2x4:2')['2x4'], 3);
  assert.equal(parseShapeCountsSpec('4x2:2, 2x4:2'), null);
});

test('canonical shape IDとorientation一覧を返す', () => {
  for (const [input, expected] of [
    [[2, 1], '1x2'], [[3, 1], '1x3'], [[4, 1], '1x4'],
    [[3, 2], '2x3'], [[4, 2], '2x4'], [[4, 3], '3x4']
  ]) assert.equal(canonicalShapeKey(...input), expected);
  assert.deepEqual(orientationsForShape({ w: 1, h: 3 }), [{ w: 1, h: 3 }, { w: 3, h: 1 }]);
  assert.deepEqual(orientationsForShape({ w: 2, h: 2 }), [{ w: 2, h: 2 }]);
});

test('5x5単一宝は長方形2方向、正方形1方向を候補に含む', () => {
  const configurations = (spec) => {
    const model = createDefaultModel(5);
    model.spec = spec;
    return solveTreasureModel(model).configurations;
  };
  assert.equal(configurations('1x3:1'), 30);
  assert.equal(configurations('1x2:1'), 40);
  assert.equal(configurations('2x3:1'), 24);
  assert.equal(configurations('2x2:1'), 16);
});

test('逆向きspecは同じcanonical specと確率結果になる', () => {
  for (const [forward, reverse] of [
    ['1x2:1', '2x1:1'], ['1x3:1', '3x1:1'], ['1x4:1', '4x1:1'],
    ['2x3:1', '3x2:1'], ['2x4:1', '4x2:1'], ['3x4:1', '4x3:1']
  ]) {
    const left = createDefaultModel(5);
    left.spec = forward;
    const right = createDefaultModel(5);
    right.spec = reverse;
    assert.equal(normalizeModel(left).spec, normalizeModel(right).spec);
    assert.deepEqual(solveTreasureModel(left).probabilities, solveTreasureModel(right).probabilities);
  }
});

test('同一形状2個の順序入れ替えを二重カウントしない', () => {
  const model = createDefaultModel(5);
  model.spec = '1x2:2';
  assert.equal(solveTreasureModel(model).configurations, 686);
});

test('未確認盤面の1x3確率は上下左右対称になる', () => {
  const model = createDefaultModel(5);
  model.spec = '1x3:1';
  const { probabilities } = solveTreasureModel(model);
  for (let row = 0; row < 5; row += 1) for (let column = 0; column < 5; column += 1) {
    const index = row * 5 + column;
    assert.equal(probabilities[index], probabilities[row * 5 + (4 - column)]);
    assert.equal(probabilities[index], probabilities[(4 - row) * 5 + column]);
  }
});

test('盤面入力を90度回転すると確率も90度回転する', () => {
  const rotate = (index) => (index % 5) * 5 + (4 - Math.floor(index / 5));
  const original = createDefaultModel(5);
  original.spec = '1x3:1';
  original.cells[0] = 'miss';
  original.cells[7] = 'hit';
  const rotated = createDefaultModel(5);
  rotated.spec = '1x3:1';
  original.cells.forEach((state, index) => { rotated.cells[rotate(index)] = state; });
  const originalResult = solveTreasureModel(original);
  const rotatedResult = solveTreasureModel(rotated);
  assert.equal(originalResult.configurations, rotatedResult.configurations);
  originalResult.probabilities.forEach((probability, index) => assert.equal(probability, rotatedResult.probabilities[rotate(index)]));
});

test('6x6大規模caseは確率質量24と全対称性を保ち先頭20,000偏りを持たない', () => {
  const model = createDefaultModel(6);
  model.spec = '1x3:2, 1x4:1, 2x2:2, 2x3:1';
  const startedAt = performance.now();
  const result = solveTreasureModel(model);
  const elapsed = performance.now() - startedAt;
  assert.equal(result.treasureArea, 24);
  assert.ok(Math.abs(result.probabilityMass - 24) < 1e-9);
  assert.ok(Math.abs(result.probabilityMass / 36 - (2 / 3)) < 1e-9);
  assert.equal(result.approximate, true);
  assert.equal(result.sampleSize, 20000);
  assert.ok(Math.max(...result.probabilities) < 1);
  for (let row = 0; row < 6; row += 1) for (let column = 0; column < 6; column += 1) {
    const index = row * 6 + column;
    assert.ok(Math.abs(result.probabilities[index] - result.probabilities[row * 6 + (5 - column)]) < 1e-15);
    assert.ok(Math.abs(result.probabilities[index] - result.probabilities[(5 - row) * 6 + column]) < 1e-15);
    assert.ok(Math.abs(result.probabilities[index] - result.probabilities[column * 6 + (5 - row)]) < 1e-15);
  }
  assert.ok(elapsed < 2000, `elapsed ${elapsed.toFixed(1)}ms`);
});

test('同じ入力のapproximationはreloadや実行順に依存せず完全にdeterministic', () => {
  const model = createDefaultModel(6);
  model.spec = '1x3:2, 1x4:1, 2x2:2, 2x3:1';
  const options = { sampleBudget: 1000, exactNodeLimit: 1 };
  assert.deepEqual(solveTreasureModel(model, options), solveTreasureModel(model, options));
});

test('optimized exact counterは小規模brute-force oracleと一致する', () => {
  const cases = [
    { spec: '1x3:1', cells: [[0, 'miss'], [7, 'hit']] },
    { spec: '1x2:2', cells: [[4, 'miss']] },
    { spec: '2x2:1, 1x1:1', cells: [[6, 'found']] },
    { spec: '2x3:1', cells: [[12, 'hit'], [24, 'miss']] }
  ];
  for (const scenario of cases) {
    const model = createDefaultModel(5);
    model.spec = scenario.spec;
    scenario.cells.forEach(([index, state]) => { model.cells[index] = state; });
    const expected = bruteForceOracle(model);
    const actual = solveTreasureModel(model);
    assert.equal(actual.approximate, false, scenario.spec);
    assert.equal(actual.configurations, expected.configurations, scenario.spec);
    assert.deepEqual(actual.probabilities, expected.probabilities, scenario.spec);
  }
});

test('固定seed randomized小規模caseがbrute-force oracleと一致する', () => {
  const random = seededRandom(20260831);
  const shapePool = ['1x1', '1x2', '1x3', '2x2'];
  for (let caseIndex = 0; caseIndex < 40; caseIndex += 1) {
    const model = createDefaultModel(5);
    const first = shapePool[Math.floor(random() * shapePool.length)];
    const second = shapePool[Math.floor(random() * shapePool.length)];
    model.spec = first === second ? `${first}:2` : `${first}:1, ${second}:1`;
    for (let index = 0; index < model.cells.length; index += 1) {
      const roll = random();
      if (roll < 0.025) model.cells[index] = 'miss';
      else if (roll < 0.035) model.cells[index] = 'hit';
      else if (roll < 0.04) model.cells[index] = 'found';
    }
    const expected = bruteForceOracle(model);
    const actual = solveTreasureModel(model);
    assert.equal(actual.approximate, false, `case ${caseIndex}`);
    assert.equal(actual.configurations, expected.configurations, `case ${caseIndex}`);
    assert.deepEqual(actual.probabilities, expected.probabilities, `case ${caseIndex}`);
  }
});

test('v3の両orientation保存を物理個数を保ってv4へ移行する', () => {
  const saved = {
    version: 3,
    size: 5,
    spec: '1x3:1, 3x1:1',
    cells: Array(25).fill('unknown'),
    preferences: { inputMode: 'hit', showProbability: false, showRecommendations: true, autoCalculate: true }
  };
  saved.cells[6] = 'found';
  const migrated = normalizeModel(saved);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.spec, '1x3:2');
  assert.equal(migrated.shapeCounts['1x3'], 2);
  assert.equal(migrated.cells[6], 'found');
  assert.deepEqual(migrated.preferences, saved.preferences);
});

test('回転可能表示と3言語のUI文言を備える', () => {
  assert.match(js, /shape-rotation/);
  assert.match(js, /回転可/);
  assert.match(js, /Rotatable/);
  assert.match(js, /可旋转/);
  assert.match(html, /長方形のお宝は縦・横どちらの向きも自動で計算します/);
  assert.doesNotMatch(html, /幅×高さの向きは別々に扱います/);
});

test('既定宝は2x2と1x3を1個ずつ、全clearでは盤面を触らない', () => {
  const defaults = createDefaultShapeCounts();
  assert.equal(defaults['2x2'], 1);
  assert.equal(defaults['1x3'], 1);
  assert.equal(Object.values(defaults).reduce((sum, count) => sum + count, 0), 2);
  assert.match(js, /model\.shapeCounts = normalizeShapeCounts\(\)/);
  assert.doesNotMatch(js, /clearTreasureSettings[\s\S]{0,240}model\.cells/);
});

test('全形状0は計算不可でNaN・Infinityを返さない', () => {
  const model = createDefaultModel(6);
  model.shapeCounts = normalizeShapeCounts();
  model.spec = shapeCountsToSpec(model.shapeCounts);
  assert.throws(() => solveTreasureModel(model), /宝を1個以上/);
  const result = solveTreasureModel(createDefaultModel(6), 25);
  assert.equal(JSON.stringify(result).includes('NaN'), false);
  assert.equal(JSON.stringify(result).includes('Infinity'), false);
});

test('10形状を各3個にしても面積判定で安全に候補0を返す', () => {
  const model = createDefaultModel(8);
  model.spec = SHAPE_KEYS.map((key) => `${key}:3`).join(', ');
  const startedAt = performance.now();
  const result = solveTreasureModel(model);
  assert.equal(result.configurations, 0);
  assert.ok(performance.now() - startedAt < 200);
  assert.match(js, /DEFAULT_EXACT_NODE_LIMIT/);
  assert.match(js, /探索上限に達しました/);
});

test('5〜8盤面サイズを維持する', () => {
  for (const size of [5, 6, 7, 8]) assert.match(html, new RegExp(`value="${size}"`));
});

test('計算中表示とbutton無効化を持つ', () => {
  assert.match(js, /button\.disabled = value/);
  assert.match(js, /計算中…/);
  assert.match(js, /aria-busy/);
  assert.match(js, /mobileCalculate\.id = 'calculateMobile'/);
  assert.match(js, /max-width: 760px/);
});

test('exactと偏りを抑えたapproximationのUI文言を3言語で持つ', () => {
  for (const text of ['正確に計算しました', 'Calculated exactly', '已精确计算']) assert.match(js, new RegExp(text));
  for (const text of ['偏りを抑えた概算です', 'Bias-reduced estimate', '已使用降低偏差的估算']) assert.match(js, new RegExp(text));
  assert.doesNotMatch(js, /候補上限に達したため概算です|候補を利用して確率を算出しています/);
  assert.match(html, /固定seedの分岐重み付きサンプリング/);
});

test('Analyticsへ盤面・宝位置・specを送らない', () => {
  const calls = [...js.matchAll(/monsabaTrack\?\.\(([^\n]+)\)/g)].map((match) => match[1]);
  assert.ok(calls.length > 0);
  for (const call of calls) assert.doesNotMatch(call, /cells|model|spec|probabilities|index/);
});

test('スマホsticky paletteと320px縮小を定義する', () => {
  assert.match(css, /\.input-palette\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(css, /@media\s*\(max-width:\s*340px\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(var\(--board-size\),\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.shape-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2/);
  assert.match(css, /@media\s*\(min-width:\s*520px\)\s*and\s*\(max-width:\s*760px\)/);
});

test('表示は色だけでなく状態記号と順位記号を使う', () => {
  assert.match(js, /STATE_MARKS/);
  assert.match(js, /rankMark/);
});

test('モジュールscriptは1件だけ読み込む', () => {
  const matches = html.match(/events\/treasure-hunt\/solver\.js/g) || [];
  assert.equal(matches.length, 1);
  assert.match(html, /<script\s+type="module"\s+src="\/events\/treasure-hunt\/solver\.js/);
});

test('盤面は実行時に不正なgridcell直下構造を解消する', () => {
  assert.match(js, /board\.setAttribute\('role', 'group'\)/);
  assert.doesNotMatch(js, /setAttribute\('role', 'gridcell'\)/);
});
