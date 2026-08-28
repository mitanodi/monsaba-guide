export const STORAGE_KEY = 'monsaba-treasure-solver-v1';
export const STORAGE_VERSION = 2;
export const STATES = ['unknown', 'miss', 'hit', 'found'];
export const STATE_LABELS = { unknown: '未確認', miss: '空白', hit: '宝ヒット', found: '発見済み' };
export const STATE_MARKS = { unknown: '?', miss: '×', hit: '◆', found: '✓' };
const DEFAULT_SPEC = '2x2:1, 1x3:1';
const DEFAULT_PREFERENCES = {
  inputMode: 'miss',
  showProbability: true,
  showRecommendations: true,
  autoCalculate: false
};

export function createDefaultModel(size = 6) {
  return {
    version: STORAGE_VERSION,
    size,
    spec: DEFAULT_SPEC,
    cells: Array(size * size).fill('unknown'),
    preferences: { ...DEFAULT_PREFERENCES }
  };
}

export function normalizeModel(value) {
  const size = [5, 6, 7, 8].includes(Number(value?.size)) ? Number(value.size) : 6;
  const cells = Array.isArray(value?.cells) && value.cells.length === size * size
    ? value.cells.map((state) => STATES.includes(state) ? state : 'unknown')
    : Array(size * size).fill('unknown');
  return {
    version: STORAGE_VERSION,
    size,
    spec: typeof value?.spec === 'string' && value.spec.trim() ? value.spec.trim() : DEFAULT_SPEC,
    cells,
    preferences: {
      inputMode: STATES.includes(value?.preferences?.inputMode) ? value.preferences.inputMode : DEFAULT_PREFERENCES.inputMode,
      showProbability: value?.preferences?.showProbability !== false,
      showRecommendations: value?.preferences?.showRecommendations !== false,
      autoCalculate: value?.preferences?.autoCalculate === true
    }
  };
}

export function parseSpec(text, size) {
  const shapes = [];
  for (const part of String(text || '').split(',')) {
    const source = part.trim();
    const match = source.match(/^(\d+)x(\d+):(\d+)$/i);
    if (!match) throw new Error(`形式を確認してください: ${source}`);
    const width = Number(match[1]);
    const height = Number(match[2]);
    const count = Number(match[3]);
    if (width < 1 || height < 1 || count < 1 || width > size || height > size || count > 8) {
      throw new Error('宝の形・個数が盤面の範囲外です。');
    }
    for (let index = 0; index < count; index += 1) {
      shapes.push({ w: width, h: height, id: `${width}x${height}-${index}` });
    }
  }
  if (!shapes.length) throw new Error('宝を1個以上入力してください。');
  return shapes.sort((a, b) => (b.w * b.h) - (a.w * a.h));
}

function placementsForShape(shape, model) {
  const placements = [];
  for (let y = 0; y <= model.size - shape.h; y += 1) {
    for (let x = 0; x <= model.size - shape.w; x += 1) {
      const cells = [];
      for (let dy = 0; dy < shape.h; dy += 1) {
        for (let dx = 0; dx < shape.w; dx += 1) cells.push((y + dy) * model.size + x + dx);
      }
      if (!cells.some((cell) => model.cells[cell] === 'miss')) placements.push(cells);
    }
  }
  return placements;
}

export function solveTreasureModel(rawModel, cap = 20000) {
  const model = normalizeModel(rawModel);
  const shapes = parseSpec(model.spec, model.size);
  const candidates = shapes.map((shape) => placementsForShape(shape, model));
  if (candidates.some((list) => list.length === 0)) {
    return { configurations: 0, capped: false, probabilities: [], topCandidates: [], bestIndices: [], shapes };
  }
  const required = new Set(model.cells.flatMap((state, index) => (
    state === 'hit' || state === 'found' ? [index] : []
  )));
  const configurations = [];

  function backtrack(depth, used, chosen) {
    if (configurations.length >= cap) return;
    if (depth === shapes.length) {
      if ([...required].every((cell) => used.has(cell))) configurations.push(chosen.flat());
      return;
    }
    for (const placement of candidates[depth]) {
      if (placement.some((cell) => used.has(cell))) continue;
      const next = new Set(used);
      placement.forEach((cell) => next.add(cell));
      const remainingCells = candidates.slice(depth + 1).flat().flat();
      if ([...required].some((cell) => !next.has(cell) && !remainingCells.includes(cell))) continue;
      backtrack(depth + 1, next, [...chosen, placement]);
      if (configurations.length >= cap) break;
    }
  }

  backtrack(0, new Set(), []);
  if (!configurations.length) {
    return { configurations: 0, capped: false, probabilities: [], topCandidates: [], bestIndices: [], shapes };
  }
  const tally = Array(model.cells.length).fill(0);
  configurations.forEach((cells) => new Set(cells).forEach((cell) => { tally[cell] += 1; }));
  const probabilities = tally.map((count) => count / configurations.length);
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
    shapes.reduce((sum, shape) => sum + (shape.w * shape.h), 0)
      - model.cells.filter((state) => state === 'found').length
  );
  return {
    configurations: configurations.length,
    capped: configurations.length >= cap,
    probabilities,
    topCandidates,
    bestIndices,
    bestProbability,
    remainingPickaxes: bestProbability > 0 ? Math.ceil(remainingTreasureCells / bestProbability) : null,
    shapes
  };
}

function boot() {
  const $ = (selector) => document.querySelector(selector);
  const board = $('#board');
  if (!board) return;
  board.setAttribute('role', 'group');

  let model = createDefaultModel();
  let history = [];
  let lastResult = null;
  let selectedCandidateIndex = null;
  let calculateTimer = null;
  let calculating = false;

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
    history.push({ size: model.size, spec: model.spec, cells: [...model.cells] });
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
      button.addEventListener('click', () => setCell(index, model.preferences.inputMode));
      board.append(button);
    });
  }
  function setCell(index, state) {
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
      '入力した空白・宝ヒット・発見済みのどこかが実際の盤面と違う可能性があります。',
      true
    );
    $('#undo').classList.add('is-attention');
    $('#undo').focus({ preventScroll: true });
  }
  function renderResult(result) {
    lastResult = result;
    selectedCandidateIndex = null;
    buildBoard();
    $('#undo').classList.remove('is-attention');
    $('#solverResults').hidden = false;
    $('#maxProbability').textContent = result.topCandidates.length ? `${(result.bestProbability * 100).toFixed(1)}%` : '—';
    $('#validConfigurations').textContent = `${result.configurations.toLocaleString()}通り${result.capped ? '（概算）' : ''}`;
    $('#remainingPickaxes').textContent = result.remainingPickaxes == null ? '—' : `${result.remainingPickaxes}本`;
    $('#estimateNotice').hidden = !result.capped;
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
      result.capped ? '候補上限に達したため概算です' : '確率を計算しました',
      result.capped
        ? `${result.configurations.toLocaleString()}候補を利用して確率を算出しています。`
        : `${result.configurations.toLocaleString()}件の有効配置から算出しました。`
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
    const button = $('#calculate');
    button.disabled = value;
    button.textContent = value ? '計算中…' : '確率を計算';
    board.setAttribute('aria-busy', String(value));
  }
  function calculate() {
    if (calculating) return;
    model.spec = $('#treasureSpec').value.trim();
    save();
    setCalculating(true);
    showStatus('計算中…', '入力条件に合う宝配置を確認しています。');
    window.setTimeout(() => {
      try {
        const result = solveTreasureModel(model);
        if (!result.configurations) showContradiction();
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
    save();
    clearResult();
    buildBoard();
  });
  $('#treasureSpec').addEventListener('change', () => {
    model.spec = $('#treasureSpec').value.trim();
    save();
    clearResult();
    buildBoard();
    if (model.preferences.autoCalculate) scheduleCalculate();
  });
  $('#showProbability').addEventListener('change', (event) => syncPreference('showProbability', event.target.checked));
  $('#showRecommendations').addEventListener('change', (event) => syncPreference('showRecommendations', event.target.checked));
  $('#autoCalculate').addEventListener('change', (event) => syncPreference('autoCalculate', event.target.checked));
  $('#calculate').addEventListener('click', calculate);
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
