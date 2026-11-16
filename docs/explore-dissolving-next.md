# Explore Dissolving — where it stands, and what is open

Written at the end of the session that added heat, boiling, the recovered
mound, the bubbles, the first photographic textures and the water optics. The
next session opens with a ponytail audit; this is what the audit should know
before it starts.

---

## The plan, decided at the end of the last session

The audit runs first. Then **the objectives and the notebook**, and nothing
else — the textures, the trim and the substance toggle all wait.

**Build it bespoke, inside `explore-dissolving`.** Not in the kit. This is the
project's own rule and it applies to itself: three real activities tell you
the shape of a notebook, one does not. Let activities 2 and 3 pull on it, then
lift what survives.

**Settle this before writing a single objective:** are there going to be more
substances than sugar and calcium carbonate? The toggle gets *built* after the
objectives, but its existence has to be decided before them, because it is the
difference between objectives written per-substance and objectives written
once, generically. That is Ben's call and it is the first question of the
session.

**One decision hides inside the objectives work.** Explaining why calcium
carbonate clouds and sugar does not may require the model to represent
particle size, which it currently does not — a solute particle breaks free
whole or not at all. If the explanation lands on "the water breaks the sugar
into pieces too small to see", that is an engine change, not a copy change,
and it should be recognised as one before the copy is written around it.

**The stir is fixed and carries in nothing.** It was not fixed by the stroke
cooldown we chose — see the next section, which is worth reading, because the
reason is that the target we were aiming at was the wrong number.

---

## The swirl: diagnosed, mostly fixed, one regime still open

This was the critical one and it is worth reading even if nothing else here is.

**It was not centrifuging, and it was not the old carousel.** Measured over ten
minutes of model time, a field that is never stirred wanders around a
circulation share of ±0.14 — a gas, which is right. Stirring every 8 seconds
drove it to **+0.97 within two minutes and held it there for the remaining
eight**, both solvent and solute alike. At that point the field is not a
liquid of particles, it is a rotating solid body, which is exactly what "they
don't behave like particles at all" describes.

**The cause is a rate mismatch, not a missing sink.** My first hypothesis —
that a circular domain with elastic walls conserves angular momentum, so
nothing could ever remove it — was wrong, and the measurement said so: after
one stroke, net angular momentum falls from 43.9 to 5.9 within a minute. It
does decay. But one 1.6 s stroke lifts circulation from 0.08 to 0.60, and the
decay takes the better part of a minute, so pressing Stir every few seconds
injects far faster than the model drains and it saturates.

**The fix is `spinDrain` (0.05)** in sim.js: fit one rigid-body rotation to
the whole field each step and remove 5% of it. Only the *coherent* part goes,
so thermal motion is untouched and a stroke still reads as one flow. It adds
no rng draw, so a run that never stirs is bit-identical.

Free solute after 30 s of stirring, by how hard a student leans on the key:

| | before | after |
|---|---|---|
| tap every 8 s | outer 0.57, circ +0.42 | **outer 0.44, circ +0.03** |
| tap every 3 s | outer 0.66, circ +0.94 | **outer 0.52, circ +0.12** |
| **held down** | outer 0.64, circ +0.65 | **outer 0.80, circ +0.66** |

0.44 is exactly what an evenly spread field gives. Live, after five taps,
circulation reads 0.028 and is still 0.049 five seconds later.

**Fixed, and not the way we expected.** Five designs were built and measured
against every press rhythm a student can produce, then each was attacked.
Every one of them was refuted, including the stroke cooldown we had chosen on
reasoning alone — so the panel was worth running.

Two things came out of it that matter more than the designs.

**One: `outerShare <= 0.50` was never a sound target.** It is a cumulative
dose that does not drain, and it divides by the number of freed grains. So
throttling the stir frees fewer grains, leaves the survivors sitting at the
rim, and pushes the number *up*: a six-second lockout made the lesson's own
8 s rhythm *worse*, 0.444 to 0.600. At a fixed stir dose the thirteen rhythms
read 0.422 to 0.611 — a spread wider than the distance to the bar we were
chasing. Coherent **circulation** is what a student actually sees, it is what
"they swirl in a circle" describes, and it decays in about 120 frames, so it
behaves. That is the bar now.

**Two: the problem was much wider than the held-stir row.** Every rhythm from
half a second to two seconds apart was broken, worst 0.860 at every 30 frames
— and `every 96f`, strokes strictly back to back with no overlap at all, was
still 0.840. So a rule that merely stops a stroke restarting mid-stroke
cannot fix it, which is exactly what the chosen cooldown was. Mashing every
frame, meanwhile, turned out to be harmless: it pins the stroke envelope at
t=0 where strength is zero, so the fastest presser stirs nothing at all.

**What shipped is a hand that tires.** The Sim holds a reservoir of three
strokes, refilling one every eight seconds; a stroke costs one and a press
with nothing left is refused. It limits how *often* a student can stir and
never how *hard*, which is why it is the only one of the five that left every
stroke exactly as strong as it was:

| | baseline | shipped |
|---|---|---|
| worst circulation, any rhythm | 0.835 | **0.097** |
| first stroke | 0.732 | 0.732 |
| stroke after a 5 s pause | 0.707 | 0.707 |
| stroke after a 2 s pause | 0.751 | 0.751 |
| dissolved in 20 s: still / stirred / hot | 16 / 31 / 35 | 16 / 24 / 35 |

The four rejected designs each bought their calm by weakening or refusing
strokes. The plain cooldown needed a **thirty-second** dead button and ended
with an eager student dissolving 16 grains — exactly what still water does.
Diminishing-returns did the same at any rhythm faster than 2.7 s, while the
bar, the vortex and the turbidity all still played a full stir: a lie, and a
worse one than the bug.

Three new checks in `check-sim.js` guard precisely what separated the winner
from the losers — no rhythm spins the field solid, a *later* stroke still
reads as a current, and stirring still beats still water. Each rejected
design fails at least one.

Two things the fix carried with it, both real bugs in their own right:
`Player.prototype.stir` discarded every sim's return value, so a refused
press still clouded both beakers and fired a `stirStarted`; and the Stir cap
now dims while the hand is spent, because a key that presses and does nothing
reads as broken rather than as tired.

**One honest cost, raised and accepted.** An eager stirrer used to roughly
match heat (36 against 35 grains in 20 s) and now clearly does not (24
against 35). Stirring still beats still water, which is the comparison the
lesson rests on, and losing to 100 °C is defensible science. Ben was asked
and chose to keep it, so the next session should not reopen this: the lever,
if it is ever wanted back, is `stirBudget` (3) in the engine defaults.


---

## The long run

What "let the clock run out" turned up, and it was not what it looked like.

**The clock does not cap.** Seeking to 10, 20, 99 and 200 minutes all read
back `60.0`, which looks like a sixty-second ceiling and is not: `Sim.seek`
clamps to `cfg.duration`, and the clamp is the reading. `step()` has no end —
deliberately, per the note above `Player.play` — so a real run keeps going.
Worth knowing because a boil needs 18 s of onset plus 16 s of drying *after*
100 °C, so a ceiling would have cut a student off mid-boil.

**The snapshot ring did not stop, though.** One capture a second, into an
array nothing trimmed, while `seek()` could never reach past frame 3600. So
every snapshot after the sixtieth was memory that nothing could restore:

| run length | before | after |
|---|---|---|
| 1 min | 632 KB | 632 KB |
| 10 min | 6.3 MB | **632 KB** |
| 50 min | 31.6 MB | **632 KB** |

(Both stations, typed-array buffers only.) The fix is one condition on the
capture in `step()`. Seeking backwards from frame 180,000 is still bit-exact
against a fresh run — `check-sim.js` now asserts both, because the failure
mode is silent: nothing looks wrong, the tab just gets heavier all period.

Half a gigabyte was never at stake. But it is a Chromebook with the tab open
from first period to last, and it cost one line.

---

## Open from my side

- **The water wash lifts the skirting behind it**, 45 grey to 114, where it
  should darken. The wash model is wrong, not the value; `mix-blend-mode:
  multiply` on the water fixes it and looks better, but swallows the boil
  bubbles, which are children of that layer. Moving the bubbles out unblocks it.
- **The `--refract` lift (-3px) and `--wall-light`** were both judged against
  placeholder art. Re-check once the finished wall lands.
- **`notebook-paper`** is still the one placeholder that is off-spec:
  730x1826 against a wanted 730x1850.
- **The two streams now hang under their outlets** — `sprite-pour` x 235 to
  228 and `sprite-powder` 262 to 259.5, both stations. The painted column
  inside each sprite frame is narrower than its box and off-centre in it, so
  the box is positioned from the column, not from the beaker axis; the notes
  in `layer-manifest.json` say so, because the obvious "tidy-up" is to
  re-centre them on the beaker and that breaks it. Water now lands 0.05 units
  off the nozzle bore and powder 0.08 off the chute, against 7.0 and 2.5
  before. The art did not move: sliding the water housing right instead would
  have closed its gap to the cone from 52 art px to 3 and merged the two
  fixtures at render size.
- **Click-to-identify is dead for every raster part.** `dissolving.css:226`
  sets `pointer-events: none` on `.layer[data-render^="raster"]:not(button)`,
  which scores (0,2,1); line 230's `.layer[data-id] { pointer-events: auto }`
  scores (0,2,0) and loses. Confirmed in the running page: the beaker, the
  head, the stir plate and both nameplates all compute `none`, and
  `elementsFromPoint` over any of them returns the wall. Only the sprites
  survive, because `sprite` does not match `^="raster"`. `.layer[data-render^="raster"][data-id]`
  would win at (0,3,0) — but restoring it naively hands the beaker's whole
  162.5x187.5 rect the stir bar's hit target, which works today, so this needs
  its own small pass rather than a one-line fix. Separately `activity.js:193`
  defines a `probe` entry that nothing in the DOM ever carries.
- **The dispenser head art is wider than its box.** `dispenser.png` came in at
  1381x973 — aspect 1.42 against the `head` box's 1.21 — so it is scaled to the
  box width undistorted and the bottom 48 rows of the 400x330 file are
  transparent. The probe stops at 85% of the box rather than the foot of it,
  which still puts the tip well under the water line, and nothing in the
  manifest moved to accommodate it. If the probe should hang lower, the art
  needs to be taller; shrinking the box to 400x282 would only make the file
  tidy, not the probe longer.
- **Print** has never been seen on paper. The `.display` family now renders as
  ink on white, but with *background graphics* ticked the readouts sit on their
  own dark recesses. Needs one real print preview to settle.
- **Frame cost on an actual Chromebook** is still unmeasured. On this machine
  the model and both canvases take 0.258 ms of a 16.7 ms frame, so there is a
  lot of headroom, but that is not the target machine.
- **Sugar boiling dry** recovers cleanly in the model. Real sugar caramelises
  rather than recrystallising. Honest for salt, not for sugar, and still
  unaddressed in the copy.

---

## What the checks cover

`node tools/check-sim.js` — determinism (stepping to frame N equals seeking to
N, across heat, a boil and a restored snapshot), the boil's invariants, the
recovered pile matching the original slot for slot, and the stir metrics
above. It separates regressions, which fail the run, from open targets, which
print but do not.

`python3 tools/make-placeholders.py --check` — every shipped texture against
its manifest box.

Neither covers anything visual. Every visual fault this session was found by
rendering it and looking, usually after a measurement said it was fine.
