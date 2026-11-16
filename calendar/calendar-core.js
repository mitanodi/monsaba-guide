const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const JST_OFFSET_HOURS = 9;
const mod = (value, base) => ((value % base) + base) % base;

export function jstParts(value) {
  const shifted = new Date(new Date(value).getTime() + JST_OFFSET_HOURS * HOUR_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes()
  };
}
export function jstBoundary(year, month, day, hour = 9) {
  return Date.UTC(year, month - 1, day, hour - JST_OFFSET_HOURS);
}
export function gameDayStart(value, resetHour = 9) {
  const instant = new Date(value).getTime();
  const parts = jstParts(instant);
  let boundary = jstBoundary(parts.year, parts.month, parts.day, resetHour);
  if (instant < boundary)
    boundary -= DAY_MS;
  return boundary;
}
export function dateKey(value) {
  const p = jstParts(value);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
// Transitions apply only from their effective timestamp; historical dates keep
// the original rotation instead of retroactively expanding a new sequence.
function teamPeriodAt(instant, config) {
  const base = config.teamEventRotation;
  const transitions = [...(base.transitions || [])].sort((a, b) => Date.parse(a.effectiveFrom) - Date.parse(b.effectiveFrom));
  let rotation = base;
  let effectiveStart = -Infinity;
  let effectiveEnd = Infinity;
  for (const transition of transitions) {
    const boundary = Date.parse(transition.effectiveFrom);
    if (boundary <= instant) {
      rotation = transition;
      effectiveStart = boundary;
    } else {
      effectiveEnd = boundary;
      break;
    }
  }
  const duration = rotation.durationHours * HOUR_MS;
  const anchor = Date.parse(rotation.anchorStart);
  const period = Math.floor((instant - anchor) / duration);
  const start = Math.max(anchor + period * duration, effectiveStart);
  const end = Math.min(anchor + (period + 1) * duration, effectiveEnd);
  return { event: rotation.sequence[mod(period, rotation.sequence.length)], start, end };
}
export function teamEventAt(value, config) {
  const instant = new Date(value).getTime();
  const { event, start, end } = teamPeriodAt(instant, config);
  return {
    event,
    start,
    end,
    day: Math.floor((instant - start) / DAY_MS) + 1,
    isFinalDay: instant >= end - DAY_MS,
    nextEvent: teamPeriodAt(end, config).event
  };
}
export function islandAt(value, config) {
  const start = gameDayStart(value, config.islandTreasure.resetHour);
  const weekday = jstParts(start).weekday;
  if (weekday === config.islandTreasure.recruitmentWeekday)
    return { phase: 'recruitment', start, end: start + DAY_MS, day: null, isFinalDay: false };
  const day = mod(weekday - config.islandTreasure.battleStartWeekday, 7) + 1;
  return { phase: 'battle', start, end: start + DAY_MS, day, isFinalDay: day === config.islandTreasure.battleDays };
}
export function bossAt(value, config) {
  const rotation = config.bossRotationConfig;
  if (!rotation.bossAnchorStart || !rotation.bossAnchorBoss)
    return { scheduled: false, observation: rotation.currentObservation };
  const duration = rotation.bossDurationDays * DAY_MS;
  const anchor = new Date(rotation.bossAnchorStart).getTime();
  const anchorIndex = rotation.sequence.findIndex(item => item.id === rotation.bossAnchorBoss);
  if (anchorIndex < 0)
    return { scheduled: false, observation: rotation.currentObservation };
  const instant = new Date(value).getTime();
  const period = Math.floor((instant - anchor) / duration);
  const index = mod(anchorIndex + period, rotation.sequence.length);
  const start = anchor + period * duration;
  return {
    scheduled: true,
    boss: rotation.sequence[index],
    nextBoss: rotation.sequence[mod(index + 1, rotation.sequence.length)],
    start,
    end: start + duration,
    day: Math.floor((instant - start) / DAY_MS) + 1
  };
}
export function monthDays(year, month) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((firstWeekday + days) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    const date = new Date(Date.UTC(year, month - 1, day));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      inMonth: day >= 1 && day <= days,
      weekday: date.getUTCDay(),
      start: jstBoundary(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 9)
    };
  });
}
export function calendarState(now, config) {
  const instant = new Date(now).getTime();
  const team = teamEventAt(instant, config);
  const island = islandAt(instant, config);
  const boss = bossAt(instant, config);
  return {
    instant,
    gameDayStart: gameDayStart(instant, config.dailyResetHour),
    team,
    island,
    boss,
    showNextTeam: team.end - instant <= DAY_MS
  };
}
export { DAY_MS };
