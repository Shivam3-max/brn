# Putting the BRN theme on Shopify

Everything the theme shows comes from the Shopify admin. This is the contract.

## 1. Upload

```bash
npm i -g @shopify/cli
shopify theme push --path theme --unpublished --store <your-store>.myshopify.com
```

Preview it, then publish. Run `node scripts/materialize-presets.mjs` first if
you've edited any section presets.

## 2. Metaobject definitions (Settings → Custom data → Metaobjects)

Create these with exactly these type handles and field keys.

**`concern`** — one entry per concern; the entry handle must equal its collection handle.
`title` text · `short` text · `colour` color · `icon` text (drawing key, e.g. `c-liver`) ·
`body_x`, `body_y` integer (point on the 200×360 body map) · `feel` text · `hook` text ·
`explain` multi-line text · `signs` JSON (`[["s-tired","Low energy by mid-afternoon"], …]`) ·
`products` list of products · `stack` metaobject reference (stack) · `intro_video` file (video).
Turn on **Web pages: off** (concern pages are collections).

**`ingredient`** — `name` · `aka` · `kind` (herb / vitamin / mineral / nutrient) · `art` (drawing key) ·
`symbol` · `does` · `low` · `story` · `illustration` file (optional, replaces the drawing) ·
`products` list of products. Turn on **Web pages** with URL handle `ingredient`, and assign
template `metaobject/ingredient`.

**`stack`** — `title` · `colour` color · `discount` integer (%) · `line` · `products` list of products.

**`reel`** — `title` · `kind` · `length` · `product` product · `video` file (video) · `poster` file (image).

**`expert_answer`** — `question` · `answer` multi-line · `product` product · `who` · `video` file.

**`batch`** — `code` · `product` product · `mfg` · `lab` · `report` file (PDF) · `sample` boolean.

**`quiz_question`** — entry handles `goal`, `day`, `life`; fields `question` text and
`options` JSON (`[{"label":"Sleep and stress","score":{"magnesium-tulsi":3}}, …]`).

## 3. Product metafields (namespace `brn`)

| key | type | used for |
|---|---|---|
| `colour` | color | the product's colour world everywhere |
| `short` | text | name on the drawn pack and 3D label |
| `tagline` | text | one-liner under the title |
| `made_for` | text | "Made for …" line |
| `title_note` | text | optional note under the title |
| `concern` | metaobject ref (concern) | breadcrumb, chips, body zone, stack |
| `format` | text | Tablets / Capsules / Powder (shop filters) |
| `pack` | text | `tablet` or `tub` (drawn pack + 3D shape) |
| `count` | text | "60 tablets" |
| `serving` | text | "1 tablet a day, after breakfast" |
| `formula` | JSON | `[{"i":"magnesium","dose":"300 mg"}, …]` — `i` is the ingredient handle |
| `story` | JSON (optional) | how-it-works steps for single-ingredient products |
| `who_for`, `who_skip`, `not_inside`, `signs` | JSON lists | label section, signs |
| `how` | JSON | `{"when":…, "with":…, "tip":…, "slots":["am","noon","pm","night"]}` |
| `timeline` | JSON | `[{"w":"Week 1","t":"…"}, …]` |
| `faq` | JSON | `[{"q":…, "a":…}]` |
| `pairs` | list of products | "Pairs well with", cart upsell |
| `reels` | list of metaobjects (reel) | product reels |
| `story_video`, `howto_video` | file (video) | product videos |

Variant metafields (namespace `brn`): `days` integer (how long that pack lasts — drives
₹/day), `badge` text ("Save 8%").

Collection metafields (namespace `brn`): `line` text, `kind` (`concern` / `audience` / `range`).

## 4. Collections

Concern collections: `daily-energy-immunity`, `liver-care`, `gut-digestion`, `sleep-stress`,
`bone-strength`, `joint-comfort`, `strength-muscle`. Header range tabs: `all`,
`sports-nutrition`, `ayurveda`. "Made for you": `for-gym`, `for-professionals`, `for-women`,
`for-40-plus`, `for-vegetarians`, `for-students`.

## 5. Pages

Create pages with these handles and assign the matching template:
`find-your-brn` → page.quiz · `stacks` → page.stacks · `bare-proof` → page.proof ·
`our-story` → page.story · `ingredients` → page.ingredients · `faq` → page.faq ·
`contact` → page.contact · `body-map` → page.bodymap. Blog handle: `learn`.

## 6. Discounts (so the site's promises hold at checkout)

* Stacks: one automatic "Buy X get Y" / amount-off discount per stack, matching `discount`.
* Stack builder tiers (2 → 5%, 3 → 10%, 4+ → 15%): automatic discount by quantity.
* Launch code `ROOT15` (announcement bar).

## 7. Apps to add

Reviews (Judge.me — add its block to "Reels + reviews"), Shopify Subscriptions (optional),
a COD-friendly checkout, WhatsApp. Ratings stay hidden until the reviews app provides them.

## 8. Before launch

Theme settings → Store → turn **off "Show placeholder labels"**. Add phone, WhatsApp,
email, address and FSSAI number in Contact & legal.
