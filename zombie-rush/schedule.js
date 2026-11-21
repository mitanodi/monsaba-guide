import { rushScheduleAt, japanTimeParts, remainingTime } from './schedule-core.js';
import { SCHEDULE_COPY } from './schedule-copy.js';

const root = document.querySelector('[data-rush-schedule]');
if (root) {
  const copy = SCHEDULE_COPY[document.documentElement.lang] || SCHEDULE_COPY.ja;
  const find = name => root.querySelector(`[data-rush-${name}]`);
  let previousBoundary;
  const render = () => {
    const now = Date.now(), state = rushScheduleAt(now), japan = japanTimeParts(now);
    find('date').textContent = japan.date;
    find('clock').textContent = japan.time;
    find('clock').dateTime = new Date(now).toISOString();
    find('remaining').textContent = remainingTime(state.secondsRemaining);
    if (previousBoundary !== state.boundary) {
      const target = japanTimeParts(state.boundary);
      root.dataset.session = state.active ? 'active' : 'paused';
      find('status').textContent = state.active ? copy.active : copy.paused;
      find('label').textContent = state.active ? copy.endsIn : copy.startsIn;
      find('boundary').textContent = `${state.active ? copy.end : copy.start}: ${target.date} ${target.time.slice(0, 5)} JST`;
      root.querySelectorAll('[data-rush-window]').forEach((row, index) => {
        if (state.active && index === state.windowIndex) row.setAttribute('aria-current', 'true');
        else row.removeAttribute('aria-current');
      });
      previousBoundary = state.boundary;
    }
  };
  render();
  // No decrementing counter: delayed ticks and sleep always recalculate from epoch time.
  setInterval(render, 1000);
  document.addEventListener('visibilitychange', render);
  window.addEventListener('pageshow', render);
  window.addEventListener('focus', render);
}
