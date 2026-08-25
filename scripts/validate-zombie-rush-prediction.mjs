import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const errors=[];
const expect=(condition,message)=>{if(!condition) errors.push(message);};

const prediction=json('data/zombie-rush/seasons/season-1-prediction.json');
const season=json('data/zombie-rush/seasons/season-1.json');
const tatari=json('data/tatari.json');
const tierRatings=json('data/tier-ratings.json');
const normalSkills=json('data/tata-skills.json');
const html=read('zombie-rush/index.html');
const script=read('zombie-rush/zombie-rush.js');
const styles=read('zombie-rush/prediction.css');

const families=tatari.families||[];
const byId=new Map(families.map(family=>[family.id,family]));
const predictions=prediction.predictions||[];
const tierIds=(prediction.tiers||[]).flatMap(group=>group.ids||[]);
const predictionIds=predictions.map(item=>item.familyId);
const officialIds=(season.tataSkillBalance||[]).map(item=>item.familyId);
const unique=items=>new Set(items).size===items.length;
const sorted=items=>[...items].sort().join('|');

expect(prediction.meta?.status==='pre-implementation-prediction','AI予測のstatusが実装前予測ではありません');
expect(prediction.meta?.predictionAsOf==='2026-08-25','AI予測基準日が2026-08-25ではありません');
expect(prediction.meta?.scope==='zombie-rush-only','AI予測の対象範囲がZombie Rush専用ではありません');
expect(prediction.meta?.officialDataPath==='/data/zombie-rush/seasons/season-1.json','公式データとAI予測の参照分離が不正です');
expect(prediction.meta?.disclaimer?.includes('公式Tierではなく')&&prediction.meta?.disclaimer?.includes('実装後の実戦結果'),'AI予測の注意文が不足しています');
expect(prediction.meta?.adoptionDisclaimer?.includes('実測・統計・公式データではありません'),'AI予測採用率の注意文が不足しています');
expect(JSON.stringify(prediction.comparisonConfig?.resultValues)==='["pending","exact","off_by_one","miss"]','的中結果の値定義が不正です');
expect(JSON.stringify(prediction.comparisonConfig?.actualMovementValues)==='["up","same","down"]','実戦の上昇・維持・下降値定義が不正です');
expect(prediction.comparisonConfig?.pendingExcludedFromDenominator===true,'未判定を的中率の分母から除外する定義がありません');

expect((season.tataSkillBalance||[]).length===35,'公式Season 1専用スキル調整が35系統ではありません');
expect(predictions.length===35,'AI予測対象が35系統ではありません');
expect(tierIds.length===35,'AI予測Tierの登録数が35系統ではありません');
expect(unique(predictionIds),'AI予測対象に重複があります');
expect(unique(tierIds),'AI予測Tier内に重複があります');
expect(sorted(predictionIds)===sorted(tierIds),'AI予測詳細とTier所属が一致しません');
expect(sorted(predictionIds)===sorted(officialIds),'AI予測対象と公式35調整対象が一致しません');

const expectedCounts={SSS:5,SS:14,S:14,A:2};
for(const [rank,count] of Object.entries(expectedCounts)){
  const group=(prediction.tiers||[]).find(item=>item.rank===rank);
  expect((group?.ids||[]).length===count,`${rank}のAI予測数が${count}ではありません`);
}

for(const item of predictions){
  const family=byId.get(item.familyId);
  const group=(prediction.tiers||[]).find(entry=>(entry.ids||[]).includes(item.familyId));
  expect(Boolean(family),`${item.familyId}: tatari.jsonに系統がありません`);
  expect(Boolean(family?.evolutions?.[0]?.name),`${item.familyId}: stage 1名がありません`);
  expect(group?.rank===item.predictedTier,`${item.familyId}: Tier所属とpredictedTierが一致しません`);
  expect(item.actualTier===null&&item.result==='pending',`${item.familyId}: 実装前なのに実戦Tierまたはresultが確定しています`);
  expect(item.comparison?.actualMovement===null&&item.comparison?.movementResult==='pending',`${item.familyId}: 実装前なのに上昇・維持・下降判定が確定しています`);
  expect(['大幅上昇','上昇','維持','下降','大幅下降','実質下降'].includes(item.movement),`${item.familyId}: 変動表記が不正です`);
}

for(const [id,name] of Object.entries({denjika:'ビリジカ',shizukuchou:'シズクジ',nenbutsuhebi:'ボウズヘビ',fukurogumo:'フクロクモ',shiiparusu:'ライメー',kunbuu:'クンブー'})){
  expect(byId.get(id)?.evolutions?.[0]?.name===name,`${id}: 現在確認済みのstage 1名 ${name} が維持されていません`);
}
expect(script.includes('getFamilyDisplayLabel(family)')&&!script.includes('officialTataName)}系'), 'カード表示がstage 1名 + 系ルールを使っていません');

const holds=prediction.holds||[];
expect(holds.some(item=>item.id==='pakuma'&&item.status==='AI評価保留'&&item.nextAction==='実装後確認予定'),'パクマのAI評価保留がありません');
expect(holds.some(item=>item.familyId==='nenbutsuhebi'&&item.nextAction==='新T4実装確認後に再評価'),'ボウズヘビ新T4の評価保留がありません');
expect((prediction.rankings?.rising||[]).length===5&&(prediction.rankings?.falling||[]).length===5,'上昇・下降ランキングがTOP5ではありません');
expect((prediction.adoptionPredictions||[]).length>=10,'AI予測採用率が最低10系統ありません');

const trani=(season.tataSkillBalance||[]).find(item=>item.familyId==='haamitora');
const kaen=trani?.skills?.find(skill=>skill.name==='火焔爆裂')?.changes?.find(change=>change.metric==='ダメージ倍率');
expect(kaen?.before==='160%'&&kaen?.after==='230%','トラーニー火焔爆裂が公式告知の160%→230%ではありません');

expect(html.includes('id="prediction"')&&html.includes('Season 1 AI予測Tier'),'AI予測Tierセクションがありません');
expect(html.includes('AI予測')&&html.includes('実装前予測'),'目立つAI予測ラベルがありません');
expect(html.includes('公式Tier・実戦確認済みTierではありません'),'公式Tierではない注意表示がありません');
expect(html.includes('id="prediction-accuracy"')&&html.includes('AI予測的中率'),'AI予測的中率カードがありません');
expect(html.includes('id="predictionExactRate">0%</strong>')&&html.includes('id="predictionJudged">0 / 35</strong>'),'実装前の完全的中率0%・判定済み0/35表示がありません');
expect(html.includes('id="predictionAccuracyStatus">答え合わせ前</strong>'),'実装前の答え合わせ前表示がありません');
expect(html.includes('0%は全予測が外れたという意味ではなく'),'0%の誤解防止説明がありません');
expect(html.includes('AI予測採用率')&&html.includes('実測・統計・公式データではなく'),'採用率の非実測表示がありません');
expect(html.includes('<link rel="canonical" href="https://monster-survival.com/zombie-rush/"'),'Zombie Rush URL/canonicalが変更されています');
expect(html.includes('/zombie-rush/prediction.css'),'AI予測専用スタイルが読み込まれていません');
expect(script.includes('movementMeta')&&script.includes("'大幅上昇':{symbol:'⬆'")&&script.includes("'大幅下降':{symbol:'⬇'"),'変動が色だけでなく記号と文字で表示されていません');
expect(script.includes('calculatePredictionAccuracy')&&script.includes("item.result!=='pending'"),'未判定を除外する的中率自動計算がありません');
expect(script.includes("difference===0?'exact':difference===1?'off_by_one':'miss'"),'完全一致・1段階差・2段階以上の自動判定がありません');
expect(script.includes('resolveMovementResult')&&script.includes('tierMovementDirection'),'上昇・維持・下降の答え合わせ設計がありません');
expect(styles.includes('.prediction-accuracy-card'),'AI予測的中率カードの専用デザインがありません');
expect(styles.includes('@media(max-width:760px)')&&styles.includes('@media(max-width:430px)')&&styles.includes('minmax(0,1fr)'),'AI予測UIのレスポンシブ対策が不足しています');

expect(Boolean(tierRatings.zombieRush?.groups)&&!tierRatings.zombieRush?.prediction,'現在のZombie Rush実戦TierへAI予測が混入しています');
expect(!JSON.stringify(normalSkills).includes('season-1-ai-prelaunch-2026-08-25'),'通常スキルDBへAI予測が混入しています');

if(errors.length){
  console.error(`Zombie Rush Season 1 AI予測検証失敗 (${errors.length})\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log('Zombie Rush Season 1 AI予測検証成功: 35系統 / Tier重複なし / stage 1名表示 / 公式データ分離 / 的中率・変動比較・保留・採用率正常');
