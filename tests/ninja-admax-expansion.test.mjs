import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {load} from 'cheerio';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const targets=[
  ['beginner-guide/index.html','GUIDE_BEGINNER'],['normal-guide/index.html','GUIDE_NORMAL'],['evolution-priority/index.html','GUIDE_EVOLUTION'],['zombie-rush/index.html','GUIDE_ZOMBIE_RUSH'],['boss-rally/index.html','GUIDE_BOSS_RALLY'],['badge-dojo/index.html','GUIDE_BADGE_DOJO'],
  ['attribute/grass/index.html','ATTRIBUTE_GRASS'],['attribute/water/index.html','ATTRIBUTE_WATER'],['attribute/fire/index.html','ATTRIBUTE_FIRE'],['attribute/thunder/index.html','ATTRIBUTE_THUNDER'],['attribute/rock/index.html','ATTRIBUTE_ROCK'],
  ['events/island-treasure/index.html','EVENT_ISLAND_TREASURE'],['events/fishing-tournament/index.html','EVENT_FISHING_TOURNAMENT'],['events/carnival-fest/index.html','EVENT_CARNIVAL_FEST'],['events/magic-farm/index.html','EVENT_MAGIC_FARM'],['events/zombie-siege/index.html','EVENT_ZOMBIE_SIEGE'],
  ['team-builder/index.html','TOOL_TEAM_BUILDER'],['events/treasure-hunt/index.html','TOOL_TREASURE_HUNT'],['feeding/index.html','TOOL_FEEDING'],['index.html','HOME_TOP']
];
const approvedTags=['dc7e80014dc39634f880de618b5b4f3b','4622ef9decb0d620290304f7ec64e778'];

test('twenty Japanese editorial placements each have one labelled, reusable AdMax slot',()=>{
  assert.equal(targets.length,20);
  for(const [file,slotId] of targets){
    const $=load(read(file));const slots=$('.ninja-admax-expansion');
    assert.equal(slots.length,1,file);assert.equal(slots.attr('data-admax-slot'),slotId,file);
    assert.equal(slots.attr('data-admax-placement'),'2026-09-expansion',file);
    assert.equal(slots.find('.ninja-admax-label').text(),'広告',file);
    const inline=slots.find('script').html()||'';
    for(const tag of approvedTags)assert.match(inline,new RegExp(tag),file);
    assert.match(read(file),/ninja-admax\.js\?v=[a-f0-9]+/,file);
  }
});

test('the expansion remains Japanese-only and leaves existing Tier/Tata inventory alone',()=>{
  for(const locale of ['en','zh-cn'])for(const file of ['index.html','tata-tier/index.html','tata/gaoden/index.html','feeding/index.html']){
    const html=read(`${locale}/${file}`);assert.doesNotMatch(html,/ninja-admax-expansion/,`${locale}/${file}`);
    for(const tag of approvedTags)assert.doesNotMatch(html,new RegExp(tag),`${locale}/${file}`);
  }
  for(const file of ['tata-tier/index.html','tata/gaoden/index.html']){const $=load(read(file));assert.equal($('.ninja-admax-expansion').length,0,file);assert.equal($('.ninja-admax-slot').length,1,file);}
});

test('tool placement stays outside the feeding app and team-builder controls',()=>{
  const feeding=load(read('feeding/index.html'));assert.equal(feeding('main .ninja-admax-expansion').length,0);assert.equal(feeding('main').nextAll('.ninja-admax-expansion').first().length,1);
  const builder=load(read('team-builder/index.html'));assert.equal(builder('#team-settings .ninja-admax-expansion,[data-team-builder] .ninja-admax-expansion').length,0);
});
