import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {load} from 'cheerio';
import {MODES,TIERS,groupRankings,legacyRatings} from '../lib/tata-tier.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const data=json('data/tata-tier.json'), canonical=json('data/tatari.json').families, images=json('data/tata-images.json').families;
test('65 canonical families have five independent, valid rankings and real assets/URLs',()=>{
  assert.equal(data.families.length,65);
  assert.equal(new Set(data.families.map(f=>f.familyId)).size,65);
  assert.deepEqual(data.families.map(f=>f.familyId).sort(),canonical.map(f=>f.id).sort());
  for(const f of data.families){
    assert.deepEqual(Object.keys(f.rankings),MODES);
    assert.equal(f.slug,f.familyId);
    assert.ok(fs.existsSync(path.join(root,`tata/${f.slug}/index.html`)));
    const image=images.find(i=>i.familyId===f.familyId)?.stage1;
    assert.ok(image?.width&&image?.height);
    assert.ok(fs.existsSync(path.join(root,image.src.replace(/^\//,''))));
    for(const r of Object.values(f.rankings)){
      assert.ok(TIERS.includes(r.tier));
      assert.ok(['confirmed','provisional','hold'].includes(r.status));
      assert.equal(r.tier==='HOLD',r.status==='hold');
    }
  }
  const all=data.families.flatMap(f=>Object.values(f.rankings));
  assert.equal(all.filter(r=>r.tier==='HOLD').length,0);
  assert.equal(all.filter(r=>r.status==='provisional').length,5);
  assert.equal(groupRankings(data,'overall')[0].entries.length,11);
});
test('editorial spot checks retain large mode differences and raw provisional values',()=>{
  const expected={gaoden:'SSS SSS SSS SSS SSS',yanzaru:'SSS SSS S SSS SSS',denjika:'SS SSS A SSS SS',boruzarashi:'SSS SSS SSS SSS SS',tafupen:'SS SSS B SSS SSS',matchiba:'SS SSS B SSS SSS',nekoori:'S S B A SSS',himori:'A A B A SSS',furuggu:'S S B A SSS',haamitora:'S SSS D SSS SS',yaminome:'SS S SSS SS SS',hikaru:'D D D D D'};
  for(const [id,values] of Object.entries(expected)){const f=data.families.find(f=>f.familyId===id);assert.equal(MODES.map(m=>f.rankings[m].tier).join(' '),values,id);}
  for(const [id,mode,raw] of [['fureebi','zombie','A〜B'],['pupunku','normal','H'],['mogurin','zombie','E']])assert.equal(data.families.find(f=>f.familyId===id).rankings[mode].rawEvaluation,raw);
  assert.deepEqual(json('data/tier-ratings.json'),legacyRatings(data));
});
test('all three locales render every family once per board in the specified order without JavaScript',()=>{
  for(const prefix of ['','en/','zh-cn/']){
    const $=load(read(`${prefix}tata-tier/index.html`));
    assert.equal($('.tier-board').length,5);
    assert.equal($('h1').length,1);
    assert.equal($('.tier-mode-nav a').length,5);
    assert.equal($('.astra-ad').length,prefix ? 0 : 4,'既存A8枠は日本語Tierページに4枠を維持する');
    assert.equal($('.ninja-admax-slot').length,prefix ? 0 : 1,'端末別AdMax枠は日本語Tierページだけに置く');
    for(const mode of MODES){
      const board=$(`#mode-${mode}`);
      const ids=board.find('[data-family-id]').map((_,el)=>$(el).attr('data-family-id')).get();
      assert.equal(ids.length,65);assert.equal(new Set(ids).size,65);
      assert.deepEqual(ids,groupRankings(data,mode).flatMap(g=>g.entries.map(f=>f.familyId)));
      for(const f of data.families){
        const card=board.find(`[data-family-id="${f.familyId}"]`);
        assert.equal(card.closest('[data-tier]').attr('data-tier'),f.rankings[mode].tier);
        assert.equal(card.attr('data-status'),f.rankings[mode].status);
        assert.equal(card.attr('href'),`/${prefix}tata/${f.slug}/`);
      }
    }
    for(const f of data.families){
      const detail=load(read(`${prefix}tata/${f.slug}/index.html`));
      const admaxCount=detail('.ninja-admax-slot').length;
      if(prefix)assert.equal(admaxCount,0,`${prefix}${f.familyId}: 非日本語タタ詳細にAdMaxがある`);
      else assert.ok(admaxCount>=2&&admaxCount<=3,`${f.familyId}: 日本語タタ詳細は既存枠を含め最大3枠`);
      for(const mode of MODES){
        const cell=detail(`[data-ranking-mode="${mode}"]`);
        assert.equal(cell.length,1,`${prefix}${f.familyId}:${mode}`);
        if(f.rankings[mode].tier!=='HOLD')assert.equal(cell.find('b').text(),f.rankings[mode].tier);
        assert.equal(cell.attr('data-status'),f.rankings[mode].status);
      }
    }
  }
});
test('explicit mode order overrides overall tie-break without changing any tier',()=>{
  const copy=structuredClone(data),entry=copy.families.find(f=>f.familyId==='umimi');
  entry.rankings.normal.order=0;
  assert.equal(groupRankings(copy,'normal')[0].entries[0].familyId,'umimi');
  assert.equal(groupRankings(copy,'overall')[0].entries[0].familyId,'gaoden');
});
test('generated ratings, boards and detail output are reproducible',()=>{
  execFileSync(process.execPath,['scripts/generate-tier-pages.mjs','--check'],{cwd:root});
});

test('operator-confirmed September 16 ratings appear without pending qualifiers in every locale',()=>{
  const fixture=json('tests/fixtures/confirmed-ratings-20260916.json');
  assert.deepEqual(data.families.find(f=>f.familyId==='sabooru').rankings.overall,fixture.preservedSabooruOverall);
  for(const [id,modes] of Object.entries(fixture.families)) {
    const entry=data.families.find(f=>f.familyId===id);
    for(const [mode,tier] of Object.entries(modes)) assert.deepEqual(entry.rankings[mode],{tier,status:'confirmed'});
    for(const prefix of ['','en/','zh-cn/']) {
      const board=load(read(`${prefix}tata-tier/index.html`)),detail=load(read(`${prefix}tata/${id}/index.html`)),beginner=load(read(`${prefix}beginner-guide/index.html`));
      for(const [mode,tier] of Object.entries(modes)) {
        const card=board(`#mode-${mode} [data-family-id="${id}"]`),cell=detail(`[data-ranking-mode="${mode}"]`);
        assert.equal(card.closest('[data-tier]').attr('data-tier'),tier);
        assert.equal(card.attr('data-status'),'confirmed');assert.equal(card.find('.tier-status').length,0);
        assert.equal(cell.find('b').text(),tier);assert.equal(cell.find('small').length,0);
      }
      assert.match(beginner(`[data-beginner-family="${id}"] .beginner-card-meta`).text(),new RegExp(` ${modes.beginner}$`));
      assert.equal(detail('.rating-hold-note').length,0);
      assert.doesNotMatch(detail('.source-note').text(),/暫定評価|provisional evaluation|临时评估/);
    }
  }
  for(const prefix of ['','en/','zh-cn/']) {
    const page=load(read(`${prefix}tata-tier/index.html`));
    assert.equal(page('.tier-criteria-panel').length,0);
    assert.doesNotMatch(page('#mode-overall > p').text(),/平均|average/);
  }
  const ja=load(read('tata-tier/index.html'));
  assert.equal(ja('#mode-overall > p').text(),'通常ステージ、ゾンビラッシュ、バッジ道場、育成価値などを総合した独自評価です。');
});

test('comparison places confirmed D below higher ranks in either card order',()=>{
  const context=vm.createContext({MONSABA_FAMILY:{getFamilyDisplayLabel:f=>f.id}});
  vm.runInContext(read('compare/compare.js').replace(/boot\(\)\.catch[\s\S]*$/, ''),context);
  for(const higher of ['SSS','SS','S','A','B','C']) {
    vm.runInContext(`state={ratings:{overall:{byFamily:{higher:{zombie:'${higher}'},sabooru:{zombie:'D'}}}}};`,context);
    for(const order of ["{id:'higher'},{id:'sabooru'}", "{id:'sabooru'},{id:'higher'}"])
      assert.match(vm.runInContext(`conclusion(${order},'zombie')`,context),/higherが上位/);
  }
});
