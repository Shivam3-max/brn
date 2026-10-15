/** Copies the pinned third-party builds into theme/assets (Shopify has no npm). */
import fs from 'node:fs';
const pairs = [
  ['node_modules/gsap/dist/gsap.min.js', 'theme/assets/gsap.min.js'],
  ['node_modules/gsap/dist/ScrollTrigger.min.js', 'theme/assets/ScrollTrigger.min.js'],
  ['node_modules/three/build/three.module.min.js', 'theme/assets/three.module.min.js'],
];
for (const [a, b] of pairs) { fs.copyFileSync(a, b); console.log('  vendored', b, (fs.statSync(b).size / 1024).toFixed(0) + ' KB'); }
