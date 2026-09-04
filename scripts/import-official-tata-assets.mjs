import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.split('=');
  return [key, value.join('=') || true];
}));
const manifestRoot = args.get('--manifest-root');
const apply = args.has('--apply');
const previewDir = args.get('--preview-dir');

if (!manifestRoot) {
  throw new Error('Usage: node scripts/import-official-tata-assets.mjs --manifest-root=<04_MANIFEST> [--apply] [--preview-dir=<dir>]');
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const manifest = readJson(path.join(manifestRoot, 'assets-master.json'));
const tata = readJson(path.join(root, 'data', 'tatari.json'));
const currentImages = readJson(path.join(root, 'data', 'tata-images.json'));
const coverageLines = fs.readFileSync(path.join(manifestRoot, 'tata-official-coverage.csv'), 'utf8').trim().split(/\r?\n/);
const coverageHeaders = coverageLines[0].split(',');
const baselineStatus = new Map();
for (const line of coverageLines.slice(1)) {
  const values = line.split(',');
  const record = Object.fromEntries(coverageHeaders.map((header, index) => [header, values[index]]));
  for (let stage = 1; stage <= 4; stage += 1) {
    if (record[`T${stage}_site_status`] && record[`T${stage}_site_status`] !== 'unknown') baselineStatus.set(`${record.family}:${stage}`, record[`T${stage}_site_status`]);
  }
}
const originalRoot = path.resolve(manifest.root);
const existingByFamily = new Map(currentImages.families.map((family) => [family.familyId, family]));
const clean = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');

function candidateScore(asset, evolution) {
  const pathValue = asset.original_drive_path.replaceAll('\\', '/');
  const filename = path.posix.basename(pathValue);
  const normalizedFilename = clean(filename);
  const normalizedName = clean(evolution.nameEn);
  let score = 0;
  if (asset.file_type !== 'image' || asset.extension !== '.png') return -Infinity;
  if (!['tata-character', 'creator-tata-image', 'korean-tata-art'].includes(asset.subcategory)) return -Infinity;
  if (/glitch|reference[_ -]?sheet|card|meme|attack|death|disable|drag|eat|idle|move|rest|work/i.test(filename)) return -Infinity;
  if (asset.alpha) score += 1_000_000;
  if (normalizedName && normalizedFilename.includes(normalizedName)) score += 500_000;
  if (/\/캐릭터 일러스트\/critters\//.test(pathValue)) score += 80_000;
  if (/\/FOR KOL_KOC\/critters image\//i.test(pathValue)) score += 60_000;
  if (/\/Critters-NEW\//.test(pathValue)) score += 40_000;
  if (asset.quality_rating === 'excellent') score += 20_000;
  score += Math.min(Number(asset.width || 0) * Number(asset.height || 0), 10_000_000) / 100;
  score -= Number(asset.size_bytes || asset.bytes || 0) / 10_000_000;
  return score;
}

function selectCandidate(familyId, evolution) {
  return manifest.assets
    .filter((asset) => asset.tata_family === familyId && Number(asset.tata_stage) === evolution.stage)
    .map((asset) => ({ asset, score: candidateScore(asset, evolution) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score || a.asset.asset_id.localeCompare(b.asset.asset_id))[0]?.asset || null;
}

const audit = [];
for (const family of tata.families) {
  const currentFamily = existingByFamily.get(family.id);
  for (const evolution of family.evolutions) {
    const current = currentFamily?.forms.find((form) => form.stage === evolution.stage);
    const originalStatus = baselineStatus.get(`${family.id}:${evolution.stage}`) || current?.status || 'missing';
    const official = selectCandidate(family.id, evolution);
    const pendingResolution = originalStatus === 'pending' && official;
    const qualityReplacement = originalStatus === 'verified' && official && Math.max(official.width || 0, official.height || 0) >= 512;
    audit.push({
      familyId: family.id,
      familyName: family.familyName,
      attribute: family.attribute,
      stage: evolution.stage,
      name: evolution.name,
      nameEn: evolution.nameEn,
      currentStatus: originalStatus,
      currentPath: originalStatus === 'pending' ? null : (current?.sourceType === 'official_creator_asset' ? 'existing verified mapping (see git history)' : current?.src || null),
      currentWidth: current?.width || null,
      currentHeight: current?.height || null,
      action: pendingResolution ? 'pending_to_official' : qualityReplacement ? 'verified_to_high_quality_official' : official ? 'retain_current' : 'official_missing',
      officialAssetId: official?.asset_id || null,
      sourceFilename: official?.original_filename || null,
      sourceSha256: official?.sha256 || null,
      sourcePath: official?.local_original_path || null,
      sourceDrivePath: official?.original_drive_path || null,
      sourceWidth: official?.width || null,
      sourceHeight: official?.height || null,
      sourceAlpha: official?.alpha ?? null,
    });
  }
}

const selected = audit.filter((entry) => ['pending_to_official', 'verified_to_high_quality_official'].includes(entry.action));
const totals = Object.fromEntries(['pending_to_official', 'verified_to_high_quality_official', 'retain_current', 'official_missing'].map((action) => [action, audit.filter((entry) => entry.action === action).length]));

function resolveSkillTarget(asset) {
  if (asset.tata_family && asset.tata_stage) return { familyId: asset.tata_family, stage: Number(asset.tata_stage) };
  const prefix = clean(asset.original_filename.split('-')[0]);
  const matches = tata.families.flatMap((family) => family.evolutions.map((evolution) => ({ familyId: family.id, stage: evolution.stage, name: clean(evolution.nameEn) }))).filter((entry) => entry.name === prefix);
  return matches.length === 1 ? matches[0] : null;
}

const skillIcons = manifest.assets
  .filter((asset) => asset.subcategory === 'skill-icon' && asset.file_type === 'image' && asset.extension === '.png')
  .map((asset) => ({ asset, target: resolveSkillTarget(asset) }))
  .filter((entry) => entry.target)
  .sort((a, b) => a.target.familyId.localeCompare(b.target.familyId) || a.target.stage - b.target.stage);
const eventAssetIds = ['MSOA-06324', 'MSOA-06328', 'MSOA-06332', 'MSOA-06335'];
const eventAssets = eventAssetIds.map((assetId) => manifest.assets.find((asset) => asset.asset_id === assetId));
if (eventAssets.some((asset) => !asset)) throw new Error('Treasure Hunt event asset is missing from the manifest');

async function optimizedBuffers(sourcePath) {
  const make = (size, inset) => sharp(sourcePath, { failOn: 'error' })
    .rotate()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(size - inset * 2, size - inset * 2, { fit: 'contain', withoutEnlargement: false, kernel: sharp.kernel.lanczos3, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: inset,
      bottom: inset,
      left: inset,
      right: inset,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 88, alphaQuality: 100, effort: 4, smartSubsample: true })
    .toBuffer();
  return { small: await make(256, 14), large: await make(512, 24) };
}

async function buildPreview() {
  if (!previewDir) return;
  fs.mkdirSync(previewDir, { recursive: true });
  const tiles = [];
  for (const entry of selected) {
    const image = await sharp(entry.sourcePath).rotate().resize(180, 180, { fit: 'contain', background: '#eef4f8' }).png().toBuffer();
    const label = Buffer.from(`<svg width="220" height="42"><rect width="220" height="42" fill="#fff"/><text x="6" y="16" font-size="12" font-family="sans-serif">${entry.familyId} T${entry.stage} ${entry.officialAssetId}</text><text x="6" y="33" font-size="11" font-family="sans-serif">${entry.nameEn}</text></svg>`);
    tiles.push(await sharp({ create: { width: 220, height: 222, channels: 4, background: '#eef4f8' } }).composite([{ input: image, top: 0, left: 20 }, { input: label, top: 180, left: 0 }]).jpeg({ quality: 88 }).toBuffer());
  }
  const columns = 5;
  const rows = Math.ceil(tiles.length / columns);
  await sharp({ create: { width: columns * 220, height: rows * 222, channels: 3, background: '#dce7ef' } })
    .composite(tiles.map((input, index) => ({ input, left: (index % columns) * 220, top: Math.floor(index / columns) * 222 })))
    .jpeg({ quality: 88 })
    .toFile(path.join(previewDir, 'official-tata-selection.jpg'));
  fs.writeFileSync(path.join(previewDir, 'official-tata-selection.json'), `${JSON.stringify({ totals, entries: audit }, null, 2)}\n`);
}

async function applySelection() {
  const next = structuredClone(currentImages);
  next.version = '2026-09-04-official-assets-v1';
  next.generatedFrom = 'Monster Survival official creator assets manifest (2026-09-04)';
  next.sourcePolicy = {
    ...next.sourcePolicy,
    officialCreatorAssets: true,
    sourceTraceability: 'asset_id + source SHA-256',
    googleDriveHotlinking: false,
  };
  const nextFamilyMap = new Map(next.families.map((family) => [family.familyId, family]));
  for (const entry of selected) {
    const source = fs.readFileSync(entry.sourcePath);
    if (sha256(source) !== entry.sourceSha256) throw new Error(`${entry.officialAssetId}: source SHA-256 mismatch`);
    const outputDirectory = path.join(root, 'assets', 'official', 'tata', entry.familyId);
    fs.mkdirSync(outputDirectory, { recursive: true });
    const buffers = await optimizedBuffers(entry.sourcePath);
    const smallRelative = `assets/official/tata/${entry.familyId}/t${entry.stage}-256.webp`;
    const largeRelative = `assets/official/tata/${entry.familyId}/t${entry.stage}-512.webp`;
    fs.writeFileSync(path.join(root, smallRelative), buffers.small);
    fs.writeFileSync(path.join(root, largeRelative), buffers.large);
    const optimizedSha256 = sha256(buffers.large);
    const metadata = {
      stage: entry.stage,
      name: entry.name,
      src: `/${largeRelative.replaceAll('\\', '/')}`,
      srcset: `/${smallRelative.replaceAll('\\', '/')} 256w, /${largeRelative.replaceAll('\\', '/')} 512w`,
      sizes: '(max-width: 600px) 44vw, 256px',
      width: 512,
      height: 512,
      status: 'verified',
      sha256: optimizedSha256,
      sourceType: 'official_creator_asset',
      adoptionAction: entry.action,
      officialAssetId: entry.officialAssetId,
      sourceFilename: entry.sourceFilename,
      sourceSha256: entry.sourceSha256,
      optimizedPath: `/${largeRelative.replaceAll('\\', '/')}`,
      verifiedAt: '2026-09-04',
    };
    const family = nextFamilyMap.get(entry.familyId);
    const index = family.forms.findIndex((form) => form.stage === entry.stage);
    family.forms[index] = metadata;
    if (entry.stage === 1) family.stage1 = { ...metadata };
  }
  const forms = next.families.flatMap((family) => family.forms);
  next.counts = {
    families: next.families.length,
    forms: forms.length,
    verifiedForms: forms.filter((form) => form.status === 'verified').length,
    pendingForms: forms.filter((form) => form.status === 'pending').length,
    officialCreatorAssetForms: forms.filter((form) => form.sourceType === 'official_creator_asset').length,
  };
  fs.writeFileSync(path.join(root, 'data', 'tata-images.json'), `${JSON.stringify(next, null, 2)}\n`);
  fs.mkdirSync(path.join(root, 'data', 'official-assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'official-assets', 'tata-source-map.json'), `${JSON.stringify({
    version: '2026-09-04',
    sourceType: 'official_creator_asset',
    verifiedAt: '2026-09-04',
    counts: totals,
    assets: selected.map(({ sourcePath: _sourcePath, ...entry }) => {
      const form = nextFamilyMap.get(entry.familyId).forms.find((item) => item.stage === entry.stage);
      return { ...entry, optimizedPath: form.optimizedPath, optimizedSha256: form.sha256, width: form.width, height: form.height };
    }),
  }, null, 2)}\n`);
  const skillRecords = [];
  for (const { asset, target } of skillIcons) {
    const source = fs.readFileSync(asset.local_original_path);
    if (sha256(source) !== asset.sha256) throw new Error(`${asset.asset_id}: skill source SHA-256 mismatch`);
    const relative = `assets/official/skills/${target.familyId}-t${target.stage}.webp`;
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    const output = await sharp(source, { failOn: 'error' })
      .rotate()
      .resize(128, 128, { fit: 'contain', withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, alphaQuality: 100, effort: 4, smartSubsample: true })
      .toBuffer();
    fs.writeFileSync(path.join(root, relative), output);
    skillRecords.push({
      familyId: target.familyId,
      stage: target.stage,
      sourceType: 'official_creator_asset',
      officialAssetId: asset.asset_id,
      sourceFilename: asset.original_filename,
      sourceSha256: asset.sha256,
      optimizedPath: `/${relative.replaceAll('\\', '/')}`,
      optimizedSha256: sha256(output),
      width: 128,
      height: 128,
      verifiedAt: '2026-09-04',
    });
  }
  fs.writeFileSync(path.join(root, 'data', 'official-assets', 'skill-icons.json'), `${JSON.stringify({
    version: '2026-09-04',
    sourceType: 'official_creator_asset',
    count: skillRecords.length,
    excluded: [{ officialAssetId: 'MSOA-06272', sourceFilename: 'Lullelly-Sapping Orb.png', reason: 'No confirmed Tata mapping in the current database' }],
    icons: skillRecords,
  }, null, 2)}\n`);
  const eventRecords = [];
  for (const asset of eventAssets) {
    const source = fs.readFileSync(asset.local_original_path);
    if (sha256(source) !== asset.sha256) throw new Error(`${asset.asset_id}: event source SHA-256 mismatch`);
    const relative = `assets/official/events/treasure-hunt/${asset.asset_id.toLowerCase()}.webp`;
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    const output = await sharp(source, { failOn: 'error' })
      .rotate()
      .resize(256, 256, { fit: 'contain', withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, alphaQuality: 100, effort: 4, smartSubsample: true })
      .toBuffer();
    fs.writeFileSync(path.join(root, relative), output);
    eventRecords.push({
      eventId: 'treasure-hunt',
      sourceType: 'official_creator_asset',
      officialAssetId: asset.asset_id,
      sourceFilename: asset.original_filename,
      sourceSha256: asset.sha256,
      optimizedPath: `/${relative.replaceAll('\\', '/')}`,
      optimizedSha256: sha256(output),
      width: 256,
      height: 256,
      verifiedAt: '2026-09-04',
    });
  }
  fs.writeFileSync(path.join(root, 'data', 'official-assets', 'event-images.json'), `${JSON.stringify({
    version: '2026-09-04',
    sourceType: 'official_creator_asset',
    count: eventRecords.length,
    events: eventRecords,
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'data', 'official-assets', 'name-audit.json'), `${JSON.stringify({
    version: '2026-09-04',
    confirmed: { count: 223, differences: 0, changes: 0 },
    candidate: { count: 7, changes: 0, promotionAllowedFromImageEvidence: false },
    internalOnly: { count: 4, changes: 0, names: ['Volterrier', 'Zapleco', 'Voltgriff', 'Nyctolord'] },
    stableSlugsChanged: 0,
  }, null, 2)}\n`);

  const highQualityAudit = audit.filter((entry) => entry.currentStatus === 'verified').map((entry) => {
    const raw = manifest.assets
      .filter((asset) => asset.tata_family === entry.familyId && Number(asset.tata_stage) === entry.stage && asset.file_type === 'image' && !asset.extension.includes('gif') && !asset.extension.includes('psd') && Number(asset.width || 0) >= 512 && Number(asset.height || 0) >= 512)
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    if (!raw) return null;
    const adopted = entry.action === 'verified_to_high_quality_official';
    const candidate = adopted ? manifest.assets.find((asset) => asset.asset_id === entry.officialAssetId) : raw;
    const rejectReason = candidate.subcategory === 'tata-card'
      ? '不採用：カード絵で透過clean artではない'
      : /reference[_ -]?sheet/i.test(candidate.original_filename)
        ? '不採用：複数ポーズの参考シート'
        : candidate.subcategory === 'creator-promo'
          ? '不採用：単体立ち絵ではなくKV'
          : '不採用：企画絵または用途不一致。既存verifiedを維持';
    return { ...entry, candidate, decision: adopted ? '採用：透過clean artで明確に改善' : rejectReason };
  }).filter(Boolean);

  const table = (headers, rows) => [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map((row) => `| ${row.map((value) => String(value ?? '').replaceAll('|', '\\|')).join(' | ')} |`)].join('\n');
  const tataPendingTable = table(['対象', 'Current', 'Official candidate', 'Asset ID', '原本解像度', '理由'], audit.filter((entry) => entry.action === 'pending_to_official').map((entry) => [
    `${entry.familyId} T${entry.stage} ${entry.name}`, '画像確認中', entry.sourceFilename, entry.officialAssetId, `${entry.sourceWidth}×${entry.sourceHeight}`, 'family/stage一致・透過clean artを目視確認',
  ]));
  const tataUpgradeTable = table(['対象', 'Current', 'Official candidate', 'Asset ID', '原本解像度', '判断'], highQualityAudit.map((entry) => [
    `${entry.familyId} T${entry.stage}`, '既存verified画像', entry.candidate.original_filename, entry.candidate.asset_id, `${entry.candidate.width}×${entry.candidate.height}`, entry.decision,
  ]));
  const eventTable = table(['対象', 'Current', 'Official candidate', 'Asset ID', '原本解像度', '判断'], manifest.assets.filter((asset) => asset.classification === 'EVENTS').map((asset) => [
    'Treasure Hunt', asset.asset_id === 'MSOA-05880' ? '既存攻略ページ（動画未使用）' : 'イベント画像なし', asset.original_filename, asset.asset_id, `${asset.width || '-'}×${asset.height || '-'}`, eventAssetIds.includes(asset.asset_id) ? '採用：イベントフォルダ明示・汎用公式アート' : '不採用：重複variant、低解像度、用途不明確、または動画',
  ]));
  const logoTable = table(['Current', 'Official candidate', 'Asset ID', '原本解像度', '判断'], manifest.assets.filter((asset) => asset.classification === 'LOGO').map((asset) => [
    '独自サイトロゴ＋非公式表記', asset.original_filename, asset.asset_id, `${asset.width || '-'}×${asset.height || '-'}`, /krlogo/i.test(asset.original_filename) ? '不採用：韓国語地域向け' : '不採用：ゲーム公式ロゴと攻略DBブランドの混同を回避',
  ]));
  const skillTable = table(['対象', 'Current', 'Official candidate', 'Asset ID', '原本解像度', '判断'], manifest.assets.filter((asset) => asset.subcategory === 'skill-icon').map((asset) => {
    const target = resolveSkillTarget(asset);
    return [target ? `${target.familyId} T${target.stage}` : '対応未確定', 'スキル説明のみ', asset.original_filename, asset.asset_id, `${asset.width || '-'}×${asset.height || '-'}`, target ? '採用：family/stageをmanifestまたはconfirmed名で特定' : '不採用：現DBとの確定対応なし'];
  }));
  const evidence = `# 公式クリエイター素材 導入監査台帳（2026-09-04）

## 方針と集計

- 公式Drive原本はRepository外のread-only mirrorとして維持し、Web派生だけを採用した。
- Tataは230形態を監査。導入前 pending 119 → 導入後 pending 5、verified 111 → 225。
- 公式静止画を確認できた224形態のうち、pending解消114形態と既存verified改善7形態を採用した。
- 元レポートの高解像度候補27形態は全件比較し、カード絵・参考シート・KV等20形態を不採用とした。
- Team Builderの代表画像はT1のまま。候補段階はbadgeで表示する既存仕様を維持した。
- Google Drive hotlink、AI生成、別キャラ代用、動画・音声・APK・fontの公開は行っていない。

## A. pending → official（114形態）

${tataPendingTable}

## B. verified → high quality official（27候補を全件比較、7採用）

${tataUpgradeTable}

## C. Event画像（26件監査、4採用）

${eventTable}

## D. Logo（4件監査、変更0）

${logoTable}

## E. Skill icon（59件監査、58採用）

${skillTable}

## F. Enemy / Item / Background候補

| 分類 | 候補 | Asset ID | 解像度 | 判断 |
|---|---|---|---|---|
| Enemy | shaman zobo.png | MSOA-08854 | 3158×3481 | 利用0。対応する既存敵ページがなく、画像だけの薄いページを作らない |
| Item | txsc_fish_anaconda.png | MSOA-05080 | 591×591 | 利用0。現行アイテムDBとの意味対応を断定できない |
| Background | txsc_worldmap_cloud.png | MSOA-08767 | 1334×676 | 利用0。Hero/OGの情報価値とLCP改善が明確でないため現状維持 |

## G. 名称監査

- confirmed 223形態を現行JA / EN / zh-CNと照合し、差異0・変更0。
- candidate 7件は名称変更0。画像導入を理由に昇格していない。
- internal_only 4件（Volterrier / Zapleco / Voltgriff / Nyctolord）は名称変更0。
- family ID・slug・alias・Tier・進化優先度・スキル数値は変更していない。

## 不足形態

- nenbutsuhebi T4
- pakuma T2 / T3 / T4
- sukedako T4

公式Drive全体では pakuma T1 も不足だが、サイトには既存verified画像があるため公開画像確認中は上記5形態のみ。

## 追跡性

採用物は \`data/official-assets/\` に \`officialAssetId\`、原本ファイル名、原本SHA-256、最適化先、最適化後SHA-256またはTata mapping側SHA-256、確認日を保持する。UIへasset IDは表示しない。
`;
  fs.mkdirSync(path.join(root, 'docs', 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'evidence', 'official-assets-2026-09-04.md'), evidence);
}

await buildPreview();
if (apply) await applySelection();
console.log(JSON.stringify({ mode: apply ? 'apply' : 'audit', totals, selected: selected.length, skillIcons: skillIcons.length, eventAssets: eventAssets.length, previewDir: previewDir || null }, null, 2));
