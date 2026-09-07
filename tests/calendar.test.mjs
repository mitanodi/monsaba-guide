import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {bossAt,islandAt,monthDays,teamEventAt} from '../calendar/calendar-core.js';

const config=JSON.parse(await readFile(new URL('../data/calendar-config.json',import.meta.url),'utf8'));

test('team rotation uses the confirmed 09:00 JST anchor and three-day periods',()=>{
  const cases=[
    ['2026-09-08T08:59:00+09:00','fishing-tournament',2,false],
    ['2026-09-08T09:00:00+09:00','fishing-tournament',3,true],
    ['2026-09-09T08:59:59+09:00','fishing-tournament',3,true],
    ['2026-09-09T09:00:00+09:00','treasure-hunt',1,false],
    ['2026-09-12T09:00:00+09:00','running-party',1,false],
    ['2026-09-15T09:00:00+09:00','zombie-siege',1,false],
    ['2026-09-18T09:00:00+09:00','magic-farm',1,false],
    ['2026-09-21T09:00:00+09:00','fishing-tournament',1,false],
    ['2026-09-30T09:00:00+09:00','zombie-siege',1,false]
  ];
  for(const [at,id,day,final] of cases){const result=teamEventAt(at,config);assert.equal(result.event.id,id);assert.equal(result.day,day);assert.equal(result.isFinalDay,final);}
});

test('island week changes at 09:00 JST and labels Tuesday as final Day 6',()=>{
  assert.deepEqual(islandAt('2026-09-09T08:59:59+09:00',config),{phase:'battle',start:Date.parse('2026-09-08T09:00:00+09:00'),end:Date.parse('2026-09-09T09:00:00+09:00'),day:6,isFinalDay:true});
  assert.equal(islandAt('2026-09-09T09:00:00+09:00',config).phase,'recruitment');
  assert.equal(islandAt('2026-09-10T08:59:59+09:00',config).phase,'recruitment');
  assert.equal(islandAt('2026-09-10T09:00:00+09:00',config).day,1);
});

test('boss schedule stays ungenerated until a real anchor is configured',()=>{
  const pending=bossAt('2026-09-08T12:00:00+09:00',config);assert.equal(pending.scheduled,false);assert.equal(pending.observation.currentBoss,'pop-star');assert.equal(pending.observation.nextBoss,'road-bully');
  const anchored=structuredClone(config);anchored.bossRotationConfig.bossAnchorStart='2026-09-08T09:00:00+09:00';anchored.bossRotationConfig.bossAnchorBoss='pop-star';assert.equal(bossAt('2026-09-10T09:00:00+09:00',anchored).boss.id,'road-bully');
});

test('month generator covers complete calendar weeks at the 09:00 boundary',()=>{
  const days=monthDays(2026,9);assert.equal(days.length,35);const last=days.find(day=>day.year===2026&&day.month===9&&day.day===30);assert.ok(last);assert.equal(teamEventAt(last.start,config).event.id,'zombie-siege');
});

test('calendar configuration remains separate from localized event pages',async()=>{
  assert.equal(config.islandTreasure.anchorWeek,null);assert.equal(config.bossRotationConfig.bossAnchorStart,null);assert.equal(config.timeZone,'Asia/Tokyo');assert.equal(config.dailyResetHour,9);
  for(const path of ['../events/index.html','../en/events/index.html','../zh-cn/events/index.html']){const html=await readFile(new URL(path,import.meta.url),'utf8');assert.match(html,/calendar\/calendar\.js/);assert.match(html,/calendar\/calendar\.css/);}
});
