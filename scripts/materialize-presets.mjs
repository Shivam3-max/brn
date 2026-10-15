/**
 * Shopify does not apply a section's `presets` to a JSON template: a template
 * section with no `blocks` renders with none. The local harness falls back to
 * presets, Shopify would not. This script writes every preset's blocks into
 * the JSON templates (and the header's range tabs into settings_data.json),
 * so the uploaded theme looks exactly like the local preview.
 *
 *   node scripts/materialize-presets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = path.join(ROOT, 'theme');

const schemaOf = (type) => {
  const src = fs.readFileSync(path.join(T, 'sections', `${type}.liquid`), 'utf8');
  const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  return m ? JSON.parse(m[1]) : {};
};
const presetBlocks = (type) => {
  const p = (schemaOf(type).presets || [])[0];
  if (!p?.blocks?.length) return null;
  const blocks = {}, order = [];
  p.blocks.forEach((b, i) => { const k = `${b.type}_${i + 1}`; blocks[k] = { type: b.type, settings: b.settings || {} }; order.push(k); });
  return { blocks, block_order: order };
};

let changed = 0;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
for (const file of walk(path.join(T, 'templates')).filter((f) => f.endsWith('.json'))) {
  const tpl = JSON.parse(fs.readFileSync(file, 'utf8'));
  let dirty = false;
  for (const sec of Object.values(tpl.sections)) {
    if (sec.blocks) continue;
    const pb = presetBlocks(sec.type);
    if (pb) { Object.assign(sec, pb); dirty = true; }
  }
  if (dirty) { fs.writeFileSync(file, JSON.stringify(tpl, null, 2)); changed++; console.log('  blocks written ·', path.relative(T, file)); }
}

/* static sections rendered from the layout keep their data in settings_data */
const sdFile = path.join(T, 'config/settings_data.json');
const sd = JSON.parse(fs.readFileSync(sdFile, 'utf8'));
sd.current.sections = sd.current.sections || {};
for (const type of ['header', 'footer', 'announcement-bar']) {
  if (sd.current.sections[type]) continue;
  const schema = schemaOf(type);
  const settings = Object.fromEntries((schema.settings || []).filter((s) => s.id && s.default !== undefined).map((s) => [s.id, s.default]));
  sd.current.sections[type] = { type, settings, ...(presetBlocks(type) || {}) };
  changed++;
}
fs.writeFileSync(sdFile, JSON.stringify(sd, null, 2));
console.log(`  ${changed} files/sections updated`);
