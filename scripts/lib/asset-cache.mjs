import fs from 'node:fs';
import path from 'node:path';
import policy from '../../data/asset-build.json' with { type: 'json' };

export const assetPolicy = policy;
const ignored = new Set(['.git', '.github', '.vercel', '.agents', 'node_modules', 'promo', 'assets', 'data', 'scripts', 'docs']);
const retrySignal = new Int32Array(new SharedArrayBuffer(4));
function io(operation) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try { return operation(); }
    catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error;
      Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1));
    }
  }
}

export function normalizeAssetUrl(value, basePath = '/') {
  // External services, fragments and all non-CSS/JS URLs keep their original bytes.
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return value;
  let parsed;
  try { parsed = new URL(value, `https://local.invalid${basePath}`); } catch { return value; }
  if (!/\.(?:css|js)$/.test(parsed.pathname)) return value;
  const hashAt = value.indexOf('#');
  const fragment = hashAt < 0 ? '' : value.slice(hashAt);
  const beforeHash = hashAt < 0 ? value : value.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const originalPath = queryAt < 0 ? beforeHash : beforeHash.slice(0, queryAt);
  const migratedPath = policy.migrations[parsed.pathname] ?? originalPath;
  if (queryAt < 0) return migratedPath + fragment;
  const pieces = beforeHash.slice(queryAt + 1).split(/(&amp;|&)/);
  let retained = '', changed = false;
  for (let index = 0; index < pieces.length; index += 2) {
    const parameter = pieces[index];
    if (/^v=/.test(parameter)) { changed = true; continue; }
    retained += (retained ? pieces[index - 1] : '') + parameter;
  }
  if (!changed) return migratedPath + beforeHash.slice(queryAt) + fragment;
  return migratedPath + (retained ? '?' + retained : '') + fragment;
}

export function normalizeAssetHtml(source, basePath = '/') {
  // Attribute-only edits retain markup, navigation, inline integrations and SEO byte-for-byte.
  return source.replace(/<(?:script|link)\b[^>]*>/gi, tag => tag.replace(/\b(href|src)(\s*=\s*)(["'])([^"']*)\3/gi,
    (match, attribute, equals, quote, value) => `${attribute}${equals}${quote}${normalizeAssetUrl(value, basePath)}${quote}`));
}

export function siteHtmlFiles(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (ignored.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.html')) files.push(file);
    }
  }
  walk(root);
  return files;
}

export function normalizeSiteAssets(root, { check = false } = {}) {
  const files = siteHtmlFiles(root), changed = [];
  for (const file of files) {
    const source = io(() => fs.readFileSync(file, 'utf8'));
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const result = normalizeAssetHtml(source, '/' + relative);
    if (result !== source) {
      changed.push(relative);
      if (!check) io(() => fs.writeFileSync(file, result));
    }
  }
  return { scanned: files.length, changed };
}
