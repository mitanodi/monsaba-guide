// Compatibility entry point: normalize fixed URLs; no content hash or version is calculated.
import path from 'node:path';
import { normalizeSiteAssets } from './lib/asset-cache.mjs';
const result = normalizeSiteAssets(path.resolve(import.meta.dirname, '..'), { check: process.argv.includes('--check') });
console.log('Fixed asset URLs: ' + result.changed.length + ' / ' + result.scanned + ' HTML need normalization.');
if (process.argv.includes('--check') && result.changed.length) process.exitCode = 1;
