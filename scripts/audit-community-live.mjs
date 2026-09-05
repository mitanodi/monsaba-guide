import fs from 'node:fs';
import path from 'node:path';
import { decodeTeam, playerCount, TEAM_SLOTS } from '../team-builder/team-core.js';

const root = path.resolve(import.meta.dirname, '..');
const args = new Map(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.replace(/^--/, '').split('=');
  return [key, rest.join('=') || true];
}));
const baseUrl = String(args.get('base') || 'https://monster-survival.com').replace(/\/$/, '');
const output = args.get('write') === true ? 'data/community-live-audit.json' : args.get('write');
const observedAt = String(args.get('observed-at') || new Date().toISOString());
const json = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const families = json('data/tatari.json').families;
const chips = json('data/zombie-rush/chips.json').chips;

async function get(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json, text/html;q=0.9' } });
  const text = await response.text();
  return { response, text };
}

async function collectBuilds() {
  const builds = [];
  const ids = new Set();
  let cursor = '';
  let firstResponse;
  for (let page = 0; page < 100; page += 1) {
    const url = new URL('/api/community', baseUrl);
    if (cursor) url.searchParams.set('cursor', cursor);
    const { response, text } = await get(url);
    firstResponse ||= response;
    let payload;
    try { payload = JSON.parse(text); } catch { throw new Error(`Community API returned non-JSON (${response.status}).`); }
    if (!response.ok || !payload.ok || !Array.isArray(payload.builds)) throw new Error(`Community API failed (${response.status}).`);
    for (const build of payload.builds) {
      if (!build?.id || ids.has(build.id)) throw new Error('Community list contains a missing or duplicate build ID.');
      ids.add(build.id);
      builds.push(build);
    }
    cursor = payload.nextCursor || '';
    if (!cursor) return { builds, firstResponse, nextCursor: null };
  }
  throw new Error('Community pagination exceeded the 100-page safety limit.');
}

function inspectFormation(build) {
  const team = decodeTeam(build.formationCode, families, chips);
  const occupied = team.slots.filter(Boolean);
  const validPlayers = occupied.every((slot) => [1, 2].includes(slot.playerId));
  const validStages = occupied.every((slot) => Number.isInteger(slot.stage) && slot.stage >= 1 && slot.stage <= 4);
  const validLevels = occupied.every((slot) => Number.isInteger(slot.level) && slot.level >= 1);
  const validChips = [1, 2].every((playerId) => Array.isArray(team.chips[playerId]) && team.chips[playerId].length <= 3);
  const countsMatch = [1, 2].every((playerId) => Number(build.playerCounts?.[playerId]) === playerCount(team, playerId));
  return { team, checks: { preview6x6: team.slots.length === TEAM_SLOTS ? 'pass' : 'fail', playerLabels: validPlayers && countsMatch ? 'pass' : 'fail', tier: validStages ? 'pass' : 'fail', level: validLevels ? 'pass' : 'fail', chips: validChips ? 'pass' : 'fail' } };
}

async function run() {
  const { builds, firstResponse, nextCursor } = await collectBuilds();
  const checks = {
    listApi: firstResponse.status === 200 ? 'pass' : 'fail',
    apiNoindex: /noindex/i.test(firstResponse.headers.get('x-robots-tag') || '') ? 'pass' : 'fail',
    fakeSeedAbsent: builds.length === 0 ? 'pass' : 'not_applicable',
    detail: 'not_testable', preview6x6: 'not_testable', playerLabels: 'not_testable', tier: 'not_testable', level: 'not_testable', chips: 'not_testable',
    publicOwnerTokenAbsent: 'not_testable', shareUrl: 'not_testable', teamBuilderLoad: 'manual_required', helpful: 'manual_required', trialReport: 'manual_required', comment: 'manual_required', reply: 'manual_required', edit: 'manual_required', delete: 'manual_required', report: 'manual_required'
  };
  let sample = null;
  if (builds.length) {
    const build = builds[0];
    const detailUrl = new URL('/api/community', baseUrl);
    detailUrl.searchParams.set('id', build.id);
    const detailResponse = await get(detailUrl);
    const detail = JSON.parse(detailResponse.text);
    const formation = inspectFormation(build);
    Object.assign(checks, formation.checks, {
      detail: detailResponse.response.ok && detail.ok && detail.build?.id === build.id && Array.isArray(detail.comments) ? 'pass' : 'fail',
      publicOwnerTokenAbsent: /ownerToken/i.test(JSON.stringify({ list: builds, detail })) ? 'fail' : 'pass',
      shareUrl: 'pass'
    });
    sample = {
      id: build.id,
      shareUrl: `${baseUrl}/team-builder/community/detail/?id=${encodeURIComponent(build.id)}`,
      occupiedSlots: formation.team.slots.filter(Boolean).length,
      playerCounts: build.playerCounts,
      commentCount: Number(build.commentCount || 0),
      helpfulCount: Number(build.helpfulCount || 0),
      trialCount: Number(build.trialCount || 0)
    };
  }
  const report = {
    version: 1,
    observedAt,
    baseUrl,
    apiStatus: firstResponse.status,
    postCount: builds.length,
    sampleStatus: builds.length ? 'REAL_DATA_AVAILABLE' : 'INSUFFICIENT_DATA',
    nextCursor,
    checks,
    sample,
    note: builds.length ? 'Read-only API checks passed. Complete the two-device manual checklist without creating fake actions.' : 'No fake post was created. Run this audit after the first real post, then complete the two-device checklist.'
  };
  if (Object.values(checks).includes('fail')) process.exitCode = 1;
  if (output) fs.writeFileSync(path.resolve(root, String(output)), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; });
