/**
 * Local Shopify emulator for the BRN theme.
 *
 * Express + LiquidJS standing in for Shopify's object graph (products,
 * metafields, metaobjects, blogs), its filters and tags, and the /cart/*.js
 * AJAX API — so the theme can be built and reviewed with no store attached.
 *
 *   npm run dev   ->  http://localhost:3800
 *
 * Debug flags on any URL:
 *   ?only=<section>   render one homepage/product section alone
 *   ?still=1          final animation state, no motion (for screenshots)
 *   ?webgl=off        force the drawn fallbacks instead of three.js
 *
 * Two LiquidJS traps are handled deliberately (both fail silently):
 *   1. custom block tags use generator `*render`, never `async render`;
 *   2. `{% render %}` isolates scope, so Shopify globals go in renderOptions.globals.
 */
import express from 'express';
import { Liquid } from 'liquidjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as CAT from '../data/catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const THEME = path.join(ROOT, 'theme');
const PORT = process.env.PORT || 3800;

/* ========================================================================== *
 * 1. Object graph — shaped exactly like Shopify's, so the Liquid is portable
 * ========================================================================== */
const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const money = (paise) => `₹${INR.format(Math.round(Number(paise || 0) / 100))}`;
const field = (value) => ({ value });
/** A metaobject: every field is {value}, identity under `system`. */
const mo = (type, handle, fields, url) => {
  const o = { system: { handle, type, url: url || null } };
  for (const [k, v] of Object.entries(fields)) o[k] = field(v);
  return o;
};

/* --- products --- */
const products = CAT.products.map((p, i) => {
  const id = 1000 + i;
  const variants = p.variants.map((v, k) => ({
    id: id * 100 + k + 1,
    title: v.title,
    option1: v.title,
    price: v.price * 100,
    compare_at_price: v.compare * 100,
    available: true,
    url: `/products/${p.handle}?variant=${id * 100 + k + 1}`,
    metafields: { brn: { days: field(v.days), packs: field(v.packs), badge: field(v.badge || null) } },
  }));
  return {
    id, handle: p.handle, title: p.title, vendor: 'BRN', type: p.format,
    url: `/products/${p.handle}`,
    available: true,
    description: `<p>${p.tagline}. ${p.made_for}</p>`,
    tags: [p.concern, p.format.toLowerCase()],
    variants,
    first_available_variant: variants[0],
    selected_or_first_available_variant: variants[0],
    has_only_default_variant: variants.length === 1,
    price: variants[0].price,
    price_min: Math.min(...variants.map((v) => v.price)),
    compare_at_price: variants[0].compare_at_price,
    images: [], media: [], featured_image: null, featured_media: null,
    options_with_values: [{ name: 'Pack', values: variants.map((v) => v.title) }],
    _src: p,
  };
});
const productByHandle = new Map(products.map((p) => [p.handle, p]));
const P = (h) => productByHandle.get(h);
const variantById = new Map();
for (const p of products) for (const v of p.variants) variantById.set(v.id, { product: p, variant: v });

/* --- metaobjects --- */
const metaobjects = {};
function register(type, list) {
  metaobjects[type] = { values: list };
  for (const o of list) metaobjects[type][o.system.handle] = o;
}

register('concern', CAT.concerns.map((c) => mo('concern', c.handle, {
  title: c.title, short: c.short, colour: c.colour, icon: c.icon,
  body_x: c.body_x, body_y: c.body_y, feel: c.feel, hook: c.hook, explain: c.explain,
  signs: c.signs, products: c.products.map(P), stack: null, intro_video: null,
}, `/collections/${c.handle}`)));

register('ingredient', CAT.ingredients.map((g) => mo('ingredient', g.handle, {
  name: g.name, aka: g.aka, kind: g.kind, art: g.art, symbol: g.symbol,
  does: g.does, low: g.low, story: g.story, illustration: null,
  products: CAT.products.filter((p) => p.formula.some(([h]) => h === g.handle)).map((p) => P(p.handle)),
}, `/pages/ingredient/${g.handle}`)));

register('stack', CAT.stacks.map((s) => mo('stack', s.handle, {
  title: s.title, colour: s.colour, discount: s.discount, line: s.line, products: s.products.map(P),
})));

register('reel', CAT.reels.map((r, i) => mo('reel', `reel-${i + 1}`, {
  title: r.title, kind: r.kind, length: r.length, product: P(r.product), video: null, poster: null,
})));

register('expert_answer', CAT.experts.map((e, i) => mo('expert_answer', `expert-${i + 1}`, {
  question: e.q, answer: e.a, product: P(e.product), who: e.who, video: null,
})));

register('batch', CAT.batches.map((b) => mo('batch', b.code.toLowerCase(), {
  code: b.code, product: P(b.product), mfg: b.mfg, lab: b.lab, report: null, sample: b.sample,
})));

register('quiz_question', CAT.quiz.map((q) => mo('quiz_question', q.key, {
  question: q.q, options: q.options.map(([label, score]) => ({ label, score })),
})));

/* concern -> stack reference, after both exist */
for (const c of CAT.concerns) metaobjects.concern[c.handle].stack.value = metaobjects.stack[c.stack];

/* --- product metafields (namespace `brn`) --- */
for (const p of products) {
  const s = p._src;
  const reels = metaobjects.reel.values.filter((r) => r.product.value === p);
  p.metafields = {
    brn: {
      colour: field(s.colour), short: field(s.short), tagline: field(s.tagline), made_for: field(s.made_for),
      title_note: field(s.title_note || null),
      concern: field(metaobjects.concern[s.concern]),
      also_concerns: field(CAT.concerns.filter((c) => c.handle !== s.concern && c.products.includes(s.handle)).map((c) => metaobjects.concern[c.handle])),
      format: field(s.format), pack: field(s.pack), count: field(s.count), serving: field(s.serving),
      formula: field(s.formula.map(([i, dose]) => ({ i, dose: dose || '' }))),
      story: field(s.story ? s.story.map(([art, title, does, low]) => ({ art, title, does, low })) : null),
      who_for: field(s.who_for), who_skip: field(s.who_skip),
      how: field(s.how), timeline: field(s.timeline.map(([w, t]) => ({ w, t }))),
      not_inside: field(s.not_inside), signs: field(s.signs.map((k) => [k, CAT.signText[k] || k])),
      faq: field(s.faq.map(([q, a]) => ({ q, a }))),
      pairs: field(s.pairs.map(P)),
      reels: field(reels),
      story_video: field(null), howto_video: field(null), label_image: field(null),
    },
    reviews: { rating: field(null), rating_count: field(null) },
  };
  delete p._src;
}

/* --- collections --- */
const collections = {};
const mkCollection = (handle, title, list, extra = {}) => {
  collections[handle] = {
    handle, title, url: `/collections/${handle}`, products: list, products_count: list.length,
    all_products_count: list.length, description: extra.description || '',
    metafields: { brn: { line: field(extra.line || null), kind: field(extra.kind || 'concern') } },
    image: null,
  };
};
for (const c of CAT.concerns) mkCollection(c.handle, c.title, c.products.map(P), { description: c.explain, line: c.hook, kind: 'concern' });
for (const a of CAT.audiences) mkCollection(a.handle, a.title, a.products.map(P), { description: a.line, line: a.line, kind: 'audience' });
for (const r of CAT.ranges) mkCollection(r.handle, r.title, r.products.map(P), { description: r.line, line: r.line, kind: 'range' });
mkCollection('all', 'Shop all', products, { description: 'The full BRN launch range: eight formulas, seven concerns.', line: 'Every formula, one shelf.', kind: 'all' });

/* --- blog --- */
const articles = CAT.articles.map((a, i) => ({
  id: i + 1, handle: a.handle, title: a.title, url: `/blogs/learn/${a.handle}`,
  excerpt: a.excerpt, content: a.body.map((b) => `<p>${b}</p>`).join(''),
  tags: [a.concern], published_at: '2026-10-15', author: 'BRN nutrition team', image: null,
  metafields: { brn: { read_minutes: field(a.read), product: field(P(a.product)), concern: field(metaobjects.concern[a.concern]) } },
}));
const blogs = { learn: { handle: 'learn', title: 'Learn', url: '/blogs/learn', articles, articles_count: articles.length } };

/* ========================================================================== *
 * 2. Cart
 * ========================================================================== */
const cart = { items: [], item_count: 0, total_price: 0, original_total_price: 0, total_discount: 0, currency: 'INR', note: '' };
function recalc() {
  cart.items.forEach((i) => { i.line_price = i.price * i.quantity; i.final_line_price = i.line_price; });
  cart.item_count = cart.items.reduce((n, i) => n + i.quantity, 0);
  cart.total_price = cart.items.reduce((n, i) => n + i.line_price, 0);
  cart.original_total_price = cart.items.reduce((n, i) => n + i.original_price * i.quantity, 0);
  cart.total_discount = Math.max(0, cart.original_total_price - cart.total_price);
}
function addToCart(id, quantity = 1) {
  const rec = variantById.get(Number(id));
  if (!rec) return null;
  const { product, variant } = rec;
  let line = cart.items.find((i) => i.variant_id === variant.id);
  if (line) line.quantity += quantity;
  else {
    line = {
      key: `${variant.id}:brn`, id: variant.id, variant_id: variant.id, product_id: product.id,
      handle: product.handle, product_title: product.title, variant_title: variant.title,
      title: `${product.title} · ${variant.title}`, quantity, price: variant.price,
      original_price: variant.compare_at_price || variant.price, url: product.url, image: null,
      colour: product.metafields.brn.colour.value, pack: product.metafields.brn.pack.value, short: product.metafields.brn.short.value,
    };
    Object.defineProperty(line, 'product', { value: product, enumerable: false });
    cart.items.push(line);
  }
  recalc();
  return line;
}
function changeCart(key, quantity) {
  const i = cart.items.findIndex((x) => x.key === key || String(x.variant_id) === String(key));
  if (i < 0) return;
  if (quantity <= 0) cart.items.splice(i, 1); else cart.items[i].quantity = quantity;
  recalc();
}

/* ========================================================================== *
 * 3. Liquid engine
 * ========================================================================== */
const engine = new Liquid({
  root: ['sections', 'snippets', 'templates', 'layout'].map((d) => path.join(THEME, d)),
  extname: '.liquid', cache: false, jsTruthy: true, strictFilters: false, strictVariables: false,
});

const F = engine.registerFilter.bind(engine);
const handleize = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
F('asset_url', (v) => `/assets/${v}`);
F('file_url', (v) => `/assets/${v}`);
F('stylesheet_tag', (v) => `<link rel="stylesheet" href="${v}">`);
F('script_tag', (v) => `<script src="${v}" defer></script>`);
F('image_url', (img) => (typeof img === 'string' ? img : img?.src || ''));
F('image_tag', (url, ...a) => `<img src="${url}" alt="" loading="lazy">`);
F('video_tag', () => '');
F('money', money);
F('money_without_trailing_zeros', money);
F('money_with_currency', (v) => `${money(v)} INR`);
F('handle', handleize);
F('handleize', handleize);
F('json', (v) => JSON.stringify(v, (k, val) => (k === 'products' || k === 'pairs' || k === 'reels' ? undefined : val)));
F('t', (v) => String(v));
F('pluralize', (n, one, many) => (Number(n) === 1 ? one : many));
F('strip_html', (s) => String(s || '').replace(/<[^>]*>/g, ''));
F('escape_once', (s) => String(s || '').replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
F('date', (v, fmt) => {
  const d = v === 'now' || v === 'today' ? new Date() : new Date(v);
  if (isNaN(d)) return String(v || '');
  if (!fmt) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return fmt.replace('%Y', d.getFullYear()).replace('%b', M[d.getMonth()]).replace('%d', String(d.getDate()).padStart(2, '0')).replace('%-d', d.getDate());
});
F('within', (url) => url);
F('default_errors', () => '');
F('placeholder_svg_tag', () => '');
F('payment_type_svg_tag', () => '');
F('highlight', (s) => s);
F('metafield_tag', (m) => (m && m.value != null ? m.value : ''));

const skipBlock = (name) => engine.registerTag(name, {
  parse(t, remain) { while (remain.length) { const x = remain.shift(); if (x.name === `end${name}`) return; } },
  render() { return ''; },
});
['schema', 'javascript', 'stylesheet'].forEach(skipBlock);

const wrapTag = (name, open, close) => engine.registerTag(name, {
  parse(token, remain) {
    this.args = token.args; this.tpls = [];
    const s = this.liquid.parser.parseStream(remain);
    s.on(`tag:end${name}`, function () { this.stop(); }).on('template', (t) => this.tpls.push(t))
      .on('end', () => { throw new Error(`{% ${name} %} not closed`); });
    s.start();
  },
  *render(ctx, emitter) {
    emitter.write(open(this.args));
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    emitter.write(close);
  },
});
wrapTag('style', () => '<style>', '</style>');
wrapTag('form', (args) => {
  const kind = (args.split(',')[0] || '').trim().replace(/^['"]|['"]$/g, '');
  const action = { product: '/cart/add', cart: '/cart', customer: '/contact', newsletter: '/contact', contact: '/contact' }[kind] || '/';
  const cls = (args.match(/class:\s*['"]([^'"]+)['"]/) || [])[1] || '';
  return `<form method="post" action="${action}" accept-charset="UTF-8" class="form form--${kind} ${cls}" data-form="${kind}">`;
}, '</form>');

engine.registerTag('paginate', {
  parse(token, remain) {
    this.args = token.args; this.tpls = [];
    const s = this.liquid.parser.parseStream(remain);
    s.on('tag:endpaginate', function () { this.stop(); }).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error('paginate not closed'); });
    s.start();
  },
  *render(ctx, emitter) {
    ctx.push({ paginate: { pages: 1, current_page: 1, parts: [] } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
  },
});

/** Section settings + preset blocks read from the {% schema %} block. */
function buildSection(name, src) {
  const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  const section = { id: name, settings: {}, blocks: [] };
  if (!m) return section;
  let schema;
  try { schema = JSON.parse(m[1]); } catch (e) { console.warn(`  ! ${name}: schema JSON — ${e.message}`); return section; }
  const defaults = (list) => Object.fromEntries((list || []).filter((s) => s.id).map((s) => [s.id, s.default !== undefined ? s.default : (s.type === 'checkbox' ? false : '')]));
  Object.assign(section.settings, defaults(schema.settings));
  const preset = (schema.presets || [])[0];
  if (preset) {
    Object.assign(section.settings, preset.settings || {});
    section.blocks = (preset.blocks || []).map((b, i) => ({
      id: `${name}-${i}`, type: b.type, shopify_attributes: '',
      settings: { ...defaults((schema.blocks || []).find((x) => x.type === b.type)?.settings), ...(b.settings || {}) },
    }));
  }
  section._schema = schema;
  return section;
}

async function renderSection(key, def, globals) {
  const file = path.join(THEME, 'sections', `${def.type}.liquid`);
  if (!fs.existsSync(file)) return `<!-- section ${def.type} missing -->`;
  const src = fs.readFileSync(file, 'utf8');
  const section = buildSection(def.type, src);
  if (def.settings) Object.assign(section.settings, def.settings);
  if (def.blocks) {
    const order = def.block_order || Object.keys(def.blocks);
    const blockDefs = section._schema?.blocks || [];
    section.blocks = order.map((bk, i) => {
      const b = def.blocks[bk];
      const d = Object.fromEntries((blockDefs.find((x) => x.type === b.type)?.settings || []).filter((s) => s.id).map((s) => [s.id, s.default ?? '']));
      return { id: `${key}-${i}`, type: b.type, settings: { ...d, ...(b.settings || {}) }, shopify_attributes: '' };
    });
  }
  /* resource pickers store a handle in JSON; Shopify hands Liquid the object */
  const resolve = (defs, target) => {
    for (const d of defs || []) {
      const v = target[d.id];
      if (typeof v !== 'string' || !v) continue;
      if (d.type === 'collection') target[d.id] = collections[v] || null;
      if (d.type === 'product') target[d.id] = P(v) || null;
    }
  };
  resolve(section._schema?.settings, section.settings);
  for (const b of section.blocks) resolve((section._schema?.blocks || []).find((x) => x.type === b.type)?.settings, b.settings);
  delete section._schema;
  section.id = key;
  const html = await engine.parseAndRender(src, { section }, { globals });
  return `<div id="shopify-section-${key}" class="shopify-section shopify-section--${def.type}">${html}</div>`;
}

const staticSections = JSON.parse(fs.readFileSync(path.join(THEME, 'config/settings_data.json'), 'utf8')).current.sections || {};
engine.registerTag('section', {
  parse(token) { this.name = token.args.trim().replace(/^['"]|['"]$/g, ''); },
  *render(ctx, emitter) {
    const html = yield renderSection(this.name, staticSections[this.name] || { type: this.name }, ctx.globals || {});
    emitter.write(html);
  },
});

/* ========================================================================== *
 * 4. Globals
 * ========================================================================== */
const settings = JSON.parse(fs.readFileSync(path.join(THEME, 'config/settings_data.json'), 'utf8')).current;
const routes = {
  root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change',
  cart_update_url: '/cart/update', search_url: '/search', all_products_collection_url: '/collections/all',
  account_url: '/account', account_login_url: '/account/login', predictive_search_url: '/search/suggest',
};
const shop = { name: 'BRN · Bare Root Nutrition', email: settings.email, domain: 'bareroot.example', url: 'http://localhost:' + PORT, currency: 'INR', money_format: '₹{{amount_no_decimals}}' };
const linklists = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/menus.json'), 'utf8'));

function globalsFor(extra) {
  return {
    settings, routes, shop, cart, linklists, collections, blogs, metaobjects,
    all_products: Object.fromEntries(products.map((p) => [p.handle, p])),
    canonical_url: shop.url + (extra.path || '/'),
    request: { design_mode: false, page_type: extra.template, path: extra.path || '/', host: 'localhost' },
    ...extra,
    template: { name: extra.template.split(/[./]/)[0], suffix: extra.template.split(/[./]/)[1] || null },
  };
}

async function renderPage(req, res, { template, page_title, page_description, data = {} }) {
  const p = req.path;
  const globals = globalsFor({ template, path: p, page_title, page_description, ...data });
  try {
    const jsonFile = path.join(THEME, 'templates', `${template.replace('.', '/') === template ? template : template}.json`);
    const jsonPath = fs.existsSync(path.join(THEME, 'templates', `${template}.json`)) ? path.join(THEME, 'templates', `${template}.json`) : null;
    const liquidPath = path.join(THEME, 'templates', `${template}.liquid`);
    let content;
    if (jsonPath) {
      const cfg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      let order = cfg.order || Object.keys(cfg.sections);
      const only = req.query.only;
      if (only) order = order.filter((k) => k === only || cfg.sections[k]?.type === only);
      const parts = [];
      for (const key of order) if (cfg.sections[key] && !cfg.sections[key].disabled) parts.push(await renderSection(key, cfg.sections[key], globals));
      content = parts.join('\n');
    } else if (fs.existsSync(liquidPath)) {
      content = await engine.parseAndRender(fs.readFileSync(liquidPath, 'utf8'), {}, { globals });
    } else content = `<!-- template ${template} missing -->`;
    void jsonFile;
    const layout = fs.readFileSync(path.join(THEME, 'layout/theme.liquid'), 'utf8');
    const html = await engine.parseAndRender(layout, { content_for_layout: content }, { globals });
    res.set('content-type', 'text/html; charset=utf-8').send(html);
  } catch (err) {
    console.error(`\n[render ${template}]`, err.message);
    res.status(500).send(`<pre style="padding:2rem;font:13px/1.6 ui-monospace,monospace;white-space:pre-wrap"><b>Render error · ${template}</b>\n\n${String(err.stack || err.message).replace(/[<>]/g, (c) => ({ '<': '&lt;', '>': '&gt;' }[c]))}</pre>`);
  }
}

/* ========================================================================== *
 * 5. Routes
 * ========================================================================== */
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(THEME, 'assets'), { maxAge: 0 }));

app.get('/', (req, res) => renderPage(req, res, { template: 'index', page_title: null, page_description: 'Ayurvedic and nutraceutical supplements that show you what is inside. Eight formulas, seven concerns, every batch tested.' }));

app.get('/collections/:handle', (req, res) => {
  const collection = collections[req.params.handle];
  if (!collection) { res.status(404); return renderPage(req, res, { template: '404', page_title: 'Not found' }); }
  renderPage(req, res, { template: 'collection', page_title: collection.title, page_description: collection.description, data: { collection } });
});

app.get('/products/:handle', (req, res) => {
  const product = P(req.params.handle);
  if (!product) { res.status(404); return renderPage(req, res, { template: '404', page_title: 'Not found' }); }
  renderPage(req, res, { template: 'product', page_title: product.title, page_description: product.metafields.brn.tagline.value, data: { product, collection: collections[product.metafields.brn.concern.value.system.handle] } });
});

const PAGES = {
  'find-your-brn': ['Find your BRN', 'page.quiz'],
  stacks: ['Stacks', 'page.stacks'],
  'bare-proof': ['Bare Proof', 'page.proof'],
  'our-story': ['Root to bottle', 'page.story'],
  ingredients: ['Ingredient library', 'page.ingredients'],
  faq: ['Questions, answered', 'page.faq'],
  contact: ['Contact us', 'page.contact'],
  'body-map': ['Body map', 'page.bodymap'],
};
app.get('/pages/:handle', (req, res) => {
  const def = PAGES[req.params.handle];
  if (!def) { res.status(404); return renderPage(req, res, { template: '404', page_title: 'Not found' }); }
  renderPage(req, res, { template: def[1], page_title: def[0], data: { page: { title: def[0], handle: req.params.handle, content: '' } } });
});

app.get('/pages/ingredient/:handle', (req, res) => {
  const metaobject = metaobjects.ingredient[req.params.handle];
  if (!metaobject || req.params.handle === 'values') { res.status(404); return renderPage(req, res, { template: '404', page_title: 'Not found' }); }
  renderPage(req, res, { template: 'metaobject/ingredient', page_title: metaobject.name.value, page_description: metaobject.does.value, data: { metaobject } });
});

app.get('/blogs/learn', (req, res) => renderPage(req, res, { template: 'blog', page_title: 'Learn', data: { blog: blogs.learn } }));
app.get('/blogs/learn/:handle', (req, res) => {
  const article = articles.find((a) => a.handle === req.params.handle);
  if (!article) { res.status(404); return renderPage(req, res, { template: '404', page_title: 'Not found' }); }
  renderPage(req, res, { template: 'article', page_title: article.title, page_description: article.excerpt, data: { blog: blogs.learn, article } });
});

app.get('/cart', (req, res) => renderPage(req, res, { template: 'cart', page_title: 'Your cart' }));

app.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = (p) => [p.title, p.metafields.brn.tagline.value, p.metafields.brn.concern.value.title.value, ...p.metafields.brn.formula.value.map((r) => metaobjects.ingredient[r.i]?.name.value)].join(' ').toLowerCase();
  const results = terms.length ? products.filter((p) => terms.every((t) => hay(p).includes(t))) : [];
  renderPage(req, res, { template: 'search', page_title: q ? `Search: ${q}` : 'Search', data: { search: { terms: q, results, results_count: results.length, performed: !!q } } });
});

/* cart AJAX */
app.get('/cart.js', (req, res) => res.json(cart));
app.post('/cart/add.js', (req, res) => {
  const items = req.body.items || [{ id: req.body.id, quantity: req.body.quantity || 1 }];
  const added = items.map((i) => addToCart(i.id, Number(i.quantity) || 1)).filter(Boolean);
  if (!added.length) return res.status(422).json({ status: 422, description: 'Variant not found' });
  res.json({ items: added });
});
app.post('/cart/change.js', (req, res) => { changeCart(req.body.id ?? req.body.line, Number(req.body.quantity)); res.json(cart); });
app.post('/cart/clear.js', (req, res) => { cart.items = []; recalc(); res.json(cart); });
app.post('/cart/add', (req, res) => { addToCart(req.body.id, Number(req.body.quantity) || 1); res.redirect('/cart'); });
app.post('/contact', (req, res) => res.redirect((req.get('referer') || '/') + '#subscribed'));

app.get('/search/suggest.json', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const match = (s) => String(s).toLowerCase().includes(q);
  res.json({ resources: { results: {
    products: q ? products.filter((p) => match(p.title) || match(p.metafields.brn.tagline.value)).slice(0, 5).map((p) => ({ title: p.title, url: p.url, price: money(p.price), colour: p.metafields.brn.colour.value, tagline: p.metafields.brn.tagline.value })) : [],
    collections: q ? Object.values(collections).filter((c) => match(c.title)).slice(0, 4).map((c) => ({ title: c.title, url: c.url })) : [],
    pages: q ? metaobjects.ingredient.values.filter((i) => match(i.name.value)).slice(0, 4).map((i) => ({ title: i.name.value, url: i.system.url })) : [],
  } } });
});

function notFound(p) {
  return `<!-- 404 ${p} -->`;
}
function notFoundRaw(p) {
  return `<!doctype html><meta charset=utf-8><title>Not found</title><body style="font:16px/1.6 system-ui;padding:4rem;max-width:40rem;margin:auto;color:#403322"><h1 style="font-size:1.4rem">Nothing at <code>${p}</code></h1><p><a href="/">Back to the homepage</a></p></body>`;
}
app.use((req, res) => { res.status(404); renderPage(req, res, { template: '404', page_title: 'Not found' }); });

app.listen(PORT, () => {
  console.log(`\n  BRN theme  →  http://localhost:${PORT}`);
  console.log(`  ${products.length} products · ${Object.keys(collections).length} collections · ${metaobjects.concern.values.length} concerns · ${metaobjects.ingredient.values.length} ingredients · ${articles.length} articles\n`);
});
