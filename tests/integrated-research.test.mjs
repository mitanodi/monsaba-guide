import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {protectLocalizedHtml} from '../scripts/lib/protect-localized-html.mjs';
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
test('nested untranslated content and adjacent advertising bytes survive localization',()=>{
 const source='<section><div translate="no"><b>Rock Breath</b><p>4%<span>子分</span></p></div><script data-ad="unchanged">x()</script><p>翻訳</p></section>';
 const protectedHtml=protectLocalizedHtml(source);
 assert.equal(protectedHtml.restore(protectedHtml.html.replace('翻訳','Translation')),source.replace('翻訳','Translation'));
 assert.ok(!protectedHtml.html.includes('子分'));
});
test('normal and dedicated skills retain independent evolution and level dimensions',()=>{
 const normal=json('data/tata-skills.json'),zr=json('data/zombie-rush/skills.json');
 assert.equal(Object.keys(zr.byFamily).length,66);
 assert.equal(Object.values(normal.byFamily).reduce((n,f)=>n+f.stages.length,0),246);
 for(const family of Object.values(normal.byFamily))for(const stage of family.stages){
  if(stage.verificationStatus==='pending-user-skill-evidence'){assert.equal(stage.skillName,'確認待ち');assert.deepEqual(stage.values,[]);continue;}
  assert.equal(stage.externalReview.sourceType,'public_wiki');
  assert.match(stage.externalReview.sourceUrl,/^https:\/\/w.atwiki.jp\/monstersurvival\/pages\/\d+\.html$/);
 }
 for(const family of Object.values(zr.byFamily))assert.deepEqual(family.skills.map(s=>s.level),[3,5,7]);
 assert.equal(normal.byFamily.tsubaruka.stages[3].skillName,'ドシャツバ嵐');
 assert.deepEqual(normal.byFamily.tsubaruka.stages[3].values,[{label:'束縛持続',value:'1秒'}]);
 assert.equal(normal.byFamily.erekineko.stages[0].skillName,'雷猫拳');
 assert.equal(normal.byFamily.erekineko.stages[0].externalReview.sourceSkillName,'電猫拳');
 assert.equal(zr.byFamily.himori.skills[2].values.find(v=>v.metric==='damagePercent').value,270);
});
test('dated official update resolves older chip conflicts while preserving their evidence',()=>{
 const chips=json('data/zombie-rush/chips.json').chips;
 for(const id of ['upgrade','rear-support','bucket-theory'])assert.ok(chips.find(c=>c.id===id).verificationNote);
 for(const [id,value] of [['rear-support','45%'],['bucket-theory','15%']])for(const language of ['ja','en','zh-CN'])assert.ok(chips.find(c=>c.id===id).effect[language].includes(value));
 assert.ok(chips.find(c=>c.id==='upgrade').effect.ja.includes('2アップ'));
 for(const id of ['upgrade','rear-support','bucket-theory']){const c=chips.find(c=>c.id===id);assert.equal(c.effectSource.sourceUrl,'https://discord.com/channels/1343763804349267989/1344150608743104532/1551858168974417943');assert.equal(c.effectSource.effectiveAt,'2026-09-23');assert.ok(c.effectHistory.previousVerificationNote);}
 for(const [id,number] of [['slack-off','40'],['boss-killer','20'],['maverick','35'],['lawn-care','40'],['parting-gift','40'],['strategic-move','30']])
  for(const language of ['ja','en','zh-CN']) assert.ok(chips.find(c=>c.id===id).effect[language].includes(number),id+' '+language);
});

test('official chip names have source records and unknown names retain complete Japanese labels',()=>{
 let confirmed=0;
 for(const chip of json('data/zombie-rush/chips.json').chips){
  assert.equal(chip.name['zh-CN'],chip.name.ja);
  if(chip.nameLocalizationStatus.en==='official-source-confirmed'){confirmed++;assert.equal(chip.nameSources.en.sourceType,'official_discord');assert.match(chip.nameSources.en.sourceUrl,/\/(1541736245124792390|1551858168974417943)$/);}
  else {assert.equal(chip.name.en,chip.name.ja);assert.equal(chip.nameLocalizationStatus.en,'official-name-pending-japanese-fallback');}
 }
 assert.equal(confirmed,21);
 const names=Object.fromEntries(json('data/zombie-rush/chips.json').chips.map(c=>[c.id,c.name.en]));
 assert.equal(names['rear-support'],'Backend Support');assert.equal(names.upgrade,'Patch Upgrade');assert.equal(names['bucket-theory'],'Weakest Link');assert.equal(names['sugar-iii'],'Photosynthesis III');
});

import {languageSwitchHash} from '../team-builder/locale-handoff.js';
import {emptyTeam,loadDraft,decodeTeam} from '../team-builder/team-core.js';
test('language switching keeps edits after opening an older shared URL, including the private name',()=>{
 const families=json('data/tatari.json').families,chips=json('data/zombie-rush/chips.json').chips;
 const team=emptyTeam();team.mode='zombie';team.name='ローカル名を保持';team.slots[0]={familyId:'rukaron',stage:4,playerId:1,level:3};team.slots[1]={familyId:'rukaron',stage:4,playerId:2,level:5};team.chips[1]=['rock-iii'];
 const store=new Map(),storage={setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)||null};
 assert.equal(languageSwitchHash(storage,team,families,chips),'');
 const restored=loadDraft(storage,families);assert.equal(restored.name,team.name);assert.deepEqual(restored.slots,team.slots);assert.deepEqual(restored.chips,team.chips);
 const fallback=languageSwitchHash({setItem(){throw new Error('blocked');}},team,families,chips);
 assert.ok(fallback.startsWith('#build='));const decoded=decodeTeam(fallback.slice(7),families,chips);assert.deepEqual(decoded.slots,team.slots);assert.deepEqual(decoded.chips,team.chips);
 assert.ok(!fallback.includes(team.name));
 const ui=fs.readFileSync(new URL('../team-builder/team-builder.js',import.meta.url),'utf8');assert.match(ui,/#site-language[\s\S]*languageSwitchHash[\s\S]*capture: true/);
});
