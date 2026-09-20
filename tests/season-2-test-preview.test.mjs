import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const preview = JSON.parse(read('data/zombie-rush/seasons/season-2-test-preview.json'));
const liveChips = JSON.parse(read('data/zombie-rush/chips.json'));

test('Sep 23 data is labelled as an unconfirmed test-server preview', () => {
  assert.equal(preview.meta.status, 'test-server-preview-not-live');
  assert.match(preview.meta.notice, /現行のチップDB・通常スキル・Tierには適用しない/);
  assert.equal(preview.meta.listedUpdateDate, '2026-09-23');
});

test('nine independently listed chip changes retain their exact preview values', () => {
  assert.deepEqual(preview.chipBalancePreview.map(({ name, before, after }) => [name, before, after]), [
    ['サボる', '90秒', '40秒'], ['ボスキラー', '25%', '20%'], ['マーベリック', '20%', '35%'],
    ['後方支援', '30%', '45%'], ['芝生のお手入れ', '50%', '40%'], ['アップグレード', '+1', '+2'],
    ['別れの贈り物', '200', '40'], ['戦略的移動', '20秒', '30秒'], ['バケツ理論', '10%', '15%']
  ]);
});

test('preview pages and update hubs retain a clear non-live notice in every locale', () => {
  for (const [route, warning] of [
    ['updates/2026-09-23-test-preview/index.html', '本番の現行仕様ではありません'],
    ['en/updates/2026-09-23-test-preview/index.html', 'not the live-game specification'],
    ['zh-cn/updates/2026-09-23-test-preview/index.html', '不是正式服当前规格'],
    ['zombie-rush/index.html', 'Season 2のテストサーバー情報'],
    ['en/zombie-rush/index.html', 'Season 2 test-server preview'],
    ['zh-cn/zombie-rush/index.html', 'Season 2测试服务器预览']
  ]) assert.ok(read(route).includes(warning), `${route} warning missing`);
});

test('official Zobo assets are present but not falsely mapped to a preview enemy name', () => {
  const page = read('updates/2026-09-23-test-preview/index.html');
  for (const asset of ['shaman-zobo.png', 'shocker-zobo.png', 'roadhog-zobo.png']) assert.ok(fs.existsSync(path.join(root, 'assets/official/zobos', asset)));
  assert.match(page, /名称対応は確認待ち/);
});

test('every preview chip change uses its existing live chip icon without changing live values', () => {
  const page = read('updates/2026-09-23-test-preview/index.html');
  for (const { name } of preview.chipBalancePreview) {
    const liveChip = liveChips.chips.find((chip) => chip.name.ja === name);
    assert.ok(liveChip?.icon, `${name}: current chip icon mapping missing`);
    assert.ok(fs.existsSync(path.join(root, liveChip.icon.slice(1))), `${name}: current chip icon file missing`);
    assert.match(page, new RegExp(`src="${liveChip.icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`), `${name}: preview page icon missing`);
    assert.match(page, new RegExp(`alt="${name}の現行チップアイコン"`), `${name}: preview alt text missing`);
  }
});
