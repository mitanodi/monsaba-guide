import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const errors=[];const expect=(condition,message)=>{if(!condition)errors.push(message)};
const stage=json('data/stages.json'),items=json('data/items.json'),acquisition=json('data/tata-acquisition.json');
expect(Array.isArray(stage.guides)&&stage.requiredFields.length===10,'stage guide schemaが不正です');
expect(Array.isArray(items.items)&&items.items.length===0,'未確認アイテムを追加しています');
expect(Object.keys(acquisition.byFamily||{}).length===0,'未確認の入手方法を追加しています');
expect(read('events/treasure-hunt/solver.js').includes('function backtrack')&&read('events/treasure-hunt/solver.js').includes('localStorage'),'Treasure Hunt solverの制約探索または保存がありません');
expect(!read('events/treasure-hunt/solver.js').includes('adj-acent'),'参考サイトの実装参照が混入しています');
expect(read('search/search.js').includes('distance =')&&read('data/tatari.json').includes('"ライマー"')&&read('data/tatari.json').includes('"ヒカル"'),'fuzzy/alias検索が不足しています');
expect(read('compare/index.html').includes('compareASearch')&&read('compare/compare.js').includes('compareCandidates'),'比較検索UIがありません');
expect(read('tata/denjika/index.html').includes('data-family-id="denjika"')&&read('tata/denjika/index.html').includes('tata-favorite-button'),'タタ履歴・お気に入りUIがありません');
expect(read('consult/consult.js').includes('answerProvenance'),'相談所の根拠表示がありません');
expect(read('zombie-rush/index.html').includes('Season 1実戦Tier')&&read('zombie-rush/index.html').includes('旧環境Tier'),'ZR新旧Tierが分離されていません');
const versions=[...new Set([...read('index.html').matchAll(/\?v=([a-f0-9]{12})/g)].map(match=>match[1]))];
expect(versions.length===1&&versions[0]===json('data/asset-build.json').version,'共通asset versionが不正です');
for(const file of ['stages/index.html','evolution/index.html','items/index.html','systems/index.html','events/index.html','events/treasure-hunt/index.html','roles/index.html','compare-guides/purabi-vs-denjika/index.html'])expect(fs.existsSync(path.join(root,file)),`${file}がありません`);
if(errors.length){console.error(`30項目追加検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);process.exit(1)}
console.log('30項目追加検証成功: data foundations / solver / search / compare / favorites / ZR / asset version');
