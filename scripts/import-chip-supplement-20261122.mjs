import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='data/zombie-rush/chips.json',data=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(data.chips.length,49,'Append only to the reviewed 49-chip baseline');
const sourceUrl='https://w.atwiki.jp/monstersurvival/pages/128.html',checkedAt='2026-11-22';
const references=JSON.parse(fs.readFileSync(process.argv[2]||'../chips-20261122-evidence/wiki-image-reference.json','utf8'));
const records=[],added=[];
function add({id,name,rank,refName=name,effect,tags,stats=[],targetRole=null,verificationNote,conditions={}}){
 const ref=references.find(r=>r.name===refName&&r.rank===rank);assert(ref,`Missing visual reference: ${name}`);
 const source={sourceType:'public_wiki',sourceUrl,sourceUpdatedAt:checkedAt,verifiedAt:checkedAt,status:'externally_confirmed',evidence:'data/zombie-rush/chip-supplement-2026-11-22.json'};
 const chip={id,name:{ja:name,en:name,'zh-CN':name},rarity:['','I','II','III'][rank],icon:null,iconStatus:'pending',iconPendingReason:'reuse-permission-not-confirmed',effect:{ja:effect[0],en:effect[1],'zh-CN':effect[2]},tags,targetAttribute:null,targetPosition:tags.includes('placement')?'specified-by-effect':null,targetRole,flags:Object.fromEntries(['attack','defense','heal','cc','level','random','drawback','placement','special'].map(tag=>[tag,tags.includes(tag)])),source,effectSource:{...source},effectStats:stats,conditions,nameLocalizationStatus:{ja:'wiki-card-image-compared',en:'official-name-pending-japanese-fallback','zh-CN':'official-name-pending-japanese-fallback'},nameSources:{ja:{sourceType:'public_wiki_card_image',sourceUrl,imageUrl:ref.url,sourceSha256:ref.sha256,verifiedAt:checkedAt}}};
 if(verificationNote)chip.verificationNote={ja:verificationNote[0],en:verificationNote[1],'zh-CN':verificationNote[2]};
 added.push(chip);records.push({id,japaneseName:name,rarity:chip.rarity,sourceUrl,referenceImageUrl:ref.url,referenceSha256:ref.sha256,nameAndRankComparison:'matched',artworkComparison:'stage-correct reference viewed; not published',imagePermission:'unconfirmed',publishedIcon:null,effectStats:stats,conditionStatus:conditions.status||'externally_confirmed'});
}
const roles=[['fighter','ファイター','Fighter','战士',{attack:[12,18,24],defense:[12,18,24]}],['tank','タンク','Tank','坦克',{defense:[16,24,32],maxHp:[10,15,20]}],['archer','アーチャー','Archer','弓手',{attack:[20,30,40]}],['healer','ヒーラー','Healer','治疗者',{attack:[12,18,24],maxHp:[12,18,24]}],['supporter','サポーター','Supporter','辅助',{defense:[10,15,20],maxHp:[14,21,28]}],['special','スペシャル','Special','特殊',{attack:[8,12,16],defense:[8,12,16],maxHp:[8,12,16]}]];
const statLabels={attack:['攻撃力','ATK','攻击力'],defense:['防御力','DEF','防御力'],maxHp:['最大HP','max HP','最大生命值']};
for(const rank of [3,2,1]){
 for(const [role,ja,en,zh,values]of roles){
  const stats=Object.entries(values).map(([stat,ranks])=>({stat,value:ranks[rank-1],unit:'percent'}));
  const lists=[0,1,2].map(locale=>stats.map(s=>`${statLabels[s.stat][locale]}+${s.value}%`).join(locale===0?'、':locale===1?', ':'、'));
  add({id:`${role}-emblem-${['','i','ii','iii'][rank]}`,name:`${ja}の紋章${['','I','II','III'][rank]}`,refName:ja+'の紋章',rank,targetRole:role,effect:[`自分の${ja}タタ：${lists[0]}。`,`Your ${en} Tatari: ${lists[1]}.`,`你的${zh}塔塔：${lists[2]}。`],tags:[...(values.attack?['attack']:[]),...(values.defense||values.maxHp?['defense']:[])],stats});
 }
 if(rank===3){
  add({id:'last-stand',name:'背水の陣',rank,effect:['以降、ゾンビが1体でも防衛ラインへ到達すると戦闘終了。自分とチームメイトのタタのダメージが30%増加する。','From now on, the battle ends if any zombie reaches the defense line. Your and your teammate’s Tatari gain 30% increased damage.','此后只要有1只僵尸到达防线，战斗即结束。你和队友的塔塔伤害提高30%。'],tags:['attack','drawback','special'],stats:[{stat:'damage',value:30,unit:'percent'}],conditions:{zombiesReachingLineToEndBattle:1,includesTeammate:true}});
  add({id:'long-training',name:'長き修行',rank,effect:['12ウェーブ後、配置中で最もレベルの低いタタからランダムで1体を選び、Lv.8にする。第5ウェーブでのみ出現するとのWiki記載。','After 12 waves, one randomly chosen Tatari among your lowest-level deployed Tatari is raised to Lv.8. The Wiki lists this chip as offered only at wave 5.','经过12波后，从你已部署且等级最低的塔塔中随机选1只升至Lv.8。Wiki记载仅在第5波出现。'],tags:['level','random','special'],stats:[{stat:'delayWaves',value:12},{stat:'targetLevel',value:8},{stat:'targetCount',value:1}],conditions:{offeredAtWave:5,selection:'random-among-lowest-level-deployed'}});
 }
 if(rank===2){
  add({id:'little-adult',name:'小さな大人',rank,effect:['自分の低レベルのタタの攻撃力・防御力・最大HPが30%増加する。対象の上限Lvは未確定。','Your low-level Tatari gain 30% ATK, DEF and max HP. The maximum eligible level is unresolved.','你的低等级塔塔攻击力、防御力及最大生命值提高30%。适用的最高等级尚未确认。'],tags:['attack','defense','level'],stats:['attack','defense','maxHp'].map(stat=>({stat,value:30,unit:'percent'})),conditions:{status:'conflicting',targetMaxLevel:null,wikiEffectMaxLevel:5,wikiCommentMaxLevel:4},verificationNote:['Wiki効果欄は「Lv.5以下」、解説欄は「4までと思われる」と記載。条件は未確定として掲載し、自動補正には使用しません。','The Wiki effect table says Lv.5 or below; its commentary suggests Lv.4 or below. This unresolved condition is not used for automatic adjustments.','Wiki效果栏写Lv.5及以下，解说栏推测为Lv.4及以下。此条件尚未确认，不用于自动修正。']});
  add({id:'tata-revival',name:'タタ蘇生',rank,effect:['自分のタタが倒れた時、キャンディが十分なら再配置コストの80%を自動消費して復活させる。','When your Tatari falls, automatically revive it by spending 80% of its redeployment cost if you have enough Energy Candies.','你的塔塔倒下时，若能量糖果足够，会自动消耗重新部署费用的80%使其复活。'],tags:['heal','special'],stats:[{stat:'redeploymentCost',value:80,unit:'percent'}],conditions:{requiresSufficientEnergyCandies:true}});
  add({id:'frontier-expansion',name:'開拓と拡張',rank,effect:['配置エリアを前方へ横3列拡張し、自分とチームメイトのタタを配置・移動できるようにする。','Extend the deployment area forward by three horizontal rows, allowing your and your teammate’s Tatari to be placed or moved there.','部署区域向前扩展3横排，你和队友的塔塔均可放置或移动到扩展区域。'],tags:['placement','special'],stats:[{stat:'additionalFrontRows',value:3}],conditions:{includesTeammate:true}});
 }
 if(rank===1)add({id:'delayed-reward',name:'おあずけご褒美',rank,effect:['5ウェーブ後にエナジーキャンディを400個獲得する。','Gain 400 Energy Candies after 5 waves.','经过5波后获得400个能量糖果。'],tags:['special'],stats:[{stat:'delayWaves',value:5},{stat:'energyCandies',value:400}]});
}
assert.equal(added.length,24);assert.equal(new Set([...data.chips,...added].map(c=>c.id)).size,73);
data.chips.push(...added);data.count=data.chips.length;data.updated=checkedAt;
data.latestSupplement={checkedAt,sourceUrl,evidence:'data/zombie-rush/chip-supplement-2026-11-22.json',added:24,existing:49,imagesPending:24,sourceGameVersion:'0.52.1',officialExistenceSource:'https://apps.apple.com/jp/app/id6741567125',individualEffectsOfficiallyConfirmed:false};
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
const evidence={version:1,checkedAt,sourceUrl,sourceUpdatedAt:checkedAt,officialExistenceSource:'https://apps.apple.com/jp/app/id6741567125',officialScope:'Version 0.52.1 confirms new chips and Hikoko exist; individual chip names, ranks and values below are externally checked Wiki data.',baselineCount:49,addedCount:24,totalCount:73,imagesPublished:0,imagesPending:24,imageRights:{status:'unconfirmed',officialManifest:'2026-09-04 / 9726 entries',officialMaterialMatch:'not established',wikiMaterialPage:'https://w.atwiki.jp/monstersurvival/pages/26.html',wikiTerms:'https://atwiki.jp/tos',note:'No new Wiki card is published or hotlinked. References were viewed for name/rank matching only. No substitute artwork is used.'},records};
fs.writeFileSync('data/zombie-rush/chip-supplement-2026-11-22.json',JSON.stringify(evidence,null,2)+'\n');
console.log('Appended 24 chips: 73 total; 24 icons pending reuse permission.');
