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
 assert.equal(Object.values(normal.byFamily).reduce((n,f)=>n+f.stages.length,0),242);
 for(const family of Object.values(normal.byFamily))for(const stage of family.stages){
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
test('reviewed effect corrections preserve three conflicts instead of resolving them by invention',()=>{
 const chips=json('data/zombie-rush/chips.json').chips;
 for(const id of ['upgrade','rear-support','bucket-theory'])assert.ok(chips.find(c=>c.id===id).verificationNote);
 for(const [id,number] of [['slack-off','40'],['boss-killer','20'],['maverick','35'],['lawn-care','40'],['parting-gift','40'],['strategic-move','30']])
  for(const language of ['ja','en','zh-CN']) assert.ok(chips.find(c=>c.id===id).effect[language].includes(number),id+' '+language);
});

test('unknown chip names retain the entire Japanese label in both foreign locales',()=>{
 for(const chip of json('data/zombie-rush/chips.json').chips){
  assert.equal(chip.name.en,chip.name.ja);assert.equal(chip.name['zh-CN'],chip.name.ja);
  assert.equal(chip.nameLocalizationStatus.en,'official-name-pending-japanese-fallback');
 }
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
