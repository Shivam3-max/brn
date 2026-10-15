/* ==========================================================================
   BRN · product page, concern page and page tools.
   Imported by theme.js, which passes in its shared helpers.
   ========================================================================== */
let H;

/* ------------------------------------------------------------ product --- */
function product() {
  const { $, $$ } = H;
  const pdp = $('[data-pdp]');
  if (!pdp) return;

  /* gallery views: pack · photos · 3D · film */
  const gallery = $('[data-gallery]', pdp);
  const btn3d = $('[data-view-btn="3d"]', gallery);
  if (!H.B.gl && btn3d) btn3d.hidden = true;
  gallery.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view-btn]');
    if (!b) return;
    const v = b.dataset.viewBtn;
    $$('[data-view-btn]', gallery).forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', String(on)); });
    $$('[data-view]', gallery).forEach((x) => { x.hidden = x.dataset.view !== v; x.classList.toggle('is-on', x.dataset.view === v); });
    if (v === '3d') {
      const host = $('[data-bottle-3d]', gallery);
      H.gl().then((m) => m?.bottleViewer?.(host, { ...host.dataset }));
    }
  });

  /* pack ladder */
  const form = $('form', pdp);
  const idInput = $('[data-variant-input]', form);
  const price = $('[data-price]', pdp), compare = $('[data-compare]', pdp), perday = $('[data-perday]', pdp);
  const satc = $('[data-sticky-atc]'), satcPrice = $('[data-satc-price]'), satcVar = $('[data-satc-variant]');
  form.addEventListener('change', (e) => {
    const r = e.target.closest('input[name="pack"]');
    if (!r) return;
    $$('.rung', form).forEach((x) => x.classList.toggle('is-on', x.contains(r)));
    idInput.value = r.value;
    price.textContent = r.dataset.price;
    if (compare) { compare.textContent = r.dataset.compare; compare.hidden = !r.dataset.compare; }
    perday.textContent = `${r.dataset.perday} a day`;
    if (satcPrice) satcPrice.textContent = r.dataset.price;
    if (satcVar) satcVar.firstChild.textContent = `${r.closest('.rung').querySelector('.rung__t').firstChild.textContent.trim()} · `;
    const url = new URL(location.href); url.searchParams.set('variant', r.value); history.replaceState(null, '', url);
  });

  /* quantity */
  const qty = $('[data-qty-input]', form);
  $('[data-qty-box]', form)?.addEventListener('click', (e) => {
    const s = e.target.closest('[data-step]');
    if (!s) return;
    qty.value = Math.max(1, Math.min(10, Number(qty.value || 1) + Number(s.dataset.step)));
  });

  const add = (btn, thenCheckout) => H.addItems([{ id: Number(idInput.value), quantity: Number(qty.value || 1) }], btn).then(() => { if (thenCheckout) location.href = '/checkout'; });
  form.addEventListener('submit', (e) => { e.preventDefault(); add($('[data-add-main]', form)); });
  $('[data-buy-now]', form)?.addEventListener('click', (e) => add(e.currentTarget, true));
  $('[data-satc-add]')?.addEventListener('click', (e) => add(e.currentTarget));

  /* sticky add-to-cart: shows once the buy button scrolls away */
  if (satc && 'IntersectionObserver' in window) {
    satc.hidden = false;
    const target = $('[data-add-main]', form);
    new IntersectionObserver(([en]) => {
      satc.classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0);
    }).observe(target);
  }
}

/* ------------------------------------------------------ concern pages --- */
function concern() {
  const { $, $$ } = H;
  const field = $('[data-capsules]');
  if (field && H.B.gl) H.whenNear(field, () => H.gl().then((m) => m?.capsuleField?.(field, { colour: field.dataset.colour })));

  $$('[data-selfcheck]').forEach((box) => {
    const out = $('[data-selfcheck-out]', box);
    const all = $$('input[type="checkbox"]', box);
    box.addEventListener('change', () => {
      const n = all.filter((c) => c.checked).length;
      if (!n) { out.innerHTML = '<p>Tick one or more to see what may help.</p>'; return; }
      const d = box.dataset;
      const lead = n >= 2
        ? `<b>${n} of ${all.length} signs.</b> That's a common pattern, and it's exactly what <b>${H.esc(d.lead)}</b> is made for.`
        : `<b>1 sign.</b> Worth keeping an eye on. <b>${H.esc(d.lead)}</b> is made for this.`;
      out.innerHTML = `<p>${lead}</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn--ink btn--sm" data-add="${H.esc(d.variant)}">Add to cart</button><a class="btn btn--ghost btn--sm" href="${H.esc(d.url)}">See why it works</a></div><p class="note" style="margin:0">Signs can have many causes. If they persist, talk to your doctor.</p>`;
    });
  });

  $('[data-filter-reset]')?.addEventListener('click', () => $('[data-filter="all"]')?.click());
}

/* ------------------------------------------------------- stack builder --- */
function builder() {
  const { $, $$, money, esc } = H;
  $$('[data-builder]').forEach((root) => {
    const tiers = (root.dataset.tiers || '2:5,3:10,4:15').split(',').map((t) => t.split(':').map(Number)).sort((a, b) => a[0] - b[0]);
    const boxes = $$('input[type="checkbox"]', root);
    const tray = $('[data-builder-tray]', root), tierEl = $('[data-builder-tiers]', root);
    const total = $('[data-builder-total]', root), was = $('[data-builder-was]', root), addBtn = $('[data-builder-add]', root);
    tierEl.innerHTML = tiers.map(([n, p]) => `<li data-n="${n}"><b>${p}%</b>${n}${n === tiers[tiers.length - 1][0] ? '+' : ''} products</li>`).join('');
    const update = () => {
      const picked = boxes.filter((b) => b.checked);
      const sum = picked.reduce((s, b) => s + Number(b.dataset.price), 0);
      const tier = tiers.filter(([n]) => picked.length >= n).pop();
      const off = tier ? Math.round(sum * tier[1] / 100) : 0;
      tray.innerHTML = picked.length ? picked.map((b) => `<span class="chip is-on" style="--pc:${getComputedStyle(b.closest('.bpick')).getPropertyValue('--pc')}">${esc(b.dataset.title)}</span>`).join('') : '<p class="builder__empty">Pick two or more to start saving.</p>';
      $$('li', tierEl).forEach((li) => li.classList.toggle('is-on', tier && Number(li.dataset.n) === tier[0]));
      total.textContent = money(sum - off);
      was.textContent = off ? money(sum) : '';
      addBtn.disabled = picked.length < 1;
      addBtn.textContent = picked.length ? `Add ${picked.length} to cart${off ? ` · save ${money(off)}` : ''}` : 'Add stack to cart';
    };
    root.addEventListener('change', update);
    addBtn.addEventListener('click', () => {
      const items = boxes.filter((b) => b.checked).map((b) => ({ id: Number(b.value), quantity: 1 }));
      if (items.length) H.addItems(items, addBtn);
    });
    update();
  });
}

/* ---------------------------------------------------- library + blog --- */
function filters() {
  const { $, $$ } = H;
  const lib = $('[data-ilib]');
  if (lib) {
    let kind = 'all', q = '';
    const apply = () => {
      let shown = 0;
      $$('.icard', lib).forEach((c) => {
        const ok = (kind === 'all' || c.dataset.kind === kind) && (!q || c.dataset.name.includes(q));
        c.hidden = !ok; if (ok) shown++;
      });
      $('[data-ilib-empty]', lib).hidden = shown > 0;
    };
    $('[data-ilib-filter]', lib).addEventListener('click', (e) => {
      const b = e.target.closest('[data-kind]'); if (!b) return;
      kind = b.dataset.kind;
      $$('[data-kind]', $('[data-ilib-filter]', lib)).forEach((x) => x.classList.toggle('is-on', x === b));
      apply();
    });
    $('[data-ilib-q]', lib).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); apply(); });
  }
  const blog = $('[data-blog]');
  if (blog) {
    $('[data-blog-filter]', blog).addEventListener('click', (e) => {
      const b = e.target.closest('[data-tag]'); if (!b) return;
      $$('[data-tag]', blog).forEach((x) => x.classList.toggle('is-on', x === b));
      $$('[data-tags]', blog).forEach((a) => { a.hidden = b.dataset.tag !== 'all' && !a.dataset.tags.split(' ').includes(b.dataset.tag); });
    });
  }
  /* cart page qty buttons reload so totals stay server-rendered */
  document.addEventListener('click', (e) => {
    const r = e.target.closest('[data-reload]');
    if (r) setTimeout(() => location.reload(), 350);
  });
}

export function init(helpers) {
  H = helpers;
  product();
  concern();
  builder();
  filters();
}
