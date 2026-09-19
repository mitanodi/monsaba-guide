import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { FOODS, STORAGE_KEY, addFood, createDefaultModel, findFoodPlan, normalizeModel, remainingPoints, undoLast } from '../feeding/feeding.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('餌付け初版は公式動画で確認済みの9食品だけを画像候補にする', () => {
  assert.equal(FOODS.length, 9);
  assert.deepEqual([...new Set(FOODS.map((food) => food.points))], [5, 10, 30]);
  assert.ok(FOODS.every((food) => food.tier === 'confirmed'));
});

test('加算・残り・取り消しは端末内モデルで一貫する', () => {
  let model = createDefaultModel();
  model = addFood(model, { label: 'テスト', points: 30 });
  model = addFood(model, { label: 'テスト2', points: 10 });
  assert.equal(model.current, 40);
  assert.equal(remainingPoints(model), 60);
  assert.equal(undoLast(model).current, 30);
  assert.equal(undoLast(model).history.length, 1);
});

test('不正な保存データを安全に正規化し、保存キーを固定する', () => {
  const model = normalizeModel({ target: -1, current: 'not-a-number', history: [{ label: 'x', points: -4 }, null] });
  assert.equal(model.target, 1);
  assert.equal(model.current, 0);
  assert.equal(model.history[0].points, 0);
  assert.equal(STORAGE_KEY, 'monsaba-feeding-simulator-v2');
});

test('所持数と取り置きを尊重し、三種類の最適化計算は目標を下回らない', () => {
  const model = normalizeModel({ target: 50, current: 0, inventory: { soda: 9, pizza: 2 }, reserves: { pizza: 1 } });
  for (const mode of ['minItems', 'minWaste', 'preserveHigh']) {
    const plan = findFoodPlan(model, mode);
    assert.equal(plan.status, 'ok');
    assert.ok(plan.total >= 50);
    assert.ok((plan.counts.pizza || 0) <= 1);
  }
  assert.equal(findFoodPlan(normalizeModel({ target: 100, inventory: { soda: 1 } }), 'minItems').status, 'unavailable');
});

test('境界値・不正値・同率候補でも組み合わせ計算は決定的に安全に動く', () => {
  const unlimited = normalizeModel({ target: 1, unlimited: true });
  assert.equal(findFoodPlan(normalizeModel({ target: 1, current: 1 }), 'minItems').status, 'complete');
  for (const target of [1, 5, 10, 30, 50, 9999]) {
    const plan = findFoodPlan(normalizeModel({ target, unlimited: true }), 'minWaste');
    assert.equal(plan.status, 'ok');
    assert.ok(plan.total >= target);
  }
  const invalid = normalizeModel({ target: 'NaN', current: -1, inventory: { soda: -3, pizza: '1.9' }, reserves: { pizza: 99 } });
  assert.equal(invalid.current, 0);
  assert.equal(invalid.inventory.soda, 0);
  assert.equal(invalid.inventory.pizza, 1);
  assert.equal(findFoodPlan(invalid, 'minItems').status, 'unavailable');
  const ties = normalizeModel({ target: 10, inventory: { soda: 2, 'ice-cream': 2 } });
  assert.deepEqual(findFoodPlan(ties, 'minItems'), findFoodPlan(ties, 'minItems'));
  assert.equal(findFoodPlan(normalizeModel({ target: 5, inventory: { soda: 5 }, reserves: { soda: 5 } }), 'minWaste').status, 'unavailable');
});

test('3言語ページは同じローカル機能と公式素材を読み込む', () => {
  for (const file of ['feeding/index.html', 'en/feeding/index.html', 'zh-cn/feeding/index.html']) {
    const html = read(file);
    assert.match(html, /data-feeding-app/);
    assert.match(html, /\/feeding\/feeding\.js/);
    assert.match(html, /\/feeding\/feeding\.css/);
    assert.match(html, /canonical/);
    assert.match(html, /noindex,follow/);
  }
});

test('公式素材の出所マップと最適化済み画像を保持する', () => {
  const source = JSON.parse(read('data/official-assets/feeding-images.json'));
  assert.equal(source.count, 10);
  assert.equal(source.assets.filter((asset) => asset.officialAssetId === 'MSOA-06185').length, 1);
  for (const asset of source.assets) {
    assert.match(asset.officialAssetId, /^MSOA-\d{5}$/);
    assert.match(asset.optimizedPath, /^\/assets\/official\/feeding\/.+\.webp$/);
    assert.ok(fs.existsSync(path.join(root, asset.optimizedPath.slice(1))));
  }
});
