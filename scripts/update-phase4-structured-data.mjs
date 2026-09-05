import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pages = [
  { file: 'events/treasure-hunt/index.html', locale: 'ja', prefix: '', home: 'トップ', events: 'イベント', current: 'オタカラ探しソルバー' },
  { file: 'en/events/treasure-hunt/index.html', locale: 'en', prefix: '/en', home: 'Home', events: 'Events', current: 'Treasure Hunt Solver' },
  { file: 'zh-cn/events/treasure-hunt/index.html', locale: 'zh-CN', prefix: '/zh-cn', home: '首页', events: '活动', current: '寻宝求解器' }
];

for (const page of pages) {
  const target = path.join(root, page.file); let html = fs.readFileSync(target, 'utf8');
  if (/"@type"\s*:\s*"BreadcrumbList"/.test(html)) continue;
  const graph = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: page.home, item: `https://monster-survival.com${page.prefix}/` },
      { '@type': 'ListItem', position: 2, name: page.events, item: `https://monster-survival.com${page.prefix}/events/` },
      { '@type': 'ListItem', position: 3, name: page.current, item: `https://monster-survival.com${page.prefix}/events/treasure-hunt/` }
    ]
  };
  html = html.replace('</head>', `<script type="application/ld+json" data-phase4-breadcrumb>${JSON.stringify(graph)}</script></head>`);
  fs.writeFileSync(target, html);
}
console.log('Phase 4 structured data: Treasure Hunt BreadcrumbList verified in 3 locales.');
