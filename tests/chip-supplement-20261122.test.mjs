import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {emptyTeam,encodeTeam,decodeTeam,saveDraft,loadDraft,saveTeamList,loadTeams,teamText} from '../team-builder/team-core.js';
const read=file=>JSON.parse(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const data=read('data/zombie-rush/chips.json'),all=data.chips,legacy=all.slice(0,49),added=all.slice(49);
const evidence=read('data/zombie-rush/chip-supplement-2026-11-22.json');
const families=read('data/tatari.json').families;

test('all 24 additions are append-only, stage-correct and separately attributed from historical evidence',()=>{
 const baseline=read('docs/evidence/chip-correspondence-2026-10-06.json').rows;
 assert.equal(data.count,73);assert.equal(all.length,73);assert.equal(new Set(all.map(c=>c.id)).size,73);
 assert.deepEqual(legacy.map(c=>c.id),baseline.map(c=>c.id));
 assert.equal(added.length,24);assert.equal(evidence.records.length,24);
 assert.deepEqual(added.map(c=>c.id),evidence.records.map(r=>r.id));
 for(const chip of added){
  const row=evidence.records.find(r=>r.id===chip.id);
  assert.equal(chip.name.ja,row.japaneseName);assert.equal(chip.rarity,row.rarity);
  assert.equal(chip.source.sourceType,'public_wiki');assert.equal(chip.source.sourceUrl,'https://w.atwiki.jp/monstersurvival/pages/128.html');
  assert.equal(chip.source.pdfPage,undefined);assert.equal(chip.source.pdfPages,undefined);
  assert.deepEqual(chip.effectStats,row.effectStats);assert.equal(row.nameAndRankComparison,'matched');
  for(const locale of ['en','zh-CN']){assert.equal(chip.name[locale],chip.name.ja);assert.equal(chip.nameLocalizationStatus[locale],'official-name-pending-japanese-fallback');assert.ok(chip.effect[locale]);}
 }
});

test('six profession emblems preserve every independently reported rank value',()=>{
 const expected={fighter:{attack:[12,18,24],defense:[12,18,24]},tank:{defense:[16,24,32],maxHp:[10,15,20]},archer:{attack:[20,30,40]},healer:{attack:[12,18,24],maxHp:[12,18,24]},supporter:{defense:[10,15,20],maxHp:[14,21,28]},special:{attack:[8,12,16],defense:[8,12,16],maxHp:[8,12,16]}};
 for(const [role,stats]of Object.entries(expected))for(const [index,rank]of ['i','ii','iii'].entries()){
  const chip=added.find(c=>c.id===`${role}-emblem-${rank}`);assert(chip);assert.equal(chip.targetRole,role);
  assert.deepEqual(Object.fromEntries(chip.effectStats.map(s=>[s.stat,s.value])),Object.fromEntries(Object.entries(stats).map(([key,values])=>[key,values[index]])));
 }
});

test('six distinct effects retain delays, costs and the user-confirmed inclusive Lv.5 condition',()=>{
 const byId=Object.fromEntries(added.map(c=>[c.id,c]));
 assert.deepEqual(byId['last-stand'].conditions,{zombiesReachingLineToEndBattle:1,includesTeammate:true});
 assert.equal(byId['last-stand'].effectStats[0].value,30);
 assert.deepEqual(byId['long-training'].effectStats.map(s=>s.value),[12,8,1]);assert.equal(byId['long-training'].conditions.offeredAtWave,5);
 const little=byId['little-adult'];assert.equal(little.conditions.targetMaxLevel,5);assert.equal(little.conditions.status,'user_confirmed');assert.equal(little.conditions.targetMaxLevelInclusive,true);
 assert.equal(little.conditionSource.sourceType,'user_confirmation');assert.equal(little.conditionSource.officialConfirmation,false);
 assert.equal(little.conditionHistory.previousConditions.wikiEffectMaxLevel,5);assert.equal(little.conditionHistory.previousConditions.wikiCommentMaxLevel,4);
 assert.equal(little.verificationNote,undefined);
 for(const locale of ['ja','en','zh-CN'])assert(little.effect[locale].includes('5'));
 for(const [level,eligible]of [[4,true],[5,true],[6,false]])assert.equal(level<=little.conditions.targetMaxLevel,eligible);
 assert.equal(byId['tata-revival'].effectStats[0].value,80);assert.equal(byId['tata-revival'].conditions.requiresSufficientEnergyCandies,true);
 assert.equal(byId['frontier-expansion'].effectStats[0].value,3);assert.equal(byId['frontier-expansion'].conditions.includesTeammate,true);
 assert.deepEqual(byId['delayed-reward'].effectStats.map(s=>s.value),[5,400]);
});

test('all 24 user-authorized icons retain the original name/rank-matched bytes and a separate license status',()=>{
 assert.equal(evidence.imagesPublished,24);assert.equal(evidence.imagesPending,0);
 assert.equal(data.latestSupplement.imagesPublished,24);assert.equal(data.latestSupplement.imagesPending,0);
 assert.equal(evidence.imageRights.sourceType,'user_instruction');assert.equal(evidence.imageRights.thirdPartyLicenseStatus,'unconfirmed');
 for(const chip of added){
  const row=evidence.records.find(r=>r.id===chip.id);
  assert.match(chip.icon,new RegExp('^/assets/chips/'+chip.id+'-wiki-[a-f0-9]{12}\\.webp$'));assert.equal(chip.iconStatus,'verified');assert.equal(chip.iconPendingReason,undefined);
  assert.equal(row.publishedIcon,chip.icon);assert.equal(row.imagePermission,'user-authorized');assert.equal(row.thirdPartyLicenseStatus,'unconfirmed');assert.match(row.referenceSha256,/^[a-f0-9]{64}$/);
  const bytes=fs.readFileSync(new URL('..'+chip.icon,import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.referenceSha256);
  assert.equal(chip.iconSource.nameAndRankComparison,'matched');assert.equal(chip.iconSource.artworkComparison,'visually-matched-original-card');
  assert.match(row.referenceImageUrl,/^https:\/\/img\.atwiki\.jp\/monstersurvival\/attach\/83\//);
 }
 assert.equal(legacy.filter(c=>c.iconStatus==='verified'&&c.icon).length,49);
});

test('every old URL encoding stays identical while all new chips survive both-player shares and private storage',()=>{
 for(let start=0;start<legacy.length;start+=3){
  const team=emptyTeam();team.mode='zombie';team.chips[1]=legacy.slice(start,start+3).map(c=>c.id);
  assert.equal(encodeTeam(team,families,legacy),encodeTeam(team,families,all));
 }
 for(let start=0;start<added.length;start+=3){
  const team=emptyTeam();team.mode='zombie';team.chips[1]=added.slice(start,start+3).map(c=>c.id);team.chips[2]=[legacy[0].id,added[start].id];
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  saveDraft(storage,team,families);saveTeamList(storage,[team],families);
  for(const restored of [decodeTeam(encodeTeam(team,families,all),families,all),loadDraft(storage,families),loadTeams(storage,families)[0]])assert.deepEqual(restored.chips,team.chips);
  for(const id of team.chips[1])assert(teamText(team,families,'ja',all).includes(all.find(c=>c.id===id).name.ja));
 }
});
