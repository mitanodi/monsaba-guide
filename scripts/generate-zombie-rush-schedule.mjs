import fs from 'node:fs';
import path from 'node:path';
import { SCHEDULE_COPY } from '../zombie-rush/schedule-copy.js';
import { START_HOURS_JST } from '../zombie-rush/schedule-core.js';
const root = path.resolve(import.meta.dirname, '..');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const begin = '<!-- RUSH_SCHEDULE:START -->', end = '<!-- RUSH_SCHEDULE:END -->';
for (const [locale, prefix] of [['ja',''],['en','en/'],['zh-CN','zh-cn/']]) {
  const c = SCHEDULE_COPY[locale], file = path.join(root, prefix, 'zombie-rush/index.html');
  let html = fs.readFileSync(file, 'utf8');
  const rows = START_HOURS_JST.map(hour => `<tr data-rush-window="${hour}"><th scope="row">${String(hour).padStart(2,'0')}:00</th><td>${hour === 22 ? esc(c.nextDay) : ''}${String((hour + 3) % 24).padStart(2,'0')}:00</td></tr>`).join('');
  const widget = `${begin}<section id="rush-schedule" class="zr-schedule" data-rush-schedule translate="no" aria-labelledby="rush-schedule-title"><h2 id="rush-schedule-title">${esc(c.title)}</h2><p class="zr-schedule-zone">${esc(c.zone)}</p><div class="zr-schedule-grid"><div class="zr-schedule-live"><p class="zr-schedule-date" data-rush-date></p><time class="zr-schedule-clock" data-rush-clock role="timer" aria-live="off" aria-label="${esc(c.clock)}">--:--:--</time><p class="zr-schedule-status" data-rush-status role="status" aria-live="polite" aria-atomic="true">${esc(c.caption)}</p><p class="zr-schedule-countdown"><span data-rush-label>${esc(c.startsIn)}</span><span class="zr-schedule-remaining" data-rush-remaining role="timer" aria-live="off">--:--:--</span></p><p class="zr-schedule-boundary" data-rush-boundary></p></div><table><caption>${esc(c.caption)}</caption><thead><tr><th scope="col">${esc(c.from)}</th><th scope="col">${esc(c.until)}</th></tr></thead><tbody>${rows}</tbody></table></div><p class="zr-schedule-note">${esc(c.note)}</p><p class="zr-schedule-source"><a href="https://w.atwiki.jp/monstersurvival/pages/19.html" target="_blank" rel="noopener noreferrer">${esc(c.source)}</a> · ${esc(c.checked)}</p><p class="zr-schedule-device">${esc(c.device)}</p><noscript><p>${esc(c.fallback)}</p></noscript></section>${end}`;
  const marker = new RegExp(`${begin}[\\s\\S]*?${end}`, 'g');
  html = html.replace(marker, '');
  const anchor = /(<a\b[^>]*href="#tier"[^>]*>[\s\S]*?<\/a>)(\s*<\/div>\s*<figure\b[^>]*hero-media-zombie)/;
  if (!anchor.test(html)) throw new Error(`Missing top-of-page schedule anchor: ${file}`);
  html = html.replace(anchor, (_, link, tail) => link + widget + tail);
  if (!html.includes('href="/zombie-rush/schedule.css"')) html = html.replace('</head>', '<link rel="stylesheet" href="/zombie-rush/schedule.css"></head>');
  if (!html.includes('src="/zombie-rush/schedule.js"')) html = html.replace('</body>', '<script type="module" src="/zombie-rush/schedule.js"></script></body>');
  fs.writeFileSync(file, html);
}
console.log('Zombie Rush schedule generated for ja, en, zh-CN.');
