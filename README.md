# Science Activities

Replacements for the publisher's online activities, built to work on the
hardware my students actually have.

## Layout

```
src/                              everything that ships
  index.html                      landing page
  kit/kit.css                     design tokens + the shell every activity uses
  kit/kit.js                      popover, tablist, walkthrough, announcer
  kit/fonts/                      Jost, IBM Plex Mono, Patrick Hand — subset, local
  engines/particle-sim/sim.js     deterministic particle model
  engines/particle-sim/view.js    canvas lens + playback controls
  activities/<name>/              one activity: markup, styling, config

tools/make-placeholders.py        rebuilds placeholder art from the sketches
CLAUDE.md                         the rules, for me and for Claude
docs/STACK.md                     why it is built this way
docs/all-text.txt                 every word a student can read, in one place
docs/sketches/                    to-scale layout sketches + the layer manifest
```

Only `src/` is the deliverable. Everything above it is project notes.

Nothing in `kit/kit.js` is used by Explore Dissolving since the rebuild — the
tablist, the popover and the walkthrough all went with the features they
served. They are left alone until a second activity says whether they survive.

## Running it

Double-click **`serve.command`**. It serves `src/` on port 8765, opens the
browser at it, and stops when you close the window or press Ctrl-C — the
server runs in the foreground, so there is never one left behind. If the port
is already taken it names what has it and asks before stopping it.

The same thing by hand:

```bash
python3 tools/serve.py 8765
```

Then open <http://localhost:8765>. No build step and no package manager yet —
what is in `src/` is what gets served. Vite arrives at Phase 1.

`tools/serve.py` is the dev server, and it sends `Cache-Control: no-store` on
everything. That one header is load-bearing. A plain `python3 -m http.server`
sends only `Last-Modified`, so a browser falls back to heuristic freshness —
about a tenth of the file's age — and holds a day-old placeholder as fresh for
hours. Drop a new texture in over it and the browser does not even ask the
server: you reload and you are still looking at the old picture. That has cost
this project a confused half hour over a wall texture, and before that a
simulation was nearly retuned against numbers measured from a stale `.js`.

With `serve.command` a plain reload is enough, and what is on disk is what the
browser has. If you ever serve this another way, the hard-reload rule comes
back with it.

**One hard reload, once.** `no-store` stops the browser caching from now on;
it does not evict what is already in there. Anything cached by an earlier
plain `http.server` stays cached — the browser does not request it, so it
never sees the new header — and that was the whole bug. The first time you
load after switching servers, hard-reload (Cmd-Shift-R) to clear the old
entries. After that, plain reloads are enough for good.

**Each query string is its own cache entry.** If a page is so stale that it is
missing a script added since — which looks exactly like the script being
broken — loading it with any query string you have not used before, say
`?debug&new=1`, sidesteps the stale copy entirely and fetches fresh. That is
the quickest way back in, and it is how this was diagnosed after two wrong
guesses at a keyboard shortcut. The debug menu's **Clear cache and reload**
then flushes both the address you are on and its query-less twin, which are
separate entries.

## Hosting

Copy `src/` anywhere that serves static files. No server side anything.

Paths are relative, so keep the folder intact — `kit/` and `engines/` must
stay where the activities expect them.

**It no longer runs from `file://`.** Explore Dissolving fetches
`layer-manifest.json` so that the manifest stays the single file I re-export
beside a set of renders, and a browser refuses that over `file://`. The
activity says so plainly rather than showing an empty bench. For a sub, that
means a link to the hosted copy, not a ZIP on a stick.

## Design rules

The full list is in `CLAUDE.md`. The short version:

- **Pointer Events, never mouse events.** A touchscreen Chromebook is neither
  a desktop nor a phone, and mouse-only handlers fail on it silently.
- **Every interaction has a keyboard path.** Half the trackpads in the room
  are broken by March.
- **48px touch targets**, from the `--tap` token. A fixed-stage activity
  measures these in safe-area points instead, which is not the same thing
  once the stage is scaled down — see below.
- **One screen.** Title, one line of instruction, the stage, the controls.
  Anything else is below the fold or behind a `?`.
- **No CDN, no external fonts, no analytics, nothing fetched at runtime.**
  The publisher's version pulls a runtime Google discontinued in 2016 from
  `gstatic.com` at lesson time. That is the thing being fixed. Fonts are
  subset and vendored into `kit/fonts/` instead; all three are OFL and their
  licences sit beside them.
- **Colours are tokens**, declared once in `kit/kit.css`.
- **Dark mode works** — except on a fixed-stage instrument, which has one
  appearance by design. A beige console on a grey tiled wall has no dark
  counterpart; Explore Dissolving sets `color-scheme: light` and declares its
  own palette.
- **It prints**, for absent students.

## Adding an activity

If the activity is a page — a stage, some controls, a panel or two — copy
`src/activities/` from an activity of that shape and strip it back. The shell
markup and the controls come from the kit.

If it is an *instrument* like Explore Dissolving, the kit gives you much less:
it is a fixed stage with its own layer system, and almost all of it is content
and configuration over `instrument.js`. Copy that folder instead, and expect
to supply a layout manifest and a set of layer images.

If it involves particles in a liquid or a gas, build it on `particle-sim`
rather than writing new physics — see the engine notes in `CLAUDE.md`.

## About Explore Dissolving

`engines/particle-sim/sim.js` is a real model, not a recorded animation.
Water particles move, collide, and occasionally knock a solute particle off
the pile. Whether anything dissolves is an outcome, not a script.

Two properties are worth preserving if you edit it:

- **It is deterministic.** Same seed, same frame, same picture. That is what
  makes the two stations a fair test — both run identical water and differ
  only in the solute — and what lets `seek(n)` stand in for n steps. The rng
  call order is load-bearing; changing it silently moves every tuned number.
- **Solubility is one number.** `breakChance` in `activity.js` is the chance
  a hard enough collision frees a surface particle: `0.08` for sugar, `0` for
  calcium carbonate. A third substance is one more row and one more station.

A particle counts as on the surface when nothing sits above it. That is what
makes the heap erode from the outside in rather than evaporating evenly.

### Two builds, one switch

`TO_SCALE` at the top of `activity.js` picks between them.

**Schematic**, which ships. Every particle is the solute's size — 0.90 nm in
a 6.79 nm field — and there are 70 water to 50 solute. A collision is
something a student can watch happen, which is the point: water hammers the
solid apart and carries the pieces off.

**To scale**, kept for a lesson that is about scale. Water is 0.28 nm, a
third of the solute's span, and it takes 700 of them to fill the field to the
same occupancy. It is honest and close to unreadable — the water is dust.

Each build carries its own water count and its own `breakChance`, because
both follow from how hard the pile is being hit. Occupancy is about half the
field either way, so neither looks emptier than the other.

Both are gases — particles fly between collisions. Making the field settle and
slide like a liquid was tried, by damping the collisions, and it works and also
sets the whole viewport slowly rotating; the build report explains why those
are the same effect and not separable. A collision carrying energy into the
solid is the thing this is for, so it stays a gas. **The scale bar measures the solid
honestly in both, and the water only in the to-scale one** — in the shipping
build the water is knowingly drawn oversized, the way a textbook diagram does
it.

`SOLVENT` is the number to turn down if a school Chromebook struggles. The
cost is in drawing the particles, not in the collisions.

### The screen is one instrument, at a fixed size

Everything lives inside a **1600 × 1000 point safe area**, scaled uniformly to
fit the viewport and centred. Nothing reflows. The wall and the bench bleed
past the safe area to fill whatever is left over — sideways on a 16:9
Chromebook, above and below on a 4:3 iPad.

JavaScript sets exactly three numbers on `:root`: the scale and the two
offsets. Everything else is CSS, in points.

**Every position comes from `layer-manifest.json`,** which is exported
alongside the art. If a number looks like a coordinate and is not in the
manifest, it is wrong. That is what makes a re-render a pure file swap.

**Layer outlines** in the debug menu outline every layer and label it with its
id — which is how a fresh set of renders gets checked against the manifest
without measuring anything.

### Blend modes

A manifest row can carry `"blend"`, which `instrument.js` applies as
`mix-blend-mode`. The beakers use `multiply`, so photographed glass darkens
what is behind it instead of needing its transparency masked by hand.

That only works because of `.ground`: the stage is scaled, a transform makes
a stacking context, and a stacking context is an isolated group — a layer set
to multiply blends with its siblings and with nothing behind the stage. The
wall lives in the bleed, outside it, so until `.ground` repainted the same
wall, trim and bench *inside* the stage, multiply had nothing to act on and
did exactly nothing. The two draw the same image on the same 100-point grid
and meet without a seam.

Worth knowing when adding one: the blend sees only what is inside the stage
and below the layer in paint order. `ORDER` in `instrument.js` is that order —
not the order rows appear in the manifest, which is a different thing and easy
to misread.

### Two sets of art

`assets/layers/` is the finished renders and is what ships.
`assets/layers-placeholder/` is the generated stand-ins. A layer loads from
the finished set when that set has the file and from the placeholder set when
it does not, so **the bench is whole at every stage of making the art** —
drop in one render and only that one changes.

The dev server answers `?list` on a directory with its filenames as JSON, and
that one request is how the activity knows what the finished set holds. Asking
for each file instead would mean a 404 per render not yet made — 38 red lines
in the console while the art is in progress, which buries the errors that
matter. Served without that endpoint, the finished set is assumed complete and
nothing falls back, which is correct in production.

`geometry.json` and `index.json` describe the layout rather than the pictures,
so a set without them borrows the placeholder set's. The tab title names the
set whenever it is not the finished one.

Nothing names an asset folder in CSS. The lamps used to, and they were the one
thing that broke when the folders were renamed — everything goes through
`Instrument.prototype.url` so it all gets the same fallback.

### The debug menu

Load any page once with `?debug` and this machine remembers it. From then on
a small **DEBUG** tab appears on the right edge of every page on the site.
Click it for a menu: switch the texture set between finished and placeholder,
turn the instrument's keyboard shortcuts off, show the layer outlines, clear
the cache and reload, or lock the machine again. The **backtick** key does the
same, and Escape closes it.

The tab exists because a key was not enough. Backtick is taken in some
browsers, modifier chords in all of them, and a keyboard layout can move a
character anywhere; three attempts at a key each failed somewhere. A thing you
click cannot be taken away by any of that. It is only rendered once the
machine is unlocked, so a class never sees it — and it doubles as the test,
since a tab that is not there means the script is not running and no key would
have worked either.

The unlocking visit opens the menu straight away, so that step proves itself:
if nothing appears, the script is not running — an old cached copy, most
likely — rather than the key being wrong. **Each browser unlocks separately**,
since the flag lives in that browser's own storage.

Backtick because every modifier chord worth having is already taken by one
browser or another — Ctrl-Shift-D was, in all of them — and a bare key no page
uses for anything is the one thing nothing argues over. It matches on the
physical key as well as the character, so a layout that puts backtick
somewhere other than left of the 1 still works. It is ignored while a text
field has focus.

A school Chromebook never had the unlocking visit, so the chord does nothing
there and a student cannot wander into it. Settings live in one `localStorage`
key, so they survive reloads and apply across pages.

`?assets=<folder>` still loads a third set by name for a one-off comparison,
and beats the menu.

`?debug` also exposes `window.__dissolving`: `hold()` takes the clock off the
display, `step(dt)` advances one frame by a known amount, `press(name)` hits a
key, and `read()` returns the whole state. A browser that is throttling frames
cannot be timed, but a known `dt` always lands on the same numbers, which is
how the fill and reset sequences are checked.

### Placeholder art, and replacing it

`tools/make-placeholders.py` isolates each layer from the sketches in
`docs/sketches/`, renders it with headless Chrome at 2×, and writes
`assets/layers-placeholder/{layer-id}.webp` at exactly its manifest box. Real
renders go in `assets/layers/` beside it, one at a time, with no code change.

The PSDs to paint in are in `art-source/`, already at the right canvas size —
4× the manifest box, so an export at 50% lands on the shipping size exactly.
`art-source/README.md` covers the rest, and `tools/make-source-psd.py`
rebuilds them from the manifest if a box ever moves.

**Export at 2× the manifest box.** That is the rule for every file: a layer
whose `box_1x` is 162.5 × 187.5 ships as a 325 × 375 `.webp`. Sprite sheets are
2× the box per frame, laid side by side — the stir bar is 12 frames, the pour
and powder 8 each. There are no other exceptions: the three layers that repeat
(`wall`, `wall-trim`, `bench`) have a box describing one tile, and the file is
2× that like everything else.

Author as high as you like and downsample to that. 2× is the ship size because
the stage scales to fit: a 1366 × 768 Chromebook renders the 1600 × 1000 safe
area at 0.77, so it is already throwing away more than half of a 2× file, and
3× would cost it memory it does not have for detail it cannot show. At the
other end, a 16-inch MacBook Pro and a 4K panel both land at 2.16 device pixels
per point — a 7% shortfall against 2×, which is invisible. Only a 5K display
(2.88) would see the difference, and nothing in the room is one.

```bash
python3 tools/make-placeholders.py            # everything
python3 tools/make-placeholders.py console    # just ids that match
```

`--check` measures a set against the manifest instead of rendering one, which
is how an export gets confirmed before you wonder why a layer looks soft. It
reports anything the wrong size, anything not made yet, and any file sitting
in the folder that nothing loads — a misnamed render shows up there. It exits
non-zero if a file is the wrong size.

```bash
python3 tools/make-placeholders.py --check                     # the finished set
python3 tools/make-placeholders.py --check layers-placeholder  # the stand-ins
```

It also writes `assets/layers-placeholder/geometry.json`, which records where the water
surface sits inside the beaker box — **measured off the rendered texture, not
typed in**. A full beaker stops at the 250 mL graduation rather than the rim,
so re-rendering water with the line somewhere else keeps the fill and the
vortex on the surface by itself.

Two quirks worth knowing before touching that script: Chrome writes the
screenshot and then never exits, so it is killed once the file stops growing;
and `key-freeze-down` exists in no sketch, so it is synthesised from the up
cap using the same offsets the stir and reset caps use between their states.

### Five states, and no Play button

Loaded → **Dispense water** → Filling → Running, with **Freeze** latching
Running in place and **Reset** returning any state to Loaded over 3 seconds.

There is no end frame and no transport. `duration` survives only as a clamp.
The clock starts when the beakers finish filling, not when the key is pressed,
so every run begins from the same moment and two runs can be compared by it.

Reset is a sequence, not a jump: the lights cascade off from the end backwards
and the readings roll to zero in the first 0.3 s, the beakers drain by 1.6 s,
sit empty until 1.8 s, take fresh powder until 2.8 s, and the Dispense key
pops back up amber at 3.0 s. The engine itself is reset mid-refill, as the
powder starts falling, so the viewport has its new pile while the mound is
still growing in the beaker.

Three things the drain gets right because getting them wrong looked wrong:

- **It empties downward.** The level falls on a Torricelli curve — fast when
  the beaker is full, crawling at the end — and in the viewfinder whatever the
  falling surface uncovers drops out through the floor. Replaying the pour
  backwards instead reads as the water being sucked back up the nozzle.
- **It drains from where the water actually stood.** Resetting a beaker that
  holds nothing does not conjure a beaker full of water to empty.
- **Dry powder tips out rather than blinking.** With no water to carry it off,
  the old mound gets the last 0.45 s of the drain to leave before the fresh
  sample falls.

### Two variables, and why they must not look alike

A student can change two things: the water temperature and whether it is
stirred. Both speed the dissolving up, and in the model they work differently
**on purpose**, because they are different in nature.

**Heat** is thermal. `sim.heat` multiplies `cfg.speed`, which the engine
already calls "effectively temperature", so every particle moves faster in
its own direction and the field jitters harder all over. A slider, continuous
from 20 °C to 100 °C, mapped linearly onto ×1 to ×2.3 — temperature is a
continuous quantity and sliding it up is the gesture that matches raising it.

**Stirring** is bulk flow. `cfg.stirSwirl` turns particles onto a shared
circular path for the length of a stir and leaves their speed alone. The
beaker reads as a current rather than a swarm.

The first draft had a stir simply raise the same speed number heat does. That
produces the right outcome by the wrong mechanism, and what it quietly teaches
is that stirring warms the water. Measured circulation as a share of all
motion: **0.79** stirred against **0.03** heated. They now look as different
as they are.

The temperature multipliers are schematic and the build report says so:
particle speed goes as the square root of absolute temperature, so 20 °C to
100 °C is really about 13% faster — true, and invisible.

It is drawn as the hardware it is pretending to be, in two parts on one line:
a readout, then the channel the actuator rides in. `--channel`, `--fader` and
`--fader-lit` are the slot's tokens; the layer itself has no background, so
the surface the cut is in is the console art.

The temperature is shown **on a screen** — the same glass, bezel and amber as
the instrument's other displays, in a smaller part — because a panel
engraving does not change, and because the number has to be something the
bench is telling you rather than something the page is saying. A `BOIL` lamp
sits beside the legend, dark until the water reaches 100 °C. There is no lit
bar running down the slot: a slot is a hole, and light does not come out of
one.

**Everything is on one centreline** — the screen's, the slot's and the WATER
key's, all at y 147.84 at 1366 wide. That is what the legend being printed on
the glass buys: a nameplate above the screen would push the screen off the
line the keys sit on, and a nameplate beside it would eat the throw. It says
`TEMP`, not `WATER TEMP`, because the full words are 152 of the panel's 248
points; it is printed beside a key that says WATER and reads out in °C.

The glass is 92 points wide and the slot 124. The glass is sized by its
widest reading: `100 °C` is 68.4 points inside 74.

Ticks at 20, 60 and 100 °C, and the **H** key jumps between them. The
instrument is a fair test, so results are only comparable when two students
used the same temperature; the marks are there so the three the lesson
actually compares can be hit exactly, while the slider in between stays open
for "what about 45?". 100 °C is the boil, so that end of the track means
something.

### Boiling it dry

Left at 100 °C the water goes. After `BOIL.onset` seconds the level starts
falling, and over `BOIL.dry` more it reaches nothing. Two things happen in
step with it:

- **Water leaves from the top.** `sim.evaporate(n)` flags the highest free
  solvent particles as `gone` — out of the physics and out of the drawing.
  They are flagged rather than spliced out because `capture()` indexes the
  particle array by position, and a snapshot taken before the boil has to
  restore onto the same array.
- **The solute comes back.** Only as much can stay in solution as there is
  water to hold it, so as the level falls `sim.settle(n)` drops the lowest
  free particles onto the heap and makes them solid again. The counter falls
  with the level, and the mound grows back in the beaker.

When it is dry the instrument is back at Loaded with the samples as powder,
because that is what is actually in the beaker. **That is the point of the
whole sequence: dissolving did not destroy the sugar, and here it is again.**

**The field is not rebuilt when it dries.** What is on screen at the end is
the simulation's own result — every solvent particle `gone`, every solute
particle back on the heap — and not a fresh one that happens to resemble it.
The rebuild that starts a run lives at the start of a run instead, in
`enter('filling')`, so pressing Dispense after a boil gives the same fair-test
field as pressing it after a Reset. Rebuilding at the dry is what used to put
the water back at the exact moment the point was being made.

**The solid comes back to the pile it started as.** `packPile` lays each grain
in a slot it computes without the rng, and keeps that slot on the grain
(`homeX`/`homeY`). When the water goes, `settle` aims a grain at its own slot
and `step` walks it there on a critically damped spring, so the heap is
rebuilt rather than heaped up wherever the water happened to leave it — and
the end of a boil is position-identical to frame 0, which is what makes
Dispense afterwards a fair test rather than a different one. Nothing new goes
into the snapshot: x, y, vx and vy already travel in it, so a scrub through a
return resumes mid-flight. Reduced motion is handed the slot with no journey.

The same return fills a fresh beaker. On a reset, `liftHome` throws the packed
solid clear of the field and `returnHome` walks it back down, with the clock
stopped — a reset cannot step the model, because the field is full of solvent
that is not in the beaker yet and the new sample would dissolve before it
landed. So powder going in and solid coming back out of solution are the same
motion, which is the honest thing for them to be.

Three things fall out of it and are easy to get wrong:

- A grain in flight is **not part of the heap**, so `refreshSurface` skips it.
  Counting it would stand a surface column up in mid-water and clamp the
  remaining solvent above it.
- A grain in flight is **not exposed**, so the water cannot dissolve what the
  boil is in the middle of recovering. Without that, 18 grains a boil were
  knocked loose again and the heap never closed.
- The last grains are **always** still travelling when the water runs out, so
  the dry waits on `sim.landing()` before it stops the clock — checked before
  the temperature, or a hand on the slider during that second strands the run
  with a half-rebuilt heap.

**The clock starts at the keypress.** The model runs from `enter('filling')`,
not from `enter('running')`, so the field is already moving while the pour
lowers each drop into it — a drop is in motion as it lands instead of the
whole field starting at once when the beaker is full. Every displayed time
therefore includes the 1.45 s pour.

**The grain and the eyepiece belong to the instrument, not to the run.**
`Lens.grainOver` and `Lens.optics` are both called from the live canvas and
from the activity's dry frame, so neither appears or disappears when a run
starts or ends.

**The boil bubbles.** Eighteen CSS circles a beaker, children of the
`water-{s}` layer so the water's own clip-path is the surface they burst at
and a falling level needs no second mask. `--boil` rides `boilT`, which
already ramps up over 2 s at 100 °C and decays twice as fast below it, so
there is no second clock. `--rise` and `--floor` come from the same
`geometry.json` the surface is drawn from, so no coordinate lives in the CSS.
Transform and opacity only, paused by Freeze and by reduced motion.

The checks that keep this honest are in `tools/check-sim.js`:

```bash
node tools/check-sim.js
```

Stepping to frame N against seeking to frame N, across heat and a boil and a
snapshot restored mid-boil, and then the boil's own invariant: 50 solute
particles still there, all back on the heap, all at a real position, and 70
solvent particles gone.

**One caveat worth knowing before teaching it.** This is honest for salt,
which really does recrystallise when its solution is boiled dry. Sugar does
not — it caramelises and then burns, and what is left is not the sugar you
started with. The model shows clean recovery for both. If that matters for
the lesson, the sugar station is the one to be careful about.

Calcium carbonate needs no special case: it never dissolved, so there is
nothing to come back, and boiling simply leaves the heap where it was.

### One stir phase, however many things read it

`Stir` does two things: it speeds the water up for `stirSeconds`, and it
starts a gesture that `sim.stirProgress()` reports as
`{ strength, turns, x, y }`. Everything that moves during a stir reads that
one call, so the physics and the picture cannot drift apart.

Three things read it now: the stir bar sprite, whose spin rate is
`strength × 6` turns a second; the vortex, which dips the top edge of the
water mask up to 12 points in the middle and eases flat as the bar slows; and
the keycap, which stays pressed for as long as the stir lasts.

Stirring a **dry** beaker is the exception, because there is no model to ask:
nothing dissolves, so the activity plays a damped shove of its own for 0.75 s
and spins the bar from that instead. The beaker's mound and the viewfinder's
heap both take it, or the two views would disagree about whether the key did
anything.

Under `prefers-reduced-motion` there is no shove: the powder is simply left
leaning to one side, and the next stir tips it back. The stir still reads as
having done something, with nothing animating to say so, and the lean clears
as soon as water arrives so the dry canvas still matches the live field it
hands over to.

The envelope opens from zero and closes back to zero, so a stroke begins and
ends exactly where things rest. That is why a repeated press extends a stir
rather than restarting it mid-swing.

**The spoons are gone.** `view.js` still draws a large blurred stirrer
whenever the model is stirring — this instrument stirs magnetically from a bar
on the beaker floor, so the activity passes `stirrer: 'rgba(0,0,0,0)'` in its
palette and it draws nothing. The engine is untouched; the stir is still
visible in the field, as faster particles, which is the physics. Same trick
for the engine's built-in scale bar: the activity passes no `opts.scale`, so
the engine draws none, and the `1 nm` bar is drawn in the DOM on the dark
plate it needs to stay legible over the particles.

### The solvation shell is built but switched off

`particle-sim` can cage solvent around a freed solute (`shellSize`, with
`shellPull` and `hydratedDrag` to tune it). It works and it is physically
right — six water to one sucrose, which is also exactly how many equal
circles fit around one in two dimensions — but **this activity runs with it
off**, because the cages turned every freed particle into a slow seven-particle
clump and the solution visibly stopped mixing.

It is not dead code to delete on sight: it defaults to `shellSize: 0`, is
fully guarded, and runs nothing when off. Turn it on for an activity where
the cage is the point and the particle budget can carry a 6:1 ratio.

### The notebook is data, not code

Objectives and challenges live in two arrays in `notebook.js`. Each item names
an event on the activity's bus, an optional condition on that event, and the
line it writes into Observations when it fires:

```js
{ id: 'obj-first-free',
  text: 'Watch one sugar particle break free.',
  trigger: { event: 'particleFreed',
             when: function (d) { return d.substance === 'sugar'; } },
  completion: 'A sugar particle broke away from the pile.' }
```

The bus emits `dispensed`, `fillComplete`, `particleFreed`, `allDissolved`,
`stirStarted`, `stirEnded`, `frozen`, `unfrozen`, `resetStarted`,
`resetComplete`, `identified`, `particleSelected`, `predicted` and
`itemComplete`, and `allComplete` once every item is done. Nothing listens to `allComplete` yet;
it is the hook the payoff hangs off.

A **prediction** item renders tappable choices and records the answer, and
only then becomes eligible to complete — the point is to commit before you
find out.

The items shipped today are deliberately placeholders. They exist so the
mechanism can be tested and are meant to be replaced.

Observations are written on the paper's own ruled lines, and the lists above
them are clipped to the space before the first rule, so writing can never run
over the ruling. Six placeholder items leave about one spare line of that
space, so a much longer real list wants smaller writing or fewer items.

### Everything is identifiable

Hovering an object names it in the readout, focusing a control names it, and
on a touchscreen a tap names it — a tap on a key both presses it and names it,
because there is no hover to fall back on and no second tap to spend. Only a
mouse takes the name away again.

Particles are hit-tested against the engine's own positions, read-only, so a
sugar particle reports whether it is still held in the pile or dissolved, and
whether it is buried or on the surface.

The full list of what everything answers is in `docs/all-text.txt`, which is
the file to edit when the wording changes.
