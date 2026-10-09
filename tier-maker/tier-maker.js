import { COPY } from './copy.js';
import { STORAGE_KEY, LIMITS, createState, parseState, updateState, unplacedIds, categoryName, exportLayout } from './core.js';
import '../family-display.js';
import { stageImageFor, pickerOrder } from '../team-builder/team-core.js';

const locale = document.documentElement.lang;
const copy = COPY[locale] || COPY.ja;
const app = document.querySelector('[data-tier-maker]');
const status = document.querySelector('[data-status]');
const dialog = document.querySelector('[data-dialog]');
const exportDialog = document.querySelector('[data-image-dialog]');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const button = (action, label, attrs = '') => `<button type="button" data-action="${action}" ${attrs}>${esc(label)}</button>`;
const { getFamilyDisplayName, getFamilySearchAliases } = globalThis.MONSABA_FAMILY;
let state, activeId, selectedId = null, roster = [], images = new Map(), ids = [], byId = new Map();
let history = [], future = [], query = '', attribute = '', dragged = null, clickUntil = 0, exportUrl = null, busy = false;
let dialogAction = null;
const nameOf = family => getFamilyDisplayName(family, locale);
const category = () => state.categories.find(item => item.id === activeId) || state.categories[0];
const message = value => { status.textContent = value; };
const focused = () => {
  const node = document.activeElement;
  return node?.closest('[data-tier-maker]') && node.dataset.focus ? node.dataset.focus : null;
};
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); message(copy.saved); }
  catch { message(copy.storageError); }
}
function dispatch(action) {
  const next = updateState(state, { categoryId: activeId, ...action }, ids);
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  history.push(state); if (history.length > 50) history.shift();
  future = []; state = next; activeId = category().id;
  if (action.type !== 'title') selectedId = null;
  persist();
  if (action.type === 'title') {
    app.querySelector('[data-action="undo"]').disabled = !history.length;
    app.querySelector('[data-action="redo"]').disabled = !future.length;
  } else render();
}
function restore(direction) {
  const source = direction === 'undo' ? history : future, target = direction === 'undo' ? future : history;
  if (!source.length) return;
  target.push(state); state = source.pop(); activeId = category().id; selectedId = null;
  persist(); render();
}
function imageMarkup(family) {
  const img = stageImageFor(family, 1, images);
  return img ? `<img src="${esc(img.src)}" alt="" width="64" height="64" loading="lazy" draggable="false">` : '<span class="tm-placeholder" aria-hidden="true">?</span>';
}
function cardMarkup(id, tierId = '') {
  const family = byId.get(id);
  if (!family) return '';
  return `<button type="button" class="tm-card${selectedId === id ? ' is-selected' : ''}" data-card="${id}" data-tier="${tierId}" data-focus="card-${id}" draggable="true" aria-pressed="${selectedId === id}" title="${esc(nameOf(family))}">${imageMarkup(family)}<span translate="no">${esc(nameOf(family))}</span></button>`;
}
function render() {
  const focus = focused(), current = category();
  const selectedTier = current.tiers.find(tier => tier.cards.includes(selectedId));
  const selectedIndex = selectedTier?.cards.indexOf(selectedId) ?? -1;
  const unknown = current.tiers.some(tier => tier.cards.some(id => !byId.has(id)));
  app.innerHTML = `
    <section class="tm-toolbar">
      <label class="tm-title-input">${esc(copy.tableTitle)}<input data-title data-focus="title" maxlength="80" value="${esc(state.title)}" placeholder="${esc(copy.placeholder)}"></label>
      <div class="tm-actions">${button('undo', copy.undo, `${!history.length ? 'disabled' : ''} data-focus="undo"`)}${button('redo', copy.redo, `${!future.length ? 'disabled' : ''} data-focus="redo"`)}${button('export-all', copy.export, 'class="tm-primary"')}</div>
    </section>
    <div class="tm-category-bar"><div class="tm-tabs" role="group" aria-label="${esc(copy.category)}">${state.categories.map(item => button('category', categoryName(item, copy), `data-id="${item.id}" aria-pressed="${item.id === activeId}" data-focus="category-${item.id}"`)).join('')}</div>${button('add-category', `＋ ${copy.addCategory}`, state.categories.length >= LIMITS.categories ? 'disabled' : '')}</div>
    <section class="tm-board" aria-labelledby="tm-category-title">
      <div class="tm-board-head"><div><h2 id="tm-category-title">${esc(categoryName(current, copy))}</h2></div><div class="tm-actions">${button('rename-category', copy.rename)}${button('delete-category', copy.remove, state.categories.length <= 1 ? 'disabled' : '')}${button('export-one', copy.image, 'class="tm-primary"')}</div></div>
      <div class="tm-selection" aria-live="polite"><div>${selectedId ? `<strong>${esc(copy.select)}: <span translate="no">${esc(nameOf(byId.get(selectedId)))}</span></strong><p>${esc(copy.selectedHint)}</p>` : esc(copy.help)}</div>${selectedId ? `<div class="tm-actions">${selectedTier ? `${button('card-left', `← ${copy.previous}`, selectedIndex <= 0 ? 'disabled' : '')}${button('card-right', `${copy.next} →`, selectedIndex >= selectedTier.cards.length - 1 ? 'disabled' : '')}${button('unplace', copy.return)}` : ''}${button('cancel', copy.cancel)}</div>` : ''}</div>
      ${unknown ? `<p class="tm-warning">${esc(copy.unknown)}</p>` : ''}
      <div class="tm-rows">${current.tiers.map(tier => `
        <section class="tm-row" data-row="${tier.id}" aria-label="${esc(tier.name)}">
          <div class="tm-rank" style="--tier-color:${tier.color}">
            <button type="button" class="tm-rank-name" data-action="rename-tier" data-tier="${tier.id}" title="${esc(copy.rename)}">${esc(tier.name)}</button>
          </div>
          <div class="tm-drop" data-drop="${tier.id}">${tier.cards.map(id => cardMarkup(id, tier.id)).join('')}<button type="button" class="tm-append" data-action="append" data-tier="${tier.id}" ${!selectedId ? 'disabled' : ''}>＋<span>${esc(copy.empty)}</span></button></div>
        </section>`).join('')}</div>
      <div class="tm-board-foot">${button('add-tier', `＋ ${copy.addTier}`, current.tiers.length >= LIMITS.tiers ? 'disabled' : '')}<span>${current.tiers.reduce((sum, tier) => sum + tier.cards.filter(id => byId.has(id)).length, 0)} / ${ids.length}</span></div>
    </section>
    <section class="tm-pool" data-drop="" aria-labelledby="tm-unplaced-title">
      <div class="tm-pool-head"><h2 id="tm-unplaced-title">${esc(copy.unplaced)} <small>(${unplacedIds(current, ids).length})</small></h2><div class="tm-filters"><label><span>${esc(copy.search)}</span><input type="search" data-search data-focus="search" value="${esc(query)}" placeholder="${esc(copy.searchHint)}"></label><label><span class="tm-sr-only">${esc(copy.all)}</span><select data-attribute data-focus="attribute"><option value="">${esc(copy.all)}</option>${Object.entries(copy.attributes).map(([value, label]) => `<option value="${value}" ${value === attribute ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div></div>
      <div class="tm-pool-cards" data-pool-cards></div>
    </section>
    <div class="tm-bottom-actions">${button('clear', copy.clear)}${button('reset', copy.reset, 'class="tm-danger"')}</div>
    <p class="tm-local-note">${esc(copy.localNote)}</p>`;
  renderPool();
  if (focus) app.querySelector(`[data-focus="${CSS.escape(focus)}"]`)?.focus({ preventScroll: true });
}
function renderPool() {
  const normalized = query.trim().toLocaleLowerCase().normalize('NFKC');
  const matches = unplacedIds(category(), ids).filter(id => {
    const family = byId.get(id);
    return (!attribute || attribute === family.attribute) && (!normalized || getFamilySearchAliases(family).some(name => name.toLocaleLowerCase().normalize('NFKC').includes(normalized)));
  });
  app.querySelector('[data-pool-cards]').innerHTML = matches.map(id => cardMarkup(id)).join('') || `<p class="tm-empty">${esc(copy.noResults)}</p>`;
}
function openConfirm(text, action) {
  dialogAction = action;
  dialog.returnValue = '';
  dialog.innerHTML = `<form method="dialog"><h2>${esc(copy.yes)}</h2><p>${esc(text)}</p><div class="tm-actions"><button value="cancel">${esc(copy.close)}</button><button class="tm-primary" value="confirm">${esc(copy.confirm)}</button></div></form>`;
  dialog.showModal();
}
function openName(title, initial, action) {
  dialogAction = action;
  dialog.returnValue = '';
  dialog.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2><label>${esc(copy.name)}<input name="name" value="${esc(initial)}" maxlength="40" required autofocus></label><div class="tm-actions"><button value="cancel" formnovalidate>${esc(copy.close)}</button><button class="tm-primary" value="confirm">${esc(copy.save)}</button></div></form>`;
  dialog.showModal();
  const input = dialog.querySelector('input'); input.focus(); input.select();
}
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'confirm' && dialogAction) {
    const name = dialog.querySelector('input')?.value;
    dialogAction(name);
  }
  dialogAction = null;
});
dialog.addEventListener('input', event => {
  if (event.target.name === 'name') event.target.setCustomValidity(event.target.value.trim() ? '' : copy.editName);
});
app.addEventListener('input', event => {
  if (event.target.matches('[data-search]')) { query = event.target.value; renderPool(); }
  if (event.target.matches('[data-title]')) dispatch({ type: 'title', value: event.target.value });
});
app.addEventListener('change', event => {
  if (event.target.matches('[data-attribute]')) { attribute = event.target.value; renderPool(); }
});
app.addEventListener('click', event => {
  if (Date.now() < clickUntil) return;
  const card = event.target.closest('[data-card]');
  if (card) {
    if (selectedId && selectedId !== card.dataset.card && card.dataset.tier) {
      dispatch({ type: 'move', cardId: selectedId, tierId: card.dataset.tier, beforeId: card.dataset.card });
    } else { selectedId = selectedId === card.dataset.card ? null : card.dataset.card; render(); }
    return;
  }
  const actionNode = event.target.closest('[data-action]');
  if (!actionNode) {
    const drop = event.target.closest('[data-drop]');
    if (selectedId && drop) dispatch({ type: 'move', cardId: selectedId, tierId: drop.dataset.drop || null });
    return;
  }
  const action = actionNode.dataset.action, tierId = actionNode.dataset.tier, current = category();
  const tier = current.tiers.find(item => item.id === tierId);
  if (action === 'category') { activeId = actionNode.dataset.id; selectedId = null; query = ''; attribute = ''; render(); }
  if (action === 'cancel') { selectedId = null; render(); }
  if (action === 'undo' || action === 'redo') restore(action);
  if (action === 'append' || action === 'unplace') dispatch({ type: 'move', cardId: selectedId, tierId: action === 'unplace' ? null : tierId });
  if (action === 'card-left' || action === 'card-right') {
    const row = current.tiers.find(item => item.cards.includes(selectedId));
    const index = row.cards.indexOf(selectedId), target = index + (action === 'card-left' ? -1 : 1);
    const cardId = selectedId;
    dispatch({ type: 'move', cardId, tierId: row.id, beforeId: action === 'card-left' ? row.cards[target] : row.cards[target + 1] });
    selectedId = cardId; render();
  }
  if (action === 'add-category') openName(copy.addCategory, state.categories.some(item => categoryName(item, copy) === copy.roles.overall) ? copy.newCategory : copy.roles.overall, name => dispatch({ type: action, name }));
  if (action === 'rename-category') openName(copy.rename, categoryName(current, copy), name => dispatch({ type: action, name }));
  if (action === 'add-tier') openName(copy.addTier, copy.newTier, name => dispatch({ type: action, name }));
  if (action === 'rename-tier') openName(copy.rename, tier.name, name => dispatch({ type: action, tierId, name }));
  if (action === 'delete-category') openConfirm(copy.deleteCategory, () => dispatch({ type: action }));
  if (action === 'clear' || action === 'reset') openConfirm(action === 'clear' ? copy.clearConfirm : copy.resetConfirm, () => dispatch({ type: action }));
  if (action === 'export-one') openExport([activeId]);
  if (action === 'export-all') openExport(state.categories.map(item => item.id));
});

// Native desktop dragging. On touch screens taps keep page scrolling available.
app.addEventListener('dragstart', event => {
  const card = event.target.closest('[data-card]'); if (!card) return;
  dragged = { cardId: card.dataset.card, categoryId: activeId };
  event.dataTransfer.setData('text/plain', card.dataset.card); event.dataTransfer.effectAllowed = 'move';
  selectedId = null; card.classList.add('is-dragging');
});
app.addEventListener('dragover', event => {
  const drop = event.target.closest('[data-drop]'); if (!drop || !dragged) return;
  event.preventDefault(); event.dataTransfer.dropEffect = 'move';
  app.querySelectorAll('.is-drop-target').forEach(node => node.classList.remove('is-drop-target'));
  (event.target.closest('[data-card]') || drop).classList.add('is-drop-target');
});
app.addEventListener('drop', event => {
  const drop = event.target.closest('[data-drop]'); if (!drop || !dragged || dragged.categoryId !== activeId) return;
  event.preventDefault();
  const before = event.target.closest('[data-card]');
  dispatch({ type: 'move', cardId: dragged.cardId, tierId: drop.dataset.drop || null, beforeId: before?.dataset.card });
  dragged = null; clickUntil = Date.now() + 250;
});
app.addEventListener('dragend', () => {
  dragged = null; clickUntil = Date.now() + 250;
  app.querySelectorAll('.is-dragging,.is-drop-target').forEach(node => node.classList.remove('is-dragging', 'is-drop-target'));
});
// Pointer dragging on touch has a hold threshold so ordinary scrolling still works.
let touch = null, holdTimer;
app.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || busy || !event.isPrimary) return;
  const card = event.target.closest('[data-card]'); if (!card) return;
  touch = { id: event.pointerId, x: event.clientX, y: event.clientY, card, cardId: card.dataset.card, active: false };
  holdTimer = setTimeout(() => {
    if (!touch) return;
    touch.active = true; touch.card.setPointerCapture(touch.id); touch.card.classList.add('is-dragging');
    document.body.classList.add('tm-touch-dragging');
  }, 300);
});
app.addEventListener('pointermove', event => {
  if (!touch || event.pointerId !== touch.id) return;
  if (!touch.active) {
    if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 10) { clearTimeout(holdTimer); touch = null; }
    return;
  }
  event.preventDefault();
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-card],[data-drop]');
  app.querySelectorAll('.is-drop-target').forEach(node => node.classList.remove('is-drop-target'));
  target?.classList.add('is-drop-target');
  if (event.clientY < 80) window.scrollBy(0, -16);
  else if (event.clientY > window.innerHeight - 80) window.scrollBy(0, 16);
}, { passive: false });
function finishTouch(event) {
  clearTimeout(holdTimer);
  const item = touch; if (!item || event.pointerId !== item.id) return;
  touch = null;
  document.body.classList.remove('tm-touch-dragging');
  if (item.active && event.type === 'pointerup') {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const drop = target?.closest('[data-drop]');
    if (drop) dispatch({ type: 'move', cardId: item.cardId, tierId: drop.dataset.drop || null, beforeId: target.closest('[data-card]')?.dataset.card });
    clickUntil = Date.now() + 500;
  }
  app.querySelectorAll('.is-dragging,.is-drop-target').forEach(node => node.classList.remove('is-dragging', 'is-drop-target'));
}
app.addEventListener('pointerup', finishTouch);
app.addEventListener('pointercancel', finishTouch);
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) message(copy.changedElsewhere); });

function openExport(chosen) {
  exportDialog.innerHTML = `<form data-export-form><h2>${esc(copy.exportTitle)}</h2><div class="tm-export-choices">${state.categories.map(item => `<label><input name="category" type="checkbox" value="${item.id}" ${chosen.includes(item.id) ? 'checked' : ''}>${esc(categoryName(item, copy))}</label>`).join('')}</div><label class="tm-checkbox"><input type="checkbox" name="unplaced">${esc(copy.includeUnplaced)}</label><div class="tm-actions"><button type="button" data-close-image>${esc(copy.close)}</button><button class="tm-primary" type="submit">${esc(copy.save)}</button></div><p data-image-status role="status" aria-live="polite"></p><div data-image-result></div></form>`;
  exportDialog.showModal();
}
exportDialog.addEventListener('click', event => { if (event.target.closest('[data-close-image]')) exportDialog.close(); });
exportDialog.addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  const form = event.target, data = new FormData(form), selected = data.getAll('category');
  const note = form.querySelector('[data-image-status]');
  if (!selected.length) { note.textContent = copy.exportEmpty; return; }
  busy = true; form.querySelector('[type="submit"]').disabled = true; note.textContent = copy.exporting;
  try {
    const snapshot = structuredClone(state), include = data.has('unplaced');
    const url = await createImage(snapshot, selected, include);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    exportUrl = url;
    const filename = `monsaba-tier-${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date())}.png`;
    form.querySelector('[data-image-result]').innerHTML = `<img src="${url}" alt="${esc(copy.personal)}" class="tm-image-preview"><div class="tm-actions"><a class="tm-primary" href="${url}" download="${filename}">${esc(copy.download)}</a><a href="${url}" target="_blank" rel="noopener noreferrer">${esc(copy.preview)}</a></div><p>${esc(copy.imageHelp)}</p>`;
    note.textContent = copy.imageSaved;
    const download = form.querySelector('[download]'); download.click();
  } catch (error) { note.textContent = error.message.startsWith('TM:') ? error.message.slice(3) : copy.exportError; }
  finally { busy = false; form.querySelector('[type="submit"]').disabled = false; }
});
async function createImage(snapshot, chosen, includeUnplaced) {
  const width = 1200;
  const sections = snapshot.categories.filter(item => chosen.includes(item.id)).map(item => ({ category: item, rows: exportLayout(item, ids, includeUnplaced, width) }));
  const height = 130 + sections.reduce((sum, section) => sum + 90 + section.rows.reduce((total, row) => total + row.height + 4, 0), 0);
  // Keep below common mobile canvas limits; suggest separate category exports.
  if (height > 16000 || width * height > 16_000_000) throw new Error(`TM:${copy.tooLarge}`);
  await document.fonts.ready;
  const needed = new Set(sections.flatMap(section => section.rows.flatMap(row => row.cards)));
  const loaded = new Map();
  await Promise.all([...needed].map(async id => {
    const img = stageImageFor(byId.get(id), 1, images); if (!img) return;
    const image = new Image();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`TM:${copy.imageMissing}`)), 15000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error(`TM:${copy.imageMissing}`)); };
      image.src = img.src;
    });
    loaded.set(id, image);
  }));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#f2f5f9'; ctx.fillRect(0, 0, width, height);
  const font = size => { ctx.font = `600 ${size}px system-ui, "Yu Gothic", sans-serif`; };
  const fitText = (value, x, y, maxWidth, size = 22) => {
    font(size); let out = String(value);
    if (ctx.measureText(out).width > maxWidth) {
      while (out.length && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
      out += '…';
    }
    ctx.fillText(out, x, y);
  };
  const wrapText = (value, x, y, maxWidth, size, lineHeight) => {
    font(size); const chars = [...String(value)]; let line = '', lines = [];
    for (const char of chars) { if (line && ctx.measureText(line + char).width > maxWidth) { lines.push(line); line = char; } else line += char; }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((text, i) => ctx.fillText(text, x, y + i * lineHeight));
  };
  ctx.fillStyle = '#142b4a'; fitText(snapshot.title || copy.title, 28, 44, width - 56, 30);
  ctx.fillStyle = '#52647a'; fitText(`${copy.personal} · monster-survival.com`, 28, 78, width - 56, 17);
  let y = 105;
  for (const section of sections) {
    ctx.fillStyle = '#142b4a'; fitText(categoryName(section.category, copy), 28, y + 30, width - 56, 27); y += 52;
    for (const row of section.rows) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(24, y, width - 48, row.height);
      ctx.fillStyle = row.color; ctx.fillRect(24, y, 118, row.height);
      ctx.fillStyle = '#142b4a'; wrapText(row.name ?? copy.unplaced, 32, y + 38, 100, 23, 28);
      row.cards.forEach((id, index) => {
        const x = 156 + (index % row.columns) * 100, cy = y + 8 + Math.floor(index / row.columns) * 112;
        const image = loaded.get(id);
        if (image) {
          const ratio = Math.min(76 / image.naturalWidth, 72 / image.naturalHeight);
          const w = image.naturalWidth * ratio, h = image.naturalHeight * ratio;
          ctx.drawImage(image, x + (90 - w) / 2, cy + (72 - h) / 2, w, h);
        } else { ctx.fillStyle = '#71829b'; fitText('?', x + 35, cy + 46, 80, 28); }
        ctx.fillStyle = '#142b4a'; wrapText(nameOf(byId.get(id)), x + 2, cy + 90, 90, 14, 15);
      });
      y += row.height + 4;
    }
    y += 38;
  }
  ctx.fillStyle = '#52647a'; fitText(`${copy.unofficial} · ${copy.site}`, 28, height - 15, width - 56, 16);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('blob');
  return URL.createObjectURL(blob);
}

async function boot() {
  app.textContent = copy.loading;
  try {
    const [catalog, manifest, positionData] = await Promise.all(['/data/tatari.json', '/data/tata-images.json', '/data/zombie-rush/position-tiers.json'].map(async url => {
      const response = await fetch(url); if (!response.ok) throw new Error('fetch'); return response.json();
    }));
    roster = pickerOrder(catalog.families, { positionData }, 'zombie', 'all');
    ids = roster.map(family => family.id); byId = new Map(roster.map(family => [family.id, family]));
    images = new Map(manifest.families.map(item => [item.familyId, item]));
    state = createState();
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) state = parseState(saved); }
    catch { message(copy.invalidDraft); }
    activeId = state.categories[0].id;
    render();
  } catch {
    app.innerHTML = `<p>${esc(copy.loadError)}</p>${button('retry', copy.retry)}`;
    app.querySelector('button').addEventListener('click', boot, { once: true });
  }
}
boot();
