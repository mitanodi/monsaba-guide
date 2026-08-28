import fs from 'node:fs';
import path from 'node:path';

export const GA4_MEASUREMENT_ID = 'G-PTV8TYNYMR';
export const GA4_START_MARKER = '<!-- monsaba-ga4:start -->';
export const GA4_END_MARKER = '<!-- monsaba-ga4:end -->';

const root = path.resolve(import.meta.dirname, '..');
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'assets', 'data', 'scripts', 'promo', 'en', 'zh-cn', 'i18n']);
const taggedBlockPattern = /(?:\r?\n)?<!-- monsaba-ga4:start -->[\s\S]*?<!-- monsaba-ga4:end -->(?:\r?\n)?/g;

export const renderGa4Tag = () => `${GA4_START_MARKER}
<script data-monsaba-ga4="privacy">
  (function protectPrivateSearchParameters() {
    var privateSearch = {};
    var privateKeys = ['q', 's', 'search', 'query', 'keyword'];
    var currentUrl = new URL(window.location.href);
    privateKeys.forEach(function removePrivateParameter(key) {
      if (!currentUrl.searchParams.has(key)) return;
      privateSearch[key] = currentUrl.searchParams.get(key) || '';
      currentUrl.searchParams.delete(key);
    });
    Object.defineProperty(window, '__MONSABA_PRIVATE_SEARCH__', {
      value: Object.freeze(privateSearch), enumerable: false, configurable: false
    });
    if (Object.keys(privateSearch).length) {
      window.history.replaceState(window.history.state, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
    }
  })();
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}" data-monsaba-ga4="loader"></script>
<script data-monsaba-ga4="config">
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag = window.gtag || gtag;
  function monsabaSafeAnalyticsUrl(value) {
    try {
      var url = new URL(value, window.location.href);
      return url.origin + url.pathname;
    } catch (error) {
      return '';
    }
  }
  var monsabaPageLocation = monsabaSafeAnalyticsUrl(window.location.href);
  var monsabaPageReferrer = document.referrer ? monsabaSafeAnalyticsUrl(document.referrer) : '';
  window.gtag('js', new Date());
  window.gtag('set', { page_location: monsabaPageLocation, page_referrer: monsabaPageReferrer });
  window.gtag('config', '${GA4_MEASUREMENT_ID}', {
    page_location: monsabaPageLocation,
    page_referrer: monsabaPageReferrer,
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
</script>
${GA4_END_MARKER}`;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

let changed = 0;
for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  const withoutManagedTag = source.replace(taggedBlockPattern, '');
  if (/googletagmanager\.com\/gtag\/js\?id=|gtag\(['"]config['"]/.test(withoutManagedTag)) {
    throw new Error(`${path.relative(root, file)}: 管理外のGoogle tagがあり、重複を防ぐため生成を停止しました。`);
  }
  if (!withoutManagedTag.includes('</head>')) throw new Error(`${path.relative(root, file)}: </head>がありません。`);
  const output = withoutManagedTag.replace(/(?:\r?\n)?<\/head>/, `\n${renderGa4Tag()}\n</head>`);
  if (output === source) continue;
  fs.writeFileSync(file, output);
  changed += 1;
}

console.log(`GA4 tag ${GA4_MEASUREMENT_ID}: ${walk(root).length} HTMLを確認（更新 ${changed}）`);
