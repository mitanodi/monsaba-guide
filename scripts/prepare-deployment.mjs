import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {load} from 'cheerio';

// Generated source stays safe for comparisons. Only an explicit Production
// build restores the original production integrations; unknown environments fail closed.
export function prepareHtml(source, environment) {
  if (!source.includes('data-astra="experiment"')) return source;
  const production = environment === 'production';
  const body = source.match(/<body([^>]*)>([\s\S]*?)<\/body>/);
  if (!body) return source;
  const $ = load(body[2], {}, false);
  if (production) {
    $('.astra-experiment-bar,.astra-read-only').remove();
    $('script[src*="astra-ads.js"]').remove();
    const japanese = /<html[^>]*lang="ja"/.test(source);
    $('.astra-ad').each((_, element) => {
      const area = $(element);
      const slot = $(`[data-affiliate-offer="${area.attr('data-astra-offer')}"]`);
      if (!japanese || !slot.length) { area.remove(); return; }
      area.addClass('is-live');
      area.find('.astra-ad-preview').remove();
      area.append(slot);
    });
    $('script[src*="monetization.js"]').removeAttr('type');
  }
  let result = source.replace(body[0], `<body${body[1].replace('data-astra="experiment"', `data-astra="${production ? 'production' : 'experiment'}"`)}>${$.html().replace(/\s(required|hidden|checked|disabled|selected|multiple|readonly|autofocus)=""/g, ' $1')}</body>`);
  // Change only the existing GA4 script attributes, never IDs, configuration or events.
  result = result.replace(/<script\b[^>]*data-monsaba-ga4="[^"]+"[^>]*>/g, tag => {
    const clean = tag.replace(/\s+type="text\/plain"/g, '');
    return production ? clean : clean.replace(/>$/, ' type="text/plain">');
  });
  if (!production && !result.includes('data-deployment-robots="preview"')) result = result.replace('</head>', '<meta name="robots" content="noindex,nofollow" data-deployment-robots="preview"></head>');
  return result;
}

export function prepareDeployment(root, environment) {
  const ignored = new Set(['.git','.github','.vercel','node_modules','promo','chigonoki','assets','data','scripts','docs']);
  let count = 0;
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      if (ignored.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.html')) {
        const source = fs.readFileSync(file, 'utf8');
        const result = prepareHtml(source, environment);
        if (result !== source) { fs.writeFileSync(file, result); count++; }
      }
    }
  }
  walk(root);
  return count;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const count = prepareDeployment(path.resolve(import.meta.dirname, '..'), process.env.VERCEL_ENV);
  console.log(`Astra deployment: ${process.env.VERCEL_ENV === 'production' ? 'production' : 'read-only preview'}; ${count} HTML files prepared.`);
}
