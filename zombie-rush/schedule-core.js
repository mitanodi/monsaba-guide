const HOUR = 60 * 60 * 1000;
const CYCLE = 4 * HOUR;
// 1970-01-01 02:00 JST. Use epoch arithmetic, never the device's local zone.
const ANCHOR = Date.UTC(1970, 0, 1, -7);
export const START_HOURS_JST = Object.freeze([2, 6, 10, 14, 18, 22]);

export function rushScheduleAt(now) {
  if (!Number.isFinite(now)) throw new TypeError('A finite epoch timestamp is required');
  const cycle = Math.floor((now - ANCHOR) / CYCLE);
  const start = ANCHOR + cycle * CYCLE;
  const end = start + 3 * HOUR;
  const active = now < end;
  const boundary = active ? end : start + CYCLE;
  return { active, start, end, boundary, secondsRemaining: Math.ceil((boundary - now) / 1000), windowIndex: ((cycle % 6) + 6) % 6 };
}

export function japanTimeParts(now) {
  const date = new Date(now + 9 * HOUR);
  const pad = value => String(value).padStart(2, '0');
  return {
    date: `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}`,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  };
}

export function remainingTime(seconds) {
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
}
