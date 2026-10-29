/* ==========================================================================
   BRN theme · one ES module, no framework.
   Every component is opt-in by data-attribute and degrades to readable,
   fully-drawn markup when JavaScript or motion is unavailable.
   ========================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const B = window.BRN || {};
const STILL = !!B.still;
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const money = (paise) => '₹' + Math.round(Number(paise || 0) / 100).toLocaleString('en-IN');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let PRODUCTS = {};
try { PRODUCTS = JSON.parse($('#brn-products')?.textContent || '{}'); } catch (e) { PRODUCTS = {}; }
const byVariant = new Map();
for (const [handle, p] of Object.entries(PRODUCTS)) for (const id of p.variants) byVariant.set(Number(id), { ...p, handle });

/** The drawn pack shot, same as snippets/pack-art.liquid, for JS-rendered UI. */
function packSVG({ colour = '#403322', short = '', pack = 'tablet', count = '' } = {}) {
  const c = esc(colour), s = esc(short), n = esc(count);
  const body = pack === 'tub'
    ? `<rect x="30" y="74" width="140" height="148" rx="16" fill="url(#brn-cyl)"/><rect x="26" y="50" width="148" height="34" rx="10" fill="${c}"/><rect x="26" y="50" width="148" height="34" rx="10" fill="url(#brn-gloss)"/><rect x="30" y="104" width="140" height="96" fill="#fff"/><rect x="30" y="104" width="140" height="10" fill="${c}"/><text x="100" y="146" text-anchor="middle" class="pack__brand">BRN</text><text x="100" y="168" text-anchor="middle" class="pack__name">${s}</text><text x="100" y="188" text-anchor="middle" class="pack__count">${n}</text>`
    : `<rect x="72" y="22" width="56" height="34" rx="6" fill="${c}"/><rect x="72" y="22" width="56" height="34" rx="6" fill="url(#brn-gloss)"/><path d="M78 56 H122 V64 C142 66 152 78 152 96 V206 C152 216 146 222 136 222 H64 C54 222 48 216 48 206 V96 C48 78 58 66 78 64 Z" fill="url(#brn-cyl)"/><rect x="48" y="104" width="104" height="92" fill="#fff"/><rect x="48" y="104" width="104" height="10" fill="${c}"/><text x="100" y="146" text-anchor="middle" class="pack__brand">BRN</text><text x="100" y="166" text-anchor="middle" class="pack__name">${s}</text><text x="100" y="184" text-anchor="middle" class="pack__count">${n}</text>`;
  return `<svg class="pack" viewBox="0 0 200 240" aria-hidden="true" style="--pc:${c}"><ellipse cx="100" cy="226" rx="74" ry="10" fill="url(#brn-shadow)"/>${body}</svg>`;
}

/* -------------------------------------------------------------- reveal --- */
function initReveal() {
  const els = $$('.rv, [data-ink]');
  if (STILL || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}

/* ------------------------------------------------------- announcement --- */
function initAnnouncement() {
  const msgs = $$('.ann__msg');
  if (msgs.length < 2 || STILL) return;
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    msgs[i].classList.remove('is-on');
    i = (i + 1) % msgs.length;
    msgs[i].classList.add('is-on');
  }, 4500);
}

/* -------------------------------------------------------------- panels --- */
const scrim = $('[data-scrim]');
let openPanel = null;
let lastFocus = null;

function open(name) {
  const panel = $(`[data-panel="${name}"]`);
  if (!panel) return;
  if (openPanel && openPanel !== panel) close(true);
  lastFocus = document.activeElement;
  panel.hidden = false;
  scrim.hidden = false;
  requestAnimationFrame(() => { panel.classList.add('is-open'); scrim.classList.add('is-on'); });
  document.body.classList.add('is-locked');
  openPanel = panel;
  setTimeout(() => (panel.querySelector('input, [data-close]'))?.focus({ preventScroll: true }), 60);
  if (name === 'cart') refreshCart();
}
function close(instant) {
  const panel = openPanel;
  if (!panel) return;
  panel.classList.remove('is-open');
  scrim.classList.remove('is-on');
  document.body.classList.remove('is-locked');
  openPanel = null;
  const done = () => { panel.hidden = true; if (!openPanel) scrim.hidden = true; };
  if (instant || STILL) done(); else setTimeout(done, 380);
  const v = panel.querySelector('video'); if (v) v.pause();
  lastFocus?.focus?.({ preventScroll: true });
}
function initPanels() {
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); open(o.dataset.open); return; }
    if (e.target.closest('[data-close]') || e.target === scrim) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); closeDrops(); } });
}

/* -------------------------------------------------------------- header --- */
function closeDrops(except) {
  $$('[data-drop]').forEach((d) => {
    if (d === except) return;
    const btn = $('[data-drop-btn]', d), panel = $('[data-drop-panel]', d);
    btn?.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  });
}
function initHeader() {
  const hdr = $('[data-hdr]');
  if (!hdr) return;
  const setTop = () => document.documentElement.style.setProperty('--mega-top', `${hdr.getBoundingClientRect().bottom}px`);
  const onScroll = () => { hdr.classList.toggle('is-scrolled', window.scrollY > 8); setTop(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', setTop);
  onScroll();

  $$('[data-drop]').forEach((d) => {
    const btn = $('[data-drop-btn]', d), panel = $('[data-drop-panel]', d);
    let t;
    const show = () => { clearTimeout(t); closeDrops(d); setTop(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); };
    const hide = () => { t = setTimeout(() => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }, 160); };
    btn.addEventListener('click', () => (panel.hidden ? show() : (panel.hidden = true, btn.setAttribute('aria-expanded', 'false'))));
    if (FINE) { d.addEventListener('mouseenter', show); d.addEventListener('mouseleave', hide); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-drop]')) closeDrops(); });
}

/* ---------------------------------------------------------------- cart --- */
const api = async (url, body) => {
  const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) } : { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
};
let lastAdded = null;

function toast(html) {
  const t = $('[data-toast]');
  if (!t) return;
  t.innerHTML = html; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 3200);
}

function renderCart(cart) {
  $$('[data-cart-count]').forEach((el) => {
    el.textContent = cart.item_count; el.hidden = !cart.item_count;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  });
  $$('[data-cart-count-text]').forEach((el) => { el.textContent = `(${cart.item_count})`; });
  const body = $('[data-cart-body]'), foot = $('[data-cart-foot]');
  if (!body) return;
  if (!cart.items.length) {
    body.innerHTML = `<div class="drawer__empty"><p>Your cart is empty.</p><a class="btn btn--ink btn--sm" href="/collections/all">Shop the range</a></div>`;
    foot.hidden = true;
  } else {
    body.innerHTML = cart.items.map((it) => {
      const p = byVariant.get(Number(it.variant_id)) || {};
      const img = it.image ? `<img src="${esc(it.image)}" alt="">` : packSVG(p);
      return `<div class="line" style="--pc:${esc(p.colour || '#403322')}">
        <a class="line__pack" href="${esc(it.url)}">${img}</a>
        <div><a class="line__t" href="${esc(it.url)}">${esc(it.product_title)}</a><span class="line__v">${esc(it.variant_title || '')}</span>
          <div class="line__qty"><button type="button" data-qty="${esc(it.key)}" data-q="${it.quantity - 1}" aria-label="One less">−</button><span>${it.quantity}</span><button type="button" data-qty="${esc(it.key)}" data-q="${it.quantity + 1}" aria-label="One more">+</button></div>
          <button type="button" class="line__rm" data-qty="${esc(it.key)}" data-q="0">Remove</button></div>
        <div class="line__price">${money(it.final_line_price ?? it.line_price)}${it.original_price > it.price ? `<s>${money(it.original_price * it.quantity)}</s>` : ''}</div>
      </div>`;
    }).join('');
    foot.hidden = false;
  }
  const total = cart.total_price;
  $('[data-cart-total]') && ($('[data-cart-total]').textContent = money(total));
  const save = (cart.original_total_price || 0) - total;
  const saveRow = $('[data-cart-save-row]');
  if (saveRow) { saveRow.hidden = save <= 0; $('[data-cart-save]').textContent = money(save); }

  const thr = B.freeShip || 0, bar = $('[data-ship-bar]'), txt = $('[data-ship-text]');
  if (thr && bar) {
    const left = thr - total;
    bar.style.width = `${Math.min(100, (total / thr) * 100)}%`;
    txt.textContent = !cart.items.length ? `Free delivery on prepaid orders above ${money(thr)}`
      : left > 0 ? `You're ${money(left)} away from free delivery` : 'Free delivery unlocked on prepaid orders';
  }

  const up = $('[data-cart-upsell]'), list = $('[data-cart-upsell-list]');
  if (up && list) {
    const inCart = new Set(cart.items.map((i) => i.handle || byVariant.get(Number(i.variant_id))?.handle));
    const base = lastAdded || byVariant.get(Number(cart.items[0]?.variant_id));
    const pick = base?.pairs?.map((h) => ({ ...PRODUCTS[h], handle: h })).find((p) => p.title && !inCart.has(p.handle));
    up.hidden = !pick;
    if (pick) {
      list.innerHTML = `<div class="mini" style="--pc:${esc(pick.colour)}"><a class="mini__pack" href="${esc(pick.url)}">${packSVG(pick)}</a><a class="mini__t" href="${esc(pick.url)}">${esc(pick.title)}<small>${money(pick.price)}</small></a><button type="button" class="iconbtn iconbtn--line" data-add="${pick.variant}" aria-label="Add ${esc(pick.title)}">+</button></div>`;
    }
  }
}

async function refreshCart() { try { renderCart(await api('/cart.js')); } catch (e) { /* offline: drawer keeps last state */ } }

async function addItems(items, btn, label) {
  btn?.classList.add('is-busy');
  try {
    await api('/cart/add.js', { items });
    lastAdded = byVariant.get(Number(items[items.length - 1].id)) || null;
    const cart = await api('/cart.js');
    renderCart(cart);
    if (label) toast(`${esc(label)} added · <a href="#" data-open="cart">View cart</a>`);
    else open('cart');
  } catch (e) {
    toast('Could not add that right now. Please try again.');
  } finally { btn?.classList.remove('is-busy'); }
}

function initCart() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); addItems([{ id: Number(a.dataset.add), quantity: 1 }], a); return; }
    const s = e.target.closest('[data-add-stack]');
    if (s) {
      e.preventDefault();
      const ids = s.dataset.addStack.split(',').filter(Boolean).map((id) => ({ id: Number(id), quantity: 1 }));
      addItems(ids, s).then(() => toast(`${esc(s.dataset.stackName || 'Stack')} added · discount applies at checkout`));
      return;
    }
    const q = e.target.closest('[data-qty]');
    if (q) {
      e.preventDefault();
      api('/cart/change.js', { id: q.dataset.qty, quantity: Math.max(0, Number(q.dataset.q)) }).then(renderCart).catch(() => {});
    }
  });
}

/* -------------------------------------------------------------- search --- */
function initSearch() {
  const input = $('[data-search-input]'), out = $('[data-search-results]');
  if (!input || !out) return;
  const initial = out.innerHTML;
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    const q = input.value.trim();
    if (!q) { out.innerHTML = initial; return; }
    t = setTimeout(async () => {
      try {
        const data = await api(`${B.routes?.search || '/search/suggest'}.json?q=${encodeURIComponent(q)}&resources[type]=product,collection,page&resources[limit]=5`);
        const r = data.resources?.results || {};
        const prods = (r.products || []).map((p) => {
          const meta = PRODUCTS[p.handle] || p;
          return `<a href="${esc(p.url)}" style="--pc:${esc(meta.colour || p.colour || '#403322')}"><i class="sres__dot"></i><span><b>${esc(p.title)}</b><small>${esc(meta.tagline || p.tagline || '')}</small></span></a>`;
        }).join('');
        const cols = (r.collections || []).map((c) => `<a href="${esc(c.url)}"><span><b>${esc(c.title)}</b><small>Concern</small></span></a>`).join('');
        const pages = (r.pages || []).map((c) => `<a href="${esc(c.url)}"><span><b>${esc(c.title)}</b><small>Ingredient</small></span></a>`).join('');
        out.innerHTML = (prods || cols || pages)
          ? `${prods ? `<p class="eyebrow">Products</p><div class="sres">${prods}</div>` : ''}${cols ? `<p class="eyebrow">Concerns</p><div class="sres">${cols}</div>` : ''}${pages ? `<p class="eyebrow">Ingredients</p><div class="sres">${pages}</div>` : ''}<a class="link-arrow" href="/search?q=${encodeURIComponent(q)}">See all results for “${esc(q)}”</a>`
          : `<p>No matches for “${esc(q)}”. Try a concern like <a class="link-arrow" href="/collections/sleep-stress">sleep</a> or an ingredient like <a class="link-arrow" href="/pages/ingredient/magnesium">magnesium</a>.</p>`;
      } catch (e) { /* keep current */ }
    }, 180);
  });
}

/* --------------------------------------------------------- hero slider --- */
function initSliders() {
  $$('[data-slider]').forEach((root) => {
    const track = $('[data-slides]', root), slides = $$('[data-slide]', root), dots = $$('[data-dots] > *', root);
    if (slides.length < 2) return;
    let i = 0, timer;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(${-i * 100}%)`;
      slides.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.setAttribute('aria-hidden', String(k !== i)); s.querySelectorAll('a').forEach((a) => { a.tabIndex = k === i ? 0 : -1; }); });
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    };
    const auto = () => { clearInterval(timer); if (root.dataset.autoplay !== 'false' && !STILL) timer = setInterval(() => { if (!document.hidden) go(i + 1); }, 5500); };
    $('[data-next]', root)?.addEventListener('click', () => { go(i + 1); auto(); });
    $('[data-prev]', root)?.addEventListener('click', () => { go(i - 1); auto(); });
    dots.forEach((d, k) => d.addEventListener('click', () => { go(k); auto(); }));
    let x0 = null, moved = false;
    track.addEventListener('pointerdown', (e) => { x0 = e.clientX; moved = false; });
    track.addEventListener('pointermove', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 8) moved = true; });
    track.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) { go(i + (e.clientX < x0 ? 1 : -1)); auto(); } x0 = null; });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', auto);
    go(0); auto();
  });
}

/* ---------------------------------------------------- rails + filters --- */
function initRails() {
  $$('[data-rail]').forEach((rail) => {
    const sec = rail.closest('section') || document;
    const next = $('[data-rail-next]', sec), prev = $('[data-rail-prev]', sec), dots = $('[data-rail-dots]', sec);
    next?.addEventListener('click', () => rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' }));
    prev?.addEventListener('click', () => rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: 'smooth' }));
    /* arrows grey out at the ends; dots show one dot per screenful */
    const sync = () => {
      const max = rail.scrollWidth - rail.clientWidth - 2;
      if (prev) prev.disabled = rail.scrollLeft <= 2;
      if (next) next.disabled = rail.scrollLeft >= max;
      if (!dots) return;
      const pages = Math.max(1, Math.ceil(rail.scrollWidth / rail.clientWidth - 0.05));
      if (dots.children.length !== pages) {
        dots.innerHTML = pages > 1 ? Array.from({ length: pages }, (_, k) => `<button type="button" aria-label="Page ${k + 1}"></button>`).join('') : '';
        [...dots.children].forEach((d, k) => d.addEventListener('click', () => rail.scrollTo({ left: Math.min(k * rail.clientWidth, max + 2), behavior: 'smooth' })));
      }
      const at = max <= 0 ? 0 : Math.round((rail.scrollLeft / (max + 2)) * (pages - 1));
      [...dots.children].forEach((d, k) => d.classList.toggle('is-on', k === at));
    };
    rail.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });
  $$('[data-filter-group]').forEach((group) => {
    const sec = group.closest('section') || document;
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      $$('[data-filter]', group).forEach((x) => x.classList.toggle('is-on', x === b));
      const f = b.dataset.filter, key = group.dataset.filterKey || 'concerns';
      let shown = 0;
      $$('.pcard', sec).forEach((c) => {
        const ok = f === 'all' || (c.dataset[key] || '').split(' ').includes(f);
        c.classList.toggle('is-filtered', !ok);
        if (ok) shown++;
      });
      const empty = $('[data-filter-empty]', sec); if (empty) empty.hidden = shown > 0;
      $('[data-rail]', sec)?.scrollTo({ left: 0, behavior: 'smooth' });
    });
  });
}

/* ---------------------------------------------------------------- tilt --- */
function initTilt() {
  if (!FINE || STILL) return;
  $$('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ty', `${(x * 7).toFixed(2)}deg`);
      card.style.setProperty('--tx', `${(-y * 7).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--tx', '0deg'); card.style.setProperty('--ty', '0deg'); });
  });
}

/* ------------------------------------------------------------ WebGL --- */
let glModule = null;
function gl() {
  if (!B.gl) return Promise.resolve(null);
  if (!glModule) glModule = import(B.assets.gl).catch((e) => { console.warn('[BRN] 3D unavailable, using drawn version', e); return null; });
  return glModule;
}
function whenNear(el, cb, margin = '300px') {
  if (!('IntersectionObserver' in window)) { cb(); return; }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); cb(); } }, { rootMargin: margin });
  io.observe(el);
}

/* ----------------------------------------------------------- Root Film --- */
function initRootFilm() {
  $$('[data-rootfilm]').forEach((sec) => {
    const play = () => {
      sec.classList.remove('is-played'); void sec.offsetWidth; sec.classList.add('is-played');
      sec.dispatchEvent(new CustomEvent('rf:play'));
    };
    if (STILL) { sec.classList.add('is-played'); return; }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe($('[data-rf-stage]', sec) || sec);
    $('[data-rf-replay]', sec)?.addEventListener('click', play);
    whenNear(sec, () => gl().then((m) => m?.rootFilm?.(sec)), '500px');
  });
}

/* -------------------------------------------------------- Story player --- */
function initStory() {
  $$('[data-story]').forEach((sec) => {
    const tabs = $$('[data-story-tab]', sec), stages = $$('[data-stage]', sec);
    const segsEl = $('[data-story-segs]', sec), toggle = $('[data-story-toggle]', sec);
    const cap = {
      step: $('[data-cap-step]', sec), name: $('[data-cap-name]', sec), aka: $('[data-cap-aka]', sec), dose: $('[data-cap-dose]', sec),
      does: $('[data-cap-does]', sec), low: $('[data-cap-low]', sec), lowWrap: $('[data-cap-low-wrap]', sec),
      link: $('[data-cap-link]', sec), add: $('[data-cap-add]', sec), title: $('[data-cap-title]', sec),
    };
    /* pacing: each ingredient gets STEP ms, the last one holds a little longer,
       then the next product enters straight away */
    const STEP = 1500, HOLD = 650;
    let pi = 0, step = -1, playing = !STILL, inView = false, timer = null;
    const nodes = () => $$('.stage__node', stages[pi]);

    const capEl = $('[data-story-cap]', sec);
    function caption() {
      const st = stages[pi];
      if (capEl && !STILL) { capEl.classList.remove('is-new'); void capEl.offsetWidth; capEl.classList.add('is-new'); }
      sec.style.setProperty('--cap-pc', getComputedStyle(st).getPropertyValue('--pc'));
      cap.add.dataset.capAdd = st.dataset.variant;
      cap.title.textContent = st.dataset.title;
      if (step < 0) {
        const n = nodes().length;
        cap.step.textContent = nodes()[0]?.dataset.kind === 'step' ? `How it works · ${n} steps` : `${n} key ingredients`;
        cap.name.textContent = st.dataset.title;
        cap.aka.textContent = st.dataset.tagline;
        cap.dose.hidden = true;
        cap.does.textContent = 'Press play, or tap any ingredient around the bottle to read about it.';
        cap.lowWrap.hidden = true;
        cap.link.href = st.dataset.url; cap.link.firstChild.textContent = 'See the product ';
        return;
      }
      const n = nodes()[step], d = n.dataset;
      cap.step.textContent = `${d.kind === 'step' ? 'Step' : 'Ingredient'} ${step + 1} of ${nodes().length} · ${st.dataset.title}`;
      cap.name.textContent = d.name;
      cap.aka.textContent = d.aka || '';
      cap.dose.hidden = d.kind !== 'ingredient';
      cap.dose.textContent = d.dose ? `Dose · ${d.dose}` : 'Dose · on the final label';
      cap.does.textContent = d.does;
      cap.low.textContent = d.low; cap.lowWrap.hidden = !d.low;
      cap.lowWrap.querySelector('dt').textContent = d.kind === 'step' ? 'Why it matters' : 'You may be low if';
      if (d.url) { cap.link.href = d.url; cap.link.firstChild.textContent = `About ${d.name} `; }
      else { cap.link.href = st.dataset.url; cap.link.firstChild.textContent = 'See the product '; }
    }
    function segs() {
      segsEl.innerHTML = nodes().map(() => '<span><i></i></span>').join('');
    }
    const dur = () => (step === nodes().length - 1 ? STEP + HOLD : STEP);
    function paint() {
      const st = stages[pi];
      st.classList.toggle('is-playing', step >= 0);
      nodes().forEach((n, k) => { n.classList.toggle('is-lit', k <= step); n.classList.toggle('is-cur', k === step); });
      $$('span', segsEl).forEach((s, k) => {
        s.classList.toggle('done', k < step);
        const i = s.firstChild; i.style.transition = 'none'; i.style.width = k < step ? '100%' : '0';
        if (k === step) { void i.offsetWidth; i.style.transition = playing ? `width ${dur()}ms linear` : 'none'; i.style.width = playing ? '100%' : '50%'; }
      });
      caption();
    }
    function show(i) {
      $$('.stage__node', stages[pi]).forEach((n) => n.classList.remove('is-lit', 'is-cur'));
      stages[pi].classList.remove('is-playing');
      pi = (i + stages.length) % stages.length; step = -1;
      tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === pi)));
      stages.forEach((s, k) => { s.hidden = k !== pi; s.classList.toggle('is-active', k === pi); });
      const st = stages[pi];
      if (!STILL) { st.classList.remove('is-entering'); void st.offsetWidth; st.classList.add('is-entering'); }
      /* keep the active tab visible in the scrolling tab strip, without moving the page */
      const tab = tabs[pi], strip = tab?.parentElement;
      if (strip && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: tab.offsetLeft - strip.clientWidth / 2 + tab.offsetWidth / 2, behavior: 'smooth' });
      segs(); paint();
    }
    function advance() {
      if (step < nodes().length - 1) step++;
      else { show(pi + 1); step = 0; }
      paint();
    }
    function setPlaying(v) {
      playing = v;
      toggle.setAttribute('aria-pressed', String(!v));
      toggle.querySelector('span').textContent = v ? 'Pause' : 'Play';
      toggle.querySelector('svg')?.replaceWith(document.createRange().createContextualFragment(v
        ? '<svg class="icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>'
        : '<svg class="icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor"/></svg>'));
      clearTimeout(timer);
      if (v) { if (step < 0 && inView) advance(); else paint(); schedule(); }
      else paint();
    }
    /* one timer per step, so the last ingredient can hold longer than the rest */
    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      timer = setTimeout(() => {
        if (inView && !document.hidden) advance();
        schedule();
      }, dur());
    }

    tabs.forEach((t, k) => t.addEventListener('click', () => { show(k); if (playing) { step = 0; paint(); schedule(); } }));
    sec.addEventListener('click', (e) => {
      const n = e.target.closest('.stage__node');
      if (!n) return;
      step = Number(n.dataset.step);
      setPlaying(false);
    });
    toggle.addEventListener('click', () => setPlaying(!playing));
    segs(); paint();
    if (STILL) { setPlaying(false); step = 0; paint(); return; }
    const io = new IntersectionObserver((es) => {
      inView = es[0].isIntersecting;
      if (inView && playing && step < 0) { advance(); setPlaying(true); }
    }, { threshold: 0.35 });
    io.observe($('.story__grid', sec) || sec);
  });
}

/* ------------------------------------------------------------ body map --- */
function initBodyMap() {
  $$('[data-bodymap]').forEach((sec) => {
    const select = (h) => {
      $$('.hot', sec).forEach((g) => g.classList.toggle('is-on', g.dataset.zone === h));
      $$('[data-zone-pick]', sec).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.zonePick === h)));
      $$('[data-zone-card]', sec).forEach((c) => {
        const on = c.dataset.zoneCard === h;
        c.hidden = !on;
        if (on && !STILL) { c.classList.remove('redraw-now'); void c.offsetWidth; c.classList.add('redraw-now'); }
      });
    };
    sec.addEventListener('click', (e) => {
      const z = e.target.closest('[data-zone], [data-zone-pick]');
      if (z) select(z.dataset.zone || z.dataset.zonePick);
    });
    sec.addEventListener('keydown', (e) => {
      const z = e.target.closest('[data-zone]');
      if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(z.dataset.zone); }
    });
    const first = $('[data-zone-pick]', sec)?.dataset.zonePick;
    const fromHash = location.hash.slice(1);
    select($(`[data-zone-card="${fromHash}"]`, sec) ? fromHash : first);
  });
}

/* ---------------------------------------------------------------- quiz --- */
function initQuiz() {
  $$('[data-quiz]').forEach((root) => {
    const steps = $$('[data-quiz-step]', root), bar = $('[data-quiz-bar]', root), out = $('[data-quiz-result]', root);
    let data = {};
    try { data = JSON.parse($('[data-quiz-products]', root).textContent); } catch (e) { data = {}; }
    let score = {}, answers = [], at = 0;
    const setBar = () => { bar.style.width = `${(at / steps.length) * 100}%`; };
    const go = (n) => { steps.forEach((s, k) => { s.hidden = k !== n; }); at = n; setBar(); };
    const restart = () => { score = {}; answers = []; out.hidden = true; $$('.quiz__opt', root).forEach((o) => o.classList.remove('is-picked')); go(0); };
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-quiz-restart]')) { restart(); return; }
      const o = e.target.closest('.quiz__opt');
      if (!o) return;
      $$('.quiz__opt', o.parentElement).forEach((x) => x.classList.toggle('is-picked', x === o));
      let s = {}; try { s = JSON.parse(o.dataset.score); } catch (err) { s = {}; }
      for (const [k, v] of Object.entries(s)) score[k] = (score[k] || 0) + v;
      answers[at] = o.textContent.trim();
      setTimeout(() => {
        if (at < steps.length - 1) { go(at + 1); return; }
        steps.forEach((x) => { x.hidden = true; }); at = steps.length; setBar();
        const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
        const top = data[ranked[0]?.[0]] || Object.values(data)[0];
        const second = data[ranked[1]?.[0]];
        const pm = PRODUCTS[ranked[0]?.[0]] || {};
        out.innerHTML = `<div class="qres" style="--pc:${esc(top.colour)}">
          <div class="qres__pack">${packSVG({ ...pm, colour: top.colour })}</div>
          <div class="qres__body">
            <p class="eyebrow">Your BRN</p>
            <p class="qres__t">${esc(top.title)}</p>
            <p class="qres__why">You chose “${esc(answers[0])}”${answers[1] ? ` and “${esc(answers[1])}”` : ''}. ${esc(top.made_for)}</p>
            <div class="qres__btns"><button type="button" class="btn btn--ink btn--sm" data-add="${top.variant}">Add to cart · ${esc(top.price)}</button><a class="btn btn--ghost btn--sm" href="${esc(top.url)}">See why it works</a></div>
            ${second ? `<p class="qres__also">Also worth a look: <a href="${esc(second.url)}">${esc(second.title)}</a>${top.stack ? `, or save with the <a href="/pages/stacks">${esc(top.stack)}</a>` : ''}.</p>` : ''}
            <button type="button" class="link-arrow" data-quiz-restart>Start again</button>
          </div></div>`;
        out.hidden = false;
      }, STILL ? 0 : 320);
    });
    go(0);
  });
}

/* ---------------------------------------------------------- Bare Proof --- */
function initProof() {
  $$('[data-proof]').forEach((form) => {
    let list = [];
    try { list = JSON.parse($('[data-proof-data]', form).textContent); } catch (e) { list = []; }
    const input = $('[data-proof-input]', form), out = $('[data-proof-out]', form);
    const check = (raw) => {
      const code = raw.trim().toUpperCase();
      if (!code) return;
      const b = list.find((x) => String(x.code).toUpperCase() === code);
      out.innerHTML = b
        ? `<div class="proof__res" style="--pc:${esc(b.colour)}"><b>${esc(b.code)} · <a href="${esc(b.url)}">${esc(b.product)}</a></b><span>${esc(b.mfg)} · ${esc(b.lab)}</span>${b.report ? `<a class="link-arrow" href="${esc(b.report)}" target="_blank" rel="noopener">Open the lab report (PDF)</a>` : ''}${b.sample ? '<small>This is a sample entry. Real batch reports are added as each batch is released.</small>' : ''}</div>`
        : `<div class="proof__res proof__res--miss">We couldn't find batch <b>${esc(code)}</b>. The batch number is printed near the expiry date on your bottle. Still stuck? Write to us and we'll send the report.</div>`;
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); check(input.value); });
    const pre = new URLSearchParams(location.search).get('batch');
    if (pre && input) { input.value = pre; check(pre); }
  });
}

/* ------------------------------------------------------------ tabsets --- */
function initTabsets() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-label-tab]');
    if (!t) return;
    const sec = t.closest('section');
    $$('[data-label-tab]', sec).forEach((x) => { const on = x === t; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', String(on)); });
    $$('[data-label-panel]', sec).forEach((p) => { p.hidden = p.dataset.labelPanel !== t.dataset.labelTab; });
  });
}

/* ----------------------------------------------------- media + reels --- */
function initMedia() {
  document.addEventListener('click', (e) => {
    const play = e.target.closest('[data-vplay]');
    if (play) {
      const box = play.closest('.vslot'), v = $('video', box);
      if (v) { v.controls = true; v.muted = false; v.play(); box.classList.add('is-playing'); }
      return;
    }
    const r = e.target.closest('[data-reel]');
    if (!r) return;
    const d = r.dataset, stage = $('[data-media-stage]'), side = $('[data-media-side]');
    const handle = Object.keys(PRODUCTS).find((h) => PRODUCTS[h].url === d.productUrl);
    const pm = PRODUCTS[handle] || {};
    stage.style.setProperty('--pc', d.colour);
    stage.innerHTML = d.video
      ? `<video src="${esc(d.video)}" autoplay muted playsinline loop controls></video>`
      : `<div class="vslot" style="--ar:9/16;--pc:${esc(d.colour)};height:100%;border-radius:0"><div class="vslot__ph"><span class="vslot__title">${esc(d.title)}</span><span class="vslot__play">▶</span><span class="vslot__label"><b>${esc(d.kind)} · ${esc(d.length)}</b><span>9:16 reel · uploads in admin</span></span></div></div>`;
    side.innerHTML = `<p class="eyebrow">${esc(d.kind)}</p><h3 class="h3">${esc(d.title)}</h3>
      <div style="--pc:${esc(d.colour)};background:var(--pc-soft);border-radius:16px;padding:14px;display:grid;justify-items:center">${packSVG({ ...pm, colour: d.colour })}</div>
      <p><b>${esc(d.productTitle)}</b><br><span style="color:var(--muted);font-size:14px">${esc(d.tagline)}</span></p>
      <button type="button" class="btn btn--ink" data-add="${esc(d.variant)}">Add to cart · ${esc(d.price)}</button>
      <a class="link-arrow" href="${esc(d.productUrl)}">See the product</a>`;
    open('media');
  });
}

/* -------------------------------------------------------- Root to bottle --- */
function initRootToBottle() {
  $$('[data-rtb]').forEach((sec) => {
    const path = $('[data-rtb-path]', sec);
    if (!path || STILL) return;
    const g = window.gsap, ST = window.ScrollTrigger;
    if (g && ST) {
      g.registerPlugin(ST);
      g.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: $('.rtb__track', sec), start: 'top 85%', end: 'bottom 45%', scrub: 0.6 } });
    }
  });
}

/* -------------------------------------------------------------- boot --- */
function boot() {
  initReveal();
  initAnnouncement();
  initPanels();
  initHeader();
  initCart();
  initSearch();
  initSliders();
  initRails();
  initTilt();
  initRootFilm();
  initStory();
  initBodyMap();
  initQuiz();
  initProof();
  initTabsets();
  initMedia();
  import('./brn-product.js').then((m) => m.init({ $, $$, B, STILL, money, esc, open, addItems, gl, whenNear, PRODUCTS })).catch(() => {});
  /* GSAP is loaded with defer; module scripts run after it, but guard anyway */
  if (window.gsap) initRootToBottle(); else window.addEventListener('load', initRootToBottle, { once: true });
}
boot();

export { packSVG };
