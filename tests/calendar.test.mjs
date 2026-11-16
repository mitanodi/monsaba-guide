import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { bossAt, islandAt, monthDays, teamEventAt } from '../calendar/calendar-core.js';

const config = JSON.parse(await readFile(new URL('../data/calendar-config.json', import.meta.url), 'utf8'));

test('team rotation uses the confirmed 09:00 JST anchor and three-day periods', () => {
  const cases = [
    ['2026-09-08T08:59:00+09:00', 'fishing-tournament', 2, false],
    ['2026-09-08T09:00:00+09:00', 'fishing-tournament', 3, true],
    ['2026-09-09T08:59:59+09:00', 'fishing-tournament', 3, true],
    ['2026-09-09T09:00:00+09:00', 'treasure-hunt', 1, false],
    ['2026-09-12T09:00:00+09:00', 'running-party', 1, false],
    ['2026-09-15T09:00:00+09:00', 'zombie-siege', 1, false],
    ['2026-09-18T09:00:00+09:00', 'magic-farm', 1, false],
    ['2026-09-21T09:00:00+09:00', 'fishing-tournament', 1, false],
    ['2026-09-30T09:00:00+09:00', 'zombie-siege', 1, false]
  ];
  for (const [at, id, day, final] of cases) {
    const result = teamEventAt(at, config);
    assert.equal(result.event.id, id);
    assert.equal(result.day, day);
    assert.equal(result.isFinalDay, final);
  }
});

test('island week changes at 09:00 JST and labels Tuesday as final Day 6', () => {
  assert.deepEqual(islandAt('2026-09-09T08:59:59+09:00', config), {
    phase: 'battle',
    start: Date.parse('2026-09-08T09:00:00+09:00'),
    end: Date.parse('2026-09-09T09:00:00+09:00'),
    day: 6,
    isFinalDay: true
  });
  assert.equal(islandAt('2026-09-09T09:00:00+09:00', config).phase, 'recruitment');
  assert.equal(islandAt('2026-09-10T08:59:59+09:00', config).phase, 'recruitment');
  assert.equal(islandAt('2026-09-10T09:00:00+09:00', config).day, 1);
});

test('boss rally repeats the confirmed two-day cycle from the tire zombie anchor', () => {
  const cases = [
    ['2026-09-09T00:00:00+09:00', 'tire-zombie', 1],
    ['2026-09-10T12:00:00+09:00', 'tire-zombie', 2],
    ['2026-09-11T09:00:00+09:00', 'drunk-zombie', 1],
    ['2026-09-13T09:00:00+09:00', 'president-zombie', 1],
    ['2026-09-15T09:00:00+09:00', 'monster-fish-zombie', 1],
    ['2026-09-17T09:00:00+09:00', 'rockstar-zombie', 1],
    ['2026-09-19T09:00:00+09:00', 'tire-zombie', 1]
  ];
  for (const [at, id, day] of cases) {
    const result = bossAt(at, config);
    assert.equal(result.scheduled, true);
    assert.equal(result.boss.id, id);
    assert.equal(result.day, day);
  }
});

test('month generator covers complete calendar weeks at the 09:00 boundary', () => {
  const days = monthDays(2026, 9);
  assert.equal(days.length, 35);
  const last = days.find(day => day.year === 2026 && day.month === 9 && day.day === 30);
  assert.ok(last);
  assert.equal(teamEventAt(last.start, config).event.id, 'zombie-siege');
});

test('calendar configuration remains separate from localized event pages', async () => {
  assert.equal(config.islandTreasure.anchorWeek, null);
  assert.equal(config.bossRotationConfig.bossAnchorStart, '2026-09-09T00:00:00+09:00');
  assert.equal(config.bossRotationConfig.bossAnchorBoss, 'tire-zombie');
  assert.equal(config.timeZone, 'Asia/Tokyo');
  assert.equal(config.dailyResetHour, 9);
  for (const path of ['../events/calendar/index.html', '../en/events/calendar/index.html', '../zh-cn/events/calendar/index.html']) {
    const html = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.match(html, /calendar\/calendar\.js/);
    assert.match(html, /calendar\/calendar\.css/);
  }
  for (const path of ['../events/index.html', '../en/events/index.html', '../zh-cn/events/index.html']) {
    const html = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.match(html, /astra-calendar\.js/);
    assert.match(html, /events\/calendar\//);
    assert.doesNotMatch(html, /<script[^>]+src="\/calendar\/calendar\.js/);
  }
});

test('versioned team rotation preserves history and uses the new sequence only after its boundary', () => {
  // Synthetic boundary: not a claim about the real ruins launch date.
  const changed = structuredClone(config);
  const legacy = changed.teamEventRotation;
  legacy.transitions = [...(legacy.transitions || []), {
    effectiveFrom: '2030-01-01T09:00:00+09:00',
    anchorStart: '2030-01-01T09:00:00+09:00',
    durationHours: 72,
    sequence: [{ id: 'ruins-exploration' }, ...legacy.sequence.slice(3), ...legacy.sequence.slice(0, 3)]
  }];
  for (const date of ['2026-09-06T09:00:00+09:00', '2026-11-16T09:00:00+09:00']) {
    assert.deepEqual(teamEventAt(date, changed), teamEventAt(date, config));
  }
  const boundary = Date.parse(legacy.transitions[0].effectiveFrom);
  const before = teamEventAt(boundary - 1, changed);
  assert.equal(before.end, boundary);
  assert.equal(before.nextEvent.id, 'ruins-exploration');
  assert.equal(before.isFinalDay, true);
  const first = teamEventAt(boundary, changed);
  assert.equal(first.event.id, 'ruins-exploration');
  assert.equal(first.day, 1);
  assert.equal(first.end, boundary + 72 * 3600000);
  assert.equal(first.nextEvent.id, 'zombie-siege');
  const ids = ['ruins-exploration', 'zombie-siege', 'magic-farm', 'fishing-tournament', 'treasure-hunt', 'running-party', 'ruins-exploration'];
  ids.forEach((id, index) => assert.equal(teamEventAt(boundary + index * 72 * 3600000, changed).event.id, id));
  assert.equal(teamEventAt(boundary + 48 * 3600000, changed).isFinalDay, true);
});
test('November confirmed observation anchors ruins, then zombie, without rewriting September', () => {
  const cases = [
    ['2026-11-14T09:00:00+09:00', 'ruins-exploration', 1],
    ['2026-11-16T09:00:00+09:00', 'ruins-exploration', 3],
    ['2026-11-17T08:59:59+09:00', 'ruins-exploration', 3],
    ['2026-11-17T09:00:00+09:00', 'zombie-siege', 1],
    ['2026-11-20T09:00:00+09:00', 'magic-farm', 1],
    ['2026-11-23T09:00:00+09:00', 'fishing-tournament', 1],
    ['2026-11-26T09:00:00+09:00', 'treasure-hunt', 1],
    ['2026-11-29T09:00:00+09:00', 'running-party', 1],
    ['2026-12-02T09:00:00+09:00', 'ruins-exploration', 1]
  ];
  for (const [at, id, day] of cases) {
    const result = teamEventAt(at, config);
    assert.equal(result.event.id, id);
    assert.equal(result.day, day);
  }
  assert.equal(teamEventAt('2026-11-14T08:59:59+09:00', config).nextEvent.id, 'ruins-exploration');
  assert.equal(teamEventAt('2026-11-16T09:00:00+09:00', config).nextEvent.id, 'zombie-siege');
  assert.equal(teamEventAt('2026-11-29T09:00:00+09:00', config).event.name.ja, 'ラフトレース');
});