# Explore Dissolving — build report

Against `docs/explore-dissolving-spec.md`. Run on 27 Oct 2026.

---

## 1. Files

**Engine changes.** The first build needed none: the particle count turned out
to be an activity value (`SOLUTE` in `activity.js`), so 43 → 50 needed no
engine edit. Seeing it run asked for four things the engine could not express.
Three went in as configuration whose default is the old behaviour, so nothing
else built on `particle-sim` moves. The fourth, damped collisions, was built,
measured, and taken out again — see below:

| Config | Default | What it adds |
|---|---|---|
| `radii` | `null` | A radius per kind, falling back to `particleRadius`. Reaches packing, collision contact, the wall clamp, exposure and the lens's sprites. |
| `overhang` | `0` | How far a particle may cross the wall, as a fraction of its own radius. At 1 its centre reaches the wall and the viewport clips it. |
| `sediment` | `null` | A per-column surface over the topmost fixed particle. A free particle of another kind is pushed back to it and loses its downward velocity, so water cannot work underneath a heap on the floor. |

**Damped collisions were tried and removed.** The round-2 brief asked for a
field that slides like a liquid instead of flying like a gas, and damping the
collisions does produce that — at `restitution` 0.6, 68% of particles are
touching another at any moment against 33% elastic. It also spins the entire
field slowly around the centre. The two are one effect: rigid rotation is the
only motion with no relative velocity in it, so an inelastic collision cannot
drain it, and the thermal drift that keeps a damped field from going still
pumps energy in until it collects there. In a circular viewport that reads as
a carousel, which is what Ben spotted on screen.

Measured, net rotation as a share of all motion (0 = none), worst of three
seeds: 0.65 at `restitution` 0.6, 0.13 at 0.85, 0.15 at 0.9, 0.04 at 1. The
settling goes at the same point — 71% touching at 0.6, 49% at 0.85, 48% at 1 —
so there is no value that buys the liquid look without the spin. Raising the
water count does not substitute: 70 → 200 particles moves "touching" only from
49% to 52%, because every particle is driven back to the same fixed speed each
step and will not settle however crowded it is.

So the activity runs an elastic gas, which is also what the model is for: a
collision carrying energy into the solid is the thing a student is here to
see. `sim.js` keeps the finding in a comment at `bounce` so it is not
rediscovered.

Put to Ben with the rotation on screen and the trade measured, and his call was
to leave it a gas. Round 2's "liquid, not gas" item is therefore closed as not
achievable this way, not left outstanding: the only honest route to a settling
field is replacing the thermostat that drives every particle back to one fixed
speed, which is engine surgery nobody has asked for.

Two supporting changes came with them: `packPile` now fills rows to capacity
and only levels the summit when the rows can carry it, so the heap's widest
row is its top one; and `fillRandom`'s attempt cap went from 40 000 to 400 000
because rejection sampling against the sediment surface has a slow tail.

Two things that would otherwise have meant touching the engine were done
through configuration instead:

- **The sweeping stirrer in the lens.** `view.js` draws a large blurred spoon
  whenever the model is stirring. This instrument stirs magnetically from a
  bar on the beaker floor, and §9.1 drops the spoon, so the palette passes
  `stirrer: 'rgba(0,0,0,0)'` and it draws nothing. The stir is still visible
  in the field, as faster particles — which is the physics.
- **The engine's scale bar.** It draws one when the activity passes
  `opts.scale`, in the reticle colour and with no plate. §5.2 wants white on a
  small dark plate, so the activity passes no `scale` and the bar is drawn in
  the DOM instead, sized from the physics (1 nm = 1/6.79 of the field radius,
  the field being 6.79 nm across).

**Created**

| File | |
|---|---|
| `src/activities/explore-dissolving/instrument.js` | 366 lines — the stage, manifest-driven layers, keycaps, LED registers, sprite sheets, identify plumbing, debug view |
| `src/activities/explore-dissolving/notebook.js` | 248 lines — notebook framework and placeholder content |
| `src/activities/explore-dissolving/layer-manifest.json` | the handoff manifest, now the runtime source of layout |
| `src/activities/explore-dissolving/assets/layers/` | 45 WebP placeholders + `geometry.json` |
| `tools/make-placeholders.py` | 399 lines — regenerates every placeholder from the sketches |
| `docs/sketches/*.svg`, `layer-manifest.md` | the sketches, kept so placeholders can be regenerated |
| `docs/explore-dissolving-spec.md` | your spec, kept with the work |
| `src/kit/fonts/plex-mono-latin.woff2` | + `plex-mono-semibold-latin.woff2`, `patrick-hand-latin.woff2`, and both OFL licences |

**Rewritten**

- `index.html` — 186 → 42 lines. Nothing in it carries a position any more;
  every layer is built from the manifest.
- `dissolving.css` — 244 → 597 lines.
- `activity.js` — 425 → 838 lines.
- `docs/all-text.txt` — regenerated for the instrument.

**Edited**

- `src/kit/kit.css` — three `@font-face` blocks, `--font-mono` now leads with
  IBM Plex Mono, new `--font-hand`.
- `src/index.html` — one word: "Watch" → "Observe".

---

## 2. Placeholders

45 files in `src/activities/explore-dissolving/assets/layers/`, 300 KB in all,
each at exactly its 2× manifest box on transparent ground, named
`{layer-id}.webp`. Keys are two files each. Sprite sheets carry their frames
side by side: stir bar 12, pour 8, powder 8.

`tools/make-placeholders.py` isolates each group from whichever sketch shows
it best — keeping ancestor transforms, so the beaker group and everything
inside it lands in the right place at the right size — renders it with
headless Chrome, and encodes WebP with Pillow. Neither is needed at runtime.

```bash
python3 tools/make-placeholders.py            # everything
python3 tools/make-placeholders.py console    # just ids that match
python3 tools/make-placeholders.py --check    # measure a set, render nothing
```

`--check` compares a folder against the manifest — every file is 2× its box,
sprite sheets that again per frame, the lamps at the socket pitch — and also
names files that are missing and files nothing loads. It takes a set name, so
`--check layers-new` validates a set being built.

Two things worth knowing:

- **`key-freeze-down` is in no sketch.** It is synthesised from the up cap
  using the same offsets the stir and reset caps use between their own two
  states: cap down 6 points, base block 6 points shorter.
- **`geometry.json` is measured, not typed.** A full beaker stops at the
  250 mL graduation, not the rim, so "water level 1.0" sits some way down
  from the top of the layer box. That distance is read off the rendered
  water texture's own alpha (0.200) rather than hard-coded, so re-rendering
  water with the line somewhere else keeps the fill and the vortex on the
  surface with no code change.

---

## 3. Where I departed from the spec

**Draw order (§4.1).** The spec lists every glass overlay together, before the
viewports. A lens reflection underneath the lens is not a reflection, so
`glass-viewport-{s}` is drawn immediately over its own viewport; the other
overlays stay where the spec puts them. `register-panel-{s}` isn't in the
list at all — it sits just above the console, under its own LEDs.

**The pile tracks what is undissolved.** §5's manifest note says the pile mask
is "for refills", but §6.4 says sugar's water is *completely clear* at 50/50.
A full mound sitting under clear water would contradict the register, so the
mound now follows the undissolved count: it erodes away for sugar and stays
put for calcium carbonate. Say if you want it fixed at full during a run.

**The pile scales rather than being clipped.** A clip needs the mound's height
in points and the manifest doesn't carry it. Scaling from the beaker floor
needs no measurement and keeps the silhouette a mound at every size.

**Probe, nozzle and powder chute.** The head is one piece of art, so it can't
be hit-tested into three parts. The head answers as "Sample head" and names
all three; the nozzle and the powder chute answer from the streams that come
out of them, which have manifest boxes of their own. The probe has its text in
the inventory but no separate hit area — it would need its own box.

**`file://` no longer works.** The manifest is fetched so that it stays the one
file you re-export beside your renders. Opened as a file the browser refuses,
and the activity says so plainly instead of showing an empty bench.

**Fonts.** IBM Plex Mono and Patrick Hand weren't on the machine, and the
no-CDN rule forbids fetching them at run time. Fetched once from Google's OFL
repository, subset to Latin plus the subscripts the formulas need, and
vendored as woff2 (62 KB total, licences beside them). This needed
`pip install brotli` — build time only, nothing new loads at run time.

---

## 4. For you to decide

1. **The turbidity contrast is faint with placeholder art.** It is implemented
   to §6.4 exactly and matches your own sketch, but the placeholder water
   (`#BFD8EC`) is so pale that a cleared sugar beaker and a cloudy calcium
   carbonate one look close. That contrast is the one macroscopic signal §6.4
   says to keep visible, so it is worth judging first when the real water and
   cloud renders land. My guess is it wants deeper water rather than a
   stronger cloud.
2. **Solvent count stayed at 90.** I read "50 per substance" as the solute,
   since the register is 50 lights and counts solute. Say if you meant water
   too.
3. **The notebook has about one spare line.** Six placeholder items end at
   420 of the 446 points above the first ruled line, so there is roughly one
   more line of writing in it. Longer real objectives will clip — the clip is
   deliberate, so writing can never run over the ruling — but a list much
   longer than this one wants smaller writing or fewer items.
4. **`README.md` is now out of date.** It still describes the walkthrough, the
   specimen tray and the "Watching for" cue line, all removed by §9.1. Out of
   scope here; happy to bring it up to date.
5. **The landing page has three low-contrast warnings** from the design hook.
   §9 puts landing-page changes out of scope, so I left them standing.
6. **Where this code should live.** `instrument.js` and `notebook.js` are in
   the activity folder, not the kit, because one activity doesn't tell you the
   shape. If a second instrument-style activity appears, that is what moves.

---

## 5. Debug mode

**Layer outlines** in the debug menu outlines every layer and labels it with
its id — for checking a fresh render against the manifest without measuring
anything. It used to be backtick's own job in `instrument.js`; backtick now
opens the menu, which owns the toggle instead.

Art lives in two folders: `assets/layers/` for the finished renders that ship
and `assets/layers-placeholder/` for the generated stand-ins. Any layer the
finished set has not got yet falls back to its placeholder, so the bench is
whole at every stage. The dev server answers `?list` on a directory with its
filenames as JSON, which is how the activity learns what the finished set
holds in one request instead of a 404 per missing render.

Loading any page once with `?debug` unlocks the **backtick** key on that machine:
a site-wide menu (`src/kit/debug.js`) to switch texture set, turn the
instrument's keyboard shortcuts off, and clear the cache. `?assets=<folder>`
still names a third set for a one-off, matched as a single path segment since
it comes from the URL.

`?debug` also exposes `window.__dissolving`: `hold()` takes the clock off the
display, `step(dt)` advances one frame by a known amount, `press(name)` hits a
key, `read()` returns the whole state, and `player` is the model. That is how
the sequences below were checked; none of it is reachable without the flag.

---

## 6. What was verified

- **Fill:** stream grows to the beaker floor over 0.15 s, water rises to
  1.45 s, running at 1.6 s. The clock reads `00.0` throughout and starts at
  1.6 s. The stream's bottom tracks the water surface to within 0.1 px.
- **Reset:** clock and counters roll to zero by 0.3 s; the LED cascade clears
  from the highest lit light backwards, finishing at 0.3 s; drained by 1.2 s;
  two empty beakers 1.2–1.4 s; powder falling 1.4–2.4 s; Loaded at 2.6 s with
  the Dispense key amber again.
- **Vortex:** dips 12 points at full spin and eases flat as the bar slows,
  driven by the engine's own stir phase.
- **Turbidity:** sugar never clouds — it goes into solution and the water
  stays clear. Calcium carbonate is clear too until it is stirred, then each
  stir adds 0.26 up to a cap of 0.70 and it settles toward a 0.08 haze over
  ~15 s without ever reaching clear again. Stirring is what separates the two,
  which is the thing a student is meant to notice.
- **Particle sizes:** both species are drawn the solute's size — 0.90 nm in a
  6.79 nm field, 0.0663 of the field radius. 50 solute and 70 water fill 52.7%
  of the field. The to-scale build (water at 0.28 nm, 700 of them, the same
  52% occupancy) is kept behind `TO_SCALE` in `activity.js`; it is honest and
  close to unreadable, because the thing a student is here to watch is water
  hammering a solid apart. The `1 nm` bar therefore measures the field and the
  solute correctly and the water 3.2x too large. Decided to keep it: that is
  the textbook convention, and a bar is worth more than the error it carries
  for one species. The README states it plainly for whoever teaches from this.
- **Packing:** the heap is 6, 9, 10, 12, 13 bottom-up — 50 particles, five
  whole rows, the widest at the top, standing 32% of the way up the field.
- **No net rotation:** the field does not turn. Net rotation is 0.04, 0.00
  and 0.01 of all motion across three seeds, against 0.34 and worse when
  collisions were damped. Particles fly between collisions — it is a gas, by
  decision, for the reason recorded in §1.
- **Sediment:** no water particle is below the heap's surface at any 10 s
  checkpoint through 60 s.
- **Pace:** on the shipping seed, particles freed at 10/25/40/50 reach 8 s,
  23 s, 42 s and 87 s at `breakChance` 0.05, at 20 °C and unstirred. (An
  earlier draft of this line said 66 s for the last mark; that figure came
  from the 0.055 row of the tuning table, not the 0.05 that ships. The first
  three were right.) The to-scale build is 6 s, 20 s, 36 s, 55 s at 0.015 —
  the same arc. That tail is noise, not a setting: with only 70 water
  particles the dissolving is a small number of discrete events, and across
  three seeds the time to free all fifty ranged from 66 s to 142 s at one
  `breakChance`. The first forty are steady; the last ten are luck.
- **Drain:** the viewfinder's water leaves downward. Particles above the
  falling surface drop out through the floor — 700 → 607 → 303 → 69 → 0 as the
  level goes 1 → 0.75 → 0.5 → 0.3 → 0.15 — rather than being lifted back out
  of the top they came in by.
- **Determinism:** stepping to frame 900 is bit-identical to seeking to 900
  (max difference 0 across every particle's position and velocity).
- **Keyboard:** Space, S, R and W all work; Stir is ignored while frozen; the
  clock does not advance while frozen; all six buttons are labelled and
  focusable.
- **Reduced motion:** forcing the media query flattens the vortex and holds
  the sprites on one frame, and it recovers when the preference goes away. A
  dry stir stops rocking the powder and leaves it leaning instead — measured
  -3.50 px held indefinitely, then +3.50 px on the next stir, against an
  oscillation that decays to zero over 0.75 s with the preference off. The
  lean clears the moment water is dispensed, so the dry canvas still matches
  the live field it hands over to.
- **Assets:** 49 images load, zero failures, no console errors through a full
  fill → run → stir → freeze → reset → fill cycle.
- **Layout:** no overflow at 1366×768 or 1024×768; bleed fills the extra space
  sideways on 16:9 and above and below on 4:3; portrait shows the rotate
  screen; every touch target is at least 48 safe-area points.

**One placeholder is off-spec.** Every file is exactly 2× its `box_1x` except
`notebook-paper`, which is 730 × 1826 where the manifest's new box wants
**730 × 1850**. The manifest moved to fit the binding rings and the placeholder
was never regenerated, so the re-export is the thing that fixes it.

## 7. Temperature, and why it does not look like stirring

The engine's `speed` is the mean kinetic energy of the field — its own
comment calls it "effectively temperature" — so heat is a multiplier on it
and no other physics changes. `sim.heat` is runtime state, not config,
because it moves mid-run and has to travel in the snapshot the way the stir
does.

**Heat and stirring are different mechanisms and now look different.** Before
this, a stir raised the same speed number that heat does, which made the two
controls identical underneath and taught that stirring warms the water. It
does not: stirring is bulk flow. `cfg.stirSwirl` turns particles onto a
shared circular path during a stir, leaving their speed to temperature.
Measured, as a share of all motion:

| | circulation | mean speed |
|---|---|---|
| at rest, 20 °C | −0.01 | 0.56 |
| heated to 100 °C | −0.03 | 1.18 |
| stirred, 20 °C | **0.79** | 1.05 |
| after the stir dies away | 0.05 | 0.57 |

So a hot beaker reads as a swarm and a stirred one as a current, which is
what the two things are. `stirSwirl` defaults to 0, so nothing else built on
the engine changes.

**The multipliers are schematic.** Particle speed goes as the square root of
absolute temperature, so 20 °C to 100 °C is √(373/293) — about 13% faster.
True, and invisible. 1 / 1.6 / 2.3 is exaggerated until the difference is
watchable inside a lesson, the same trade the particle sizes already make.

**Pace, seconds to free 40 of 50** (the steady part of the curve; the last
ten are luck, as before), across three seeds:

| | 20 °C | 60 °C | 100 °C |
|---|---|---|---|
| unstirred | 42 / 59 / 53 | 37 / 27 / 31 | 14 / 24 / 21 |
| stirred every 5 s | 21 / 18 / 31 | — | 9 / 14 / 11 |

Two variables of comparable strength that combine — stirring at 20 °C is
worth about as much as heating to 100 °C, and doing both is faster than
either. All three seeds agree on the ordering.

**A continuous slider, with the three marked.** This started as three fixed
detents, on the argument that a fair test needs repeatable settings — two
students comparing 73 °C against 71 °C are not comparing anything. Ben wanted
to be able to slide it, and he is right that temperature is continuous and
that a detented switch is the wrong idiom for it. The compromise kept both:
the control is continuous from 20 °C to 100 °C, with ticks at 20, 60 and 100
and an H key that jumps between them, so the three the lesson compares are
still exactly reachable. 100 °C is the boil, so the top of the track means
something.

**Drawn as the hardware, not as a widget.** A channel milled across the
console face with a knurled actuator riding in it, from a photograph of an
ALCO slide switch. The layer has no background of its own: what shows through
is the console art, which is the surface the cut is in. Lettering is the
keycap's — same family, same 16 point size, same 1.8 tracking — so the control
is labelled like the keys beside it, and the throw is inset by half the
actuator so it stops inside the panel instead of hanging over the key.

**The readout is a screen, not a changing label.** Everything on this console
has to be something the bench is doing, and an engraved number that changes is
not a thing hardware does. So the temperature sits behind the same glass,
bezel and amber as the instrument's other two displays, in a smaller part,
with a `BOIL` lamp beside it that is dark until the water reaches 100 °C —
dark rather than absent, the way a dead segment on a real readout still shows.
The first version of the control lit a bar down the inside of the slot to show
how far up it was; that went with it. A slot is a hole and light does not come
out of one, and the actuator's position already says where the setting is.

**Two parts on one line, and the legend printed on the glass.** Readout, then
slot. Both centres are the panel's, which puts them exactly on the centre of
the WATER key beside it — measured, all three at y 147.84 at 1366 wide.

Getting there took one more round. The nameplate started engraved in the
console above the screen, which is correct for hardware and wrong here: with a
16 point nameplate above it, the screen's centre lands at 37 and the slot's at
27.5, and Ben's reaction to the result was that the slider is not aligned with
the screen. He is right — those are the two live parts, and they were the two
that did not line up.

Three ways out were mocked at 1.8× on the console face with the WATER key
beside them and that key's centreline drawn in red: **A**, one line with the
nameplate engraved to the left of the glass, which aligns everything but cuts
the throw from 108 points to 74; **B**, drop the slot to the screen's line,
which keeps the throw but hangs the whole live row below the key; **C**, grow
the glass to the panel's height and print the legend on it. Ben took C, and
asked for `BOIL` to move up beside `TEMP` so the glass could shrink and the
slot grow — which works because the glass is then sized by its digits rather
than by two words side by side.

| | before | after |
|---|---|---|
| glass | 108 pts | 92 |
| slot | 108 pts | 124 |
| screen centre | 37 | 27.5 |
| slot centre | 27.5 | 27.5 |

`100 °C` is 68.4 points inside the glass's 74, and `TEMP` + `BOIL` is 54.9, so
both have real slack rather than fitting to the pixel. The engraving says
`TEMP` and not `WATER TEMP` because the full words are 152 of the panel's 248
points; it is printed beside a key that says WATER and reads out in °C.

The cost is that this is the one label on the console not cut into the panel.
A printed legend on a display is real enough, and it is what pays for the
alignment, but it does sit next to keycaps that are all engraved.

**It broke printing, and that is fixed.** Engraved ink prints; amber on dark
glass does not, because a browser drops background colours on paper and the
glass rasters that would have sat behind the displays are already hidden by
the print rules. Moving the temperature onto glass would have printed it as
pale amber on nothing. The print block now renders the whole `.display` family
— this readout, the clock, the description panel and both DISSOLVED counters —
as ink in a ruled box, and hides the BOIL lamp when it was not lit, since
paper cannot show a lamp as off. Verified by lifting the print block's own
rules onto the screen rather than retyping them: every readout computes to
`--cap-ink` on no background, and the screen rendering is untouched.

Still open: with *background graphics* ticked in the print dialog the console
art prints too, and the readouts then sit as dark ink on their dark recesses.
That is a property of the art-plus-text design rather than of this control,
and it needs a real print preview to settle.

A press on the nameplate used to slam the temperature to the cold end, because
the whole panel is the drag surface — which is what clears the 48 point
minimum when the slot itself is 14. Left of the throw it now only takes focus.

This went through four wrong drafts first: three detented buttons, then a
raised cap with a track printed on it, then the lit bar in the slot, then the
engraved nameplate that knocked the screen off the key's centreline. The first
three read as software. The channel is the first thing in this activity drawn as
recessed hardware in code rather than in the art.

`role="slider"` with `aria-valuetext`, dragged through Pointer Events only —
one path for mouse, pen and the Chromebook touchscreen, with pointer capture
so a finger leaving the control does not drop the drag. Arrow keys move a
degree, Page Up and Down ten, Home and End the ends. Dragging announces only
at the marks, because otherwise it would read eighty numbers on the way up.

### Boiling dry put the water back

Reported from a lesson's-eye view: *"when the water boils and evaporates, the
salt disappears too — the whole point is to show the water evaporates and the
solute doesn't."* Three separate faults, stacked:

1. **The run kept running after it ended.** `boil()` sets `boilLevel` back to
   1 on its way out and calls `enter('loaded')`, which sets the beaker empty
   and the mound back. Control then returned to the rest of the `'running'`
   branch, which stamped `level = boilLevel` and `pileAt = 1 - boilLevel` over
   both — a full beaker and no mound — and since those are only written on a
   state change, they stayed that way. A `if (state !== 'running') return;`
   after `boil(dt)` is the fix.
2. **The field was rebuilt at the dry.** `player.reset()` brought all 70
   solvent particles back, and with the beaker reading full, the dry canvas
   stayed transparent and the live lens showed that rebuilt field. So the run
   ended on a full beaker of water. The rebuild moved to `enter('filling')`,
   where a run starts; the dry now keeps what the boil made.
3. **`settle()` could park a particle at infinity.** `refreshSurface` fills
   empty columns with `Infinity`, which `belowSurface` reads correctly as
   "nothing here" — but `settle` assigned it straight to `y`, and the next
   step turned that into NaN. A column dissolved hollow is exactly the case
   that arises when a beaker boils dry, so by the end **all 50** sugar
   particles were at no position at all and the viewport drew an empty circle.
   They now land on the floor of the domain instead, and the surface is
   rebuilt per particle so the next one sees them.

The first two were the symptom Ben described; the third was underneath and
would have shown up the moment the first two were fixed.

**Verified:** `tools/check-sim.js`, which is new and is the check this should
have had. Stepping to frames 900, 1200 and 1500 is bit-identical to seeking to
them with heat and a boil running, max difference 0, and so is a snapshot
taken at 900, restored and run on to 1200. Then the boil's invariant: 50
solute still there, 50 back on the heap, 0 at a non-finite position, 70
solvent gone. Taking the fix out again fails four of the eight checks, which
is the only reason to trust the other four.

In the browser: the register walks back out as the solid comes back —
44 lit at the peak, then 41, 38, 34, 31, 28, 25, 22, 19, 16, 13, 9, 6, 3, 0 —
and Dispense afterwards gives the same run as Dispense after a Reset
(both 06 dissolved at 05.5 s).

**Verified:** determinism holds with heat and stir together — stepping to
frame 900 is bit-identical to seeking to 900, max difference 0. `heat`
survives capture/restore. No solvent works under the heap at the hottest
setting. A reset re-applies the setting, because the engine clears it and a
hot plate does not switch itself off when the samples change.

**One thing the hottest setting costs:** the wall clamp runs before pair
collisions, so a particle can sit slightly outside the wall for a frame. That
overshoot grows with speed — 0.11 particle radii at 20 °C, 0.26 at 60 °C,
0.42 at 100 °C. The viewport clips it and `overhang` already allows half a
particle out, so nothing is visible, but it is the fixed timestep starting to
show and it is the reason not to push the multiplier much past 2.3.

---

**Not verified:** the print stylesheet is written but I have not seen it
through a real print preview. Touch was exercised through pointer events, not
on actual hardware. Frame cost has only ever been measured on a development
machine, never on a school Chromebook — though the shipping build now draws
240 particles rather than the 1 500 that risk was written about.


## Four fixes after a lesson's-eye look

Reported together: the solid did not come back as a pile, the boiling water
did not bubble, the eyepiece overlay came and went, and stirring sent the
grains round the rim.

### The eyepiece belonged to the model running

The crosshair, the barrel ticks, the vignette and the rim were drawn at the
tail of `Lens.draw`, which only runs while there is a model to draw. Every
state with no water in the beaker shows `drawDry` instead — loaded, filling,
resetting, boiled-dry — and `drawDry` drew none of it. So the overlay was
present during a run and gone the rest of the time, which from a student's
seat is at random. Split out as `Lens.optics`, clipping for itself, and called
from both canvases: the instrument now looks the same whichever is up.

Separately, `.viewport__dry { z-index: 2 }` was escaping. `.layer` is
positioned with `z-index: auto` and so is no stacking context, so the dry
canvas resolved against the stage and painted over `glass-viewport-{s}` as
well. The declaration was dead — the canvases are already in DOM order — so it
is gone. `.scalebar`'s `z-index: 3` is deliberately kept: the scale bar is
meant to be readable through the glass.

The cover glass now lifts for Freeze and only for Freeze, over 220 ms, from a
single `is-frozen` class on the body. Measured both directions: 1 → 0 and
0 → 1 inside 244 ms.

### The pile comes back as the pile

Covered in the README. Baseline was 15 of 50 grains on an original slot with a
worst gap of 0.2368 of the field radius; it is now 50 of 50 at 0.0000, checked
by `tools/check-sim.js` and confirmed in the browser over a real boil.

### Boiling bubbles

Covered in the README. The one correction worth recording: `bottom: 0` is the
bottom of the water layer's *box*, and the beaker floor is `floorFrac`
0.97333 of it — five points higher. Both are now set from `geometry.json` as
`--rise` and `--floor`, so a re-rendered beaker moves them together.

### Stirring: improved, not fixed

**This one is still open and the build should know it.**

It is not the old carousel. That was damping pooling energy into rigid
rotation and was cured by making collisions elastic. This is the opposite
fault: the swirl aimed every free particle at the bare tangent about a fixed
centre, which has no radial component in it at all, and a field all pointing
one way is a rotating body with nothing holding it in. Held for half a minute
it reached a circulation share of **0.999** — rigid — and put 98 of every 100
free grains in the outer quarter of the radius.

Five approaches were measured:

| | result |
|---|---|
| inward lean ∝ r², scaled by heat | fixes the orbit, pulls the field off the glass (edge 1.00 → 0.78) |
| exact centripetal correction | no measurable effect |
| balanced roll about the half-area radius | too weak to beat the coherence |
| cap on the per-step turn | breaks the orbit but collapses the stroke's circulation to 0.07 |
| **circulate about the travelling bar** | **kept** |

The one kept is the honest one: the bar sweeps a circle and the lens has
always drawn it doing so, and the flow now circulates about the bar rather
than about the middle of a beaker that is not going anywhere. `stirReach` is
one number read by both the model and the drawing, so the current and the
thing driving it cannot drift apart.

Measured, held stir, free solute in the outer quarter of the radius:

| | before | after |
|---|---|---|
| 20 °C, 30 s | 0.98 | 0.64 |
| 100 °C, 10 s | 0.98 | 0.60 |
| 100 °C, 30 s | 1.00 | 0.42 |
| edge of the field | 1.00 | 1.00 (unchanged — no ring opens) |
| circulation share | 0.999 (rigid) | 0.756 |

**What is still wrong:** the regime a student is actually in — taps on Stir,
each restarting the stroke — ends at 0.756 of free solute in the outer
quarter, against 0.44 for an evenly spread field and 0.18 at rest. The outward
push happens during each stroke and stays after it. `tools/check-sim.js`
prints this as an open target rather than a failure, so it is in front of
whoever runs it without hiding a real regression behind it.

Two directions remain, and both are Ben's call because both change something
he can see: widen the bar's drawn travel (`stirReach`) past 0.6, which swings
the stroke wider in the viewport; or stop a press restarting the stroke, so a
stir is a stroke that has to finish. A square domain is neither necessary nor
relevant — the wall clamp is a circle because the viewport is, and the fault
was in the flow.


## Three more, and an alignment pass

### The grain was switching on and off with the model

`Lens.draw` lays an optical grain over the field — sensor noise and dust, the
thing that stops a circle reading as a circle drawn on a page. `drawDry` laid
none, so the texture appeared when a run started and vanished when it ended,
which is a visible transition at both ends. Split out as `Lens.grainOver` and
drawn inside whichever clip the caller has set, so both canvases carry it;
measured on the dry frame, the standard deviation of an empty patch goes from
flat to 4.18. Same cure as the eyepiece and for the same reason: a property of
the instrument cannot belong to the model running.

### The water used to land dead

The model was paused until the pour finished, so every drop was lowered into
place motionless and the whole field started moving at once, 1.45 s after the
key. `player.play()` moved from `enter('running')` to `enter('filling')`, so
the field is already in motion while the dry frame lowers each drop onto its
own place in it: a drop moves as it lands, and the cross-fade to the live
canvas is between two moving pictures.

**The clock now starts when the key is pressed**, not when the water has
finished arriving, so every time on the display and in the narration includes
the 1.45 s pour. That is the right reading: the beaker starts holding water at
the top of the pour, not the end of it.

The model itself is unchanged, so the pacing figures elsewhere in this report
are still correct as *model* seconds — what moved is where the display counts
from. A run that takes 42 model seconds to free 40 of 50 now reads about 43.5
on the panel. Nothing needs re-measuring; the two numbers just differ by the
pour, and that is the only place it matters.

Freeze follows the model rather than the state name: `modelLive()` covers
`filling` as well as `running`, because the field is in motion through the
pour and a key that claims to hold the simulation cannot be dead while it is
moving. Holding during a pour stops `stateT` too, so the pour holds where it
is.

### Alignment pass

Audited every box in the manifest against the console frame:

| | |
|---|---|
| the two stations | repeat at **exactly +538**, all 18 layers |
| console side padding | **25 / 25**, even |
| console top / bottom padding | **40 / 32** — uneven by 8 |
| beaker column | viewport, beaker, water, pile, turbidity, head, stir bar all on **244** |
| stir plate | **232** — twelve points left of the beaker standing on it |
| pour stream | **247** — three points right of the nozzle it falls from |
| falling powder | **275** — thirty-one points right of the beaker |

Every placeholder's own art is centred in its own box (ink centre 0.495 to
0.499), so none of these is the art: they are box placement.

**Fixed:** the stir plate moved +12 and the pour stream −3, both stations, so
the beaker now stands in the middle of the plate it is on and the stream falls
from the middle of the nozzle. That is the one a student would notice — the
beaker was visibly sitting right of centre on its plate, with the stand's pole
appearing to hold up the left end.

**Left alone, deliberately, because both are judgement calls rather than
errors:**

- **Console padding 40 top / 32 bottom.** Evening it to 36/36 means moving
  every control, display and viewport up 4 points. A deeper top bezel is
  normal on real hardware, and the layout has been approved as it stands.
- **The falling powder, 31 points right.** It only appears during a reset, and
  an offset may well be deliberate — powder tipped in from a scoop held to one
  side rather than poured straight down the middle.


## The bench, and the sample arriving

### The gap under the beaker was half a point of manifest

Not the art. Every image's ink fills its own box edge to edge — the finished
`beaker.webp` included, measured at ink top 0 and ink bottom 1. The beaker's
box ended at **917.5** and the stir plate's began at **918**, so there were
0.5 points of wall showing between them, which at 2x device pixels is a
visible hairline. The plate's box now starts at 917.5 and is half a point
taller, keeping its bottom on 946 where the stand's pole ends. Nothing to
re-export.

### The instrument stands on the counter now

The plate's feet and the pole both end at **946**; the countertop began at
**963**, so the whole thing floated 17 points above the bench it was supposed
to be standing on. The counter's top moved up to 946 and the wall trim moved
up with it, keeping its own 63-point height (900..963 becomes 883..946) because
it is the joint between the wall and the counter and has to stay on it. Both
copies — `.bleed__bench` / `.bleed__trim`, which run past the safe area, and
`.ground__bench` / `.ground__trim`, which exist so a multiply layer has
something of its own to blend against.

**For whoever paints the counter:** its top edge is stage y **946**, it tiles
horizontally on a 100 x 37 point grid, and everything below its front edge is
`--under-bench`, not the texture — the tile runs sideways only, because tiling
it downwards put a lit edge across the floor every 37 points.

### The fresh sample arrives instead of appearing

A reset used to rebuild the engine and the heap was simply there on the next
frame. It now uses the return the boil already has: `Sim.prototype.liftHome`
throws the packed solid clear of the field, and `returnHome` walks it down
into the slots — so fresh powder going in and recovered solid coming out of
solution are visibly the same substance doing the same thing, and the pile
lands while the beaker's own powder sprite is still falling.

Three things it took to make that read:

- **`returnHome` is its own method, not just a pass inside `step`.** A reset
  cannot step the model: the field is full of solvent that is not in the
  beaker yet, and the fresh sample would dissolve before it had landed. So the
  reset walks the return with the clock stopped.
- **Thrown, not dropped.** A critically damped spring crosses any gap in the
  same time, so lifting the upper rows further changed nothing — all fifty
  landed on one frame, which reads as a thud. They now get an upward throw as
  well, scaled by how high the slot is.
- **Thrown wide as well as high** (1.25x their own offset), so the pile
  gathers itself inward rather than descending in formation with every grain
  holding its column. 1.25 is as wide as the outermost slot can go and stay
  inside the glass.

`settleReturn` dropped from 100 to **30** — a critically damped spring settles
in about four over the root of it, so a little under three quarters of a
second rather than a third of one. The boil's recovery is slower by the same
amount, which suits it: grains arrive there a few at a time and are easier to
follow. The dry waits on `landing()` either way, and a full boil still ends at
50 of 50 slots with nothing stranded.


## The waterline, and the beaker's own silhouette

### A fill level is not a surface

`waterClip` drew the top of the water as a straight horizontal edge, which is
what a fill gauge looks like and not what a liquid does. Water wets glass, so
it climbs where it meets the wall. The clip now carries that climb alongside
the stir dip it already had — one curve, `top + dip·sin(πx) − MENISCUS·(1−sin πx)²`
— and the polygon went from 14 points to 28 so a curve reads as one.

Judged at the size it actually ships: the texture is rendered at 2x and the
stage runs at 0.768, so a beaker is 125 CSS pixels wide. Anything tuned at
100% zoom is tuned for a picture nobody sees. At true size a meniscus below
about 0.015 of the box height is invisible and 0.022 reads.

**It improves the stirring more than the still water.** The vortex used to be
a shallow sag away from a flat line; it is now high at the walls and hollow in
the middle, which is the shape a stirred beaker takes:

| | at the wall | mid-span |
|---|---|---|
| full, at rest | 17.8% | 20.0% |
| full, stirring | 17.8% | 26.4% |
| empty | 98.7% | 98.7% |

The meniscus is scaled by the level. Without that, an empty beaker keeps a
bead of water in each bottom corner, because the climb lifts the line above
the texture's own lower edge — the one place this could go wrong, and it goes
wrong only when the beaker is supposed to be empty.

### The contents are shaped by the beaker, not by the sketch

Reported as "the bottom looks messy at the corners", and it was. The glass has
a thick floor that fillets up into the walls; the sketch draws the contents as
a square-cornered slab. Measured against the shipped beaker, the slab stopped
**5 px above the floor** and drove square corners into a rounded well.

`make-placeholders.py` now measures the beaker it is going to sit inside —
`beaker_interior()` returns the outer walls, the flat inner floor and how far
from each wall the floor stops being flat — and reshapes `water` and
`turbidity` to match, rounding exactly those two bottom corners. On the
current beaker that reads 40..288, floor 369, fillet 28, which is what a hand
count gives. Re-export the beaker and the contents follow it; no sketch needs
touching.

The top edge is left where the sketch put it, because that is the full-beaker
water line and `measure_geometry()` reads it back out — which found a bug
while it was at it: the glob was `water-*.webp` and the file has been
`water.webp` since the station twins were folded onto one name, so it had
quietly been measuring nothing. `floorFrac` moved 0.97333 to 0.98667 as a
result, which is the five pixels.


## The first two photographic textures: the counter and the skirting

Both arrived as PNGs dropped in the activity folder, both seamless sideways,
both deliberately larger than the tiles they replaced because the old ones
repeated visibly. They are the first shipped art that is tiled rather than
placed, and the two needed sizing by different rules.

| | texture | tile, in points | repeats across the 1600 pt stage |
|---|---|---|---|
| counter lip | 1536 x 319 | 768 x 159.5 | 2.1 |
| skirting | 2172 x 630 | 217 x 63 | 7.4 |

**The counter takes its own 2x size**, because it is not height-constrained:
it starts at y 946 and runs down past the bottom of the stage, so a tall tile
costs nothing. Worth knowing, though: at 1366 x 768 only about **41 CSS px**
of it is ever on screen — the top third, the lit edge and the upper face. The
shadow band at the bottom of the texture never shows at that size, and shows
more on a window that is tall for its width.

**The skirting cannot**, because its band is the gap between the wall and the
counter: 883 to 946, and `background-size` stretches it to `100%` of that. So
the height is fixed at 63 points and the *width* is what keeps the bullnose in
proportion — 63 x 3.448 is 217. Sizing it the way the counter was sized would
have squashed it five to one.

Which meant the shipped file is **434 x 126**, not the 2172 x 630 that came in:
2x of a 217 x 63 tile. That is still 2.6x oversampled against the 48 px the
band occupies on screen, so nothing visible is lost, and `--check` can hold the
set to the 2x rule. The full-resolution originals are in `art-source/`.

**Both tile sizes live in the manifest**, which is where the first draft of
this got it wrong: the numbers went into the CSS and `--check` immediately
caught the bench at "1536x319 WANTS 200x74", because `layer-manifest.json` has
carried `bench` and `wall-trim` rows all along and they are what the checker
and the placeholder generator read. The manifest now says `bench [0, 946, 768,
159.5]` and `wall-trim [0, 883, 217, 63]` — which also fixed two rows still
holding the pre-raise y of 963 and 900.


## Four realism passes, costed against a measured budget

Before proposing anything, the budget: the model and both canvases together
take **0.3 ms** of a 16.7 ms frame — 0.043 for two sims stepping, 0.258 for
`player.render()`. Even assuming a Chromebook is eight times slower, that is
under 2.5 ms. Nothing here is JS-bound, so the only thing worth costing is
compositing.

### Less blue, by a number rather than an adjective

Through the glass the water read **rgb(207, 220, 228)**. That is only 9%
saturated — the problem was never lightness, it was that blue sat **21 points
above red**. Over this wall (222 blue against 232 red) a texture gap of 15
lands about 4 on screen, so `WATER_TINT` is (205, 214, 220) and the water now
reads **+4** instead of +21.

The tint lives in `fit_to_beaker()` in make-placeholders.py, beside the
silhouette, because that function already redraws the placeholder's water and
there is no sense in two places deciding what one wash looks like. `WATER_BLUE`
turned out to colour only the pour stream, which is also water, so it moved
with it.

### The turbidity blend was a bug

`.turbidity` was `mix-blend-mode: screen` over a white texture. Screen can only
lighten, so a cloudy calcium-carbonate beaker ended up **brighter than the wall
behind it** — a glass of milk that glows. Suspended solid blocks light, it does
not emit it. Dropping the blend is one word and it is also *cheaper*: the
compositor stops reading the backdrop for that layer every frame.

### Refraction, from the geometry that was already there

The strongest refraction cue a flat elevation can carry is a horizontal line
crossing the glass, and there is one: the skirting's top edge at y 883 runs
straight through the water column, which at full spans 767.5 to 917.5. So the
skirting steps up where it passes behind water and snaps back at each wall —
the broken-pencil read — and it appears and vanishes on its own as the level
crosses 883, because it is clipped by the same polygon the water is.

`refract-{s}` is a new `code` layer sitting immediately behind `water-{s}` in
ORDER, holding the wall and the skirting again, shifted so their tiles land
over the real ones and then lifted by `--refract` (-3px, a little over two
screen pixels at 1366). The counter is not included: its top edge is at 946
and the beaker's floor at 917.5, so it is never behind water.

**The first version cost forty times what it needed to.** Cloning the whole
stage is the obvious way to make the tiles line up, and it rasterises 943,872
pixels per station per frame while the clip animates. Carrying just the two
bands at the layer's own size covers **24,000**. Measured per-frame work is
unchanged at 0.258 ms either way on this machine — but this machine is not the
target, and the difference is not resolvable here because the display caps at
60fps.

Worth recording how that was nearly misdiagnosed: frame time doubled from 8.3
to 16.7 ms when the layer went in, which looks exactly like a regression. It
was not — hiding the layer entirely still gave 16.7, so the tab had simply
dropped from 120 Hz to 60. Always measure the change against itself disabled,
not against a number from earlier in the session.

### A lighting wash on the wall

A single gradient, `--wall-light`, laid over the tile in both copies of the
wall at the same stage geometry — 1600 x 883, stopping where the skirting
starts and the wall stops being visible. No new element, no filter, no
composited layer; it repaints only on resize. It is the cheapest thing in this
set and the one that most stops the room reading as a flat fill.

### What was turned down, and why

- **`backdrop-filter` behind the glass.** Measured: free in steady state, but
  a 325 ms stall when the layer is created. Rejected for a better reason than
  cost — a tiled wall and two flat bands have no detail to blur, so there is
  nothing back there for it to do.
- **Parallax, on any driver.** `.bleed__wall` ties its background-position to
  `--ox`, it needs a pointer in a room of broken trackpads, it fights
  reduced-motion, and at a magnitude that would not feel cheap nobody sees it.
- **A screen vignette.** Measured against the real boxes: it would put the
  notebook's top-right corner in shadow.
- **Giving the water surface a far edge.** It would reintroduce exactly the
  viewpoint contradiction the beaker was redrawn to remove.


### Both of those needed a second pass

Reported after a look at the real thing: *"the water isn't visible against the
white background at all, and the refraction just affects the tile rather than
what's behind the water."* Both right, and both the same underlying mistake —
tuning against an assumed background instead of the one on screen.

**The wall is 239 grey, not the 232/230/222 the sums were done against.** The
first tint landed the hue correctly and the tone not at all: the water came
out **17 points** darker than the wall, which at the 125 px a beaker occupies
is nothing. The beaker just looked empty. `WATER_TINT` is now (174, 182, 188)
— **34 points** darker, hue gap still only +8. The lesson is that what makes
water visible is tone, and only the hue had been measured.

Water as `mix-blend-mode: multiply` was tried and looks better than a wash,
because it darkens whatever is behind rather than washing it pale — over the
skirting the wash lifts a 45 grey to 114, which is the one place the current
answer is still wrong. It was not taken because the boil bubbles are children
of the water layer: a multiplied group swallows them, and a white bubble
multiplies to nothing. Worth revisiting if the bubbles ever move out.

**The refraction was moving the wrong thing.** It carried the wall as well as
the skirting, and the wall is a near-uniform 239 whose only feature is its
tile seams — so the only visible result was a seam jumping three pixels, which
reads as a rendering fault, not as water. Refraction needs an edge to bend.
The wall band is gone; the layer now holds the skirting alone, which is the
one edge the water actually crosses. That also halved what it rasterises
again, and made the fix smaller than the thing it replaced.


### A third pass: two faults I introduced, both the same shape

**Calcium carbonate stopped clouding.** `fit_to_beaker()` is shared by the
water and the turbidity, because they share a silhouette. Putting `WATER_TINT`
inside it therefore painted the cloud the water's grey — (174, 182, 188)
instead of white — so a stirred calcium carbonate beaker looked like slightly
darker water and nothing else. The tint is now an argument, passed only for
the water. A shared function acquiring a caller-specific constant is worth
watching for: the silhouette genuinely is shared, the colour never was.

**The refraction still overran the glass.** The clip polygon `waterClip()`
builds spans the whole layer box, 0% to 100% — it is the *waterline*, not the
glass. The water texture gets its sides from its own alpha, which a
background-filled element has none of, so the lifted skirting ran **20 points
past each wall** and hung in the air beside the beaker.

The sides now come from `geometry.json`, which gains `leftFrac` and
`rightFrac` — read off a bbox `measure_geometry()` was already taking and
throwing half of away. The band clips to `inset(0 var(--wr) 0 var(--wl))`,
12.308% and 11.077% on the current texture. Anything else ever placed in that
box, rather than masked by the water texture, will need the same.

The updated skirting (2172 x 704, aspect 3.085) retiles at **194 x 63** rather
than 217, by the same rule as before: the band's height is fixed by the gap
between wall and counter, so the width is what holds the profile.


## The swirl, finally diagnosed

Reported as critical: *"the sugar and water particles still swirl in a circle
after a while — they don't behave like particles at all."* Correct, and the
two earlier attempts had both been aimed at the wrong thing.

**It is not a centrifuge and it is not the old carousel.** Watched for ten
minutes of model time: never stirred, the circulation share wanders around
±0.14, which is a gas. Stirred every 8 seconds, it reaches **+0.97 inside two
minutes and holds there for the remaining eight**, solvent and solute alike —
a rotating solid body, which is exactly what the report describes.

**The first hypothesis was wrong and the measurement said so.** A circular
domain with elastic walls conserves angular momentum, so the obvious story is
that nothing can ever remove it. Not true: stir once and leave it alone, and
net angular momentum falls from 43.9 to 5.9 inside a minute. It decays. The
fault is a rate mismatch — one 1.6 s stroke lifts circulation from 0.08 to
0.60, the decay takes most of a minute, and a student pressing Stir every few
seconds injects faster than the model drains.

`spinDrain` fits one rigid-body rotation to the field each step and removes 5%
of it. Only the coherent part goes, so thermal motion is untouched and a
stroke still peaks at 0.73 against heat's 0.03. No rng draw, so an unstirred
run stays bit-identical.

| free solute, 30 s of stirring | before | after |
|---|---|---|
| tap every 8 s | outer 0.57, circ +0.42 | outer 0.44, circ +0.03 |
| tap every 3 s | outer 0.66, circ +0.94 | outer 0.52, circ +0.12 |
| held down | outer 0.64, circ +0.65 | outer 0.80, circ +0.66 |

0.44 is exactly an evenly spread field. Holding the key down is the one regime
the drain makes worse, and `check-sim.js` prints it as an open target rather
than quietly passing. The remaining work, and everything else outstanding, is
in `docs/explore-dissolving-next.md`.
