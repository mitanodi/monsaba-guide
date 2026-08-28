import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const japanToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const today = new Date(`${process.env.CONTENT_CURRENT_DATE || japanToday}T00:00:00Z`);
const exceptions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'stale-content-exceptions.json'), 'utf8'));
const exempt = new Set((exceptions.exceptions || []).map((item) => item.path));
const ignored = new Set(['.git', '.vercel', 'node_modules', 'promo', 'en', 'zh-cn', 'i18n']);
const extensions = new Set(['.html', '.js', '.mjs', '.json', '.md']);
const staleWords = /(実装予定|開始予定|明日実装|実装後に確認|実装後更新|メンテナンス予定)/;
const datedSource = '(?:20\\d{2}[年\\/-])?(\\d{1,2})[月\\/-](\\d{1,2})日?';
const errors = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) inspect(full);
  }
}
function inspect(file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (exempt.has(relative)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!staleWords.test(line)) return;
    const dates = [...line.matchAll(new RegExp(datedSource, 'g'))];
    for (const match of dates) {
      const explicitYear = match[0].match(/^20\d{2}/)?.[0];
      const year = Number(explicitYear || today.getUTCFullYear());
      const candidate = new Date(Date.UTC(year, Number(match[1]) - 1, Number(match[2])));
      if (candidate < today) errors.push(`${relative}:${index + 1} 期限切れ表現「${match[0]} … ${line.match(staleWords)?.[0]}」`);
    }
  });
}

walk(root);
if (errors.length) {
  console.error(`期限切れコンテンツ検出: ${errors.length}件\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`stale content検証成功: 基準日 ${today.toISOString().slice(0, 10)} / 例外 ${exempt.size}件`);
