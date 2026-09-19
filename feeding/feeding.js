export const STORAGE_KEY = 'monsaba-feeding-simulator-v1';
export const STORAGE_VERSION = 1;

export const FOODS = Object.freeze([
  { id: 'soda', asset: 'soda', points: 5, tier: 'confirmed', source: '公式動画で+5表示を確認' },
  { id: 'ice-cream', asset: 'ice-cream', points: 5, tier: 'confirmed', source: '公式動画で+5表示を確認' },
  { id: 'potatoes', asset: 'potatoes', points: 5, tier: 'confirmed', source: '公式動画で+5表示を確認' },
  { id: 'noodles', asset: 'noodles', points: 10, tier: 'confirmed', source: '公式動画で+10表示を確認' },
  { id: 'salad', asset: 'salad', points: 10, tier: 'confirmed', source: '公式動画で+10表示を確認' },
  { id: 'smoothie', asset: 'smoothie', points: 10, tier: 'confirmed', source: '公式動画で+10表示を確認' },
  { id: 'pizza', asset: 'pizza', points: 30, tier: 'confirmed', source: '公式動画で+30表示を確認' },
  { id: 'soup', asset: 'soup', points: 30, tier: 'confirmed', source: '公式動画で+30表示を確認' },
  { id: 'sushi', asset: 'sushi', points: 30, tier: 'confirmed', source: '公式動画で+30表示を確認' }
]);

export function createDefaultModel() {
  return { version: STORAGE_VERSION, target: 100, current: 0, history: [] };
}

const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export function normalizeModel(value) {
  const base = createDefaultModel();
  if (!value || typeof value !== 'object') return base;
  const history = Array.isArray(value.history) ? value.history
    .filter((entry) => entry && Number.isFinite(Number(entry.points)) && typeof entry.label === 'string')
    .slice(-100)
    .map((entry) => ({ id: String(entry.id || cryptoRandomId()), label: entry.label.slice(0, 80), points: Math.max(0, Math.min(9999, Number(entry.points))) })) : [];
  return {
    version: STORAGE_VERSION,
    target: Math.max(1, Math.min(9999, numberOr(value.target, base.target))),
    current: Math.max(0, Math.min(9999, numberOr(value.current, base.current))),
    history
  };
}

function cryptoRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addFood(model, entry) {
  const points = Math.max(1, Math.min(9999, numberOr(entry?.points, 0)));
  const label = String(entry?.label || '').trim().slice(0, 80);
  if (!label || !points) return normalizeModel(model);
  const normalized = normalizeModel(model);
  return { ...normalized, current: Math.min(9999, normalized.current + points), history: [...normalized.history, { id: cryptoRandomId(), label, points }] };
}

export function undoLast(model) {
  const normalized = normalizeModel(model);
  const last = normalized.history.at(-1);
  if (!last) return normalized;
  return { ...normalized, current: Math.max(0, normalized.current - last.points), history: normalized.history.slice(0, -1) };
}

export function remainingPoints(model) {
  const normalized = normalizeModel(model);
  return Math.max(0, normalized.target - normalized.current);
}

const copy = {
  ja: {
    title: '餌付けシミュレーター', lead: '公式動画で確認できた食品画像とポイント表示を使い、必要な餌の組み合わせを端末内で試せます。',
    target: '目標ポイント', current: '現在ポイント', remaining: '残り', history: '追加履歴', noHistory: 'まだ食品を追加していません。',
    candidates: '公式画像で確認済みの候補', manual: '手動で加算', manualPlaceholder: 'ポイント', add: '追加', undo: '直前を戻す', reset: 'すべてリセット',
    confirmed: '動画でポイント表示を確認', caveat: '食品の正式名称・属性効果は確認中です。ファイル名・外部照合に基づく候補名を、ゲーム内の確定名称としては扱っていません。',
    source: '公式Creator Assetsを使用', facility: '自動餌やり機の公式画像を確認済み', foodNames: ['ソーダ候補', 'アイス候補', 'ポテト候補', 'ヌードル候補', 'サラダ候補', 'スムージー候補', 'ピザ候補', 'スープ候補', '寿司候補']
  },
  en: {
    title: 'Feeding Simulator', lead: 'Try feeding-point combinations locally using food images and point labels visible in official footage.',
    target: 'Target points', current: 'Current points', remaining: 'Remaining', history: 'Added items', noHistory: 'No food has been added yet.',
    candidates: 'Candidates with verified official images', manual: 'Add points manually', manualPlaceholder: 'Points', add: 'Add', undo: 'Undo last', reset: 'Reset all',
    confirmed: 'Point label verified in official footage', caveat: 'Official localized names and attribute effects are still being checked. Candidate names are not presented as confirmed in-game names.',
    source: 'Uses official Creator Assets', facility: 'Official Auto Feeder image verified', foodNames: ['Soda candidate', 'Ice cream candidate', 'Potato candidate', 'Noodles candidate', 'Salad candidate', 'Smoothie candidate', 'Pizza candidate', 'Soup candidate', 'Sushi candidate']
  },
  'zh-CN': {
    title: '喂食模拟器', lead: '使用官方视频中可确认的食物图片和积分显示，在本设备上试算喂食组合。',
    target: '目标积分', current: '当前积分', remaining: '还差', history: '添加记录', noHistory: '尚未添加食物。',
    candidates: '已确认官方图片的候选', manual: '手动添加积分', manualPlaceholder: '积分', add: '添加', undo: '撤销上一步', reset: '全部重置',
    confirmed: '已在官方视频中确认积分显示', caveat: '食物的正式本地化名称和属性效果仍在核实中。候选名称并非已确认的游戏内名称。',
    source: '使用官方 Creator Assets', facility: '已确认自动喂食器官方图片', foodNames: ['汽水候选', '冰淇淋候选', '土豆候选', '面条候选', '沙拉候选', '冰沙候选', '披萨候选', '汤候选', '寿司候选']
  }
};

function safeRead() {
  try { return normalizeModel(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return createDefaultModel(); }
}
function safeWrite(model) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(model)); } catch { /* local-only persistence is optional */ }
}

function mount() {
  const root = document.querySelector('[data-feeding-app]');
  if (!root) return;
  const locale = copy[document.body.dataset.locale] ? document.body.dataset.locale : 'ja';
  const text = copy[locale];
  const images = Object.fromEntries(FOODS.map((food) => [food.asset, `/assets/official/feeding/${food.asset}.webp`]));
  let model = safeRead();
  const render = () => {
    const remaining = remainingPoints(model);
    const completed = remaining === 0;
    root.innerHTML = `<section class="feeding-summary" aria-labelledby="feeding-title"><div><p class="feeding-kicker">${text.source}</p><h1 id="feeding-title">${text.title}</h1><p>${text.lead}</p></div><img src="/assets/official/feeding/automatic-feeder.webp" width="300" height="244" alt="${text.facility}" loading="eager"></section>
      <section class="feeding-score-grid" aria-label="${text.title}"><label>${text.target}<input id="feedingTarget" type="number" min="1" max="9999" value="${model.target}"></label><label>${text.current}<input id="feedingCurrent" type="number" min="0" max="9999" value="${model.current}"></label><div class="feeding-remaining ${completed ? 'is-complete' : ''}"><span>${text.remaining}</span><strong>${remaining}</strong></div></section>
      <section class="feeding-candidates"><div class="feeding-section-heading"><div><h2>${text.candidates}</h2><p>${text.confirmed}</p></div></div><div class="feeding-food-grid">${FOODS.map((food, index) => `<button class="feeding-food" type="button" data-food-id="${food.id}"><img src="${images[food.asset]}" width="160" height="160" alt="${text.foodNames[index]}" loading="lazy"><span>${text.foodNames[index]}</span><strong>+${food.points}</strong></button>`).join('')}</div></section>
      <section class="feeding-manual"><h2>${text.manual}</h2><div><input id="manualPoints" type="number" min="1" max="9999" placeholder="${text.manualPlaceholder}"><button id="manualAdd" class="button" type="button">${text.add}</button></div><p>+15 の果実は単独の公式画像を確認できていないため、ここから数値だけを加算できます。</p></section>
      <section class="feeding-history"><div class="feeding-history-title"><h2>${text.history}</h2><div><button id="feedingUndo" class="ghost-button" type="button" ${model.history.length ? '' : 'disabled'}>${text.undo}</button><button id="feedingReset" class="ghost-button" type="button">${text.reset}</button></div></div>${model.history.length ? `<ol>${model.history.slice().reverse().map((entry) => `<li><span>${entry.label}</span><strong>+${entry.points}</strong></li>`).join('')}</ol>` : `<p>${text.noHistory}</p>`}</section>
      <p class="feeding-caveat" role="note">${text.caveat}</p>`;
    root.querySelectorAll('[data-food-id]').forEach((button) => button.addEventListener('click', () => {
      const food = FOODS.find((entry) => entry.id === button.dataset.foodId);
      const index = FOODS.indexOf(food);
      model = addFood(model, { label: text.foodNames[index], points: food.points }); safeWrite(model); render();
    }));
    root.querySelector('#feedingTarget').addEventListener('change', (event) => { model = normalizeModel({ ...model, target: event.target.value }); safeWrite(model); render(); });
    root.querySelector('#feedingCurrent').addEventListener('change', (event) => { model = normalizeModel({ ...model, current: event.target.value }); safeWrite(model); render(); });
    root.querySelector('#manualAdd').addEventListener('click', () => { const input = root.querySelector('#manualPoints'); const points = Number(input.value); if (points > 0) { model = addFood(model, { label: text.manual, points }); safeWrite(model); render(); } });
    root.querySelector('#feedingUndo').addEventListener('click', () => { model = undoLast(model); safeWrite(model); render(); });
    root.querySelector('#feedingReset').addEventListener('click', () => { if (window.confirm(locale === 'ja' ? 'ポイントと履歴をリセットしますか？' : locale === 'en' ? 'Reset points and history?' : '要重置积分和记录吗？')) { model = createDefaultModel(); safeWrite(model); render(); } });
  };
  render();
}

if (typeof document !== 'undefined') mount();
