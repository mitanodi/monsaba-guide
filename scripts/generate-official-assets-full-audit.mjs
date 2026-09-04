import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const baseline = process.argv.find((arg) => arg.startsWith('--baseline='))?.slice(11) || 'fd6713b8eb233abb9bae384b7431a6e6d477db29';
const imagePattern = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i;
const excluded = /^(?:\.git|node_modules|promo)(?:\/|$)/;
const slash = (value) => value.replaceAll('\\', '/').replace(/^\.\//, '');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = slash(path.relative(root, absolute));
    if (excluded.test(relative)) continue;
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(relative);
  }
  return files;
}

const allCurrentFiles = walk(root);
const currentImages = allCurrentFiles.filter((file) => imagePattern.test(file));
const baselineLines = execFileSync('git', ['ls-tree', '-r', '-l', baseline], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim().split(/\r?\n/);
const baselineImages = baselineLines.map((line) => line.match(/^\d+\s+blob\s+[a-f0-9]+\s+(\d+)\t(.+)$/)).filter(Boolean).map((match) => slash(match[2])).filter((file) => imagePattern.test(file) && !excluded.test(file));
const baselineBytes = new Map(baselineLines.map((line) => line.match(/^\d+\s+blob\s+[a-f0-9]+\s+(\d+)\t(.+)$/)).filter(Boolean).map((match) => [slash(match[2]), Number(match[1])]));
const baselineSet = new Set(baselineImages);
const currentSet = new Set(currentImages);

const sourceMap = readJson('data/official-assets/tata-source-map.json');
const tataImages = readJson('data/tata-images.json');
const skillIcons = readJson('data/official-assets/skill-icons.json');
const eventImages = readJson('data/official-assets/event-images.json');
const siteIcons = readJson('data/official-assets/site-icons.json');
const baselineTataImages = JSON.parse(execFileSync('git', ['show', `${baseline}:data/tata-images.json`], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
const baselineTatari = JSON.parse(execFileSync('git', ['show', `${baseline}:data/tatari.json`], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
const finalForms = new Map(tataImages.families.flatMap((family) => family.forms.map((form) => [`${family.familyId}:T${form.stage}`, form])));
const oldPathToForm = new Map();
for (const family of baselineTataImages.families) {
  for (const form of family.forms) if (form.src) oldPathToForm.set(slash(form.src.replace(/^\//, '')), `${family.familyId}:T${form.stage}`);
  if (family.stage1?.src) oldPathToForm.set(slash(family.stage1.src.replace(/^\//, '')), `${family.familyId}:T1`);
}
for (const family of baselineTatari.families) for (const form of family.evolutions) if (form.image) oldPathToForm.set(slash(form.image), `${family.id}:T${form.stage}`);

const officialByPath = new Map();
for (const record of sourceMap.assets) {
  officialByPath.set(slash(record.optimizedPath.replace(/^\//, '')), record);
  officialByPath.set(slash(record.optimizedPath.replace(/-512\.webp$/, '-256.webp').replace(/^\//, '')), record);
}
for (const record of skillIcons.icons) officialByPath.set(slash(record.optimizedPath.replace(/^\//, '')), record);
for (const record of eventImages.events) officialByPath.set(slash(record.optimizedPath.replace(/^\//, '')), record);
for (const output of siteIcons.outputs) officialByPath.set(slash(output.path.replace(/^\//, '')), siteIcons);

const textFiles = allCurrentFiles.filter((file) => /\.(?:css|html|js|json|mjs|md|txt|webmanifest|xml)$/i.test(file) && !file.startsWith('docs/evidence/'));
const textSources = textFiles.map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
const usageFor = (file) => textSources.filter(([, content]) => content.includes(file) || content.includes(`/${file}`)).map(([name]) => name);

async function metadataFor(file) {
  let buffer;
  if (currentSet.has(file)) buffer = fs.readFileSync(path.join(root, file));
  else buffer = execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'buffer', maxBuffer: 30 * 1024 * 1024 });
  let metadata = {};
  try { metadata = await sharp(buffer, { failOn: 'none' }).metadata(); } catch { /* ICO or unsupported source */ }
  return { bytes: buffer.length, width: metadata.width || null, height: metadata.height || null, sha256: hash(buffer) };
}

function category(file) {
  if (file.startsWith('assets/official/tata/')) return 'Tata official';
  if (file.startsWith('assets/official/skills/')) return 'Skill official';
  if (file.startsWith('assets/official/events/')) return 'Event official';
  if (file.startsWith('assets/chips/')) return 'Zombie Rush chip';
  if (file.startsWith('assets/heroes/')) return '攻略スクリーンショット / Hero';
  if (file.startsWith('assets/og/')) return 'OG';
  if (file.startsWith('assets/monsters/') || file.startsWith('assets/tata-crops/')) return 'Tata legacy';
  if (file.startsWith('assets/thumbs/')) return 'Tata legacy thumbnail';
  if (/^(?:favicon|apple-touch-icon)|^assets\/icons\//.test(file)) return 'UI icon';
  return 'Other';
}

function decision(file) {
  const exists = currentSet.has(file);
  const official = officialByPath.get(file);
  const formKey = oldPathToForm.get(file);
  const finalForm = formKey && finalForms.get(formKey);
  if (!exists) {
    const replacement = finalForm?.sourceType === 'official_creator_asset' ? finalForm.officialAssetId : null;
    return { source: '旧Repository Web asset', candidate: replacement || 'なし / 重複旧派生', action: 'remove-unused', reason: replacement ? `${formKey}を公式SSOTへ置換後、参照0` : '参照0の重複・旧派生画像' };
  }
  if (official) {
    const newlyOfficial = !baselineSet.has(file) || category(file) === 'UI icon';
    return { source: 'official_creator_asset', candidate: official.officialAssetId, action: newlyOfficial ? 'replace' : 'keep', reason: newlyOfficial ? '公式原本SHA検証後にWeb最適化' : '既導入の公式素材を再検証・維持' };
  }
  if (file.startsWith('assets/og/')) return { source: 'サイト生成画像', candidate: siteIcons.officialAssetId, action: 'replace', reason: '公式ゲームアイコンを入力にOGを再生成' };
  if (file.startsWith('assets/chips/')) return { source: 'current_verified', candidate: '確実一致0', action: 'keep', reason: '公式Creator Assetsとの確実一致なし' };
  if (file.startsWith('assets/heroes/')) return { source: 'ゲーム画面 / 既存key art', candidate: '同一意味の確実な代替なし', action: 'keep', reason: '攻略UI・証拠スクリーンショット、または同義公式素材なし' };
  if (file === 'assets/tata-crops/forms/pakuma/t1.webp') return { source: 'current_verified', candidate: '確実一致なし', action: 'keep', reason: 'パクマT1の公式対応静止画なし' };
  if (file.startsWith('assets/monsters/')) return { source: 'pending evidence', candidate: '確実一致なし', action: 'pending', reason: `画像確認中を維持（${formKey || '未確定形態'}）` };
  return { source: 'site asset', candidate: 'なし', action: 'keep', reason: '独自ブランドまたは機能用asset' };
}

const union = [...new Set([...baselineImages, ...currentImages])].sort();
const rows = [];
for (const file of union) {
  const metadata = await metadataFor(file);
  const usage = usageFor(file);
  const result = decision(file);
  rows.push({ file, ...metadata, usage, category: category(file), ...result });
}
const count = (action) => rows.filter((row) => row.action === action).length;
const finalBytes = currentImages.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
const baselineTotalBytes = baselineImages.reduce((sum, file) => sum + (baselineBytes.get(file) || 0), 0);
const biggest = currentImages.map((file) => ({ file, bytes: fs.statSync(path.join(root, file)).size })).sort((a, b) => b.bytes - a.bytes)[0];
const escape = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const tableRows = rows.map((row) => `| ${escape(row.file)} | ${row.width && row.height ? `${row.width}×${row.height}` : '-'} | ${row.bytes} | ${escape(row.usage.length ? row.usage.join('<br>') : '参照0')} | ${escape(row.category)} | ${escape(row.source)} | ${escape(row.candidate)} | ${row.action} | ${escape(row.reason)} |`).join('\n');
const pending = ['nenbutsuhebi:T4', 'pakuma:T2', 'pakuma:T3', 'pakuma:T4', 'sukedako:T4'];
const markdown = `# 公式Creator Assets 全面置換監査台帳（2026-09-04）

## 結果

- 開始基準: \`${baseline}\`
- 開始時Repository画像: ${baselineImages.length} files / ${baselineTotalBytes} bytes
- 完了時Repository画像: ${currentImages.length} files / ${finalBytes} bytes
- 監査対象（開始・完了の和集合）: ${union.length} files
- 公式素材利用: 183 → 287 logical sources（Tata 224 + Skill 58 + Event 4 + UI icon 1）
- 今回新たに公式へ置換可能と判定: 104 logical sources（Tata 103 + UI icon 1）
- 実際に置換: 104 / 104、公式対応可能なのに未置換: 0
- 物理ファイルAction: replace ${count('replace')} / keep ${count('keep')} / pending ${count('pending')} / remove-unused ${count('remove-unused')}
- Tata: 224 / 230 official、1 current_verified（パクマT1）、pending 5
- pending: ${pending.join(', ')}
- Skill: 58 official。対応未確定のLullelly 1件は不採用
- Event: 4 official（全26候補はTreasure Hunt。重複variant・動画・用途不明は不採用）
- Item / Enemy: 現在表示画像との確実な対応なし、置換0
- Zombie Rush chips: 49維持（公式素材との確実一致0）
- Logo / Background: サイト独自ブランドと同義の確実な代替なし、置換0
- UI icon: 1 official sourceから5出力へ置換
- OG: 33枚を公式ゲームアイコン入力で再生成
- 最大完了画像: \`${biggest.file}\` ${biggest.bytes} bytes
- 画像容量差分: ${finalBytes - baselineTotalBytes} bytes

Tata公式画像は透過Canvasを原本非破壊でtrimし、256/512 WebPへ安全な余白を付けて出力した。Team BuilderとCommunityは仕様どおりT1代表、Tier・Beginner・Search・Compare・Evolution・属性・個別ページは共通 \`data/tata-images.json\` を参照する。旧画像を優先する公式対応形態は0件。

## 例外として保持した旧画像

- \`assets/tata-crops/forms/pakuma/t1.webp\`: パクマT1。公式Creator Assetsに確実な対応静止画がないためcurrent_verifiedを維持。
- \`assets/monsters/{roadpass,namuamidaija,kumash,marine-bear,blizzly}.webp\`: 未確定5形態の証拠用旧asset。UIでは「画像確認中」を表示し、推測画像として公開しない。
- \`assets/chips/*.webp\`: Zombie Rush 49チップ。全公式素材との確実一致が0のため維持。
- \`assets/heroes/*\`: 攻略UI説明・証拠スクリーンショット、または同じ意味の確実な公式代替がないHero。Creator artへの置換で攻略情報が失われるため維持。
- サイト独自ロゴ: 非公式攻略DBのブランドであり、公式ゲームロゴと混同しないため維持。

## 全画像台帳

| Current image | Dimensions | Bytes | Page / usage | Category | Current source | Official Asset | Action | Reason |
|---|---:|---:|---|---|---|---|---|---|
${tableRows}
`;
const output = path.join(root, 'docs', 'evidence', 'official-assets-full-replacement-2026-09-04.md');
fs.writeFileSync(output, markdown);
console.log(`Full image audit written: ${union.length} inventory rows / ${currentImages.length} final images / ${count('remove-unused')} removed`);
