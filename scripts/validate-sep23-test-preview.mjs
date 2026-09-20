import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const expect = (condition, message) => { if (!condition) throw new Error(message); };
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const preview = JSON.parse(read('data/zombie-rush/seasons/season-2-test-preview.json'));
const liveChips = JSON.parse(read('data/zombie-rush/chips.json'));
const tatari = JSON.parse(read('data/tatari.json'));
const expectedChanges = [
  ['サボる', '強制自動戦闘時間', '90秒', '40秒'],
  ['ボスキラー', 'ダメージ増加', '25%', '20%'],
  ['マーベリック', 'ステータスアップ', '20%', '35%'],
  ['後方支援', 'ダメージ増加', '30%', '45%'],
  ['芝生のお手入れ', '最大HPダメージ', '50%', '40%'],
  ['アップグレード', 'タタレベルアップ', '+1', '+2'],
  ['別れの贈り物', '獲得するエナジーキャンディ', '200', '40'],
  ['戦略的移動', '持続時間', '20秒', '30秒'],
  ['バケツ理論', 'ステータスアップ', '10%', '15%']
];

expect(preview.meta.status === 'test-server-preview-not-live', 'preview status must explicitly remain non-live');
expect(preview.meta.sourceType === 'user-shared-official-test-server-preview', 'preview source status mismatch');
expect(preview.meta.listedUpdateDate === '2026-09-23', 'preview date mismatch');
expect(preview.chipBalancePreview.length === expectedChanges.length, 'preview chip change count mismatch');
for (const expected of expectedChanges) {
  expect(preview.chipBalancePreview.some((item) => [item.name, item.metric, item.before, item.after].every((value, index) => value === expected[index])), `missing preview chip change: ${expected.join(' / ')}`);
}
expect(preview.newTatari.name === 'ルカロン' && preview.newTatari.databaseStatus === 'preview-only-awaiting-live-game-confirmation', 'Lucaron must remain preview-only');
expect(preview.newEvolutions.some((item) => item.from === 'エレキネコ' && item.to === 'トコヨニャット' && item.stage === 4), 'Tokoyonyatto preview missing');
expect(preview.newEvolutions.some((item) => item.from === 'ヒニャオ' && item.to === 'ネコノミコト' && item.stage === 4), 'Nekonomikoto preview missing');
expect(!JSON.stringify(tatari).includes('ルカロン') && !JSON.stringify(tatari).includes('トコヨニャット') && !JSON.stringify(tatari).includes('ネコノミコト'), 'unconfirmed preview Tata must not enter the live Tatari database');
expect(liveChips.chips.find((chip) => chip.name.ja === 'サボる')?.effect.ja.includes('90秒'), 'live chip data must retain its verified 90-second Slack Off value');

for (const [locale, file] of [['ja', 'updates/2026-09-23-test-preview/index.html'], ['en', 'en/updates/2026-09-23-test-preview/index.html'], ['zh-CN', 'zh-cn/updates/2026-09-23-test-preview/index.html']]) {
  const html = read(file);
  expect(html.includes('test-server') || html.includes('テストサーバー') || html.includes('测试服务器'), `${locale}: preview warning missing`);
  expect(html.includes('ルカロン') || html.includes('Lucaron'), `${locale}: Lucaron missing`);
  expect(html.includes('トコヨニャット') || html.includes('Tokoyonyatto'), `${locale}: Tokoyonyatto missing`);
  expect(html.includes('ネコノミコト') || html.includes('Nekonomikoto'), `${locale}: Nekonomikoto missing`);
}
for (const file of ['assets/official/zobos/shaman-zobo.png', 'assets/official/zobos/shocker-zobo.png', 'assets/official/zobos/roadhog-zobo.png']) expect(fs.existsSync(path.join(root, file)), `${file}: official asset missing`);
for (const file of ['updates/index.html', 'en/updates/index.html', 'zh-cn/updates/index.html', 'zombie-rush/index.html', 'en/zombie-rush/index.html', 'zh-cn/zombie-rush/index.html']) expect(read(file).includes('SEP23:'), `${file}: preview entry missing`);

console.log('Sep 23 test-server preview validation passed: preview stays separate from live Tata/chip data.');
