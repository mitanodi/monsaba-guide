export const STORAGE_KEY = 'monsaba-treasure-solver-v1';
export const STORAGE_VERSION = 6;
export const STATES = ['unknown', 'miss', 'found'];
export const STATE_LABELS = { unknown: '未確認', miss: '空白', found: '発見済み' };
export const STATE_MARKS = { unknown: '?', miss: '×', found: '✓' };
export const SHAPE_KEYS = Object.freeze([
  '1x1', '1x2', '1x3', '1x4',
  '2x2', '2x3', '2x4',
  '3x3', '3x4',
  '4x4'
]);
export const MAX_SHAPE_COUNT = 8;
const DEFAULT_SPEC = '2x2:1, 1x3:1';
const DEFAULT_PREFERENCES = {
  inputMode: 'miss',
  showProbability: true,
  showRecommendations: true,
  autoCalculate: false
};
const DEFAULT_SAMPLE_BUDGET = 20000;
const DEFAULT_EXACT_NODE_LIMIT = 250000;
const DEFAULT_EXACT_CONFIGURATION_LIMIT = 200000;

export function createDefaultShapeCounts() {
  return Object.fromEntries(SHAPE_KEYS.map((key) => [key, key === '2x2' || key === '1x3' ? 1 : 0]));
}

export function canonicalShapeKey(width, height) {
  const shorter = Math.min(Number(width), Number(height));
  const longer = Math.max(Number(width), Number(height));
  return `${shorter}x${longer}`;
}

export function orientationsForShape(shape) {
  const orientations = [{ w: shape.w, h: shape.h }];
  if (shape.w !== shape.h) orientations.push({ w: shape.h, h: shape.w });
  return orientations;
}

export function normalizeShapeCounts(value) {
  const counts = Object.fromEntries(SHAPE_KEYS.map((key) => [key, 0]));
  for (const [rawKey, rawCount] of Object.entries(value || {})) {
    const match = rawKey.match(/^([1-4])x([1-4])$/i);
    const count = Number(rawCount);
    if (!match || !Number.isInteger(count)) continue;
    const key = canonicalShapeKey(match[1], match[2]);
    counts[key] = Math.min(MAX_SHAPE_COUNT, Math.max(0, counts[key] + count));
  }
  return counts;
}

export function shapeCountsToSpec(value) {
  const counts = normalizeShapeCounts(value);
  return SHAPE_KEYS.filter((key) => counts[key] > 0).map((key) => `${key}:${counts[key]}`).join(', ');
}

export function parseShapeCountsSpec(text) {
  const counts = normalizeShapeCounts();
  const source = String(text ?? '').trim();
  if (!source) return counts;
  for (const part of source.split(',')) {
    const match = part.trim().match(/^([1-4])x([1-4]):(\d+)$/i);
    if (!match) return null;
    const key = canonicalShapeKey(match[1], match[2]);
    const count = Number(match[3]);
    if (count > MAX_SHAPE_COUNT) return null;
    counts[key] += count;
    if (counts[key] > MAX_SHAPE_COUNT) return null;
  }
  return counts;
}

export function adjustShapeCount(value, key, delta) {
  const match = String(key).match(/^([1-4])x([1-4])$/i);
  const canonicalKey = match ? canonicalShapeKey(match[1], match[2]) : '';
  if (!SHAPE_KEYS.includes(canonicalKey)) throw new Error(`未対応の宝形状です: ${key}`);
  const counts = normalizeShapeCounts(value);
  counts[canonicalKey] = Math.min(MAX_SHAPE_COUNT, Math.max(0, counts[canonicalKey] + Number(delta || 0)));
  return counts;
}

export function placementCells(size, key, startIndex, rotated = false) {
  const match = String(key).match(/^([1-4])x([1-4])$/i);
  if (!match || !SHAPE_KEYS.includes(canonicalShapeKey(match[1], match[2]))) return null;
  const baseWidth = Number(match[1]);
  const baseHeight = Number(match[2]);
  const width = rotated ? baseHeight : baseWidth;
  const height = rotated ? baseWidth : baseHeight;
  const row = Math.floor(Number(startIndex) / size);
  const column = Number(startIndex) % size;
  if (!Number.isInteger(startIndex) || row < 0 || column < 0 || row + height > size || column + width > size) return null;
  const cells = [];
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) cells.push((row + dy) * size + column + dx);
  }
  return { width, height, cells };
}

export function normalizePlacedTreasures(value, size, shapeCounts, cells = []) {
  const placed = [];
  const used = new Set();
  const usedCounts = Object.fromEntries(SHAPE_KEYS.map((key) => [key, 0]));
  for (const [index, raw] of (Array.isArray(value) ? value : []).entries()) {
    const match = String(raw?.key || '').match(/^([1-4])x([1-4])$/i);
    if (!match) continue;
    const key = canonicalShapeKey(match[1], match[2]);
    if (!SHAPE_KEYS.includes(key) || usedCounts[key] >= (shapeCounts[key] || 0)) continue;
    const startIndex = Number(raw.startIndex);
    const rotated = Boolean(raw.rotated) && match[1] !== match[2];
    const footprint = placementCells(size, key, startIndex, rotated);
    if (!footprint || footprint.cells.some((cell) => used.has(cell) || cells[cell] === 'miss')) continue;
    footprint.cells.forEach((cell) => used.add(cell));
    usedCounts[key] += 1;
    placed.push({ id: String(raw.id || `${key}-${index}`), key, startIndex, rotated, ...footprint });
  }
  return placed;
}

export function createDefaultModel(size = 6) {
  return {
    version: STORAGE_VERSION,
    size,
    spec: DEFAULT_SPEC,
    shapeCounts: createDefaultShapeCounts(),
    shapeMode: 'picker',
    placedTreasures: [],
    cells: Array(size * size).fill('unknown'),
    preferences: { ...DEFAULT_PREFERENCES }
  };
}

export function normalizeModel(value) {
  const size = [5, 6, 7, 8].includes(Number(value?.size)) ? Number(value.size) : 6;
  const cells = Array.isArray(value?.cells) && value.cells.length === size * size
    ? value.cells.map((state) => state === 'hit' ? 'found' : STATES.includes(state) ? state : 'unknown')
    : Array(size * size).fill('unknown');
  const hasSpec = typeof value?.spec === 'string';
  const rawSpec = hasSpec ? value.spec.trim() : DEFAULT_SPEC;
  const parsedCounts = parseShapeCountsSpec(rawSpec);
  const shapeCounts = parsedCounts || (
    value?.shapeCounts && typeof value.shapeCounts === 'object'
      ? normalizeShapeCounts(value.shapeCounts)
      : createDefaultShapeCounts()
  );
  let normalizedSpec = rawSpec;
  if (parsedCounts) normalizedSpec = shapeCountsToSpec(parsedCounts);
  else {
    try {
      const grouped = new Map();
      for (const shape of parseSpec(rawSpec, size)) grouped.set(shape.key, (grouped.get(shape.key) || 0) + 1);
      normalizedSpec = [...grouped].map(([key, count]) => `${key}:${count}`).join(', ');
    } catch { /* 入力エラーは計算時に案内するため、元のspecを保持 */ }
  }
  const placedTreasures = normalizePlacedTreasures(value?.placedTreasures, size, shapeCounts, cells);
  placedTreasures.forEach((placement) => placement.cells.forEach((cell) => { cells[cell] = 'found'; }));
  return {
    version: STORAGE_VERSION,
    size,
    spec: normalizedSpec,
    shapeCounts,
    shapeMode: parsedCounts ? 'picker' : 'advanced',
    placedTreasures,
    cells,
    preferences: {
      inputMode: value?.preferences?.inputMode === 'hit'
        ? 'found'
        : STATES.includes(value?.preferences?.inputMode) ? value.preferences.inputMode : DEFAULT_PREFERENCES.inputMode,
      showProbability: value?.preferences?.showProbability !== false,
      showRecommendations: value?.preferences?.showRecommendations !== false,
      autoCalculate: value?.preferences?.autoCalculate === true
    }
  };
}

export function parseSpec(text, size) {
  const shapes = [];
  const counts = new Map();
  const specText = String(text || '').trim();
  if (!specText) throw new Error('宝を1個以上入力してください。');
  for (const part of specText.split(',')) {
    const source = part.trim();
    const match = source.match(/^(\d+)x(\d+):(\d+)$/i);
    if (!match) throw new Error(`形式を確認してください: ${source}`);
    const width = Number(match[1]);
    const height = Number(match[2]);
    const count = Number(match[3]);
    if (width < 1 || height < 1 || count < 1 || width > 8 || height > 8 || count > 8) {
      throw new Error('宝の形・個数が対応範囲外です。');
    }
    const key = canonicalShapeKey(width, height);
    counts.set(key, (counts.get(key) || 0) + count);
    if (counts.get(key) > 8) throw new Error(`同じ形状の個数が対応範囲外です: ${key}`);
  }
  for (const [key, count] of counts) {
    const [width, height] = key.split('x').map(Number);
    for (let index = 0; index < count; index += 1) {
      const shape = { w: width, h: height, key, id: `${key}-${index}` };
      shapes.push({ ...shape, orientations: orientationsForShape(shape) });
    }
  }
  if (!shapes.length) throw new Error('宝を1個以上入力してください。');
  return shapes.sort((a, b) => (b.w * b.h) - (a.w * a.h) || a.key.localeCompare(b.key));
}

function placementsForShape(shape, model) {
  const placements = [];
  const seen = new Set();
  for (const orientation of shape.orientations) {
    for (let y = 0; y <= model.size - orientation.h; y += 1) {
      for (let x = 0; x <= model.size - orientation.w; x += 1) {
        const cells = [];
        for (let dy = 0; dy < orientation.h; dy += 1) {
          for (let dx = 0; dx < orientation.w; dx += 1) cells.push((y + dy) * model.size + x + dx);
        }
        const placementKey = cells.join('.');
        if (!seen.has(placementKey) && !cells.some((cell) => model.cells[cell] === 'miss')) {
          seen.add(placementKey);
          placements.push(cells);
        }
      }
    }
  }
  return placements;
}

function cellsToMask(cells) {
  return cells.reduce((mask, cell) => mask | (1n << BigInt(cell)), 0n);
}

function deterministicSeed(model) {
  const placedSignature = (model.placedTreasures || []).map((item) => `${item.key}:${item.startIndex}:${item.rotated ? 1 : 0}`).join(';');
  const source = `${model.size}|${model.spec}|${model.cells.join(',')}|${placedSignature}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createDeterministicRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function symmetryMaps(model) {
  const size = model.size;
  const transforms = [
    (row, column) => [row, column],
    (row, column) => [column, size - 1 - row],
    (row, column) => [size - 1 - row, size - 1 - column],
    (row, column) => [size - 1 - column, row],
    (row, column) => [row, size - 1 - column],
    (row, column) => [size - 1 - row, column],
    (row, column) => [column, row],
    (row, column) => [size - 1 - column, size - 1 - row]
  ];
  return transforms
    .map((transform) => Array.from({ length: size * size }, (_, index) => {
      const [row, column] = transform(Math.floor(index / size), index % size);
      return row * size + column;
    }))
    .filter((map) => map.every((target, index) => model.cells[target] === model.cells[index]));
}

function enforceInputSymmetry(probabilities, model) {
  const maps = symmetryMaps(model);
  if (maps.length <= 1) return probabilities;
  return probabilities.map((_, index) => (
    maps.reduce((sum, map) => sum + probabilities[map[index]], 0) / maps.length
  ));
}

function collectExactCounts({ shapes, candidates, requiredMask, remainingCoverage, initialMask = 0n, cellCount, nodeLimit, configurationLimit }) {
  const tally = Array(cellCount).fill(0);
  const chosenPlacementIndices = Array(shapes.length).fill(-1);
  let configurations = 0;
  let visitedNodes = 0;
  let limited = false;

  function visit(depth, usedMask) {
    visitedNodes += 1;
    if (visitedNodes > nodeLimit || limited) {
      limited = true;
      return;
    }
    if (depth === shapes.length) {
      if ((requiredMask & ~usedMask) !== 0n) return;
      configurations += 1;
      if (configurations > configurationLimit) {
        limited = true;
        return;
      }
      for (let cell = 0; cell < cellCount; cell += 1) {
        if ((usedMask & (1n << BigInt(cell))) !== 0n) tally[cell] += 1;
      }
      return;
    }
    const sameAsPrevious = depth > 0 && shapes[depth].key === shapes[depth - 1].key;
    const startIndex = sameAsPrevious ? chosenPlacementIndices[depth - 1] + 1 : 0;
    for (let placementIndex = startIndex; placementIndex < candidates[depth].length; placementIndex += 1) {
      const placement = candidates[depth][placementIndex];
      if ((usedMask & placement.mask) !== 0n) continue;
      const nextMask = usedMask | placement.mask;
      if ((requiredMask & ~nextMask & ~remainingCoverage[depth + 1]) !== 0n) continue;
      chosenPlacementIndices[depth] = placementIndex;
      visit(depth + 1, nextMask);
      if (limited) return;
    }
  }

  visit(0, initialMask);
  return { configurations, tally, visitedNodes, limited };
}

function collectWeightedSample({ model, shapes, candidates, requiredMask, remainingCoverage, initialMask = 0n, cellCount, sampleBudget }) {
  const random = createDeterministicRandom(deterministicSeed(model));
  const tally = Array(cellCount).fill(0);
  const chosenPlacementIndices = Array(shapes.length).fill(-1);
  let totalWeight = 0;
  let acceptedSamples = 0;

  for (let sample = 0; sample < sampleBudget; sample += 1) {
    chosenPlacementIndices.fill(-1);
    let usedMask = initialMask;
    let weight = 1;
    let valid = true;
    for (let depth = 0; depth < shapes.length; depth += 1) {
      const sameAsPrevious = depth > 0 && shapes[depth].key === shapes[depth - 1].key;
      const startIndex = sameAsPrevious ? chosenPlacementIndices[depth - 1] + 1 : 0;
      const viable = [];
      for (let placementIndex = startIndex; placementIndex < candidates[depth].length; placementIndex += 1) {
        const placement = candidates[depth][placementIndex];
        if ((usedMask & placement.mask) !== 0n) continue;
        const nextMask = usedMask | placement.mask;
        if ((requiredMask & ~nextMask & ~remainingCoverage[depth + 1]) !== 0n) continue;
        viable.push(placementIndex);
      }
      if (!viable.length) {
        valid = false;
        break;
      }
      const choice = viable[Math.floor(random() * viable.length)];
      chosenPlacementIndices[depth] = choice;
      usedMask |= candidates[depth][choice].mask;
      weight *= viable.length;
    }
    if (!valid || (requiredMask & ~usedMask) !== 0n || !Number.isFinite(weight)) continue;
    acceptedSamples += 1;
    totalWeight += weight;
    for (let cell = 0; cell < cellCount; cell += 1) {
      if ((usedMask & (1n << BigInt(cell))) !== 0n) tally[cell] += weight;
    }
  }

  return { tally, totalWeight, acceptedSamples };
}

function finalizeResult({ model, shapes, treasureArea, configurations, probabilities, approximate, sampleSize = 0, acceptedSamples = 0, visitedNodes = 0 }) {
  const unknownCandidates = probabilities
    .map((probability, index) => ({ index, probability }))
    .filter((candidate) => model.cells[candidate.index] === 'unknown')
    .sort((a, b) => b.probability - a.probability || a.index - b.index);
  const bestProbability = unknownCandidates[0]?.probability ?? 0;
  const bestIndices = unknownCandidates
    .filter((candidate) => candidate.probability === bestProbability)
    .map((candidate) => candidate.index);
  const topCandidates = unknownCandidates.slice(0, 5).map((candidate) => ({
    ...candidate,
    rank: 1 + unknownCandidates.filter((other) => other.probability > candidate.probability).length
  }));
  const remainingTreasureCells = Math.max(
    0,
    treasureArea - model.cells.filter((state) => state === 'found').length
  );
  return {
    configurations,
    capped: approximate,
    approximate,
    sampleSize,
    acceptedSamples,
    visitedNodes,
    probabilities,
    probabilityMass: probabilities.reduce((sum, probability) => sum + probability, 0),
    treasureArea,
    topCandidates,
    bestIndices,
    bestProbability,
    remainingPickaxes: bestProbability > 0 ? Math.ceil(remainingTreasureCells / bestProbability) : null,
    shapes
  };
}

export function solveTreasureModel(rawModel, rawOptions = {}) {
  const model = normalizeModel(rawModel);
  const options = typeof rawOptions === 'number' ? { sampleBudget: rawOptions } : rawOptions;
  const sampleBudget = Math.max(100, Math.min(100000, Number(options.sampleBudget) || DEFAULT_SAMPLE_BUDGET));
  const exactNodeLimit = Math.max(1, Number(options.exactNodeLimit) || DEFAULT_EXACT_NODE_LIMIT);
  const exactConfigurationLimit = Math.max(1, Number(options.exactConfigurationLimit) || DEFAULT_EXACT_CONFIGURATION_LIMIT);
  const allShapes = parseSpec(model.spec, model.size);
  const treasureArea = allShapes.reduce((sum, shape) => sum + (shape.w * shape.h), 0);
  const remainingByKey = new Map();
  model.placedTreasures.forEach((placement) => remainingByKey.set(placement.key, (remainingByKey.get(placement.key) || 0) + 1));
  const shapes = allShapes.filter((shape) => {
    const count = remainingByKey.get(shape.key) || 0;
    if (!count) return true;
    remainingByKey.set(shape.key, count - 1);
    return false;
  });
  const fixedMask = cellsToMask(model.placedTreasures.flatMap((placement) => placement.cells));
  const availableArea = model.cells.filter((state) => state !== 'miss').length;
  if (treasureArea > availableArea) {
    return { configurations: 0, capped: false, approximate: false, probabilities: [], topCandidates: [], bestIndices: [], shapes, treasureArea, probabilityMass: 0 };
  }
  const candidates = shapes.map((shape) => placementsForShape(shape, model)
    .map((cells) => ({ cells, mask: cellsToMask(cells) }))
    .filter((placement) => (placement.mask & fixedMask) === 0n));
  if (candidates.some((list) => list.length === 0)) {
    return { configurations: 0, capped: false, approximate: false, probabilities: [], topCandidates: [], bestIndices: [], shapes, treasureArea, probabilityMass: 0 };
  }
  const requiredMask = model.cells.reduce((mask, state, index) => (
    state === 'found' ? mask | (1n << BigInt(index)) : mask
  ), 0n);
  const remainingCoverage = Array(shapes.length + 1);
  remainingCoverage[shapes.length] = 0n;
  for (let depth = shapes.length - 1; depth >= 0; depth -= 1) {
    remainingCoverage[depth] = candidates[depth].reduce(
      (mask, placement) => mask | placement.mask,
      remainingCoverage[depth + 1]
    );
  }
  const exact = collectExactCounts({
    shapes,
    candidates,
    requiredMask,
    remainingCoverage,
    initialMask: fixedMask,
    cellCount: model.cells.length,
    nodeLimit: exactNodeLimit,
    configurationLimit: exactConfigurationLimit
  });
  if (!exact.limited) {
    if (!exact.configurations) {
      return { configurations: 0, capped: false, approximate: false, probabilities: [], topCandidates: [], bestIndices: [], shapes, treasureArea, probabilityMass: 0, visitedNodes: exact.visitedNodes };
    }
    return finalizeResult({
      model,
      shapes,
      treasureArea,
      configurations: exact.configurations,
      probabilities: exact.tally.map((count) => count / exact.configurations),
      approximate: false,
      visitedNodes: exact.visitedNodes
    });
  }

  const sampled = collectWeightedSample({
    model,
    shapes,
    candidates,
    requiredMask,
    remainingCoverage,
    initialMask: fixedMask,
    cellCount: model.cells.length,
    sampleBudget
  });
  if (!sampled.totalWeight) {
    return { configurations: 0, capped: true, approximate: true, probabilities: [], topCandidates: [], bestIndices: [], shapes, treasureArea, probabilityMass: 0, sampleSize: sampleBudget, acceptedSamples: 0, visitedNodes: exact.visitedNodes };
  }
  const probabilities = enforceInputSymmetry(
    sampled.tally.map((weight) => weight / sampled.totalWeight),
    model
  );
  const estimatedConfigurations = sampled.totalWeight / sampleBudget;
  return finalizeResult({
    model,
    shapes,
    treasureArea,
    configurations: Math.max(1, Math.round(Math.min(Number.MAX_SAFE_INTEGER, estimatedConfigurations))),
    probabilities,
    approximate: true,
    sampleSize: sampleBudget,
    acceptedSamples: sampled.acceptedSamples,
    visitedNodes: exact.visitedNodes
  });
}

function boot() {
  const $ = (selector) => document.querySelector(selector);
  const board = $('#board');
  if (!board) return;
  const locale = document.documentElement.lang === 'en' ? 'en' : document.documentElement.lang === 'zh-CN' ? 'zh-CN' : 'ja';
  const pickerText = {
    ja: { rotatable: '回転可', empty: '宝が選ばれていません', total: (count) => `合計：${count}個`, add: (shape, count) => `${shape}の宝を1個追加。現在${count}個`, remove: (shape) => `${shape}の宝を1個減らす`, maxReached: `この形状は最大${MAX_SHAPE_COUNT}個まで設定できます` },
    en: { rotatable: 'Rotatable', empty: 'No treasures selected', total: (count) => `Total: ${count}`, add: (shape, count) => `Add one ${shape} treasure. Currently ${count}`, remove: (shape) => `Remove one ${shape} treasure`, maxReached: `You can set up to ${MAX_SHAPE_COUNT} treasures of this shape` },
    'zh-CN': { rotatable: '可旋转', empty: '尚未选择宝物', total: (count) => `合计：${count}个`, add: (shape, count) => `添加1个${shape}宝物。当前${count}个`, remove: (shape) => `减少1个${shape}宝物`, maxReached: `每种形状最多可设置${MAX_SHAPE_COUNT}个宝物` }
  }[locale];
  const placementText = {
    ja: { found: '発見済み', place: '配置', rotate: '回転', remove: '配置を取り消す', placedTitle: '盤面に配置した宝', empty: 'まだ配置していません', selected: (shape) => `${shape}を選択中。盤面の左上マスをタップするか、ドラッグしてください。`, placed: (shape) => `${shape}を盤面へ配置しました`, invalid: 'その位置には配置できません。盤面外・空白・他の宝との重なりを確認してください。' },
    en: { found: 'Found', place: 'Place', rotate: 'Rotate', remove: 'Remove placement', placedTitle: 'Treasures placed on the board', empty: 'No treasures placed yet', selected: (shape) => `${shape} selected. Tap the top-left board tile or drag it onto the board.`, placed: (shape) => `${shape} placed on the board`, invalid: 'Cannot place it there. Check the board edge, empty tiles, and overlaps.' },
    'zh-CN': { found: '已找到', place: '放置', rotate: '旋转', remove: '取消放置', placedTitle: '已放置到棋盘的宝物', empty: '尚未放置宝物', selected: (shape) => `已选择${shape}。点击棋盘左上格，或将其拖到棋盘上。`, placed: (shape) => `已将${shape}放置到棋盘`, invalid: '无法放置在该位置。请检查棋盘边界、空白格与宝物重叠。' }
  }[locale];
  const resultText = {
    ja: {
      calculate: '確率を計算', calculating: '計算中…', exactTitle: '正確に計算しました',
      exactValue: (count) => `${count.toLocaleString('ja-JP')}通り`,
      exactDetail: (count) => `${count.toLocaleString('ja-JP')}件の有効配置をすべて数えました。`,
      approximateTitle: '偏りを抑えた概算です',
      approximateValue: (count) => `${count.toLocaleString('ja-JP')}回サンプル（概算）`,
      approximateDetail: (count) => `候補数が非常に多いため、固定seedの分岐重み付きサンプリングを${count.toLocaleString('ja-JP')}回行いました。`,
      approximateNotice: '探索順の先頭候補は使用せず、決定的な分岐重み付きサンプリングと盤面対称性で偏りを抑えています。',
      calculatingDetail: '入力条件に合う宝配置を確認しています。'
    },
    en: {
      calculate: 'Calculate Probability', calculating: 'Calculating…', exactTitle: 'Calculated exactly',
      exactValue: (count) => `${count.toLocaleString('en-US')} layouts`,
      exactDetail: (count) => `Counted all ${count.toLocaleString('en-US')} valid layouts.`,
      approximateTitle: 'Bias-reduced estimate',
      approximateValue: (count) => `${count.toLocaleString('en-US')} samples (estimate)`,
      approximateDetail: (count) => `The layout space is very large, so ${count.toLocaleString('en-US')} deterministic branch-weighted samples were used.`,
      approximateNotice: 'The solver does not use the first layouts in traversal order. It reduces bias with deterministic branch weighting and board symmetries.',
      calculatingDetail: 'Checking treasure layouts that match the board.'
    },
    'zh-CN': {
      calculate: '计算概率', calculating: '计算中…', exactTitle: '已精确计算',
      exactValue: (count) => `${count.toLocaleString('zh-CN')}种布局`,
      exactDetail: (count) => `已统计全部${count.toLocaleString('zh-CN')}种有效布局。`,
      approximateTitle: '已使用降低偏差的估算',
      approximateValue: (count) => `${count.toLocaleString('zh-CN')}次采样（估算）`,
      approximateDetail: (count) => `布局数量非常大，因此使用了${count.toLocaleString('zh-CN')}次固定种子的分支加权采样。`,
      approximateNotice: '求解器不会使用遍历顺序中的前若干布局，而是通过固定种子的分支加权采样与棋盘对称性来降低偏差。',
      calculatingDetail: '正在检查符合棋盘条件的宝物布局。'
    }
  }[locale];
  board.setAttribute('role', 'group');
  const mobileCalculate = document.createElement('button');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  mobileCalculate.id = 'calculateMobile';
  mobileCalculate.className = 'button';
  mobileCalculate.type = 'button';
  mobileCalculate.textContent = '確率を計算';
  Object.assign(mobileCalculate.style, { width: '100%', minHeight: '44px', marginTop: '8px' });
  const syncMobileCalculate = () => { mobileCalculate.hidden = !mobileViewport.matches; };
  mobileViewport.addEventListener?.('change', syncMobileCalculate);
  syncMobileCalculate();
  $('.input-palette').append(mobileCalculate);

  let model = createDefaultModel();
  let history = [];
  let lastResult = null;
  let selectedCandidateIndex = null;
  let calculateTimer = null;
  let specSyncTimer = null;
  let calculating = false;
  let selectedPlacement = null;
  const placementRotation = Object.fromEntries(SHAPE_KEYS.map((key) => [key, false]));

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); } catch { /* 計算は継続 */ }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) model = normalizeModel(saved);
    } catch { model = createDefaultModel(); }
  }
  function boardSnapshot() {
    history.push({ size: model.size, spec: model.spec, shapeCounts: { ...model.shapeCounts }, placedTreasures: model.placedTreasures.map((placement) => ({ ...placement, cells: [...placement.cells] })), cells: [...model.cells] });
    if (history.length > 40) history.shift();
    updateUndoState();
  }
  function restoreSnapshot(snapshot) {
    model = normalizeModel({ ...model, ...snapshot, preferences: model.preferences });
    syncControls();
    save();
    clearResult();
    buildBoard();
  }
  function coordinate(index) {
    return `${Math.floor(index / model.size) + 1}行${(index % model.size) + 1}列`;
  }
  function rankMark(rank) {
    return ['①', '②', '③', '④', '⑤'][Math.min(Math.max(rank, 1), 5) - 1];
  }
  function updateUndoState() {
    $('#undo').disabled = history.length === 0;
  }
  function syncControls() {
    $('#boardSize').value = String(model.size);
    $('#treasureSpec').value = model.spec;
    $('#showProbability').checked = model.preferences.showProbability;
    $('#showRecommendations').checked = model.preferences.showRecommendations;
    $('#autoCalculate').checked = model.preferences.autoCalculate;
    document.querySelectorAll('[data-input-mode]').forEach((button) => {
      const selected = button.dataset.inputMode === model.preferences.inputMode;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-selected', selected);
      button.querySelector('.mode-selected').textContent = selected ? '✓ 選択中' : '';
    });
    $('#inputModeStatus').textContent = `現在：${STATE_LABELS[model.preferences.inputMode]}を入力中`;
    renderShapePicker();
  }
  function showPickerStatus(message, error = false) {
    const status = $('#treasurePickerStatus');
    status.textContent = message;
    status.classList.toggle('is-error', error);
  }
  function createShapePreview(width, height) {
    const preview = document.createElement('span');
    preview.className = 'shape-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.style.setProperty('--shape-width', width);
    preview.style.setProperty('--shape-height', height);
    for (let index = 0; index < width * height; index += 1) preview.append(document.createElement('i'));
    return preview;
  }
  function renderShapePicker() {
    const grid = $('#shapeGrid');
    const list = $('#currentTreasures');
    if (!grid || !list) return;
    grid.innerHTML = '';
    for (const key of SHAPE_KEYS) {
      const [width, height] = key.split('x').map(Number);
      const count = model.shapeCounts[key];
      const placedCount = model.placedTreasures.filter((placement) => placement.key === key).length;
      const option = document.createElement('div');
      option.className = 'shape-option';
      option.classList.toggle('is-selected', count > 0);
      option.dataset.shape = key;

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'shape-add';
      add.dataset.shapeAdd = key;
      add.setAttribute('aria-label', `${width}×${height}の宝を1個追加。現在${count}個`);
      const label = document.createElement('strong');
      label.textContent = `${width}×${height}`;
      if (width !== height) {
        const rotation = document.createElement('small');
        rotation.className = 'shape-rotation';
        rotation.textContent = `↻ ${pickerText.rotatable}`;
        label.append(rotation);
      }
      const countLabel = document.createElement('span');
      countLabel.className = 'shape-count';
      countLabel.textContent = `${count}個`;
      if (locale === 'en') countLabel.textContent = `${count}`;
      if (locale === 'zh-CN') countLabel.textContent = `${count}个`;
      add.append(createShapePreview(width, height), label, countLabel);
      const shapeLabel = `${width}×${height}${width !== height ? ` (${pickerText.rotatable})` : ''}`;
      add.setAttribute('aria-label', pickerText.add(shapeLabel, count));
      add.addEventListener('click', () => changeShapeCount(key, 1));

      const minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'shape-minus';
      minus.dataset.shapeMinus = key;
      minus.disabled = count === 0 || count <= placedCount;
      minus.setAttribute('aria-label', pickerText.remove(shapeLabel));
      minus.textContent = '−';
      minus.addEventListener('click', () => changeShapeCount(key, -1));
      option.append(add, minus);
      grid.append(option);
    }

    list.innerHTML = '';
    const selected = SHAPE_KEYS.filter((key) => model.shapeCounts[key] > 0);
    if (!selected.length) {
      const empty = document.createElement('li');
      empty.className = 'treasure-summary-empty';
      empty.textContent = pickerText.empty;
      list.append(empty);
    } else {
      selected.forEach((key) => {
        const [width, height] = key.split('x');
        const placedCount = model.placedTreasures.filter((placement) => placement.key === key).length;
        const item = document.createElement('li');
        item.className = 'treasure-summary-item';
        const label = document.createElement('span');
        label.textContent = `${width}×${height}${width !== height ? `（${pickerText.rotatable}）` : ''} ×${model.shapeCounts[key]}　${placementText.found} ${placedCount}/${model.shapeCounts[key]}`;
        const controls = document.createElement('span');
        controls.className = 'treasure-placement-controls';
        const place = document.createElement('button');
        place.type = 'button';
        place.className = 'treasure-place-button';
        place.dataset.placeShape = key;
        place.draggable = placedCount < model.shapeCounts[key];
        place.disabled = placedCount >= model.shapeCounts[key];
        place.textContent = placementText.place;
        place.setAttribute('aria-pressed', String(selectedPlacement?.key === key));
        place.addEventListener('click', () => selectPlacement(key));
        place.addEventListener('dragstart', (event) => {
          selectedPlacement = { key, rotated: placementRotation[key] };
          event.dataTransfer?.setData('text/plain', key);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
          showPickerStatus(placementText.selected(`${width}×${height}`));
        });
        controls.append(place);
        if (width !== height) {
          const rotate = document.createElement('button');
          rotate.type = 'button';
          rotate.className = 'treasure-rotate-button';
          rotate.dataset.rotateShape = key;
          rotate.textContent = `${placementText.rotate}${placementRotation[key] ? ' ↔' : ' ↕'}`;
          rotate.addEventListener('click', () => {
            placementRotation[key] = !placementRotation[key];
            if (selectedPlacement?.key === key) selectedPlacement.rotated = placementRotation[key];
            renderShapePicker();
          });
          controls.append(rotate);
        }
        item.append(label, controls);
        list.append(item);
      });
    }
    let placedSection = $('#placedTreasureSection');
    if (!placedSection) {
      placedSection = document.createElement('section');
      placedSection.id = 'placedTreasureSection';
      placedSection.className = 'placed-treasure-section';
      placedSection.innerHTML = '<h5></h5><ul id="placedTreasures"></ul>';
      list.after(placedSection);
    }
    placedSection.querySelector('h5').textContent = placementText.placedTitle;
    const placedList = placedSection.querySelector('#placedTreasures');
    placedList.innerHTML = '';
    if (!model.placedTreasures.length) {
      const empty = document.createElement('li');
      empty.className = 'treasure-summary-empty';
      empty.textContent = placementText.empty;
      placedList.append(empty);
    } else {
      model.placedTreasures.forEach((placement) => {
        const item = document.createElement('li');
        const position = coordinate(placement.startIndex);
        const label = document.createElement('span');
        label.textContent = `${placement.width}×${placement.height}・${position}`;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'treasure-remove-placement';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `${placement.width}×${placement.height} ${position}：${placementText.remove}`);
        remove.addEventListener('click', () => removePlacedTreasure(placement.id));
        item.append(label, remove);
        placedList.append(item);
      });
    }
    const total = SHAPE_KEYS.reduce((sum, key) => sum + model.shapeCounts[key], 0);
    $('#treasureTotal').textContent = pickerText.total(total);
    $('#treasurePicker').classList.toggle('is-advanced-spec', model.shapeMode === 'advanced');
  }
  function selectPlacement(key) {
    const [width, height] = key.split('x');
    selectedPlacement = selectedPlacement?.key === key ? null : { key, rotated: placementRotation[key] };
    renderShapePicker();
    showPickerStatus(selectedPlacement ? placementText.selected(`${width}×${height}`) : '');
  }
  function placeSelectedTreasure(startIndex) {
    if (!selectedPlacement) return false;
    const { key, rotated } = selectedPlacement;
    const placedCount = model.placedTreasures.filter((placement) => placement.key === key).length;
    if (placedCount >= model.shapeCounts[key]) return false;
    const footprint = placementCells(model.size, key, startIndex, rotated);
    const occupied = new Set(model.placedTreasures.flatMap((placement) => placement.cells));
    if (!footprint || footprint.cells.some((cell) => model.cells[cell] !== 'unknown' || occupied.has(cell))) {
      showPickerStatus(placementText.invalid, true);
      return false;
    }
    boardSnapshot();
    const placement = { id: `${key}-${Date.now()}-${model.placedTreasures.length}`, key, startIndex, rotated, ...footprint };
    model.placedTreasures.push(placement);
    footprint.cells.forEach((cell) => { model.cells[cell] = 'found'; });
    selectedPlacement = null;
    save();
    clearResult();
    buildBoard();
    renderShapePicker();
    showPickerStatus(placementText.placed(`${footprint.width}×${footprint.height}`));
    if (model.preferences.autoCalculate) scheduleCalculate();
    return true;
  }
  function removePlacedTreasure(id) {
    const index = model.placedTreasures.findIndex((placement) => placement.id === id);
    if (index < 0) return;
    boardSnapshot();
    const [removed] = model.placedTreasures.splice(index, 1);
    removed.cells.forEach((cell) => { model.cells[cell] = 'unknown'; });
    save();
    clearResult();
    buildBoard();
    renderShapePicker();
    if (model.preferences.autoCalculate) scheduleCalculate();
  }
  function commitTreasureChange(message) {
    model.shapeMode = 'picker';
    model.spec = shapeCountsToSpec(model.shapeCounts);
    $('#treasureSpec').value = model.spec;
    save();
    clearResult();
    buildBoard();
    renderShapePicker();
    showPickerStatus(message);
    if (model.preferences.autoCalculate) scheduleCalculate();
  }
  function changeShapeCount(key, delta) {
    const current = model.shapeCounts[key];
    if (delta > 0 && current >= MAX_SHAPE_COUNT) {
      showPickerStatus(pickerText.maxReached, true);
      return;
    }
    model.shapeCounts = adjustShapeCount(model.shapeCounts, key, delta);
    const [width, height] = key.split('x');
    commitTreasureChange(`${width}×${height}を${delta > 0 ? '追加' : '1個減ら'}しました`);
  }
  function syncSpecFromTextarea() {
    const text = $('#treasureSpec').value.trim();
    const parsed = parseShapeCountsSpec(text);
    if (parsed) {
      model.shapeCounts = parsed;
      model.placedTreasures = normalizePlacedTreasures(model.placedTreasures, model.size, parsed, model.cells);
      model.shapeMode = 'picker';
      model.spec = shapeCountsToSpec(parsed);
      $('#treasureSpec').value = model.spec;
      showPickerStatus('カスタム設定を宝形状へ反映しました');
    } else {
      model.shapeMode = 'advanced';
      model.spec = text;
      showPickerStatus('特殊specを上級者設定として使用します。形状カードを押すと通常設定へ戻ります。');
    }
    save();
    clearResult();
    buildBoard();
    renderShapePicker();
  }
  function buildBoard() {
    board.style.setProperty('--board-size', model.size);
    board.innerHTML = '';
    model.cells.forEach((state, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'treasure-cell';
      button.dataset.state = state;
      button.dataset.index = String(index);
      button.setAttribute('aria-label', `${coordinate(index)}：${STATE_LABELS[state]}`);
      const rankCandidate = lastResult?.topCandidates.find((candidate) => candidate.index === index)
        || (lastResult?.bestIndices.includes(index) ? { index, rank: 1 } : null);
      if (model.preferences.showRecommendations && rankCandidate) {
        button.classList.add('is-recommended', `recommendation-tier-${rankCandidate.rank === 1 ? 1 : rankCandidate.rank <= 3 ? 2 : 3}`);
      }
      if (selectedCandidateIndex === index) button.classList.add('is-selected-candidate');
      const probability = lastResult?.probabilities[index];
      const probabilityText = model.preferences.showProbability && state === 'unknown' && Number.isFinite(probability)
        ? `${Math.round(probability * 100)}%`
        : '';
      const rankText = model.preferences.showRecommendations && rankCandidate ? rankMark(rankCandidate.rank) : '';
      button.innerHTML = `<span class="cell-mark" aria-hidden="true">${STATE_MARKS[state]}</span><small class="cell-probability">${probabilityText}</small><em class="cell-rank" aria-hidden="true">${rankText}</em>`;
      button.addEventListener('click', () => {
        if (selectedPlacement) {
          placeSelectedTreasure(index);
          return;
        }
        setCell(index, model.preferences.inputMode);
      });
      button.addEventListener('dragover', (event) => {
        if (!selectedPlacement) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      });
      button.addEventListener('drop', (event) => {
        event.preventDefault();
        placeSelectedTreasure(index);
      });
      board.append(button);
    });
  }
  function setCell(index, state) {
    if (model.placedTreasures.some((placement) => placement.cells.includes(index))) {
      showPickerStatus('配置済みの宝は「配置を取り消す」で外してください。', true);
      return;
    }
    if (model.cells[index] === state) return;
    boardSnapshot();
    model.cells[index] = state;
    selectedCandidateIndex = null;
    save();
    clearResult();
    buildBoard();
    if (model.preferences.autoCalculate) scheduleCalculate();
  }
  function clearResult() {
    lastResult = null;
    selectedCandidateIndex = null;
    $('#solverResults').hidden = true;
    $('#candidateList').innerHTML = '';
  }
  function showStatus(title, text, error = false) {
    const status = $('#solverStatus');
    status.classList.toggle('is-error', error);
    status.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    status.append(strong, paragraph);
  }
  function showContradiction() {
    clearResult();
    buildBoard();
    showStatus(
      '配置候補がありません',
      '入力した空白・発見済みのどこかが実際の盤面と違う可能性があります。',
      true
    );
    $('#undo').classList.add('is-attention');
    $('#undo').focus({ preventScroll: true });
  }
  function showSearchLimit() {
    clearResult();
    buildBoard();
    showStatus(
      '探索上限に達しました',
      '条件が複雑すぎるため計算を安全に停止しました。宝の数を減らすか、盤面情報を追加してください。',
      true
    );
  }
  function renderResult(result) {
    lastResult = result;
    selectedCandidateIndex = null;
    buildBoard();
    $('#undo').classList.remove('is-attention');
    $('#solverResults').hidden = false;
    $('#maxProbability').textContent = result.topCandidates.length ? `${(result.bestProbability * 100).toFixed(1)}%` : '—';
    $('#validConfigurations').textContent = result.approximate
      ? resultText.approximateValue(result.sampleSize)
      : resultText.exactValue(result.configurations);
    $('#remainingPickaxes').textContent = result.remainingPickaxes == null ? '—' : `${result.remainingPickaxes}本`;
    $('#estimateNotice').hidden = !result.approximate;
    $('#estimateNotice').textContent = resultText.approximateNotice;
    $('#tieSummary').textContent = result.bestIndices.length > 1
      ? `同率最高 ${result.bestIndices.length}マス：${result.bestIndices.map(coordinate).join('、')}`
      : result.bestIndices.length === 1 ? `最高候補：${coordinate(result.bestIndices[0])}` : '未確認マスがありません。';
    const list = $('#candidateList');
    list.innerHTML = '';
    result.topCandidates.forEach((candidate) => {
      const card = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'candidate-button';
      button.dataset.candidateIndex = String(candidate.index);
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `${coordinate(candidate.index)}を盤面で強調`);
      const rank = document.createElement('strong');
      rank.textContent = candidate.rank === 1 && result.bestIndices.length > 1 ? '同率1位' : `${candidate.rank}位`;
      const cell = document.createElement('span');
      cell.textContent = coordinate(candidate.index);
      const probability = document.createElement('span');
      probability.textContent = `宝確率 ${(candidate.probability * 100).toFixed(1)}%`;
      const action = document.createElement('small');
      action.textContent = 'このマスを盤面で選ぶ';
      button.append(rank, cell, probability, action);
      button.addEventListener('click', () => selectCandidate(candidate.index, button));
      card.append(button);
      list.append(card);
    });
    showStatus(
      result.approximate ? resultText.approximateTitle : resultText.exactTitle,
      result.approximate
        ? resultText.approximateDetail(result.sampleSize)
        : resultText.exactDetail(result.configurations)
    );
  }
  function selectCandidate(index, sourceButton) {
    selectedCandidateIndex = index;
    buildBoard();
    document.querySelectorAll('.candidate-button').forEach((button) => {
      const selected = button.dataset.candidateIndex === String(index);
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const cell = board.querySelector(`[data-index="${index}"]`);
    cell?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    sourceButton.focus({ preventScroll: true });
    showStatus('次に開ける候補として選択しました', `${coordinate(index)}を盤面で強調しています。マスの状態はまだ変更していません。`);
  }
  function setCalculating(value) {
    calculating = value;
    [$('#calculate'), $('#calculateMobile')].forEach((button) => {
      button.disabled = value;
      button.textContent = value ? resultText.calculating : resultText.calculate;
    });
    board.setAttribute('aria-busy', String(value));
  }
  function calculate() {
    if (calculating) return;
    syncSpecFromTextarea();
    setCalculating(true);
    showStatus(resultText.calculating, resultText.calculatingDetail);
    window.setTimeout(() => {
      try {
        const result = solveTreasureModel(model);
        if (!result.configurations && result.capped) showSearchLimit();
        else if (!result.configurations) showContradiction();
        else renderResult(result);
        window.monsabaTrack?.('event_tool_use', { tool: 'treasure_hunt', action: 'calculate' });
      } catch (error) {
        clearResult();
        buildBoard();
        showStatus('設定を確認してください', error instanceof Error ? error.message : '宝の形を確認してください。', true);
      } finally {
        setCalculating(false);
      }
    }, 0);
  }
  function scheduleCalculate() {
    window.clearTimeout(calculateTimer);
    calculateTimer = window.setTimeout(calculate, 260);
  }
  function syncPreference(name, value) {
    model.preferences[name] = value;
    save();
    syncControls();
    buildBoard();
  }

  document.querySelectorAll('[data-input-mode]').forEach((button) => {
    button.addEventListener('click', () => syncPreference('inputMode', button.dataset.inputMode));
  });
  $('#boardSize').addEventListener('change', (event) => {
    boardSnapshot();
    model.size = Number(event.target.value);
    model.cells = Array(model.size * model.size).fill('unknown');
    model.placedTreasures = [];
    save();
    clearResult();
    buildBoard();
  });
  $('#treasureSpec').addEventListener('input', () => {
    window.clearTimeout(specSyncTimer);
    specSyncTimer = window.setTimeout(() => {
      syncSpecFromTextarea();
      if (model.preferences.autoCalculate) scheduleCalculate();
    }, 300);
  });
  $('#treasureSpec').addEventListener('change', () => {
    window.clearTimeout(specSyncTimer);
    syncSpecFromTextarea();
    if (model.preferences.autoCalculate) scheduleCalculate();
  });
  $('#clearTreasureSettings').addEventListener('click', () => {
    model.placedTreasures.flatMap((placement) => placement.cells).forEach((cell) => { model.cells[cell] = 'unknown'; });
    model.shapeCounts = normalizeShapeCounts();
    model.placedTreasures = [];
    commitTreasureChange('宝形状と個数だけをクリアしました');
  });
  $('#showProbability').addEventListener('change', (event) => syncPreference('showProbability', event.target.checked));
  $('#showRecommendations').addEventListener('change', (event) => syncPreference('showRecommendations', event.target.checked));
  $('#autoCalculate').addEventListener('change', (event) => syncPreference('autoCalculate', event.target.checked));
  $('#calculate').addEventListener('click', calculate);
  $('#calculateMobile').addEventListener('click', calculate);
  $('#undo').addEventListener('click', () => {
    const snapshot = history.pop();
    if (!snapshot) return;
    restoreSnapshot(snapshot);
    showStatus('直前の入力を戻しました', '必要なら続けてUndoできます。');
    $('#undo').classList.remove('is-attention');
    updateUndoState();
    if (model.preferences.autoCalculate) scheduleCalculate();
  });
  $('#reset').addEventListener('click', () => {
    if (!window.confirm('本当に盤面をリセットしますか？')) return;
    model.cells = Array(model.size * model.size).fill('unknown');
    model.placedTreasures = [];
    history = [];
    save();
    clearResult();
    buildBoard();
    updateUndoState();
    showStatus('盤面をリセットしました', '入力モードと表示設定はそのままです。');
  });
  restore();
  syncControls();
  updateUndoState();
  buildBoard();
}

if (typeof document !== 'undefined') boot();
