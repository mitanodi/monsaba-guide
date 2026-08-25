export const BASE_URL = 'https://monster-survival.com';
export const LAST_MODIFIED = '2026-08-25T17:57:25+09:00';
export const formatJapanDateTime = (value) => {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}:\d{2})\+09:00)?$/);
  if (!match) throw new TypeError(`invalid Japan date/time: ${value}`);
  const [, year, month, day, time] = match;
  return `${year}/${Number(month)}/${Number(day)}${time ? ` ${time} JST` : ''}`;
};

export const ATTRIBUTE_META = Object.freeze({
  草: Object.freeze({ slug: 'grass', icon: '🌿' }),
  水: Object.freeze({ slug: 'water', icon: '💧' }),
  火: Object.freeze({ slug: 'fire', icon: '🔥' }),
  雷: Object.freeze({ slug: 'thunder', icon: '⚡' }),
  岩: Object.freeze({ slug: 'rock', icon: '🪨', aliases: Object.freeze(['土']) })
});

export const HERO_BY_ROUTE = Object.freeze({
  '/': '/assets/heroes/top-main.webp',
  '/zombie-rush/': '/assets/heroes/IMG_6941.webp',
  '/boss-rally/': '/assets/heroes/IMG_6942.webp',
  '/badge-dojo/': '/assets/heroes/IMG_6943.webp',
  '/tata-tier/': '/assets/heroes/IMG_6944.webp',
  '/consult/': '/assets/heroes/IMG_6944.webp',
  '/normal-guide/': '/assets/heroes/IMG_6945.webp',
  '/evolution-priority/': '/assets/heroes/evolution-main.webp'
});

export const toAbsoluteUrl = (pathname) => `${BASE_URL}${pathname}`;
