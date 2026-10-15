/* ==========================================================================
   BRN · WebGL scenes (three.js r160). Loaded only on capable desktops
   (see the flags in layout/theme.liquid); everyone else sees the drawn SVG
   versions, which tell the same story.

     rootFilm(section)            roots grow as 3D tubes, bottles bloom at the tips
     bottleViewer(host, product)  drag-to-turn bottle on the product page
     capsuleField(host, colour)   floating capsules and tablets behind concern heroes

   Every scene renders only while on screen, caps pixel ratio at 2, and tears
   itself down (falling back to the drawing) if the GPU context is lost.
   ========================================================================== */
import * as THREE from './three.module.min.js';

const DPR = Math.min(window.devicePixelRatio || 1, 2);
const INK = '#403322';
const easeOutBack = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

function renderer(host) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(DPR);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.08;
  r.setClearColor(0x000000, 0);
  host.appendChild(r.domElement);
  return r;
}

function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9dfcf, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(3, 5, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe7c4, 0.7); rim.position.set(-6, 2, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(-4, -2, 6); scene.add(fill);
}

const QS = new URLSearchParams(location.search);
const FORCE = QS.has('glforce');

/** Run `frame(t)` only while `el` is on screen. Returns a stop function.
    Performance guard: if the first ~40 visible frames average slower than
    ~22 fps, `onSlow` fires and the scene hands back to the drawn version. */
function loop(el, frame, onSlow) {
  let raf = 0, visible = false, alive = true, last = 0, n = 0, sum = 0;
  const tick = (now) => {
    if (!alive || !visible) { raf = 0; return; }
    if (last && n < 40) {
      sum += now - last; n++;
      if (n === 40 && sum / n > 45 && !FORCE && onSlow) { alive = false; onSlow(); return; }
    }
    last = now;
    frame(now);
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; last = 0; if (visible && !raf) raf = requestAnimationFrame(tick); }, { rootMargin: '100px' });
  io.observe(el);
  return () => { alive = false; io.disconnect(); cancelAnimationFrame(raf); };
}

/* ------------------------------------------------------------ the bottle --- */
const texCache = new Map();
function labelTexture({ colour, short, count }) {
  const key = `${colour}|${short}|${count}`;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = 2048; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = colour; g.fillRect(0, 0, c.width, 70);
  g.fillRect(0, c.height - 18, c.width, 18);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = INK; g.font = '800 200px Urbanist, "Avenir Next", sans-serif';
  g.fillText('BRN', 1024, 280);
  g.fillStyle = colour; g.font = '600 74px "IBM Plex Mono", monospace';
  g.fillText(String(short || '').toUpperCase(), 1024, 430);
  g.fillStyle = '#7B6E5E'; g.font = '400 46px "IBM Plex Mono", monospace';
  g.fillText(count || '', 1024, 520);
  /* thin side text so the turn reveals something */
  g.font = '500 34px "IBM Plex Mono", monospace'; g.fillStyle = '#7B6E5E';
  g.fillText('BARE · ROOT · NUTRITION', 420, 330); g.fillText('EVERY BATCH TESTED', 1630, 330);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}

/** A bottle (tablets/capsules) or tub (powders), 1 unit tall, pivot at its base. */
export function makeBottle({ colour = INK, short = '', count = '', pack = 'tablet' } = {}) {
  const tub = pack === 'tub';
  const grp = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xf8f5ef, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
  const capMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(colour), roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture({ colour, short, count }), roughness: 0.55 });
  let R, labelY, labelH, capY, capR, capH;
  if (tub) {
    const pts = [[0, 0], [0.56, 0], [0.6, 0.025], [0.62, 0.07], [0.62, 0.74], [0.6, 0.76]].map(([x, y]) => new THREE.Vector2(x, y));
    grp.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 72), bodyMat));
    R = 0.622; labelY = 0.39; labelH = 0.5; capY = 0.84; capR = 0.645; capH = 0.18;
  } else {
    const pts = [[0, 0], [0.38, 0], [0.43, 0.02], [0.45, 0.07], [0.45, 0.78], [0.43, 0.85], [0.35, 0.92], [0.26, 0.95], [0.25, 1.0]].map(([x, y]) => new THREE.Vector2(x, y));
    grp.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 72), bodyMat));
    R = 0.452; labelY = 0.42; labelH = 0.48; capY = 1.06; capR = 0.275; capH = 0.2;
  }
  const label = new THREE.Mesh(new THREE.CylinderGeometry(R, R, labelH, 96, 1, true), labelMat);
  label.position.y = labelY; label.rotation.y = Math.PI; grp.add(label);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(capR, capR, capH, 64), capMat);
  cap.position.y = capY; grp.add(cap);
  /* ridges on the cap */
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(capR, 0.012, 6, 64), capMat);
  ridge.rotation.x = Math.PI / 2; ridge.position.y = capY + capH / 2 - 0.01; grp.add(ridge);
  const h = capY + capH / 2;
  grp.scale.setScalar(1 / h);
  const wrap = new THREE.Group(); wrap.add(grp);
  return wrap;
}

function blobShadow() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(64,51,34,0.28)'); grd.addColorStop(1, 'rgba(64,51,34,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/* ------------------------------------------------------------ Root Film --- */
export async function rootFilm(sec) {
  if (sec.dataset.gl) return;
  sec.dataset.gl = '1';
  const host = sec.querySelector('[data-rf-gl]'), stage = sec.querySelector('[data-rf-stage]');
  if (!host || !stage || window.innerWidth < 768) return;
  let geo;
  try { geo = JSON.parse(sec.querySelector('[data-rf-geo]').textContent).wide; } catch (e) { return; }
  if (document.fonts?.ready) await document.fonts.ready;

  const r = renderer(host);
  const scene = new THREE.Scene();
  lights(scene);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  const world = new THREE.Group(); scene.add(world);
  let W = 1, H = 1, vh = 1, vw = 1;
  const toWorld = (x, y) => new THREE.Vector3((x / geo.w - 0.5) * vw, (0.5 - y / geo.h) * vh, 0);

  /* roots */
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 0.85 });
  const twigMat = new THREE.MeshStandardMaterial({ color: 0x8b7a63, roughness: 0.9 });
  const sproutMat = new THREE.MeshStandardMaterial({ color: 0x4f6f3a, roughness: 0.6 });
  let tubes = [];
  const bottles = [];
  const bottleEls = [...sec.querySelectorAll('[data-rf-bottle]')];

  function build() {
    tubes.forEach((t) => { world.remove(t.mesh); t.mesh.geometry?.dispose(); });
    tubes = [];
    geo.roots.forEach((root, i) => {
      const curve = (pts, depth) => new THREE.CubicBezierCurve3(...pts.map(([x, y], k) => {
        const v = toWorld(x, y); v.z = (k === 1 || k === 2) ? Math.sin(i * 1.7 + k) * depth : 0; return v;
      }));
      const main = new THREE.TubeGeometry(curve(root.main, 0.45), 90, 0.03, 8, false);
      const mesh = new THREE.Mesh(main, rootMat); world.add(mesh);
      tubes.push({ mesh, start: 1.1 + i * 0.12, dur: 1.8, count: main.index.count });
      root.twigs.forEach((tw, k) => {
        const g = new THREE.TubeGeometry(curve(tw, 0.2), 30, 0.014, 6, false);
        const m = new THREE.Mesh(g, twigMat); world.add(m);
        tubes.push({ mesh: m, start: 2.0 + i * 0.1 + k * 0.12, dur: 1.0, count: g.index.count });
      });
    });
    /* the seedling: stem tube + leaf blades + bud, from the same geometry as the drawing */
    const bud = geo.bud;
    const sc = vw / geo.w;
    const stemCurve = new THREE.CubicBezierCurve3(...bud.stem.map(([x, y]) => toWorld(x, y)));
    const sg = new THREE.TubeGeometry(stemCurve, 30, 0.042, 10, false);
    const sm = new THREE.Mesh(sg, sproutMat); world.add(sm);
    tubes.push({ mesh: sm, start: 0.45, dur: 0.9, count: sg.index.count });
    bud.leaves.forEach((lf, k) => {
      const [bx, by] = lf.base, [tx, ty] = lf.tip;
      const len = Math.hypot(tx - bx, ty - by) * sc, wid = lf.width * sc;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(len * 0.25, wid * 1.05, len * 0.8, wid * 0.85, len, 0);
      shape.bezierCurveTo(len * 0.8, -wid * 0.7, len * 0.25, -wid * 0.9, 0, 0);
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2, curveSegments: 18 });
      const mat = new THREE.MeshPhysicalMaterial({ color: [0x9dbd7a, 0x86ab62, 0xb9d398][k], roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide });
      const leaf = new THREE.Mesh(g, mat);
      const pivot = new THREE.Group();
      pivot.position.copy(toWorld(bx, by)); pivot.position.z = 0.05;
      pivot.rotation.z = Math.atan2(-(ty - by), tx - bx);
      pivot.rotation.x = (k === 1 ? -0.35 : 0.35);
      pivot.add(leaf); world.add(pivot);
      /* midrib */
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, len * 0.9, 6), sproutMat);
      rib.rotation.z = -Math.PI / 2; rib.position.set(len * 0.45, 0, 0.03); pivot.add(rib);
      tubes.push({ mesh: pivot, start: 1.0 + k * 0.22, dur: 0.9, leaf: true });
    });
    const tip = toWorld(...bud.stem[3]);
    const budMesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), new THREE.MeshPhysicalMaterial({ color: 0xc3d9a4, roughness: 0.4, clearcoat: 0.5 }));
    budMesh.geometry.translate(0, 0.075, 0); budMesh.scale.set(0.75, 1.5, 0.75);
    const budPivot = new THREE.Group(); budPivot.position.copy(tip); budPivot.add(budMesh); world.add(budPivot);
    tubes.push({ mesh: budPivot, start: 1.6, dur: 0.8, leaf: true });
  }

  function placeBottles() {
    /* measure layout boxes, not getBoundingClientRect: the bottles may be
       mid-animation (scaled) when this runs. The anchor is left/top with a
       translate of (-50%, -58%), so the pack centre sits 8% above it. */
    const SW = stage.offsetWidth, SH = stage.offsetHeight;
    bottleEls.forEach((el, i) => {
      const pack = el.querySelector('.rf__pack');
      const ph = pack.offsetHeight;
      const cx = el.offsetLeft / SW, cy = (el.offsetTop - 0.08 * el.offsetHeight) / SH;
      /* match the drawn pack's footprint: tubs are squat, so they get less height */
      const hw = (ph / SH) * vh * (el.dataset.pack === 'tub' ? 0.58 : 0.74);
      let b = bottles[i];
      if (!b) {
        const d = el.dataset;
        const obj = makeBottle({ colour: d.colour, short: d.short, count: d.count, pack: d.pack });
        const sh = blobShadow(); obj.add(sh); sh.scale.setScalar(1.3); sh.position.y = 0.002;
        world.add(obj);
        b = bottles[i] = { obj, base: new THREE.Vector3(), h: 1, phase: i * 0.9 };
      }
      b.h = hw;
      b.base.set((cx - 0.5) * vw, (0.5 - cy) * vh - hw * 0.44, 0.4);
      b.obj.position.copy(b.base);
      b.obj.scale.setScalar(hw);
    });
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    r.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    vh = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    vw = vh * camera.aspect;
    build(); placeBottles();
  }
  resize();
  new ResizeObserver(resize).observe(host);

  let mx = 0, my = 0, tx = 0, ty = 0;
  sec.addEventListener('pointermove', (e) => { const b = stage.getBoundingClientRect(); tx = ((e.clientX - b.left) / b.width - 0.5); ty = ((e.clientY - b.top) / b.height - 0.5); });
  sec.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  const seek = Number(QS.get('rfseek') || 0) * 1000;
  let t0 = sec.classList.contains('is-played') || seek ? performance.now() - 300 - seek : null;
  sec.addEventListener('rf:play', () => { t0 = performance.now(); });

  let first = true;
  const stop = loop(sec, (now) => {
    const t = t0 == null ? 0 : (now - t0) / 1000;
    for (const tb of tubes) {
      const p = clamp01((t - tb.start) / tb.dur);
      if (tb.leaf) tb.mesh.scale.setScalar(Math.max(0.0001, easeOutBack(p)));
      else tb.mesh.geometry.setDrawRange(0, Math.floor(easeInOut(p) * tb.count / 3) * 3);
    }
    bottles.forEach((b, i) => {
      const p = clamp01((t - (2.7 + i * 0.13)) / 0.9);
      const s = b.h * Math.max(0.0001, easeOutBack(p));
      b.obj.scale.setScalar(s);
      const idle = Math.max(0, t - 3.8);
      b.obj.rotation.y = -0.12 + Math.sin(idle * 0.6 + b.phase) * 0.22;
      b.obj.position.y = b.base.y + Math.sin(idle * 1.2 + b.phase) * 0.03 * (p > 0.99 ? 1 : 0);
    });
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    world.rotation.y = mx * 0.08; world.rotation.x = my * 0.05;
    r.render(scene, camera);
    if (first) { first = false; sec.classList.add('rf--gl'); }
  }, () => giveUp());

  function giveUp() { stop(); sec.classList.remove('rf--gl'); r.dispose(); host.innerHTML = ''; }
  r.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); giveUp(); }, { once: true });
}

/* ---------------------------------------------------------- bottle viewer --- */
export function bottleViewer(host, opts) {
  if (host.dataset.gl) return;
  host.dataset.gl = '1';
  const r = renderer(host);
  const scene = new THREE.Scene(); lights(scene);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0.55, 4.2); camera.lookAt(0, 0.5, 0);
  const b = makeBottle(opts); scene.add(b);
  const sh = blobShadow(); sh.scale.setScalar(1.6); scene.add(sh);
  b.position.y = 0;
  const resize = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1; r.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize(); new ResizeObserver(resize).observe(host);
  let rot = -0.4, vel = 0, drag = false, lx = 0, idleAt = 0;
  host.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - lx; lx = e.clientX; vel = dx * 0.012; rot += vel; idleAt = performance.now(); });
  host.addEventListener('pointerup', () => { drag = false; });
  const stop = loop(host, (now) => {
    if (!drag) { vel *= 0.94; rot += vel; if (now - idleAt > 2200) rot += 0.004; }
    b.rotation.y = rot;
    b.position.y = Math.sin(now / 900) * 0.02;
    r.render(scene, camera);
    host.classList.add('is-gl');
  }, () => giveUp());
  function giveUp() { stop(); host.classList.remove('is-gl'); r.dispose(); host.querySelector('canvas')?.remove(); }
  r.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); giveUp(); }, { once: true });
}

/* ---------------------------------------------------------- capsule field --- */
export function capsuleField(host, { colour = INK } = {}) {
  if (host.dataset.gl) return;
  host.dataset.gl = '1';
  const r = renderer(host);
  const scene = new THREE.Scene(); lights(scene);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0, 14);
  const col = new THREE.Color(colour);
  const mats = [
    new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 0.9 }),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.5 }),
    new THREE.MeshPhysicalMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.55), roughness: 0.15, transmission: 0.2, clearcoat: 1 }),
  ];
  const geos = [new THREE.CapsuleGeometry(0.22, 0.6, 6, 18), new THREE.CylinderGeometry(0.34, 0.34, 0.16, 32), new THREE.SphereGeometry(0.26, 24, 16)];
  const N = 18, items = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < N; i++) {
    const k = i % 3;
    const m = new THREE.Mesh(geos[k], mats[k]);
    if (k === 2) m.scale.set(1, 1.35, 1);
    m.position.set(rnd(-1, 7.5), rnd(-3.6, 3.6), rnd(-3, 2));
    m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
    scene.add(m);
    items.push({ m, y: m.position.y, s: rnd(0.2, 0.6), p: rnd(0, 6), rx: rnd(-0.004, 0.004), ry: rnd(-0.006, 0.006) });
  }
  const resize = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1; r.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize(); new ResizeObserver(resize).observe(host);
  let mx = 0, tx = 0;
  window.addEventListener('pointermove', (e) => { tx = e.clientX / window.innerWidth - 0.5; }, { passive: true });
  const stop = loop(host, (now) => {
    const t = now / 1000;
    mx += (tx - mx) * 0.05;
    for (const it of items) {
      it.m.position.y = it.y + Math.sin(t * it.s + it.p) * 0.35;
      it.m.rotation.x += it.rx; it.m.rotation.y += it.ry;
    }
    scene.rotation.y = mx * 0.15;
    r.render(scene, camera);
    host.classList.add('is-gl');
  }, () => giveUp());
  function giveUp() { stop(); host.classList.remove('is-gl'); r.dispose(); host.querySelector('canvas')?.remove(); }
  r.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); giveUp(); }, { once: true });
}
