---
version: 1
slug: "src-activities-explore-inheritance-index-html"
primary_target: "src/activities/explore-inheritance/index.html"
related_targets: []
---

## Direction contract

THESIS: The record is the interface. Every litter writes its own tally into the
pedigree row that produced it, so the thing a student copies onto their paper
sheet is the thing already on screen, in the same shape. It refuses the
breeding-stage-with-a-counter-underneath, where the tree is a view you switch to
and the counts live in a popover one tap away: counts are read after every
single litter, so a tap is a tax paid eight times a period. It equally refuses
the diegetic lab — no monitor bezel, no drawn desk, no instrument costume around
a working screen. This is the registry's software. The only physical thing in
the whole lesson is the DNA sequencer the camera turns to on Day 3, and it earns
that by being the one moment something happens in the room instead of in the
record.

OWN-WORLD: A daylit breed-registry office, after the stud book. Paper-pale
ground, warm rather than clinical; ink near-black, never pure. Ruled hairlines do
every division — no cards, no drop shadows, no rounded corners, nothing floating.
One entry per line, registration numbers and genotypes set in IBM Plex Mono,
Jost for everything else. A single accent marks the live row and the dog code; a
single green is reserved for tallies and appears nowhere else. Dogs are flat
vector sitting on the page, never photographs in frames. No hand-lettered font
anywhere: students have a paper sheet in front of them and must never wonder
which marks are theirs to make.

STORY: A student arrives at a ledger with one row filled in and three waiting.
They predict, breed, and watch two copies of each gene leave each parent — one
into the egg or sperm, one onto the discard rail, never destroyed. The litter
lands, its tally writes itself into the F1 row, and they copy four numbers onto
paper. By Day 4 the ledger holds four rows and the recessive that vanished in F1
is visibly back in F2. They leave knowing that traits come in two copies, that
one of each pair is passed on at random, and that a trait can skip a generation
without going anywhere.

FIRST VIEWPORT: A 452px ledger down the left edge, full height, one row per
generation: generation letter, the pair that made it as 30px thumbs, the kept
dog's five-character code, and that litter's four counts ruled inline beneath.
The live row carries the accent on its left edge; unbred generations sit as a
dashed rule. The remaining width is the work area — breeding pair at 172px with
the randomiser between them, then eight litter slots in a 4x2 grid, each at
least 48px of target. Primary action is bottom right: one filled button, one
outline button, nothing else at rest. Title and the single instruction line run
across the top; no banner, ever.

FORM: Ledger Spine, second on my ordered list of seven structures, dealt by the
roll and locked by the user over Generations Recede and Specimen Board.
seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance

## Unresolved

- Palette re-rendered daylit at `b-ledger-light.html`, same geometry, measured
  and passing (spec 12.2). Awaiting Ben's approval of the surface; the dark
  `b-ledger.html` stays the geometry of record either way.
- The kit's `--hair-lit` (#8FA0B0) is 2.20:1 on its own light ground, below the
  3:1 a component border needs. It is the kit's control-border colour, so
  Explore Dissolving's light theme shares the gap. This build works around it
  locally with #6E7C8A; correcting the token wants its own pass with Dissolving
  re-verified in both themes. Not this activity's call to make alone.
- The DNA sequencer pull-back (Day 3) has no composition yet.
- Litter size resolved: the tray is one row of n slots, sketched and measured
  at 6, 8 and 10 (`h-stage-6/-10.html`). The 4x2 grid is gone. Open risk is
  the dog dropping to 115px at a litter of 10 — legibility of beard and curl
  on the finished art, not layout.
