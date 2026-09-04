import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

test('official creator assets retain source traceability', () => {
  const tata = json('data/official-assets/tata-source-map.json');
  const skills = json('data/official-assets/skill-icons.json');
  const events = json('data/official-assets/event-images.json');
  const siteIcon = json('data/official-assets/site-icons.json');
  const records = [...tata.assets, ...skills.icons, ...events.events, siteIcon];
  assert.equal(records.length, 287);
  assert.equal(new Set(records.map((record) => record.officialAssetId)).size, 287);
  for (const record of records) {
    assert.match(record.officialAssetId, /^MSOA-\d{5}$/);
    assert.match(record.sourceSha256, /^[a-f0-9]{64}$/);
    if (record.optimizedPath) {
      assert.match(record.optimizedPath, /^\/assets\/official\/.+\.webp$/);
      assert.ok(fs.existsSync(path.join(root, record.optimizedPath.slice(1))));
    } else {
      assert.equal(record.outputs.length, 5);
      assert.ok(record.outputs.every((output) => fs.existsSync(path.join(root, output.path.slice(1)))));
    }
  }
});

test('all major consumers use the shared Tata image mapping', () => {
  for (const file of ['app.js', 'tata-tier/tata-tier.js', 'evolution-priority/evolution-priority.js', 'team-builder/team-builder.js', 'zombie-rush/zombie-rush.js', 'attribute/attribute-guide.js', 'search/search.js', 'compare/compare.js', 'my-monsaba/my-monsaba.js']) {
    assert.match(read(file), /data\/tata-images\.json/, `${file}: shared mapping missing`);
  }
  assert.match(read('team-builder/team-core.js'), /stage1ImageFor/);
  assert.match(read('team-builder/team-builder.js'), /stage1Image\(member\.family\)/);
});

test('Tata detail and Treasure Hunt pages expose optimized accessible images', () => {
  const tataHtml = read('tata/fugumaru/index.html');
  assert.match(tataHtml, /class="tata-form-image"[^>]+srcset="[^"]+256w,[^"]+512w"[^>]+width="512" height="512"[^>]+alt="[^"]+"/);
  assert.match(tataHtml, /assets\/official\/skills\/fugumaru-t1\.webp/);
  for (const file of ['events/treasure-hunt/index.html', 'en/events/treasure-hunt/index.html', 'zh-cn/events/treasure-hunt/index.html']) {
    const html = read(file);
    assert.equal((html.match(/assets\/official\/events\/treasure-hunt\//g) || []).length, 4);
    assert.equal((html.match(/official-event-art-grid/g) || []).length, 1);
  }
});

test('name safety audit records no candidate or internal-only promotions', () => {
  const audit = json('data/official-assets/name-audit.json');
  assert.deepEqual(audit.confirmed, { count: 223, differences: 0, changes: 0 });
  assert.equal(audit.candidate.changes, 0);
  assert.equal(audit.candidate.promotionAllowedFromImageEvidence, false);
  assert.equal(audit.internalOnly.changes, 0);
  assert.deepEqual(audit.internalOnly.names, ['Volterrier', 'Zapleco', 'Voltgriff', 'Nyctolord']);
  assert.equal(audit.stableSlugsChanged, 0);
});
