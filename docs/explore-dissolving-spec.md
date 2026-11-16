# Explore Dissolving: Rebuild Spec

**For:** Claude Code (overnight build)
**From:** Ben (Mr. Osborne)
**Status:** Layout, materials, behaviour and animations are settled. Objectives and challenges are deliberately left out of this spec; build the system that will hold them, not the content.

This folder contains:

- `SPEC.md`: this document
- `sketches/`: to-scale layout sketches (SVG + PNG) at the exact safe-area size, plus the layer manifest

---

## 0. Ground rules

1. **Read the existing project in full before changing anything.** Docs, `src/index.html`, `src/activities/explore-dissolving/` (`index.html`, `dissolving.css`, `activity.js`), `kit/` and `engines/particle-sim/`. Follow its conventions unless this spec says otherwise.
2. **Do not change the particle simulation.** `engines/particle-sim/sim.js` and `view.js` stay exactly as they are: same physics, collision rules, timing, stirring behaviour and particle rendering. You may only:
   - change a **configuration value** (the particle count, see 0.3), and
   - add a **read-only accessor** if you need to read state the engine doesn't expose (for example, the pile's starting positions).

   List every engine-file change, however small, in your end-of-run summary. If something in this spec seems to need a real engine change, don't make it: build the closest version without it and note it.
3. **Particle count: 50 per substance** (currently 43). If it's a constant or option, change it. Update every string that mentions 43.
4. **No math needed.** Every position and size is in `sketches/layer-manifest.md` (and `.json`) at 1×, 2× and 2.4×. Use those numbers directly.
5. Keep the "ALL TEXT" inventory workflow and regenerate it at the end.
6. Only build what's here. Section 9 lists things to leave for later.

---

## 1. Intent (why it looks like this)

The screen is one **fictional scientific instrument** on a lab bench, not a web page and not a flash game. Every control is a physical object. Students are the **operator** of a real-looking machine. Research on science identity suggests middle schoolers engage more when they're doing what scientists do (predicting, testing, observing), and game elements work when the fun **is** the science. So:

- No stars, confetti, points popups, or cartoon praise.
- Student-facing language is academic and concise ("Observe", not "Watch").
- Aesthetic: 1990s to early 2000s "Utopian Scholastic": real materials, intentional, grown-up enough for 8th graders.

---

## 2. Platform and stage

- **Targets:** Chromebooks (Chrome) and iPads (Safari), **landscape only**. Trackpad, mouse, touch and keyboard must each work on their own.
- **Fixed stage, not responsive.** Build everything inside a **1600 × 1000 point safe area** (16:10) and scale it uniformly to fit the viewport (contain).
- **Bleed:** the wall and bench extend past the safe area to fill leftover space. Sideways on 16:9 Chromebooks, top and bottom on 4:3 iPads. See `sketches/06-safe-area-and-bleed.png`. The wall tile grid continues from the safe area's origin, and the trim band and bench stay locked to their safe-area heights after scaling.
- **Portrait:** show an on-theme "Rotate your device" screen. A website can't lock orientation.
- **Assets ship at 2×** (3200 × 2000 for the full safe area). Masters are 2.4× (3840 × 2400); Ben keeps those.

---

## 3. Sketches

All sketches are exactly **1600 × 1000** (the safe area at 1×), except the bleed diagram. Every element is an SVG group whose `id` matches the layer manifest, with a `data-render` attribute: `raster`, `raster-tile`, `raster-strip`, `raster-masked`, `raster-overlay`, `sprite` or `code`.

| File | Shows |
|---|---|
| `00-layer-map` | Loaded state with every part labelled |
| `01-loaded` | Start state: dry powder only, Dispense lit |
| `02-filling` | Water streaming in, level rising, viewport filling bottom-up |
| `03-running-stirring` | Running with Stir pressed: stir bars spinning, vortex, sugar nearly clear, calcium carbonate cloudy |
| `04-reset-draining` | Reset: water level falling, LEDs and counters already zeroed |
| `05-reset-refilling-powder` | Reset: beakers empty, fresh powder falling from the chutes |
| `06-safe-area-and-bleed` | Safe area with the 16:9 and 4:3 bleed extents |

Viewport particle layouts in the sketches are **illustrative only**. The engine draws the real ones.

---

## 4. Raster-first workflow

Build with rasters from the start, using **placeholders generated from the sketches**, so Ben's Blender renders drop in later with no code changes.

1. **Placeholders from the SVG.** For every layer whose `data-render` starts with `raster` or is `sprite`, isolate that group from `01-loaded.svg` (or the state that best shows it) and export it at **2×**, on a transparent background, at exactly its manifest box. Put them in `assets/layers/` named `{layer-id}.webp`. Keys get two files each (`key-freeze-up.webp`, `key-freeze-down.webp`; `key-dispense-ready.webp`, `key-dispense-spent.webp`).
2. **Glass overlays** (`glass-*`): export transparent placeholders at full size with a very faint diagonal highlight, so alignment is visible. Ben will replace these with fingerprint and reflection layers.
3. **Masked layers** (`water-*`, `turbidity-*`, `pile-*`): export each at its **full** state (full beaker of water, a cloud texture filling the water area, a full powder mound). Code reveals or hides them with masks; never swap images to animate them.
4. **Sprites:** use **WebP sprite sheets** (frames side by side), not video. This sidesteps Safari's lack of transparent WebM. Generate simple placeholder frames in code or with a script:
   - `sprite-stirbar-{id}`: 12 frames of the white stir bar rotating (foreshortened as it turns).
   - `sprite-pour-{id}`: 8 looping frames of a thin water stream with scrolling highlights.
   - `sprite-powder-{id}`: 8 looping frames of falling powder grains.
5. **Tiles and strips:** `wall` is a repeating tile; `wall-trim` and `bench` repeat horizontally.
6. **One source of truth for layout.** Load positions from `layer-manifest.json`. Don't hard-code coordinates anywhere else, so a re-render at the same size is a pure file swap.
7. **Debug view:** a developer-only toggle (for example, the backtick key when a `?debug` URL flag is set) that outlines every layer with its id, so Ben can check his renders line up.

### 4.1 Draw order (back to front)

wall, wall-trim, bench, bracket, stirplate, water, turbidity, pile, sprite-stirbar, sprite-pour, sprite-powder, head (includes nozzle, powder chute and probe), beaker (front glass and graduations), console, display contents (code), register LEDs (code), glass overlays, keys, nameplates, viewport rings, viewport fields (code), notebook-paper, notebook-text (code).

### 4.2 Drawn in code (not rasters)

All display contents (ID readout, clock, counters), the LEDs and their glow, the viewport fields (the existing engine canvases), the `1 nm` scale bar, notebook writing, focus states, and the masks for water, turbidity, pile and vortex.

---

## 5. Components

Materials are noted for Ben's renders; placeholders just need to look like the sketch.

### 5.1 Scene

- **Wall:** mid-grey square lab tile. **Black trim band** along the bottom, matching the bench.
- **Bench:** black epoxy.

### 5.2 Console

Retro-computer **beige textured plastic**, on a two-column grid: left column lines up with the sugar station, right with calcium carbonate.

- **ID readout** (top left): two lines, `NAME` in caps and a description. Default `NO SELECTION` / `Select an object to identify it.` This is the tooltip display (see 6.6).
- **Clock:** `00.0` over `SECONDS`.
- **Keys:** Freeze, Stir, Reset. Warm grey keycaps like an old IBM keyboard. Print small shortcut legends on the keycaps (Space, S, R, W).
- **Dispense water:** wide amber key under the three keys.
- **Nameplates:** brushed aluminum, engraved black-filled `SUGAR` · C₁₂H₂₂O₁₁ and `CALCIUM CARBONATE` · CaCO₃, a rivet in each corner, and a colour dot matching that substance's particles. The substance names are among the most prominent things on screen.
- **Viewports:** metal ring around the existing engine canvas. White `1 nm` scale bar on a small dark plate so particles can't hide it.
- **Register and counter:** dark LED panel engraved `DISSOLVED`, a **5 × 10 LED grid** (one LED per particle) and a counter reading `00 / 50`. Unlit LEDs are a dim version of the substance colour; lit LEDs glow.

### 5.3 Stations (below the console)

- **Head:** a thin strip flush under the console carrying the **water nozzle**, the **powder chute** and the **probe** that hangs into the beaker.
- **Beaker:** 250 mL lab beaker with a pour spout, graduated 50 to 250 mL on the left side.
- **Stir bar:** white bar on the beaker floor.
- **Magnetic stir plate** with a speed knob, on a metal **bracket** dropping from the console. The beakers never touch the bench.

### 5.4 Lab notebook

Spiral-bound paper with three sections: **Objectives** (square checkboxes), **Challenges** (diamond markers, different ink colour) and **Observations** (ruled lines filling the rest of the page). Handwritten font. See section 7 for how to build it without content.

### 5.5 Colours drawn in code

| Token | Hex | Use |
|---|---|---|
| Water particle | `#5B8FD6` | Viewport water |
| Sugar | `#D2603F` | Sugar particles, lit sugar LEDs (`#FF7A52` when glowing) |
| Calcium carbonate | `#E9E4D6` | CaCO₃ particles, lit CaCO₃ LEDs |
| Display background | `#17202B` | All displays |
| Display text | `#F4C152` | Main display text |
| Display secondary | `#D9C9A0` | Descriptions |

Fonts in the sketches: Jost (engraving, keys), IBM Plex Mono (displays), Patrick Hand (notebook).

---

## 6. Behaviour and animation

Both stations always do the same thing at the same time. Run them with the engine's **existing side-by-side (compare) mode**, which already keeps both under identical conditions.

### 6.1 States

| State | Entered by | Summary |
|---|---|---|
| Loaded | Page load, end of Reset | Dry powder in both beakers, Dispense lit, clock `00.0`, counters `00 / 50` |
| Filling | Dispense water | Both beakers fill together; keys ignore presses |
| Running | Filling finishes | Engine runs, clock counts |
| Frozen | Freeze | Everything paused, including sprites |
| Resetting | Reset | Drain, then fresh powder; keys ignore presses |

**Viewport in the dry state.** The engine expects water. Keep it paused and show a **static dry-pile frame** over its canvas: only the solute particles, in their starting positions, drawn with the engine's own colours and sizes (use a read-only accessor if needed). Filling and draining wipe between this frame and the live canvas.

### 6.2 Dispense water (about 1.6 s)

1. The key latches down and turns grey (`key-dispense-spent`). It stays that way until Reset finishes.
2. **0 to 0.15 s:** the pour sprite starts at both nozzles and grows down to the beaker floor.
3. **0.15 to 1.45 s:** the `water` mask rises from empty to the 250 mL line (ease-out). The stream's bottom always ends at the water surface. In each viewport, the live engine canvas is revealed **bottom-up** in step with the beaker's water level, over the dry-pile frame.
4. Turbidity rises as the water churns the powder (see 6.4).
5. **1.45 to 1.6 s:** the stream cuts off (its tail falls into the beaker) and the surface settles with a small wobble.
6. The engine unpauses and **the clock starts now**, so every run starts from the same moment.

### 6.3 Stir

- Calls the engine's existing stir exactly as the current Stir button does. Drive the visuals from the engine's stir state or phase if it exposes one, so the animation matches the physics.
- **Stir bars:** the spin sprite ramps up over 0.2 s, runs for as long as the engine's stir lasts, then winds down over 0.5 s. Repeated presses extend it.
- **Vortex:** the top edge of the water mask dips in the middle, up to about 12 pt at full spin, easing back flat as the bar slows.
- Ignored while Frozen, Filling or Resetting.

### 6.4 Turbidity (cloudiness)

A beaker-level effect only; the viewport particles are unaffected. Opacity of the `turbidity` layer, with tunable constants:

- **Sugar starts cloudy and clears as it dissolves.** Target opacity = `0.35 × (undissolved / 50)`. Filling and each stir bump it up briefly (about +0.1) as grains are kicked up, then it eases back to the target. At 50 / 50 the water is completely clear.
- **Calcium carbonate gets cloudy and never clears.** Filling raises it to about 0.3. Each stir pushes it toward a 0.7 cap. With no stirring it settles slowly (over about 15 s) toward a faint 0.08 haze, but it never reaches clear while there's water in the beaker.

That contrast (one beaker clears, the other clouds) is the macroscopic version of soluble vs insoluble, so keep it visible.

### 6.5 Reset (about 2.6 s)

1. Reset is momentary. Freeze unlatches if it was latched. The engine pauses.
2. **0 to 0.3 s:** LEDs switch off in a quick reverse cascade. Counters roll to `00`, clock to `00.0`.
3. **0 to 1.2 s, drain:** the water mask falls to empty (ease-in), turbidity fades with it, stir bars stop. Each viewport wipes **top-down** from the live canvas back to the dry-pile frame. The drain flushes the beaker completely, so the pile mask shrinks to nothing as the water finishes leaving.
4. **1.2 to 1.4 s:** pause on two empty beakers.
5. **1.4 to 2.4 s, refill powder:** the powder sprite falls from both chutes, and the pile mask grows back to a full mound. Reset the engine here.
6. **2.4 to 2.6 s:** the Dispense key pops back up and lights amber. Back to Loaded.

### 6.6 Identify (ID readout)

- **Mouse/trackpad:** hovering an object shows its name and description. Moving off returns to the default.
- **Touch:** tapping a non-control object (a particle, a beaker, the stir plate) identifies it. Tapping a key **activates it and identifies it** at the same time. No double-tap.
- **Keyboard:** focusing a control identifies it.
- Particles in the viewport are identifiable by pointer and tap (hit-test against the engine's particle positions, read-only).

### 6.7 Freeze

Latching. Pauses the engine, the clock, and every sprite and mask animation exactly where they are. Pressing again resumes.

---

## 7. Notebook system (build the framework, no content)

Objectives and challenges will be written later. Build the system so they can be added as data:

- A config file (for example `notebook.js`) with two arrays, `objectives` and `challenges`. Each item has an `id`, `text`, a `trigger` (an event name plus an optional condition), and a `completion` line that gets written into Observations.
- An **event bus** in the activity that emits at least: `dispensed`, `fillComplete`, `particleFreed` (with substance and count), `allDissolved` (per substance), `stirStarted`, `stirEnded`, `frozen`, `unfrozen`, `resetStarted`, `resetComplete`, `identified` (with object id), and `particleSelected` (with substance, particle index, and whether it's buried or on the surface).
- When an item fires: check its box, strike it through, and write its completion line into Observations in the handwritten font.
- Support a **prediction** item type that renders tappable choices (for example Yes / No) inside the notebook and records the choice before its trigger is checked.
- Track overall completion and emit `allComplete` when every objective and challenge is done (the hook for a future payoff).
- Ship with **two or three obvious placeholder items** in each list (for example "Placeholder objective: dispense water") so the system can be tested. Don't write real objectives.

---

## 8. Text

### 8.1 ID readout descriptions (draft, will be rewritten)

Variants use parentheses.

| Object | Description |
|---|---|
| Water particle | Water, the solvent. Constantly moving and colliding. |
| Sugar particle (In pile) | Sugar, the solute. Held in the pile by attraction to other sugar particles. |
| Sugar particle (Free) | Dissolved sugar. Part of the solution. |
| Calcium carbonate particle | Calcium carbonate, the main ingredient in chalk. Insoluble in water. |
| Scale bar | 1 nanometre, one billionth of a metre. |
| Viewport | Magnified tens of millions of times. |
| Register | Particles dissolved. One light per particle. |
| Counter | Particles dissolved, out of 50. |
| Clock | Seconds since water was added. |
| Freeze | Pauses the simulation. |
| Stir | Spins the stir bars in both beakers. |
| Reset | Drains both beakers and adds fresh samples. |
| Dispense water | Adds 250 mL of water to both beakers at once. |
| Nameplate (Sugar) | Sugar, C₁₂H₂₂O₁₁. |
| Nameplate (Calcium carbonate) | Calcium carbonate, CaCO₃. |
| Beaker | 250 mL beaker. |
| Stir bar | Magnetic stir bar. Spins when the stir plate is on. |
| Stir plate | Magnetic stir plate. Spins the stir bar from below. |
| Probe | Sends the magnified view to the viewport. |
| Nozzle | Water outlet. |
| Powder chute | Adds a measured sample of powder. |

### 8.2 Screen reader text

- Live region, at most every 4 seconds while running: `{n} of 50 sugar particles and {m} of 50 calcium carbonate particles have dissolved after {t} seconds.`
- When a notebook item completes: `Observed: {completion line}`
- State changes: `Water added.`, `Simulation frozen.`, `Simulation resumed.`, `Reset complete.`
- Each viewport keeps a descriptive label (for example "Magnified view of sugar in water").

---

## 9. Not in this build

- Real objectives and challenges (section 7 builds the framework only).
- The completion payoff: a hidden Breakout program that boots on the instrument at 100% (ball = water particle, bricks = sugar pile, unbreakable calcium carbonate level, high score = fastest time). Just emit `allComplete`.
- Final art. Placeholders only.
- Landing page changes, beyond updating any "43" or "Watch" text you touch.

### 9.1 Removed from the current version

The colour fields and their toggle, the "?" help popover, the specimen slide tray and ← → specimen switching, the Back/Next walkthrough and "Watching for" cue line, the beaker-and-spoon drawing and magnification cone, and dark mode.

---

## 10. Accessibility

- Every control is a real `<button>` with a label, operable by keyboard.
- Visible focus states that suit the physical look (for example a lit outline around the keycap).
- Touch targets at least 44 × 44 points at the smallest supported scale.
- Text contrast at least 4.5:1, including engraved labels.
- Sugar vs calcium carbonate is never distinguished by colour alone (nameplates and position also tell them apart).
- `prefers-reduced-motion`: keep state changes, shorten or drop decorative motion (stream, powder, vortex, LED cascade).

---

## 11. End-of-run summary

When you finish, report:

1. Every file created or changed, and **every change to `engines/particle-sim/`** (should be config or read-only only).
2. The placeholder assets generated and where they live.
3. Anything in this spec you couldn't do and what you built instead.
4. Anything you'd like Ben to decide.
