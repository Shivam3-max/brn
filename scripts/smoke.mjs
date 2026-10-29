/**
 * DOM smoke tests against the running harness.
 *
 *   npm run dev   (another terminal)   ->   npm run smoke
 *
 * Asserts on rendered markup, not status codes: LiquidJS fails silently and
 * returns a 200 page with whole sections missing.
 */
const BASE = process.env.BASE || 'http://localhost:3800';
let pass = 0;
const fails = [];
const count = (html, re) => (html.match(re) || []).length;
const gte = (n) => (g) => g >= n;
function check(label, got, want) {
  const ok = typeof want === 'function' ? want(got) : got === want;
  if (ok) pass++; else fails.push(`${label}: got ${got}${typeof want === 'function' ? '' : `, want ${want}`}`);
}
async function get(p, status = 200) {
  const r = await fetch(BASE + p);
  check(`${p} · HTTP`, r.status, status);
  return r.text();
}

function chrome(html, where) {
  check(`${where} · no render error`, count(html, /Render error/g), 0);
  check(`${where} · no raw liquid`, count(html, /\{%|\{\{ /g), 0);
  check(`${where} · no missing section`, count(html, /section .+ missing/g), 0);
  check(`${where} · no NaN/undefined`, count(html, />[^<]*(NaN|undefined|\[object Object\])[^<]*</g), 0);
  check(`${where} · announcement messages`, count(html, /class="ann__msg/g), 3);
  check(`${where} · header`, count(html, /class="hdr"/g), 1);
  check(`${where} · range tabs (desktop + phone)`, count(html, /class="tabs__t/g), 6);
  check(`${where} · one active tab per bar`, count(html, /class="tabs__t is-on"/g), 2);
  check(`${where} · centred menu links`, count(html, /class="hdr__link/g), 10);
  check(`${where} · concern mega items`, count(html, /class="mega__item/g), 7);
  check(`${where} · footer`, count(html, /class="ftr"/g), 1);
  check(`${where} · cart drawer`, count(html, /data-panel="cart"/g), 1);
  check(`${where} · search overlay`, count(html, /data-panel="search"/g), 1);
  check(`${where} · product lookup json`, count(html, /id="brn-products"/g), 1);
  check(`${where} · phone bottom bar`, count(html, /class="mbar__i"/g), 4);
  check(`${where} · disclaimer`, count(html, /not intended to diagnose/g), gte(1));
}

const run = async () => {
  /* ---------------- home ---------------- */
  {
    const h = await get('/');
    chrome(h, 'home');
    check('home · 4 framed banners', count(h, /class="hero__slide/g), 4);
    check('home · banner size label', count(h, /1500 × 650 px/g), 4);
    check('home · no concern tiles', count(h, /class="ctile /g), 0);
    const order = [...h.matchAll(/id="shopify-section-([^"]+)"/g)].map((m) => m[1]).filter((k) => !['announcement-bar', 'header', 'footer'].includes(k));
    check('home · shop the range is 2nd section', order[1], 'range');
    check('home · section order', order.join(','), 'hero,range,niche_sports,goals,niche_daily,niche_ayurveda,reels,usp,quality,stacks,insta,faq');
    check('home · no root film / story / body map / quiz', count(h, /data-rf-bottle=|data-stage="|data-zone-card=|data-quiz-step=/g), 0);
    check('home · range cards', count(h, /class="pcard /g), gte(8));
    check('home · 3 niche rows', count(h, /<section class="niche niche--/g), 3);
    check('home · niche product cards (5 + 4 + 4)', count(h, /<article class="rcard"/g), 13);
    check('home · choose-options buttons', count(h, /class="rbtn" href="\/products\//g), 13);
    check('home · niche words', count(h, /class="niche__word">(Sports|Daily|Ayurveda)</g), 3);
    check('home · niche shop buttons', count(h, /class="niche__cta" href="\/collections\/(sports-nutrition|daily-wellness|ayurveda)"/g), 3);
    check('home · goals', count(h, /<a class="goal"/g), 6);
    check('home · why BRN items', count(h, /class="usp__item"/g), 4);
    check('home · quality band', count(h, /class="qband__h"/g), 1);
    check('home · reels', count(h, /data-reel/g), 8);
    check('home · stacks', count(h, /class="stack"/g), 3);
    check('home · instagram tiles', count(h, /class="insta__tile"/g), 6);
    check('home · faq', count(h, /<details class="qa/g), 8);
  }

  /* ---------------- products ---------------- */
  const handles = ['multivitamin-multimineral', 'liver-detox', 'calcium-magnesium-d3', 'magnesium-tulsi', 'creatine', 'mass-gainer', 'gut-health', 'joint-support'];
  for (const handle of handles) {
    const h = await get(`/products/${handle}`);
    chrome(h, handle);
    check(`${handle} · pack ladder`, count(h, /class="rung/g), gte(2));
    check(`${handle} · per-day price`, count(h, /a day</g), gte(1));
    check(`${handle} · 3D view`, count(h, /data-bottle-3d/g), 1);
    check(`${handle} · story stage`, count(h, /data-stage="/g), 1);
    check(`${handle} · signs`, count(h, /class="sign /g), 4);
    check(`${handle} · clock slot lit`, count(h, /clock__slot is-on/g), gte(1));
    check(`${handle} · timeline`, count(h, /class="tline__item"/g), 4);
    check(`${handle} · facts rows`, count(h, /<td class="num">/g), gte(1));
    check(`${handle} · who for + skip`, count(h, /class="who__col/g), 2);
    check(`${handle} · sticky add`, count(h, /data-sticky-atc/g), 1);
    check(`${handle} · faq`, count(h, /<details class="qa/g), 3);
    check(`${handle} · json-ld`, count(h, /"@type": "Product"/g), 1);
  }
  {
    const h = await get('/products/creatine');
    check('creatine · how-it-works steps', count(h, /data-kind="step"/g), 4);
  }

  /* ---------------- collections ---------------- */
  for (const c of ['daily-energy-immunity', 'liver-care', 'gut-digestion', 'sleep-stress', 'bone-strength', 'joint-comfort', 'strength-muscle']) {
    const h = await get(`/collections/${c}`);
    chrome(h, c);
    check(`${c} · concern hero`, count(h, /data-capsules/g), 1);
    check(`${c} · self-check`, count(h, /data-selfcheck /g), 1);
    check(`${c} · signs to tick`, count(h, /class="tick"/g), gte(4));
    check(`${c} · products`, count(h, /class="pcard /g), gte(2));
    check(`${c} · stack`, count(h, /class="stack"/g), 1);
  }
  for (const c of ['all', 'for-gym', 'for-women', 'ayurveda', 'sports-nutrition']) {
    const h = await get(`/collections/${c}`);
    chrome(h, c);
    check(`${c} · plain hero`, count(h, /chero--plain/g), 1);
    check(`${c} · products`, count(h, /class="pcard /g), gte(3));
  }
  {
    const h = await get('/collections/ayurveda');
    check('ayurveda tab active', count(h, /class="tabs__t is-on" href="\/collections\/ayurveda"/g), 2);
  }

  /* ---------------- pages ---------------- */
  const pages = {
    '/pages/find-your-brn': [[/data-quiz-step=/g, 3]],
    '/pages/stacks': [[/class="bpick"/g, 8], [/class="stack"/g, 3]],
    '/pages/bare-proof': [[/data-proof /g, gte(2)], [/class="test /g, 4]],
    '/pages/our-story': [[/class="bword /g, 3], [/class="rtb__step /g, 5]],
    '/pages/ingredients': [[/class="icard /g, 31]],
    '/pages/ingredient/magnesium': [[/class="pcard /g, 2], [/class="ing__dl"/g, 1]],
    '/pages/faq': [[/<details class="qa/g, 8]],
    '/pages/contact': [[/name="contact\[email\]"/g, 2]],
    '/pages/body-map': [[/data-zone-card=/g, 7]],
    '/blogs/learn': [[/<article class="acard /g, 6]],
    '/blogs/learn/what-your-liver-does-all-day': [[/class="rte"/g, 1], [/class="pcard /g, 1]],
    '/cart': [[/class="cartp/g, gte(1)]],
    '/search?q=magnesium': [[/class="pcard /g, gte(2)]],
  };
  for (const [p, checks] of Object.entries(pages)) {
    const h = await get(p);
    chrome(h, p);
    for (const [re, want] of checks) check(`${p} · ${re.source}`, count(h, re), want);
  }
  {
    const h = await get('/nowhere', 404);
    check('404 · themed page', count(h, /class="sec nf"/g), 1);
  }

  /* ---------------- cart API ---------------- */
  await fetch(`${BASE}/cart/clear.js`, { method: 'POST' });
  const add = await fetch(`${BASE}/cart/add.js`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ id: 100301, quantity: 2 }, { id: 100401, quantity: 1 }] }) });
  check('cart · add.js', add.status, 200);
  const cart = await (await fetch(`${BASE}/cart.js`)).json();
  check('cart · item count', cart.item_count, 3);
  check('cart · total (2×649 + 899)', cart.total_price, (2 * 649 + 899) * 100);
  await fetch(`${BASE}/cart/clear.js`, { method: 'POST' });

  const s = await (await fetch(`${BASE}/search/suggest.json?q=tulsi`)).json();
  check('predictive search · product', s.resources.results.products.length, gte(1));
  check('predictive search · ingredient page', s.resources.results.pages.length, gte(1));

  console.log(`\n  ${pass} passed · ${fails.length} failed`);
  if (fails.length) { console.log(fails.map((f) => `  ✗ ${f}`).join('\n')); process.exit(1); }
};
run().catch((e) => { console.error(e); process.exit(1); });
