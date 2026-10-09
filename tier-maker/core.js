export const STORAGE_KEY = 'monsaba-tier-maker:v1';
export const LIMITS = Object.freeze({ categories: 16, tiers: 20, name: 40 });
export const DEFAULT_ROLES = ['front', 'healer', 'dps', 'buff', 'overall'];
const COLORS = ['#f59b9b', '#f6bd82', '#f4d979', '#a6d9aa', '#94c5eb'];
const uid = () => globalThis.crypto.randomUUID();
const text = value => String(value ?? '').trim().slice(0, LIMITS.name);
const clone = value => structuredClone(value);
export const categoryName = (category, copy) => category.role ? copy.roles[category.role] : category.name;
export const createCategory = (name = '', role = null) => ({
  id: uid(), name: text(name), role,
  tiers: ['S', 'A', 'B', 'C', 'D'].map((name, i) => ({ id: uid(), name, color: COLORS[i], cards: [] }))
});
export const createState = () => ({ version: 1, title: '', categories: DEFAULT_ROLES.map(role => createCategory('', role)) });
export const unplacedIds = (category, ids) => {
  const placed = new Set(category.tiers.flatMap(tier => tier.cards));
  return ids.filter(id => !placed.has(id));
};

// Validate the whole draft before replacing it. Unknown catalog IDs are retained for
// a future catalog version; they are never reassigned to a different character.
export function parseState(raw) {
  const state = JSON.parse(raw);
  if (state?.version !== 1 || typeof state.title !== 'string' || state.title.length > 80 ||
      !Array.isArray(state.categories) || !state.categories.length || state.categories.length > LIMITS.categories)
    throw new Error('Invalid draft');
  const ids = new Set();
  const uniqueId = id => {
    if (typeof id !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(id) || ids.has(id)) throw new Error('Invalid ID');
    ids.add(id);
  };
  for (const category of state.categories) {
    uniqueId(category.id);
    if (!(category.role === null || DEFAULT_ROLES.includes(category.role)) || typeof category.name !== 'string' ||
        category.name.length > LIMITS.name || (!category.role && !category.name.trim()) ||
        !Array.isArray(category.tiers) || !category.tiers.length || category.tiers.length > LIMITS.tiers)
      throw new Error('Invalid category');
    const placed = new Set();
    for (const tier of category.tiers) {
      uniqueId(tier.id);
      if (typeof tier.name !== 'string' || !tier.name.trim() || tier.name.length > LIMITS.name ||
          !/^#[0-9a-f]{6}$/i.test(tier.color) || !Array.isArray(tier.cards) || tier.cards.length > 1000)
        throw new Error('Invalid tier');
      for (const id of tier.cards) {
        if (typeof id !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(id) || placed.has(id)) throw new Error('Invalid character');
        placed.add(id);
      }
    }
  }
  return state;
}

export function updateState(state, action, rosterIds) {
  const next = clone(state);
  if (action.type === 'title') { next.title = String(action.value).slice(0, 80); return next; }
  if (action.type === 'reset') return createState();
  if (action.type === 'clear') {
    for (const category of next.categories) for (const tier of category.tiers) tier.cards = [];
    return next;
  }
  if (action.type === 'add-category') {
    if (next.categories.length < LIMITS.categories && text(action.name)) next.categories.push(createCategory(action.name));
    return next;
  }
  const category = next.categories.find(item => item.id === action.categoryId);
  if (!category) return next;
  if (action.type === 'rename-category' && text(action.name)) { category.name = text(action.name); category.role = null; }
  if (action.type === 'delete-category' && next.categories.length > 1)
    next.categories = next.categories.filter(item => item.id !== category.id);
  if (action.type === 'add-tier' && category.tiers.length < LIMITS.tiers && text(action.name))
    category.tiers.push({ id: uid(), name: text(action.name), color: '#c9bedf', cards: [] });
  const tier = category.tiers.find(item => item.id === action.tierId);
  if (action.type === 'delete-tier' && tier && category.tiers.length > 1)
    category.tiers = category.tiers.filter(item => item.id !== tier.id);
  if (action.type === 'rename-tier' && tier && text(action.name)) tier.name = text(action.name);
  if (action.type === 'color' && tier && /^#[0-9a-f]{6}$/i.test(action.value)) tier.color = action.value;
  if (action.type === 'reorder-tier' && tier) {
    const index = category.tiers.indexOf(tier), target = index + action.offset;
    if (Number.isInteger(target) && target >= 0 && target < category.tiers.length) {
      category.tiers.splice(index, 1); category.tiers.splice(target, 0, tier);
    }
  }
  if (action.type === 'move' && rosterIds.includes(action.cardId) && (tier || action.tierId === null)) {
    if (action.beforeId === action.cardId) return next;
    for (const row of category.tiers) row.cards = row.cards.filter(id => id !== action.cardId);
    if (tier) {
      const position = tier.cards.indexOf(action.beforeId);
      tier.cards.splice(position < 0 ? tier.cards.length : position, 0, action.cardId);
    }
  }
  return next;
}

export function exportLayout(category, ids, includeUnplaced, width = 1200) {
  const known = new Set(ids), columns = Math.max(1, Math.floor((width - 160) / 100));
  const rows = category.tiers.map(tier => ({ ...tier, cards: tier.cards.filter(id => known.has(id)) }));
  if (includeUnplaced) rows.push({ name: null, color: '#dbe1e9', cards: unplacedIds(category, ids) });
  return rows.map(row => ({ ...row, columns, height: Math.max(100, Math.ceil(row.cards.length / columns) * 112 + 16) }));
}
