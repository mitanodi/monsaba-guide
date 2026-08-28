import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('generated locale pages pass the i18n regression validator', () => {
  const output = execFileSync(process.execPath, ['scripts/validate-i18n.mjs'], { cwd: root, encoding: 'utf8' });
  assert.match(output, /i18n validation passed/);
});
