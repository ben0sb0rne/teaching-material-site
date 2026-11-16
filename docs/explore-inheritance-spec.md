# Explore Inheritance: Build Spec

**For:** Claude Code
**From:** Ben (Mr. Osborne)
**Replaces:** FOSS Larkey, "A Model for Predicting Genetic Variation", Heredity and
Adaptation Inv. 2, parts 2.3 and 2.4. 8th grade, MS-LS3-2.
**Status:** Ready to build, pending one approval. Genetics, data, behaviour,
art, world, layout and palette are settled; the three open questions are
answered (section 15). Layout is **Ledger Spine**, chosen from three sketched
candidates (section 5). The palette is daylit and measured (section 12.2), and
is awaiting Ben's eye — it has not been approved the way the composition was.

**Direction contract:**
`.impeccable/surfaces/src-activities-explore-inheritance-index-html.md`
**Approved composition:** `.impeccable/mocks/decision/b-ledger.html` (dark; the
geometry of record)
**Proposed surface:** `.impeccable/mocks/decision/b-ledger-light.html` (same
geometry, daylit palette — not one box moved, so the inversion tests the
structure rather than redesigning around it)

Source material: `~/Downloads/labradoodle-sim-handoff.md` (the brief) and a full
play-through of the original, recorded in section 1.2.

---

## 0. Ground rules

1. **Read the project first.** `docs/STACK.md`, `CLAUDE.md`, `src/kit/`,
   `src/activities/explore-dissolving/`. Follow its conventions unless this spec
   says otherwise.

2. **This is an activity, not a sixth engine.** `CLAUDE.md` says a sixth engine
   needs justifying, and one activity does not justify one. Build the breeding
   model, the family tree and the gamete animation inside
   `src/activities/explore-inheritance/`. If a second heredity activity ever
   appears, extract the engine then, when two real cases show its shape.

   The exception is anything that is obviously not about heredity: if the litter
   grid, the code entry field or the ledger rows turn out to be generic, they
   belong in `src/kit/`. Judge that at the end of the build, not the start.

3. **Reuse the kit as it is.** `Kit.announcer`, `Kit.popover`, `Kit.tabs` and
   `Kit.story` all apply here and need no changes. List any kit change, however
   small, in the end-of-run summary.

4. **New colour roles.** `kit.css` says the roles never swap, and `--solute` means
   the dissolving solid. Do not reuse it for an allele. Add inheritance roles to
   the activity's own stylesheet, built from the existing palette:
   `--allele-dom`, `--allele-rec`, `--gamete-egg`, `--gamete-sperm`. No new hex
   outside `tokens.css`; derive from `--field-a/b/c`, `--signal`, `--data`.

5. **Copy the stage pattern, not the beaker.** Explore Dissolving fixes a
   1600 × 1000 point safe area and scales it with `transform: scale(var(--s))`
   (`dissolving.css:154`). Do the same here. It is a pattern to repeat, not kit
   code to call.

6. **`graphify-out/` does not exist yet.** `CLAUDE.md` says to query it first;
   there is nothing to query. I read `src/kit/` and `src/engines/` directly
   instead. Run graphify after this activity lands, per the cadence rule.

7. Only build what is here. Section 14 lists what to leave.

---

## 1. Intent

### 1.1 What this has to beat

The original is a Flash file from 2016 converted with Google Swiffy, pulling
`https://www.gstatic.com/swiffy/v7.4/runtime.js` at lesson time from a service
Google shut down in 2016. One blocked domain and the lesson is a blank canvas.
`document.querySelectorAll('a,button,input,select,textarea,[tabindex]').length`
returns **0** — not one focusable element on the page. The canvas has
`tabIndex: -1`, no role, no label, no fallback content.

That is the bar: anything we ship that loads locally and takes a Tab key is
already better. The rest of this spec is about being better at teaching.

### 1.2 What the original actually does, and what to take

I played it end to end. Findings worth building against:

**Take these:**

- **The named randomiser.** A labelled "Random Selection" circle sits between
  the parents. Both copies of a gene travel into it together, visibly swap
  places, and one comes out. Chance happens in a *place*, with a name. That is
  the single best idea in the program.
- **Inline per-row error marking.** On the offspring table a wrong row gets a red
  ✗ beside it; correct rows are left alone; you fix and re-check. Much better
  than the modal on the parent screens, which says only "The male is incorrect"
  and leaves you hunting across four genes.
- **Answers derived from the real draw.** The console trace shows it computes the
  expected genotype from the gametes it actually generated, not from a hardcoded
  key. Keep that honesty.
- **The genetic key always on screen**, never behind a button.
- **Incomplete dominance on exactly one gene** (their fur: FF striped, Ff solid,
  ff spotted). A visible third phenotype teaches more than a hidden carrier. Ours
  is curl, and it is off by default — see 4.1.

**Fix these:**

- **The discarded allele vanishes.** At the moment of selection one copy enters
  the gamete and the other simply stops being drawn. Students watch alleles get
  thrown away. Section 6 fixes this.
- **There is no fertilisation.** I captured the "Breed Larkeys" click at 0.4 s
  resolution across five frames: the egg and sperm do not move, do not merge, do
  not fade. The answer table is simply drawn underneath them. The join in
  section 6.4 is new work, not a port.
- **It cannot validate past F1,** so it nags everyone. Same eight values
  (`Aa Ee Ff Tt`) give "Correct! Good job!" on the F1 screen and an unconditional
  "double check that they are correct" on the F2 screen, twice, before it lets
  you through. F1 genotypes are deterministic; F2 genotypes depend on the
  student's own random draw, which the program never stored. **The nag is the
  symptom of having no save system.** Our dog codes are the fix.
- **One offspring at a time, 72 dropdown selections for six dogs.** With litters
  of eight that arithmetic does not survive. Litter-level counts, not per-puppy
  quizzes.
- **F1 male and F1 female are drawn pixel-identical.** No sex indicator at all.
  Ours needs one on the dog itself, because mate-trading depends on it.
- **Genotype and phenotype are scored independently** against the truth. Nothing
  checks whether the student's genotype *implies* their phenotype, so `ff` +
  `striped` reads as two unrelated errors rather than a contradiction. If we ask
  for both, check the implication.

One thing I got wrong on first pass and corrected: the "F3 Offspring" heading on
the Breed F2 screen is **not** an off-by-one bug. The convention is "Breed
[generation X]" → produces X+1, and it is consistent throughout.

### 1.3 The world: a daylit breed registry

Each lab in this site is **its own room**. Explore Dissolving is a dark
instrument plate — a microscope, mid-century science publishing. This one is not
that room, and should not be mistakable for it from across a classroom. What the
two share is the *system*: Jost and IBM Plex Mono, flat with no shadows or
perspective, 48px targets, light and dark both correct. That shared system is
what stops twenty activities being twenty interfaces to relearn. The room on top
of it is free to differ, and here it does.

**This room is a daylit breed-registry office, after the stud book.** Paper-pale
ground, warm rather than clinical. Ink near-black, never pure. Ruled hairlines
do every division: no cards, no drop shadows, no rounded corners, nothing
floating above anything else. One entry per line. Registration numbers and
genotypes in Plex Mono; one accent for the live row and the dog code; one green
reserved for tallies and used nowhere else. Dogs are flat vector sitting on the
page, not photographs in frames.

#### It is software, and it says so

The interface is the registry's own software, not a picture of a desk. No
monitor bezel, no drawn room, no instrument costume wrapped around a working
screen. A real genetics lab keeps pedigrees on a workstation, so this one does
too, and the screen is allowed to look like a screen.

**The one exception is the DNA sequencer.** On Day 3 the view pulls back from
the software to reveal the bench it sits on and pans to the machine. That is the
only moment anything happens in the room rather than in the record, and it is
memorable precisely because it is the only one. It costs no screen space on the
other four days.

#### No hand-lettered type, anywhere

Students have a paper record sheet in front of them throughout. A handwriting
font on screen invites exactly one question — *wait, am I supposed to write
this?* — and that question costs more than the charm is worth. Plex Mono for
anything machine-set, Jost for everything else. Patrick Hand is in the kit; it
does not appear in this activity.

**Motion is mechanical, never bouncy.** Rows settle, they do not spring. Nothing
eases out past its target.

**Tone:** no confetti, no points, no cartoon praise. The fun is the science.
Student-facing language is plain and concise.

#### What this is not

Not the dissolving lab's dark plate with dogs in it — that was the first
proposal and it failed the "each lab is its own room" test. Not a skeuomorphic
desk of registration cards either: that was the second proposal, and a family
tree belongs on a workstation, not in a card tray. Both are kept here as
anti-reference so a later pass does not rediscover them.

## 2. Where it sits in the unit

Five 50-minute periods. The app must survive being closed between them, on a
shared Chromebook, with no login.

| Day | What happens | What the app must do |
|---|---|---|
| 1 | P → F1. Predict, breed, see every F1 puppy look alike. Keep one. | Issue a dog code |
| 2 | Load yesterday's dog. Trade codes to get a mate. Breed F2. | Load by code, validate a mate code |
| 3 | Teacher unlocks the DNA lab. Test the F2 pair, Punnett on paper. | Lab key, test readout |
| 4 | Breed F3. Compare the litter with class percentages. | Litter counts, one tap away |
| 5 (optional) | Teacher turns on curl and colour. | Teacher toggles |

F3 is the last generation. Single player: one pair of students per device.

---

## 3. Platform and stage

- **Targets:** Chromebooks (Chrome) and iPads (Safari), **landscape**. Trackpad,
  mouse, touch and keyboard must each work alone.
- **Fixed stage.** 1600 × 1000 point safe area, scaled uniformly to fit, as in
  Explore Dissolving.
- **Portrait:** on-theme "Rotate your device" screen.
- **Pointer Events only.** Never `mousedown`/`touchstart`.
- **48 px minimum targets** (`--tap`). The handoff says 44; the project says 48.
  Use 48.
- **No network at runtime.** No CDN, no external fonts, no analytics. The
  original beacons to `ace8bc7c.akstat.io` from a student page; we do not.
- **Light and dark both work.** Verify both.
- **It prints**, for absent students.
- **`prefers-reduced-motion` honoured** — see 6.6.

### 3.1 The one-screen rule

At 1366 × 768 with no scrolling a student sees exactly four things: the title,
**one line** telling them what to do, the stage, and the primary controls. At
rest, no more than three controls are visible.

A four-generation family tree cannot fit that as a *diagram* and must not try.
The Ledger Spine resolution (section 5):

- The **ledger** is the tree, compressed to one row per generation. Four rows
  is the whole pedigree. There is no separate tree view and nothing to expand.
- The **work area** shows only the current pair, the randomiser and the current
  litter.
- **Counts are never behind a tap.** They are ruled into the ledger row that
  produced them and stay there. Students copy them after every litter, so a
  popover would be a tax paid eight times a period.
- The **title and the single instruction line** share the top strip. Nothing
  else lives there.

If the layout starts needing a persistent instruction banner, the layout is
wrong.

---

## 4. Genetics

### 4.1 The genes

| Trait | Gene | Alleles | Juniper (P ♀, poodle) | Ranger (P ♂, lab) |
|---|---|---|---|---|
| Beard and eyebrows | RSPO2 | F beard (dom.), f none | FF | ff |
| Coat length | FGF5 | S short (dom.), s long | ss | SS |
| Curl *(off by default)* | KRT71 | Incomplete: CC curly, Cc wavy, cc straight | CC | cc |
| Coat colour *(off by default)* | TYRP1 | B black (dom.), b chocolate | bb | BB |

- **Every dog carries all four genes.** Teacher toggles change only what is
  *shown*, never what is stored or inherited. A dog bred with curl hidden still
  has its curl alleles, and its code still encodes them.
- Each puppy gets one random copy of each gene from each parent, **picked
  independently per gene**.
- **Truly random from the first litter.** `crypto.getRandomValues`. Never rig it.
  Every F1 puppy looks alike because both P parents are homozygous, not because
  the code forces it.
- **No yellow dogs.** A separate gene would mask black and chocolate; we do not
  model it.

### 4.2 Litters

- Default **8 puppies**; teacher may choose 6 or 10.
- Sex is random 50/50, **except**: if a litter comes out all one sex, flip one
  puppy. Every pair must have a tradeable dog of each sex.
- Litters are generated whole, then animated. The animation reveals a result that
  already exists; it never decides one.

### 4.3 Known vs. hidden alleles

Letters show only for dogs whose DNA is **known**:

- The P pair — Juniper and Ranger, from the breed registry.
- Any dog the students have DNA tested.

Every other dog shows `?`. This is what gives the DNA lab its payoff, and it is
why section 6.2 needs care.

---

## 5. Screen layout — Breeding Record *(from Teacher Master BB)*

> **The layout reference is the handout, and it was in the repo the whole time.**
> `reference/.../Part 3- Modeling Heredity/Teacher Master BB.pdf` — "LARKEY
> BREEDING RECORD" — is the sheet students fill in beside this activity. Three
> layouts were sketched and rejected before anyone opened it. Ben's three
> guesses at what was wrong each turned out to be a thing the handout does:
>
> | his guess | what the handout does |
> |---|---|
> | "should it be on the right?" | the **immigrant male is boxed at the right edge**, offspring on the left |
> | "maybe it's the alignment" | **Sex / Phenotype / Genotype at identical x on every strip** |
> | "the thin, disconnected lines" | descent is a **bold grey wedge**, full strip width tapering down-left, labelled *Offspring* |
>
> And a fourth nobody had guessed: **the litter is not in the record.** Only the
> kept dog and the immigrant are recorded. That retires the duplication problem
> three sketches had been fighting — the eight puppies belong in the breeding
> stage, which the record never shows.
>
> Genotype is a **stack of four allele cells** per dog (`Ff` / `Ss` / `Cc` /
> `Bb`), which is the shape students copy.
>
> Built as `.impeccable/mocks/decision/g-breeding-record.html`, daylit, 1366x768
> with no overflow. Generated from a coordinate block, so a column move is one
> constant.
>
> **Licence:** structure and mechanics only. Lawrence Hall of Science holds the
> copyright on that sheet — its artwork and its wording stay in `reference/`.
> Our dogs, our labels, our palette.
>
> **Superseded, kept only as the record of why:** `b-ledger.html` (no descent at
> all), `d-pedigree.html` (drew the kept dog twice), `f-pedigree-spine.html`
> (mate on the wrong side, hairline connectors).
>
> **Open:** the breeding stage — where the litter of 8 and the gamete animation
> live — is a separate state and is unsketched. The wedge measures 2.15:1 on the
> ground; acceptable for a graphic that large, but it is not a 3:1 element and
> nothing load-bearing may depend on it alone.

## 5-old. Screen layout — Ledger Spine *(superseded — see section 5)*

Chosen from three sketched candidates; the other two and the reasoning are in
`.impeccable/surfaces/src-activities-explore-inheritance-index-html.md`.
The approved composition is `.impeccable/mocks/decision/b-ledger.html`.

**The composition is approved, the palette is not.** That sketch is drawn on the
dark plate because the decision round held palette constant to keep the choice
about structure. The world is a *daylit breed registry* (section 1.3), so the
build re-renders this composition light and re-checks the dog art's contrast on
a pale ground first.

```
┌──────────────────────┬──────────────────────────────────────────┐
│  Explore Inheritance │  Choose one puppy to keep.    F2 · OF 8  │
├──────────────────────┼──────────────────────────────────────────┤
│ BREEDING RECORD      │                                          │
│  copy to your sheet  │      ♀ Maple        ( )       ♂ Rocket   │
│ ──────────────────── │      [dog]       randomiser   [dog]      │
│ P  [··]      on file │       F s                      f S       │
│  beard 1 none 1 …    │                                          │
│ ──────────────────── │   ┌──────┬──────┬──────┬──────┐          │
│ F1 [········] YKJH7  │   │ pup  │ pup  │ pup  │ pup  │          │
│  beard 8 none 0 …    │   ├──────┼──────┼──────┼──────┤          │
│ ──────────────────── │   │ pup  │ pup  │ pup  │  8   │          │
│▌F2 [·······]  choose │   └──────┴──────┴──────┴──────┘          │
│  beard 6 none 2 …    │                                          │
│ ──────────────────── │                                          │
│╎F3  not bred yet     │              [Breed again] [Keep puppy]  │
└──────────────────────┴──────────────────────────────────────────┘
   452px ledger            the rest is the work area
```

The ledger is the spine: 452px, full height, one row per generation carrying the
pair that made it, the kept dog's code, and that litter's counts ruled inline.
The live row takes the accent on its left edge; an unbred generation is a dashed
rule. This is the answer to "counts get copied after every litter" — the tally
lives *inside* the record rather than beside it, so screen and paper have the
same shape.

Known costs, accepted: the ledger holds one row on Day 1 and looks empty, and it
spends a third of the width permanently.

### 5.1 Ledger rows

One row per generation, top to bottom, oldest first. Each row holds the
generation letter, the pair that produced it as 30px thumbs, the kept dog's
five-character code, and that litter's four counts ruled inline underneath.

The row is also the generation indicator — no separate label anywhere. The live
row carries the accent on its left edge; a generation not yet bred is a dashed
rule and the words "not bred yet", at full contrast rather than dimmed, because
it is information, not a disabled control.

Rows are a single composite widget: one tab stop, arrow keys between rows, as
`Kit.tabs` does for tablists. Not four tab stops that grow to four more as the
litters fill.

### 5.2 Parents

The current breeding pair. Sex is marked **on the dog**, not only in the context
bar: collar shape plus the ♀/♂ glyph on the portrait frame. Never use markings or
coat features to signal sex — students read those as inherited traits.

### 5.3 Litter slots

Empty circles that fill as puppies drop in. After the litter completes, students
pick one to keep.

**Littermates stay in the row and fade; the camera then recentres on the chosen
puppy.** They do not collapse away — the counts students just tallied are the
evidence for the ratio they are about to discuss, and removing the siblings
destroys it. *(Open question 2, settled.)*

The move, in order:

1. Siblings fade to about 35% and stop taking focus.
2. The stage eases the chosen puppy to the centre of the work area and scales
   it up slightly. ~450 ms, `--ease-in-out`, no overshoot.
3. It takes its place as a parent for the next generation, and its row in the
   ledger closes with the code written in.

Reduced motion: no pan and no scale. Cross-fade the siblings down and the chosen
card into its bay. The camera is a nicety; the state change is the point.

### 5.4 Context bar

One line along the bottom. Hovering a dog (tapping on iPad) shows name, sex,
generation, traits, and alleles **if known**. Pointer Events; the tap path and
the hover path are the same code.

### 5.5 Names and collars

Collars and names are how students tell puppies apart. **Never markings.**

Names, in index order (0–39): Biscuit, Pepper, Mochi, Scout, Olive, Waffles,
Clover, Pretzel, Poppy, Tofu, Maple, Cosmo, Hazel, Rocket, Nugget, Willow, Ziggy,
Basil, Bean, Pickles, Sunny, Echo, Peanut, Kiwi, Milo, Nova, Pip, Rosie, Sage,
Toast, Fig, Gizmo, Lulu, Bear, Dash, Juno, Mango, Otis, Wren, Ollie.

Collars, in index order (0–7): Red, Green, Blue, Gold, Purple, Orange, Teal, Pink.

Juniper and Ranger never get codes.

---

## 6. The breeding animation

The centrepiece, and the part with nothing to copy. Section 1.2 explains why.

### 6.0 Stage layout — from Teacher Master AA

`Teacher Master AA` ("LARKEY PARENTS") is the stage's reference the way BB is
the record's. Two things it settles:

- **Female left, male right**, large, sex symbol above each. Same handedness as
  BB, where offspring sit left and the immigrant male right. Keep it everywhere.
- **Genotype is two separate cells per gene**, one per allele — `F`|`f` in two
  boxes, not `Ff` in one. This is the detail that matters: the two cells *are*
  the two copies, so the randomiser visibly draws from one cell and leaves the
  other. A single `Ff` cell would have nothing to take from.
  - The **record** (BB) keeps the compact one-cell `Ff` form. Different jobs:
    AA is the model, BB is the archive. Do not unify them.
- The trait key table appears on **both** masters, so students never hunt for
  it. The stage needs it reachable without leaving the screen.

Built as `.impeccable/mocks/decision/h-stage.html`, daylit, 1366x768, no
overflow, no clipped text. The frame shown is mid-sequence — every named part
visible at once: genotype grids with the drawn copy ringed (never removed), both
randomisers, both discard rails captioned *kept, not lost*, egg and sperm
converging on the centre, and the tray at 3 of 8. Generated from
`scratchpad/gen/stage.py`, so the animation path is a real polyline rather than
hand-placed.

**Correction to section 5, from Teacher Master CC.** The class-tally sheet
("LARKEY BREEDING RESULTS") has **one column per trait value, not per gene** —
nine columns, because fur pattern under incomplete dominance has three. Our
curl gene is the same shape (curly / wavy / straight). The record's counts strip
is **nine** cells: beard 2, coat 2, curl 3, colour 2. Rebuilt 2026-11-04;
`scratchpad/gen/counts.py` generates it and is idempotent.

CC also settles *how* nine cells fit, and it is not nine equal columns:

- **A trait heading spans its own values** — CC's "Fur pattern" sits above
  Striped | Solid | Spotted. The heading carries the long word, so each value
  label is one short word and the cells can be narrow. A full rule divides one
  trait from the next; a hairline divides values within a trait.
- **Columns are sized to their content.** CC's "Appendages" columns are wider
  than its "Tail shape" ones. Ours have to be: nine *equal* cells at 12px need
  ~509px and only 478 are free between the kept card and the immigrant, while
  content-sized columns need 473. "Chocolate" sets the widest cell at 72px and
  "Yes"/"No" the narrowest at 28px.
- This is the **worst case**, not the default. Curl and colour are teacher
  toggles (section 4.1), so the strip is four cells by default and nine only
  with everything on. Four is what the first sketch drew, which is why the
  defect read as a style choice rather than a layout that could not grow.
- **The column header names the column, not the row.** It reads *"Dogs with
  each trait"*, beside Sex / Phenotype / Genotype, which are noun labels too.
  It said *"This litter"*, which is true of F1-F3 and false of P, whose two
  counts are the founding pair rather than a litter. The per-row meaning that
  phrase was carrying is already in the footer — *copy each row to your sheet*.
- The counts must agree with the crosses in section 4.1, not be decorative:
  every trait in a row tallies to the same litter size, and the generator
  asserts it. F1 is all `Cc`, so its curl column is 0 / 8 / 0 — the wavy
  middle state is visible from the first litter, which is the point of
  choosing an incomplete-dominance gene at all.


**Connectors are bold, solid, and run edge to edge between two named shapes.**
Ben's call, 2026-11-04, on the first stage sketch: *"The dotted lines are way
confusing. I want them bold and going from shape to shape, not crossing
anything."* The sketch had nine connectors and every one was wrong — thin
hairlines at `stroke-dasharray:4 5`, floating ends that stopped 4–50px short of
the shape they pointed at, one running *backwards* out of the grid's bottom
edge, one passing straight through the discard rail, one starting 111px from
its own gamete box, and the fertilisation drop aimed at the gutter between two
litter slots. The rule for the build:

- 3px, solid, `--hair-lit`-weight structural grey, arrowhead on every one. A
  dash means a *container* that is not yet filled (an empty slot, the holding
  rail), never a path.
- **Curved, and every tangent axis-aligned.** Ben, 2026-11-10: *"I don't like
  the arrows coming out at odd angles."* The straight version left shapes on
  arbitrary diagonals. Each connector is now a cubic that leaves its source
  square to that edge and meets its target square to that one, so the only
  directions in the drawing are horizontal, vertical, and the sweep between.
  Parallel tangents get a symmetric S (control arm = half the along-axis gap,
  or the curve doubles back on itself); perpendicular tangents get 0.38 of the
  span. **Both of the randomiser's exits leave the
  same point on its bottom edge and diverge** - a fork, which is what one draw
  with two outcomes is. The first attempt sent the kept copy out sideways, but
  the gamete sits almost directly below the drum (there is no room for it
  beside one), so an 8px horizontal offset got a 57px control arm and the curve
  swung out before coming back. **When a connector doubles back, the cause is
  the geometry, not the curve:** move the exit, do not tune the control arm.

**The discard rail lists genes in the grid's order, and nothing is faded.** It
listed them backwards (`B c S f` under a grid reading `F S C B`) with the last
two greyed, so a student could not match a discarded copy to its gene, and the
fade encoded nothing - there is exactly one tile per gene and every one is
equally real. Corrected 2026-11-10. The rail now reads as the exact complement
of the gamete beside it (`f S c B` against `F s C b`), which is the whole point
of drawing it: those are the two copies of each pair, and neither was destroyed.
Open question for Ben: the caption says *"Other eggs - kept, not lost"*, but one
tile per gene is "the other copy", not "other eggs".
- Both endpoints sit **on a shape's boundary**, within 2px. A connector that
  starts or ends in free space is a bug, not a style.
- No segment may pass through any shape's interior or any text's bounding box.
- The drum's two exits **diverge**: discard outward (away from centre), gamete
  inward. They can then never share a lane, whatever the litter size.
- The fertilisation drop targets **the slot that fills next**, not the midline.

This is checkable, so check it: `scratchpad/check_paths.py` parses the rendered
SVG and asserts all three (anchored, non-crossing, count). The browser measures
the text boxes, because estimated glyph widths are what hid the first collision.
Note that the breeding record never had this problem — it takes descent from
Teacher Master BB's bold grey wedge, which is the same instinct already.

**Labels are two registers, not one run-on.** Ben, 2026-11-10: a role word
above, the thing itself below, rather than `Mother · Maple` on one line. So
`MOTHER` in 12px mono caps over `Maple` in 15px Jost, and `OTHER EGGS` over
`kept, not lost`. The middot was doing a job that vertical position and a
change of face do better. Applied to the parent labels and the discard rail;
deliberately not to the header chrome, which should stay quiet, or to the
litter names, where stacking would put a lone `♀` on its own line.

**Allele boxes are square.** Ben, 2026-11-10: *"that's how they'll look in the
punnett squares."* The genotype grid is 36x36 per cell and the loose tiles are
28x28. A student who meets a Punnett square later should recognise the cell
they already know, so the shape is load-bearing, not decoration. This is also
why the grid narrowed from 124px to 72px wide and grew from 128 to 144 tall.

**The key is behind a `<details>`.** Ben, 2026-11-10, wanted a reminder of the
sex symbols and how to read alleles, as a pop-out. CLAUDE.md's one-screen rule
puts legends behind progressive disclosure, so a disclosure is exactly right.
`<details>` is the platform's own: keyboard-reachable and open-able with no
script, which also satisfies the keyboard-path rule for free.

- Three columns: the two sex symbols; capital/lowercase as dominant/recessive;
  and the four genes, with curl's three states spelled out because it is the
  one that does not behave like the others.
- **Both screens carry the same key**, from one definition
  (`.impeccable/mocks/decision/key.py`), because the record shows sex symbols
  and alleles too and two copies would drift. At build time this is a kit
  component, not a copied block.
- With the key, the stage footer shows three controls at rest — Key, Skip,
  Keep this puppy. That is the one-screen rule's limit exactly, so nothing
  further goes in that bar.

**Section 12.1's 12px floor now actually holds on this screen.** `.lbl` was
still 11px — the last thing under the floor, and it had survived three review
passes because it was set before the rule was written. Every text node on the
stage is now 12px or larger, verified by walking the rendered DOM rather than
reading the stylesheet.

**The litter tray at 6, 8 and 10.** Section 4.2 lets the teacher pick, so the
tray is one row of `n` slots across the full 1326px stage and everything inside
a slot is derived from the slot. Measured at 1366x768, all three fit with no
overflow and nothing outside its own slot:

| litter | slot | dog | gutter | genotype pitch |
|---|---|---|---|---|
| 6  | 212.7 | 148   | 32.3 | 34 |
| 8  | 157   | 148   | 4.5  | 34 |
| 10 | 123.6 | 114.6 | 4.5  | 30.6 |

- **148px is the dog's cap, and it is vertical, not horizontal.** The band from
  the slot top to the name line is 111px and the symbol is 4:3. So 6 and 8 draw
  the same dog and only 10 narrows it; a wider slot at 6 buys nothing.
- Dog *bottoms* sit on one line at `TRAY_Y+139` whatever the size, so the row
  reads as dogs standing on a shelf rather than floating at different heights.
- **The risk at 10 is legibility, not layout.** The dog loses 22% of its width,
  and choosing a puppy means reading its phenotype off that drawing. Beard and
  curl are small features: at 115px the beard patch is about 11px across. This
  needs re-checking against the finished art (section 11), not the placeholder,
  and it is the one thing that could make 10 unusable while still "fitting".
- `stage.py <n>` generates any of the three and asserts the slot contents fit
  before it emits anything. Regenerating at 8 is byte-identical to the approved
  sketch, so the parameterisation changed nothing that was signed off.

**The governing decision: all genes animate in parallel, not one after another.**
The original plays one gene at a time and takes ~1.25 s per gene, ~10 s for a
single puppy. At eight puppies that is unshippable. Two visible genes × two
parents animating together fits a 2 s puppy.

### 6.1 Beat 1 — the copies come out (0.00–0.45 s)

Both copies of each visible gene slide out of each parent as separate tiles. The
parent's own genotype display keeps showing the pair; these are copies, not
removals.

All visible genes move at once.

### 6.2 Beat 2 — one leaves, and it goes somewhere (0.45–0.90 s)

Both copies enter the **randomiser**, the one named place where chance happens.
It resolves once,
and one tile drops out toward this gamete. **The other drops onto the discard
rail beside it, labelled "other eggs" / "other sperm", and stays there
visibly.** It is not destroyed. This is the fix for the original's worst teaching
bug, and it is the whole reason the rail exists.

The rail holds the last few discarded copies and fades the oldest out. It is
scenery, not a control, and never takes focus.

**When the parents' DNA is unknown the tiles show `?`.** *(Open question 1,
settled.)* The two copies must still be **visually distinct from each other** —
different tile fill or notch, no letter. Students then still see *two copies, one
goes each way* without being handed the genotype, and the DNA test still has
something to reveal.

Once a dog is tested, its tiles show letters from then on, everywhere.

### 6.3 Beat 3 — the gametes form (0.90–1.25 s)

The copies that stayed gather into an egg (from the mother) and a sperm (from the
father), each carrying its half-set.

### 6.4 Beat 4 — fertilisation (1.25–1.70 s)

**New work.** Egg and sperm travel toward each other and meet at the centre of
the lane. On contact: a single scale pop, and the two half-sets **interleave into
pairs** — the mother's F settling beside the father's f to read `Ff`. The pairing
is the point; the pop is just the punctuation.

### 6.5 Beat 5 — the puppy lands (1.70–2.00 s)

The zygote drops into the next empty litter slot with a slight squash on landing,
and resolves into the puppy.

### 6.6 Timing, skip and reduced motion

| Mode | Per puppy | Notes |
|---|---|---|
| Puppies 1–2 | ~2.0 s | Full five beats, as above |
| Puppies 3–n | ~0.7 s | Same beats at ~35%; the tray is established, so beat 2 shortens to a flick |
| Reduced motion | ~0.9 s | No travel. Each beat is a crossfade **at its destination**. |
| Skip | immediate | Jump to the finished litter |

A **Skip** button is always available during the sequence, and it is a real
button in the tab order, not a click-anywhere.

`prefers-reduced-motion` is already handled globally in `kit.css:305`, which kills
durations. That is not enough here — an animation reduced to 0.001 ms reads as a
jump cut, not a fade. Implement the reduced-motion path deliberately.

---

## 7. Dog codes

Every kept dog gets a 5-character code students write on paper, like an NES
password. Typing it back loads the dog. No server, no accounts. localStorage may
be a convenience, **never the only save**.

```
Alphabet (no look-alikes): ACDEFGHJKMNPQRTUWXY3479      (23 characters)

geno  = F + 3*S + 9*C + 27*B      each = count of dominant alleles (0, 1, 2)
value = (((collar*40 + name)*2 + sex)*4 + gen)*81 + geno
        sex 0 = female, 1 = male;  gen 0-3 (P, F1, F2, F3)
        collar 0-7;  name 0-39;  geno 0-80
        max value = 207359

s      = (value*7919 + 104729) mod 279841          (279841 = 23^4)
d1..d4 = s as 4 base-23 digits, most significant first
d5     = (-(1*d1 + 2*d2 + 3*d3 + 4*d4) * 14) mod 23
         so that 1*d1 + 2*d2 + 3*d3 + 4*d4 + 5*d5 = 0 (mod 23)

Decode: verify the weighted sum, invert the scramble with 7919^-1 mod 279841,
        reject any value over 207359.
```

### 7.1 I verified this by hand — it is sound

- **`YKJH7`** — Biscuit, F1, female, red collar, `Ff Ss Cc Bb`.
  geno 40 → value 121 → s 223405 → digits 18, 8, 7, 6 → `YKJH`, check digit 21 → `7`. ✓
- **`HP9PA`** — Pepper, F1, male, blue collar, same genotype.
  geno 40 → value 52933 → s 79338 → digits 6, 11, 22, 11 → `HP9P`, check digit 0 → `A`. ✓

Both reproduce exactly. Three further properties hold:

- **Max value is exactly 207359** — `(((7*40+39)*2+1)*4+3)*81 + 80`. Under 23⁴, so
  the scramble is injective across the valid range.
- **7919 is invertible mod 23⁴** — it is not a multiple of 23 (`23*344 = 7912`).
- **The check digit catches what it claims.** 23 is prime, so a single wrong
  character changes the sum by `w·δ ≠ 0`, and swapping neighbours changes it by
  `(w_i − w_{i+1})(d_{i+1} − d_i) = −(d_{i+1} − d_i) ≠ 0` unless the two
  characters are identical, which is not an error. Every single-character typo
  and every adjacent transposition is rejected.

**Ship both vectors as an assert-based self-check** that runs on load in debug
builds. This is new non-trivial logic handling data students have written on
paper; a silent regression here loses a day of their work.


### 7.2 The name list is part of the wire format

The code stores the name's **index**, not the name. `YKJH7` carries name 0 and
collar 0; it says "Biscuit, red collar" only because both lists are in a
particular order on both machines. So:

- **Never reorder, insert into, or re-spell the name or collar lists.** Append
  only, and only up to 40 names and 8 collars. A code a student wrote on paper
  in October decodes to a different dog in March if the list moved under it,
  and nothing will flag it — the check digit still passes, because the code is
  not corrupt. It is correct for a list that no longer exists.
- Both lists belong beside the codec, not in content or config, with a comment
  saying why they are frozen.
- 40 names must cover a litter of 10 with distinct names, so the list needs
  at least 10 that read as clearly different at a glance.

Verified by `.impeccable/mocks/decision/codec-check.py`, which reproduces both
vectors from section 7.1, round-trips all 207,360 codes with no collision,
confirms every single-character typo and adjacent transposition is rejected,
and confirms `XXXXX` / `YYYYY` fail the check digit while `AAAAA` does not.
Port it to the activity's own self-check when the codec lands.
---

## 8. Mate codes

Students get a mate by typing another pair's dog code. This replaces FOSS's
"immigrant male" swap.

| Problem | Message |
|---|---|
| Fewer than 5 characters | Enter all 5 characters. |
| Fails the check character | That code doesn't check out. Compare each character with the other pair's litter record. |
| Their own dog | That's your own dog's code. Trade codes with another pair. |
| Wrong generation | That code belongs to an F2 dog. You need an F1 mate. |
| Same sex | Both dogs are female. Trade with a pair that kept a male. |

Messages name the problem and the fix. None of them says "invalid".

### 8.1 Registry codes, and why `XXXXX` is exactly right

**If no opposite-sex mate exists in the room:** two reserved codes, intercepted
*before* decoding. *(Open question 3, settled.)*

| Code | Gives |
|---|---|
| `XXXXX` | A registry female |
| `YYYYY` | A registry male |

Ben's instinct to pick something like `xxxxx` turns out to be right for a reason
worth writing down. A code of five identical characters has weighted sum
`15d mod 23`, and since 23 is prime and `gcd(15, 23) = 1`, that is zero **only**
when `d = 0`. So `AAAAA` is the single repeated-character string that could ever
be a real dog, and every other one — `XXXXX` and `YYYYY` included — **fails the
check digit by construction.**

That makes them permanently safe to reserve: no dog can ever be issued one, so
the reserved list can never shadow a student's dog. Do not reserve `AAAAA`.

The registry dog:

- Is **heterozygous at every gene** (`Ff Ss Cc Bb`), so it behaves like an
  ordinary F1 classmate and makes an informative cross.
- **Adopts whatever generation the student's dog needs**, so it never trips the
  wrong-generation error.
- Is named from the normal list and gets a normal collar, so it does not look
  special in the litter. It is a classmate's dog that happens not to exist.

Available only when the teacher switches registry mates on. Default off, because
the trading is the social half of the lesson and should not be opted out of
casually. The other fallback needs no code at all: **two pairs double up** and
share a device for that round.

### 8.2 Everything stays on this machine

No network, no database, no sync, no accounts, no room codes. A dog moves between
two devices exactly one way: a student writes five characters on paper and
another student types them in. That constraint is the design, not a limitation of
it — it is why the codes have a check digit, and it is why the activity still
works when the school's filter is having a bad day.

---

## 9. DNA lab

- **Locked** until a student types the teacher's lab key (Day 3).
- Any dog can be tested. Progress bar ~2 s, then each gene's genotype with its
  zygosity and what it means: **homozygous dominant**, **heterozygous**,
  **homozygous recessive**. Curl uses only homozygous / heterozygous.
- The P pair reads **"on file"** and needs no test.
- A tested dog's alleles become known everywhere — context bar, pedigree, and the
  breeding animation (6.2).

---

## 10. Teacher setup

Opens from a teacher link, **not** a button students can see.

| Setting | Default |
|---|---|
| Curl shown | off |
| Colour shown | off |
| Litter size | 8 (or 6, 10) |
| Require a prediction | on |
| DNA lab open | off |
| Lab key | teacher-set |
| Registry mate codes | generated list, read-only |

---

## 11. Art

Ben has supplied the placeholder set: `placeholder-dogs.zip`, 28 flattened
examples plus the six layers and `dog-layered-master.svg` (every layer as a named
Illustrator group). **These are good — build against them as they are.** Flat
vector, rounded-rect geometry, no outlines, no gradients, soft elliptical ground
shadow, side profile facing left. Every trait reads at thumbnail size.

They land in `src/activities/explore-inheritance/assets/layers-placeholder/` when
the build starts. *(Until then the only copy is the zip in `~/Downloads` — move
it before clearing anything.)*

**One 160 × 120 viewBox across every file**, so layers stack without alignment
work. Order, bottom to top:

| Layer | File | When |
|---|---|---|
| 1 | `1-base` | always — shadow, body, legs, neck, head, muzzle |
| 2 | `2-coat-short` / `2-coat-long` | `S_` / `ss`; long adds the belly fringe |
| 3 | `3-beard` | `F_` only — beard, mustache, eyebrows |
| 4 | `4-face` | always, above the beard — eye and nose |
| 5 | `5-curl-wavy` / `5-curl-curly` | `Cc` / `CC`; nothing for `cc` or curl off |
| 6 | `6-collar` | always — collar and tag; identity, not a trait |

**Inline the SVG and recolour from CSS.** Fills already read `--coat`, `--ear`,
`--tex` and `--collar` with fallbacks, so a dog is a stack of six `<use>`s plus
four custom properties. No sprite sheets, no canvas, no per-combination file —
and a puppy's whole appearance is four variables, which is exactly what a card
needs to be cheap to draw eight at a time.

Neutral coat (colour trait off) is `--coat: #B4875A`. Those hex values live in
the activity's token block, not scattered through the markup — the project rule
is no hex outside tokens.

Ben replaces these with his own Illustrator layers later, so **keep every layer a
separate asset**. Follow the Explore Dissolving precedent: finished art in
`assets/layers/`, stand-ins in `assets/layers-placeholder/`, and a layer falls
back to the placeholder when the finished set lacks it. **Never write an asset
path into CSS** — everything goes through the activity's `url` helper.

### 11.1 What the placeholders still need

- **No sex indicator.** Section 5.2 requires one on the dog itself. Add it to the
  dog's frame in the litter grid — the ♀/♂ mark — not to the animal itself, so it
  never reads as an inherited trait.
- **Puppies are adult-proportioned.** Acceptable for v1. If it bothers anyone,
  scale the card art to ~80% in litter slots rather than drawing a second set.

Do not copy the publisher's artwork or wording. Mechanics and science are fair
game; their assets and prose are not.

---

## 12. Accessibility

The original scores zero here, so there is no excuse for us.

- **Every interaction has a keyboard path.** Breeding, choosing a puppy, entering
  a code, testing DNA, skipping the animation. Half the trackpads in the room are
  broken by March.
- Litter slots are a single composite widget with arrow-key navigation and one
  tab stop, as `Kit.tabs` does for tablists — not eight tab stops.
- **Live region narration** via `Kit.announcer` (throttled; a per-frame animation
  would otherwise never let the reader finish a sentence). Announce the litter
  result, not every tile: *"Litter of 8. Five with beards, three without."*
- Visible focus on everything focusable. 48 px targets. Readable contrast in both
  themes.
- The dog code field accepts lower case and ignores spaces. Students are
  transcribing from handwriting.

### 12.1 Two type rules, both learned the hard way in the layout sketches

- **No genotype may sit inside a `text-transform` element.** `F` and `f` are
  different alleles and the whole notation depends on case. A `.label` class
  carrying `text-transform: uppercase` rendered `ff SS` as `FF SS` in the
  sketches — silently, and the dog was wrong rather than ugly. Genotypes,
  allele tiles and dog codes get their own class that sets
  `text-transform: none` explicitly, so a later refactor cannot inherit the bug
  back in.
- **12px is the floor for functional text**, not 10px. Every label, count,
  tally header and name on this screen is functional. The first sketches used
  10px mono labels and all three layouts "fit" at 1366x768 — then stopped
  fitting honestly once the type was legible. Design at 12px from the start:
  a layout that only fits at 10px does not fit.

### 12.2 The daylit palette, and the three colours that do not invert

Mock: `.impeccable/mocks/decision/b-ledger-light.html`. Verified at 1366x768 —
no overflow, every target >= 48px. Ratios below are measured, not estimated.

| role | light | dark | on |
|---|---|---|---|
| ground | `#EDE8DC` | `#070B10` | body |
| plate | `#F7F3E9` | `#0A1016` | ledger, slots |
| plate-lit | `#FFFDF6` | `#141E29` | live row, selected slot |
| ink | `#0E141A` | `#EAF1F7` | 15.2:1 |
| ink-soft (labels) | `#46525F` | `#93A6B8` | 6.5:1 |
| accent (live row, dog code) | `#7A5A00` | `#F5C518` | 5.2:1 |
| tally | `#0F6340` | `#3FD17A` | 6.6:1 |
| `--allele-dom` | `#14537B` | `#9FD3FA` | 8.1:1 |
| `--allele-rec` | `#8E2A20` | `#FFA392` | 8.3:1 |
| structural rule, component border | `#6E7C8A` | `#28384A` | 3.5:1 |
| minor divider | `#BFC7CF` | `#1B2733` | within a bounded region only |

Everything above is from the kit's own light theme (`kit.css:109`) except the
tally green, the two allele roles and the structural rule. Three traps:

- **Signal yellow is a fill on light, never a foreground.** `#F5C518` on the
  paper ground is **1.33:1** — invisible. The kit already says so at
  `kit.css:78` ("fill: dark text sits on this"). So the primary button keeps
  the yellow fill with ink on it, and every other place the dark sketch used
  yellow as ink — the live row's rule, the dog code, the generation letter —
  becomes `#7A5A00` on light. This is the one colour that does not invert.
- **`--data` has no light foreground.** `#3FD17A` on paper is **1.62:1**. The
  tally numbers are the single most-read thing on the screen, so the activity
  declares `#0F6340` (6.6:1) rather than shipping an unreadable count.
- **The kit's `--hair-lit` does not clear 3:1 on its own light ground.**
  `#8FA0B0` measures **2.20:1**. That token is the kit's control-border colour
  (`kit.css:232,253,273`), so this is a pre-existing gap in the light theme
  that **Explore Dissolving's controls share** — not something this activity
  invents. This build uses `#6E7C8A` (3.50:1) locally and does not touch the
  kit; correcting `--hair-lit` wants its own pass, with Dissolving re-verified
  in both themes. Flagged, not fixed.

### 12.3 Dogs carry an outline, and coat colour is never tuned for contrast

The bare coat `#B4875A` on the paper ground is **2.62:1** — under the 3:1 a
graphic needs. It cannot be darkened: **coat colour is the B gene**, so tuning
it for contrast would change the genotype the dog is displaying.

So the dog is drawn twice instead: a stroke-only pass underneath at
`stroke-width: 5` in `#46525F`, then the filled shapes on top covering every
internal seam. Only the outer contour survives, and the dog reads at **6.5:1**
on paper whatever its coat. The outline holds down to the 30px ledger thumbs.

Two consequences:

- **No drop shadow.** The placeholder SVGs carry a shadow ellipse; it is
  dropped. The contract says nothing floats, and the stroke pass would outline
  the shadow too.
- Applied to `1-base` in the layered master, so every coat, texture and collar
  combination inherits it without a per-variant fix.

---

## 13. Determinism and testing

The project rule is that simulations are deterministic — seeded RNG, fixed
timestep, so a timeline is scrubbable.

**This activity is the deliberate exception, and only for the draw.** Section 4.1
requires `crypto.getRandomValues`; a seeded litter would be a rigged litter.
Resolve it this way:

- The **draw** is cryptographically random and happens once, up front.
- The **animation** is a deterministic replay of that stored result. Stepping to
  puppy N and seeking to puppy N give the same frame, because the outcome is
  already fixed.

Verify that replay property the way the particle sim's `capture`/`restore`/`seek`
are verified.

Also test:

- Both dog code vectors (7.1), encode and decode, round-trip.
- Every rejection path in section 8.
- A litter that comes out all one sex gets exactly one puppy flipped.
- Hidden genes still inherit and still encode.

---

## 14. Not in this build

- **Whole-class host mode** with a live tally and shared litters. Possible v2.
- The class tally itself stays a Google Form, outside the app.
- Punnett squares stay on paper. Day 3 is a paper exercise by design.
- No sixth engine (ground rule 2).
- No per-puppy genotype quiz. The original's 72 dropdowns are the thing we are
  removing.

---

## 15. Open questions — all answered

| # | Question | Answer | Where |
|---|---|---|---|
| 1 | Unknown parents in the animation — `?` or letters? | `?`, with the two copies visually distinct | 6.2 |
| 2 | Littermates after a puppy is chosen | Fade them, then recentre the camera on the chosen puppy | 5.3 |
| 3 | No opposite-sex mate in class | Reserved `XXXXX` / `YYYYY` registry codes, teacher-enabled; or two pairs double up | 8.1 |

Nothing in this spec is blocked. What remains open is **layout** (section 5),
pending Ben's sketches.

---

## 16. End-of-run summary

Report:

- Every file added or changed, and any kit change however small.
- The "Done means all of this passes" checklist from `CLAUDE.md`, line by line,
  with what was actually verified rather than assumed.
- Anything in this spec that could not be built as written, and what was built
  instead.
- Any `shortcut:` comments left behind, with their limits.
