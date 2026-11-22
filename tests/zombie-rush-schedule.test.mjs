import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { load } from 'cheerio';
import { rushScheduleAt, japanTimeParts, remainingTime, START_HOURS_JST } from '../zombie-rush/schedule-core.js';
import { SCHEDULE_COPY } from '../zombie-rush/schedule-copy.js';
const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const jst = value => Date.parse(value + '+09:00');

test('all six Wiki windows include their start and exclude their end exactly', () => {
  assert.deepEqual(START_HOURS_JST, [2,6,10,14,18,22]);
  for (const [index, hour] of START_HOURS_JST.entries()) {
    const start = jst(`2026-11-21T${String(hour).padStart(2,'0')}:00:00`), end = start + 10800000;
    assert.equal(rushScheduleAt(start - 1).active, false);
    assert.equal(rushScheduleAt(start - 1).secondsRemaining, 1);
    assert.deepEqual(rushScheduleAt(start), { active:true, start, end, boundary:end, secondsRemaining:10800, windowIndex:index });
    assert.equal(rushScheduleAt(end - 1).active, true);
    assert.equal(rushScheduleAt(end - 1).secondsRemaining, 1);
    assert.equal(rushScheduleAt(end).active, false);
    assert.equal(rushScheduleAt(end).secondsRemaining, 3600);
    assert.equal(rushScheduleAt(end).boundary, start + 14400000);
  }
});

test('overnight, year changes and leap dates keep the correct JST boundary', () => {
  for (const date of ['2026-11-21','2027-01-01','2028-02-29']) {
    const state = rushScheduleAt(jst(date + 'T00:30:00'));
    assert.equal(state.active, true); assert.equal(state.windowIndex, 5);
    assert.equal(state.boundary, jst(date + 'T01:00:00'));
    assert.equal(state.secondsRemaining, 1800);
    const paused = rushScheduleAt(jst(date + 'T01:00:00'));
    assert.equal(paused.active, false); assert.equal(paused.boundary, jst(date + 'T02:00:00'));
  }
  assert.deepEqual(japanTimeParts(jst('2026-12-31T23:59:59')), {date:'2026/12/31',time:'23:59:59'});
  assert.deepEqual(japanTimeParts(jst('2027-01-01T00:00:00')), {date:'2027/01/01',time:'00:00:00'});
  assert.equal(remainingTime(10800), '03:00:00'); assert.equal(remainingTime(1), '00:00:01');
});

test('device time zones including daylight-saving zones cannot change the schedule or JST clock', () => {
  const module = new URL('../zombie-rush/schedule-core.js', import.meta.url).href;
  const code = `import {rushScheduleAt,japanTimeParts} from ${JSON.stringify(module)};const now=Date.parse('2027-03-14T17:30:25.250Z');console.log(JSON.stringify([rushScheduleAt(now),japanTimeParts(now)]));`;
  const values = ['UTC','Asia/Tokyo','America/Los_Angeles','Pacific/Honolulu','Pacific/Auckland'].map(TZ => execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,TZ},encoding:'utf8'}));
  for (const value of values) assert.equal(value, values[0]);
});

test('sleep and clock corrections are recalculated from absolute time rather than decremented state', () => {
  assert.equal(rushScheduleAt(jst('2026-11-21T04:59:59')).secondsRemaining, 1);
  const resumed = rushScheduleAt(jst('2026-11-21T14:10:07'));
  assert.equal(resumed.active,true); assert.equal(resumed.secondsRemaining,10193); assert.equal(resumed.windowIndex,3);
  const corrected = rushScheduleAt(jst('2026-11-21T01:30:00'));
  assert.equal(corrected.active,false); assert.equal(corrected.secondsRemaining,1800);
  for (const value of [NaN,Infinity,-Infinity]) assert.throws(()=>rushScheduleAt(value),TypeError);
  const source = read('zombie-rush/schedule.js');
  for (const event of ['visibilitychange','pageshow','focus']) assert.ok(source.includes(`'${event}'`));
  assert.match(source,/Date\.now\(\)/); assert.match(source,/setInterval\(render, 1000\)/);
});

test('three generated top-of-page widgets preserve static schedules and quiet accessible timers', () => {
  for (const [locale,prefix] of [['ja',''],['en','en/'],['zh-CN','zh-cn/']]) {
    const html=read(prefix+'zombie-rush/index.html'),$=load(html),widget=$('[data-rush-schedule]');
    assert.equal(widget.length,1);assert.equal(widget.closest('.family-page-head').length,1);
    assert.equal(widget.find('h2').text(),SCHEDULE_COPY[locale].title);
    assert.equal(widget.find('tbody tr').length,6);
    assert.deepEqual(widget.find('tbody th').toArray().map(el=>$(el).text()),['02:00','06:00','10:00','14:00','18:00','22:00']);
    assert.equal(widget.find('tbody tr').last().find('td').text(),SCHEDULE_COPY[locale].nextDay+'01:00');
    assert.equal(widget.find('caption').text(),SCHEDULE_COPY[locale].caption);
    assert.equal(widget.find('[data-rush-clock]').attr('aria-live'),'off');
    assert.equal(widget.find('[data-rush-remaining]').attr('aria-live'),'off');
    assert.equal(widget.find('[aria-live="polite"]').length,1);
    assert.equal(widget.find('[data-rush-status][role="status"]').length,1);
    assert.equal(widget.find('noscript').text().includes(SCHEDULE_COPY[locale].fallback),true);
    assert.equal(widget.find('.zr-schedule-source,a[href*="atwiki"]').length,0);
    assert.equal(widget.find('.zr-schedule-note').text(),SCHEDULE_COPY[locale].note);
    assert.equal($('script[src="/zombie-rush/schedule.js"][type="module"]').length,1);
    assert.equal($('link[href="/zombie-rush/schedule.css"]').length,1);
  }
});
