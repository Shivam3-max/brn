# BRN · Bare Root Nutrition — custom Shopify theme

A Shopify Online Store 2.0 theme built from scratch for BRN (a Nimai Lifesciences
brand). Liquid + vanilla ES modules + CSS custom properties, GSAP for scroll
motion, three.js for the 3D scenes. No Dawn fork, no build step.

```bash
npm install
npm run dev      # http://localhost:3800  (local Shopify emulator)
npm run smoke    # 736 rendered-DOM assertions against the running server
```

Debug flags on any URL: `?only=<section>` (one section alone), `?still=1` (final
frame of every animation), `?webgl=off` (drawn fallbacks), `?rfseek=8&glforce=1`
(jump the 3D Root Film to its end, skip the frame-rate guard).

## What's where

```
data/catalog.mjs        seed catalogue: 8 products, 7 concerns, 31 ingredients, stacks, reels, quiz, articles
data/menus.json         navigation menus
scripts/art.mjs         76 line drawings (ingredients, concerns, deficiency signs, journey)
scripts/build-art.mjs   -> theme/snippets/art.liquid
scripts/build-roots.mjs -> theme/snippets/root-film-art.liquid (Root Film geometry, SVG + JSON)
scripts/materialize-presets.mjs  writes preset blocks into JSON templates (Shopify parity)
scripts/smoke.mjs       DOM assertions
dev/server.mjs          Express + LiquidJS Shopify emulator
theme/                  the uploadable theme
docs/                   blueprint, Shopify setup, seeded data
```

## Signature pieces

| Piece | Where | Files |
|---|---|---|
| Root Film — roots grow into the 8 bottles (3D on desktop, drawn elsewhere) | Home | `sections/root-film.liquid`, `assets/brn-gl.js` |
| Story Player — ingredients drawn in around the bottle, auto-plays | Home, product, concern | `snippets/story-stage.liquid`, `assets/theme.js` |
| Body Map | Home, `/pages/body-map` | `snippets/body-figure.liquid` |
| Find your BRN quiz | Home, `/pages/find-your-brn` | `snippets/quiz.liquid` |
| Read the Bare Label + Bare Proof batch lookup | Home, product, `/pages/bare-proof` | `snippets/label-panel.liquid`, `snippets/proof-form.liquid` |
| Turnable 3D bottle | Product gallery | `assets/brn-gl.js` → `bottleViewer` |
| Floating capsules | Concern heroes | `assets/brn-gl.js` → `capsuleField` |
| Signs self-check | Concern pages | `sections/concern-check.liquid` |
| Stack builder | `/pages/stacks` | `sections/stack-builder.liquid` |
| Day clock + honest timeline | Product | `sections/product-how.liquid` |

3D only loads on desktops with WebGL, 4+ cores and no data-saver, and hands back
to the drawing if it can't hold ~22 fps or the GPU context is lost.

See `docs/SHOPIFY-SETUP.md` to put it on the store.
