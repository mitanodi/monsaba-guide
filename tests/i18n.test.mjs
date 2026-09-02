import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('generated locale pages pass the i18n regression validator', () => {
  const output = execFileSync(process.execPath, ['scripts/validate-i18n.mjs'], { cwd: root, encoding: 'utf8' });
  assert.match(output, /i18n validation passed/);
});

test('English and Simplified Chinese pages pass translation quality QA', () => {
  const output = execFileSync(process.execPath, ['scripts/validate-translation-quality.mjs'], { cwd: root, encoding: 'utf8' });
  assert.match(output, /translation quality validation passed/);
});

test('Japanese pages display ゾンビラッシュ instead of Zombie Rush', () => {
  const ignored = new Set(['.git', '.vercel', 'node_modules', 'promo', 'en', 'zh-cn']);
  const failures = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(full, 'utf8')
          .replaceAll('data-board-category="Zombie Rush"', '')
          .replaceAll('value="Zombie Rush"', '');
        if (html.includes('Zombie Rush')) failures.push(path.relative(root, full));
      }
    }
  };
  walk(root);
  assert.deepEqual(failures, []);
});
