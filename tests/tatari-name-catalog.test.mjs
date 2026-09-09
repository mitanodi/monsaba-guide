import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const root=new URL('../',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('data/tatari-name-catalog.json',root),'utf8'));

test('provided workbook name catalog publishes all 236 non-empty multilingual rows',()=>{
  assert.equal(catalog.source.fileName,'Tatari_Name (1).xlsx');
  assert.equal(catalog.source.scope,'names_only');
  assert.equal(catalog.names.length,236);
  assert.equal(catalog.names.filter(item=>item.existingFamilyId).length,230);
  assert.equal(catalog.names.filter(item=>item.status==='supplemental-name-only').length,6);
  for(const item of catalog.names){assert.ok(item.japaneseName);assert.ok(item.englishName);assert.ok(item.simplifiedChineseName);assert.ok(Number.isInteger(item.sourceRow));assert.ok(item.mappedFamilyId);assert.ok(item.mappedStage);assert.ok(item.sitePath);}
});

test('six supplemental rows are mapped without inventing gameplay attributes',()=>{
  const namesOnly=catalog.names.filter(item=>item.status==='supplemental-name-only');
  assert.deepEqual(namesOnly.map(item=>item.japaneseName),['エーテリファル','ジャンガルパカ','ヌスケ','ラクディット','マスクーン','トリックーン']);
  assert.deepEqual(namesOnly.map(item=>`${item.mappedFamilyId}:T${item.mappedStage}`),['shizukuchou:T4','tsubaruka:T4','nusuke:T1','nusuke:T2','nusuke:T3','nusuke:T4']);
  for(const item of namesOnly){assert.equal(item.attribute,undefined);}
});

test('localized searchable catalog pages use the shared source and remain non-indexed until gameplay mapping is known',async()=>{
  for(const path of ['tatari-names/index.html','en/tatari-names/index.html','zh-cn/tatari-names/index.html']){const html=await readFile(new URL(path,root),'utf8');assert.match(html,/noindex,follow/);assert.match(html,/tatari-names\/catalog\.js/);assert.match(html,/236/);}
  const script=await readFile(new URL('tatari-names/catalog.js',root),'utf8');assert.match(script,/tatari-name-catalog\.json/);assert.match(script,/previousJapaneseName/);
  for(const path of ['tata/nusuke/index.html','en/tata/nusuke/index.html','zh-cn/tata/nusuke/index.html']){const html=await readFile(new URL(path,root),'utf8');assert.match(html,/ヌスケ|Ringtail|干脆面/);assert.match(html,/トリックーン|Phantothief|偷心假面/);}
});
