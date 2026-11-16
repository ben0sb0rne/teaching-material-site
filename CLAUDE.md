# Teaching Material Site

Interactive science activities for Ben's middle school classes, replacing the
publisher's online activities. Target: ~20 tools, shipped as a WordPress
plugin, used on school Chromebooks.

Full reasoning behind these rules is in `docs/STACK.md`. This file is the
short version — the part that has to be obeyed.

## Architecture

```
src/kit/         design system: tokens, shell, controls, a11y, motion
src/engines/     reusable interaction types — the unit of reuse
src/activities/  one folder each: content, config, spec.md, bespoke logic only
wp/              plugin bootstrap, shortcode/block, iframe height bridge
activities.json  manifest — the index page and the shortcode both read this
```

**Activities are thin.** An activity is content plus configuration on top of
an engine. If an activity folder is growing real logic, that logic belongs in
an engine or the kit.

**Five engines cover almost everything**: `particle-sim`, `sort-bins`,
`label-diagram`, `sequence`, `data-grapher`. A sixth needs justifying.

## Before writing anything new

1. **Query graphify first.** `graphify-out/` holds the graph of this repo. Ask
   it what already exists for the interaction you are about to build. The
   failure mode for this project is activity 14 reimplementing what activity 3
   already has.
2. **Work in ponytail mode.** Smallest change that fully solves the task. No
   speculative abstraction, no options nobody asked for.
3. Re-run graphify after an activity lands.

## The publisher's originals

`reference/thinklink/` holds the FOSS units downloaded from the publisher's
platform — the guides as searchable text and PDF, the teacher masters, and the
original activities, runnable offline. Check an interaction against the original
there before guessing at what it did.

It is **reference only**: Lawrence Hall of Science copyright, so mechanics and
science are fair game and their artwork and prose are not. Nothing in that folder
belongs under `src/` or in a shipped build.

That folder is self-contained and has its own `CLAUDE.md` and `tools/`, because
it is meant to be lifted onto a drive and opened as its own project. Downloading
further units is its business, not this repo's — read
`reference/thinklink/CLAUDE.md` before touching any of it.

## The one-screen rule

This is the rule the first draft of Explore Dissolving broke, and the main
thing separating these from the originals.

At **1366×768 with no scrolling**, a student sees exactly four things:

1. The activity title
2. **One line** telling them what to do
3. The interactive stage
4. The primary controls

Everything else — legend, tally, walkthrough, teacher notes, keyboard hints —
is below the fold, inside the stage, or behind progressive disclosure. A
persistent instruction banner is a failure. At rest, no more than **three**
controls are visible.

## Hard rules

- **Pointer Events only.** Never `mousedown`/`touchstart`. A touchscreen
  Chromebook is neither a desktop nor a phone and mouse-only handlers fail on
  it silently.
- **Every interaction has a keyboard path.** Accessibility, and also: half the
  trackpads in the room are broken by March.
- **48px minimum touch targets** (`--tap`).
- **Colours come from tokens.** No hex outside `src/kit/tokens.css`.
- **Light and dark both work.** Verify both, every time.
- **No CDN, no external fonts, no analytics, no network at runtime.** School
  networks block things. The publisher's version fetches a runtime Google
  killed in 2016 from `gstatic.com` at lesson time — that is the thing we are
  fixing, so do not reintroduce it.
- **No framework in the activity core.** Plain JS. Simulations run per-frame
  and React re-rendering fights that. Chrome in the kit may use Preact if it
  ever earns it.
- **Simulations are deterministic.** Seeded RNG, fixed timestep. This is what
  makes a timeline scrubbable and a side-by-side comparison a fair test.
  Verify stepping to frame N equals seeking to frame N.
- **It prints**, for absent students.
- **Honour `prefers-reduced-motion`.**

## Done means all of this passes

Not "it works on my machine". Run through every line:

- [ ] No console errors or warnings
- [ ] No horizontal overflow at 360, 768 and 1366 wide
- [ ] Completable with keyboard only
- [ ] Light and dark both correct
- [ ] Reduced-motion honoured
- [ ] Touch targets ≥48px
- [ ] `break-ui` pass with worst-case content
- [ ] Screen reader gets a sensible live-region narration
- [ ] Fits the one-screen rule at 1366×768

## Polish pipeline

After it works, before it ships. In order:

1. `emil-design-eng` — component detail, spacing, states
2. `impeccable` / `taste-skill` — visual craft pass *(read these when first used)*
3. `animate` — deliberate motion only; `apple-design` if gesture-driven
4. `mobile-native` — touch behaviour, Chromebook quirks
5. `break-ui` — worst-case content
6. `animation-performance` — only if frames drop

## Commands

Phase 0: there is no npm here yet. The dev server is Python, and
`.claude/launch.json` holds the same thing as a named config. Ben launches it
by double-clicking `serve.command`.

```bash
python3 tools/serve.py 8765        # serves src/, no browser caching
```

**Use this, not `python3 -m http.server`.** The plain module sends no
`Cache-Control`, so the browser applies heuristic freshness and holds a file
for roughly a tenth of its age — a texture dropped in over a day-old
placeholder does not appear, and an edited `.js` is quietly served stale while
you measure against it. Both have already happened here. `tools/serve.py`
sends `no-store`, so what is on disk is what the browser has, and a plain
reload is enough. One exception, once: `no-store` does not evict entries an
earlier plain `http.server` already cached, so hard-reload the first time
after switching servers.

`?debug` once per machine unlocks a **DEBUG** tab on the right edge of every
page (backtick opens it too), holding a site-wide debug menu:
texture set, keyboard shortcuts off, layer outlines, clear cache.
`src/kit/debug.js`. Not a modifier chord — every one worth having is already
bound by some browser. The unlocking visit opens the menu, so a browser where
nothing happens is serving a stale script rather than missing the key. Each
browser unlocks separately.

Water temperature is a continuous slider, 20–100 °C, linear onto ×1–×2.3 of
`cfg.speed`; ticks and the H key mark the three the lesson compares.

Two variables drive the dissolving, and they are **deliberately different in
the model because they are different in nature**. Heat (`sim.heat`, a
multiplier on `cfg.speed`, which the engine already calls "effectively
temperature") raises random thermal speed: the field jitters harder all over.
Stirring (`cfg.stirSwirl`) turns particles onto a shared circular path: the
field flows. Modelling both as "make the number bigger" would teach that
stirring warms the water. Measured circulation: 0.79 stirred against 0.03
heated.

Held at 100 °C the water boils off (`sim.evaporate`) and the solute comes
back out of solution onto the heap (`sim.settle`), ending at Loaded with dry
powder. Evaporated particles are flagged `gone`, not spliced out, because
`capture()` indexes the particle array by position. Honest for salt; sugar
really caramelises rather than recrystallising, which the model does not show.

A manifest row can carry `"blend"` (applied as `mix-blend-mode`); the beakers
use `multiply` so glass darkens what is behind it. It only reaches `.ground`,
the in-stage copy of the wall — the scaled stage is an isolated group, so a
blend never sees the bleed behind it. Paint order is `ORDER` in
`instrument.js`, not the manifest's row order.

Art lives in two folders — `assets/layers/` is the finished renders that ship,
`assets/layers-placeholder/` the generated stand-ins, and a layer falls back
to the placeholder when the finished set has not got it yet. Never write an
asset path into CSS; everything goes through `Instrument.prototype.url`.

That fallback needs a listing to work. The dev server answers `?list`; a
static host cannot be asked, so the set carries `present.json` and
`make-placeholders.py --check layers` writes it. **Run that after exporting
art**, or the deployed page loads every undrawn layer from `assets/layers/`,
404s on each, and comes up as a bare bench — which is exactly what the first
GitHub Pages deploy did.

Vite and the `npm run build|pack` pipeline arrive at Phase 1.

## Building on particle-sim

An activity supplies four things and the engine does the rest:

- **`setup(sim)`** — where particles start. `sim.packPile(kind, n)` for a
  packed heap, `sim.fillRandom(kind, n)` to scatter. Anything that uses no
  randomness runs first, or the rng stream shifts and tuned numbers move.
- **`onImpact(sim, fixed, free, relSpeed)`** — what a collision means.
  `ParticleSim.rules.dissolve({solvent, breakChance})` is the one that exists.
- **`groups`** — named predicates the walkthrough highlights by name.
- **`palette()`** — reads the CSS custom properties, re-read on resize and on
  theme change.

`Lens` draws one sim; `Player` owns the clock, transport and timeline across
however many lenses are on screen. Neither knows what the particles represent.

## Cadence

Run `ponytail-audit` after every ~4 activities and fold the duplication back
into the kit. Finding the drift at activity 18 is too late.

## Do not

- Build kit features for hypothetical future activities. Three real activities
  tell you the shape; one does not.
- Add a sixth engine without checking the five.
- Copy the publisher's artwork or wording. Mechanics and science are fair
  game; their assets and prose are not. Everything here is drawn in code and
  written fresh.
