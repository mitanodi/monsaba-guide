import '../catalog-order.js';
import { STORAGE_KEY, parseState, categoryName } from '../tier-maker/core.js';
import { COPY } from '../tier-maker/copy.js';

export const TIER_DRAFT_KEY = STORAGE_KEY;
export const ORDER_KEY = 'monsaba-picker-order:v1';
export function readPersonalTiers(storage) {
  try {
    const raw = storage.getItem(TIER_DRAFT_KEY);
    return raw ? parseState(raw) : null;
  } catch { return null; }
}
export const personalTierOptions = (draft, locale) => (draft?.categories || []).map(category => ({
  id: category.id, name: categoryName(category, COPY[locale] || COPY.ja)
}));
export const validOrder = (id, draft) => draft?.categories.some(category => category.id === id) ? id : '';
export function loadOrder(storage, draft) {
  try { return validOrder(storage.getItem(ORDER_KEY), draft); } catch { return ''; }
}
export function saveOrder(storage, id) {
  try { storage.setItem(ORDER_KEY, id); } catch { /* ordering still works for this visit */ }
}
export function personalTierOrder(families, draft, id) {
  const category = draft?.categories.find(category => category.id === id);
  // Custom labels have no implied grade. Follow the saved row and card positions.
  return globalThis.MONSABA_CATALOG_ORDER.byIds(families, category?.tiers.flatMap(tier => tier.cards) || []);
}
