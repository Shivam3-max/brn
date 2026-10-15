/**
 * Root Film geometry. One root system, grown from a seedling, ending in eight
 * tips where the eight bottles bloom. Generated once (seeded, so it never
 * changes between builds) for two frames:
 *   wide  1200×560  — desktop
 *   tall   600×1040 — phones (2 columns × 4 rows of bottles)
 *
 * Output: theme/snippets/root-film-art.liquid — both SVGs plus the same curves
 * as JSON, which brn-gl.js turns into 3D tubes so the drawn and the WebGL
 * versions tell the identical story.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const bez = (p, t) => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]);
};
const tan = (p, t) => {
  const u = 1 - t;
  return [0, 1].map((k) => 3 * u * u * (p[1][k] - p[0][k]) + 6 * u * t * (p[2][k] - p[1][k]) + 3 * t * t * (p[3][k] - p[2][k]));
};
const r1 = (n) => Math.round(n * 10) / 10;
const d = (p) => `M${r1(p[0][0])} ${r1(p[0][1])} C${r1(p[1][0])} ${r1(p[1][1])} ${r1(p[2][0])} ${r1(p[2][1])} ${r1(p[3][0])} ${r1(p[3][1])}`;

function system({ w, h, origin, tips, seed }) {
  const rand = rng(seed);
  const roots = tips.map((T, i) => {
    const O = origin;
    const j = (rand() - 0.5) * 60, j2 = (rand() - 0.5) * 50;
    const main = [O, [O[0] + (T[0] - O[0]) * 0.12 + j, O[1] + (T[1] - O[1]) * 0.45], [T[0] - (T[0] - O[0]) * 0.18 + j2, T[1] - (T[1] - O[1]) * 0.38], T];
    const twigs = [0.32, 0.52, 0.72].map((t, k) => {
      const P = bez(main, t);
      const [tx, ty] = tan(main, t);
      const len = Math.hypot(tx, ty) || 1;
      const side = (k % 2 ? 1 : -1) * (T[0] < O[0] ? -1 : 1) * (rand() > 0.3 ? 1 : -1);
      const nx = (-ty / len) * side, ny = (tx / len) * side;
      const L = 34 + rand() * 46;
      const E = [P[0] + nx * L + (tx / len) * L * 0.5, P[1] + Math.abs(ny * L) * 0.6 + L * 0.55];
      return [P, [P[0] + nx * L * 0.35, P[1] + 8], [E[0] - nx * 6, E[1] - 14], E];
    });
    return { main, twigs, tip: T, i };
  });
  return { w, h, origin, roots };
}

const wide = system({
  w: 1200, h: 560, origin: [600, 122], seed: 7,
  tips: [[90, 420], [235, 320], [380, 420], [525, 330], [675, 430], [820, 320], [965, 420], [1110, 330]],
});
const tall = system({
  w: 600, h: 1040, origin: [300, 126], seed: 11,
  tips: [[150, 270], [450, 270], [150, 490], [450, 490], [150, 710], [450, 710], [150, 930], [450, 930]],
});

/* ---------------------------------------------------------------- land --- */
/** Ground surface: a gentle undulation across the full width, flat where the seedling stands. */
function land(sys, seed) {
  const { w, h, origin: [ox, oy] } = sys;
  const rand = rng(seed);
  const gy = (x) => oy + Math.sin(x / w * Math.PI * 3 + 0.6) * 5 * Math.min(1, Math.abs(x - ox) / 140) + (Math.abs(x - ox) / w) * 10;
  const pts = []; for (let x = 0; x <= w; x += 20) pts.push([x, gy(x)]);
  const line = 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L');
  const fill = `${line} L${w} ${h} L0 ${h} Z`;
  const strata = [46, 128, 230].filter((dy) => oy + dy < h * 0.75).map((dy, k) => {
    const sp = []; for (let x = 0; x <= w; x += 30) sp.push([x, gy(x) + dy + Math.sin(x / 70 + k * 2) * (3 + k)]);
    return 'M' + sp.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L');
  });
  const pebbles = [];
  for (let i = 0; i < Math.round(w / 34); i++) {
    const x = rand() * w, depth = 12 + rand() * rand() * 170;
    if (Math.abs(x - ox) < 50 && depth < 40) continue;
    const rx = 2.2 + rand() * 4.5;
    pebbles.push([r1(x), r1(gy(x) + depth), r1(rx), r1(rx * (0.55 + rand() * 0.25))]);
  }
  const grass = [];
  for (let i = 0; i < Math.round(w / 30); i++) {
    const x = 18 + rand() * (w - 36);
    if (Math.abs(x - ox) < 70) continue;
    const y = gy(x), hgt = 7 + rand() * 9, blades = [];
    for (let b = -1; b <= 1; b++) {
      const lean = b * (3 + rand() * 4) + (rand() - 0.5) * 3;
      blades.push(`M${r1(x + b * 2.2)} ${r1(y + 1)} Q${r1(x + b * 2 + lean * 0.3)} ${r1(y - hgt * 0.6)} ${r1(x + b * 2 + lean)} ${r1(y - hgt * (b === 0 ? 1.15 : 0.85))}`);
    }
    grass.push(blades.join(' '));
  }
  const top = []; for (let x = w; x >= 0; x -= 20) top.push([x, gy(x) + 13 + Math.sin(x / 37) * 2.5]);
  const topsoil = `${line} L` + top.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L') + ' Z';
  const mound = `M${ox - 58} ${r1(gy(ox - 58))} C${ox - 34} ${oy - 12} ${ox + 34} ${oy - 12} ${ox + 58} ${r1(gy(ox + 58))}`;
  return { line, fill, topsoil, strata, pebbles, grass, mound };
}

/** The seedling: stem, two seed-leaves with veins, a true leaf unfurling, a bud at the tip. */
function bud([ox, oy]) {
  const stem = [[ox, oy - 4], [ox + 3, oy - 30], [ox - 5, oy - 56], [ox, oy - 86]];
  const L = { base: [ox - 1, oy - 58], tip: [ox - 52, oy - 72], width: 17 };
  const Rt = { base: [ox + 1, oy - 64], tip: [ox + 58, oy - 86], width: 20 };
  const T = { base: [ox, oy - 82], tip: [ox + 14, oy - 112], width: 9 };
  const leaf = ({ base: [bx, by], tip: [tx, ty], width }) => {
    const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy), nx = -dy / len * width, ny = dx / len * width;
    const a = (t, k) => [bx + dx * t + nx * k, by + dy * t + ny * k];
    const [c1, c2, c3, c4] = [a(0.25, 1.05), a(0.8, 0.85), a(0.8, -0.7), a(0.25, -0.9)];
    return {
      shape: `M${bx} ${by} C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${tx} ${ty} C${r1(c3[0])} ${r1(c3[1])} ${r1(c4[0])} ${r1(c4[1])} ${bx} ${by} Z`,
      vein: `M${bx} ${by} Q${r1(bx + dx * 0.5 + nx * 0.12)} ${r1(by + dy * 0.5 + ny * 0.12)} ${r1(bx + dx * 0.9)} ${r1(by + dy * 0.9)}` +
        [0.35, 0.6].map((t) => { const p = a(t, 0.02), q = a(t + 0.16, 0.6), q2 = a(t + 0.16, -0.55); return ` M${r1(p[0])} ${r1(p[1])} L${r1(q[0])} ${r1(q[1])} M${r1(p[0])} ${r1(p[1])} L${r1(q2[0])} ${r1(q2[1])}`; }).join(''),
    };
  };
  const tip = stem[3];
  const budPath = `M${tip[0]} ${tip[1]} C${tip[0] - 7} ${tip[1] - 8} ${tip[0] - 5} ${tip[1] - 19} ${tip[0] + 1} ${tip[1] - 25} C${tip[0] + 7} ${tip[1] - 17} ${tip[0] + 7} ${tip[1] - 7} ${tip[0]} ${tip[1]} Z`;
  return { stem, leaves: [L, Rt, T], paths: [leaf(L), leaf(Rt), leaf(T)], budPath };
}

function svg(sys, cls, seed) {
  const { w, h, origin: [ox, oy], roots } = sys;
  const g = land(sys, seed), b = bud(sys.origin);
  const id = `rf-soil-${cls.split('--')[1]}`;
  const paths = roots.map((r) =>
    `<path class="rf__main" pathLength="1" style="--i:${r.i}" d="${d(r.main)}"/>` +
    r.twigs.map((t, k) => `<path class="rf__twig" pathLength="1" style="--i:${r.i};--k:${k}" d="${d(t)}"/>`).join('')
  ).join('');
  const leaves = b.paths.map((p, k) => {
    const base = b.leaves[k].base;
    return `<g class="rf__leaf rf__leaf--${k + 1}" style="transform-origin:${base[0]}px ${base[1]}px;--k:${k}"><path class="rf__leaf-fill" d="${p.shape}"/><path class="rf__leaf-line" pathLength="1" d="${p.shape}"/><path class="rf__vein" pathLength="1" d="${p.vein}"/></g>`;
  }).join('');
  const tip = b.stem[3];
  return `<svg class="rf__svg ${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">` +
    `<defs><linearGradient id="${id}" x1="0" y1="${oy}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#D8C19B"/><stop offset=".14" stop-color="#E5D4B7" stop-opacity=".95"/><stop offset=".55" stop-color="#EFE4D2" stop-opacity=".7"/><stop offset="1" stop-color="#F8F5F0" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${id}-fade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".07" stop-color="#fff"/><stop offset=".93" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="url(#${id}-fade)"/></mask>` +
    `<radialGradient id="${id}-glow" cx="${ox}" cy="${oy - 50}" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#EEF3E8"/><stop offset="1" stop-color="#EEF3E8" stop-opacity="0"/></radialGradient></defs>` +
    `<g class="rf__land" mask="url(#${id}-mask)">` +
      `<circle class="rf__glow" cx="${ox}" cy="${oy - 50}" r="150" fill="url(#${id}-glow)"/>` +
      `<path class="rf__soil-fill" d="${g.fill}" fill="url(#${id})"/><path class="rf__topsoil" d="${g.topsoil}"/>` +
      g.strata.map((p, k) => `<path class="rf__strata" style="--k:${k}" d="${p}"/>`).join('') +
      g.pebbles.map(([x, y, rx, ry]) => `<ellipse class="rf__pebble" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('') +
      `<path class="rf__ground" pathLength="1" d="${g.line}"/>` +
      `<path class="rf__mound" d="${g.mound} Z"/>` +
      g.grass.map((p, k) => `<path class="rf__grass" style="--k:${k % 9}" d="${p}"/>`).join('') +
    `</g>` +
    paths +
    `<g class="rf__bud" style="transform-origin:${ox}px ${oy}px">` +
      `<path class="rf__stem" pathLength="1" d="${d(b.stem)}"/>` + leaves +
      `<g class="rf__tip" style="transform-origin:${tip[0]}px ${tip[1]}px"><path class="rf__leaf-fill rf__tip-fill" d="${b.budPath}"/><path class="rf__leaf-line" pathLength="1" d="${b.budPath}"/></g>` +
    `</g></svg>`;
}

const toJSON = (sys) => ({
  w: sys.w, h: sys.h, origin: sys.origin, bud: (({ stem, leaves }) => ({ stem, leaves }))(bud(sys.origin)),
  roots: sys.roots.map((r) => ({ main: r.main, twigs: r.twigs, tip: r.tip })),
});

const out = `{%- comment -%}GENERATED by scripts/build-roots.mjs — do not edit.{%- endcomment -%}
${svg(wide, 'rf__svg--wide', 21)}
${svg(tall, 'rf__svg--tall', 23)}
<script type="application/json" data-rf-geo>${JSON.stringify({ wide: toJSON(wide), tall: toJSON(tall) })}</script>
`;
fs.writeFileSync(path.join(ROOT, 'theme/snippets/root-film-art.liquid'), out);

/* tip positions as % of each frame, for placing the HTML bottles */
const pct = (sys) => sys.roots.map((r) => [r1((r.tip[0] / sys.w) * 100), r1((r.tip[1] / sys.h) * 100)]);
fs.writeFileSync(path.join(ROOT, 'data/root-tips.json'), JSON.stringify({ wide: pct(wide), tall: pct(tall) }));
console.log('  root-film-art.liquid · 8 roots × 2 frames');
