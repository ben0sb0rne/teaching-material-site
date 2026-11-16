# Explore Inheritance — design review

A heredity simulation for 8th grade science (NGSS MS-LS3-2). Students breed
labradoodles across four generations, watch each parent pass on one random copy
of every gene, and record the results on a paper sheet. It replaces a Flash-era
publisher activity that no longer runs on a school network.

**Two screens.** The *stage* is where a litter is bred, one puppy at a time.
The *record* is the running pedigree students copy onto paper.

## Where it runs

- School Chromebooks, **1366×768, no scrolling**, often touchscreen.
- Offline. No CDN, no external fonts, no network at runtime.
- Printable, for absent students.

## Constraints that bound any suggestion

These are settled and not up for redesign — but say so if one of them is what's
making the screen hard to read.

1. **One screen, no scroll.** At rest a student sees four things: the title, one
   line of instruction, the stage, the primary controls. No persistent banner.
   At most three controls visible at rest.
2. **12px is the floor** for any functional text. A layout that only fits at
   10px does not fit.
3. **Keyboard path for everything**; 48px minimum touch targets; WCAG 4.5:1 for
   text, 3:1 for graphics.
4. **Light and dark both work.** (These exports are light only — dark is unbuilt.)
5. **Case is meaning.** `F` and `f` are different alleles, so nothing holding a
   genotype can be uppercased by styling.
6. Four genes: beard `F/f`, coat length `S/s`, curl `C/c`, colour `B/b`. Curl is
   **incomplete dominance** — `CC` curly, `Cc` wavy, `cc` straight — which is why
   tallies need nine columns and not eight.
7. The paper handouts students fill in are the layout reference. The record's
   column order and the nine-column tally come from them directly.

## The screens

| File | What it shows |
|---|---|
| `01-stage-litter-8.png` | Breeding stage, mid-sequence, 3 of 8 puppies done |
| `02-stage-key-open.png` | Same, with the Key pop-out open |
| `03-record.png` | Breeding record — P, F1, F2 bred; F3 waiting |
| `04-record-key-open.png` | Same, Key open |
| `05-stage-litter-10.png` | Stage at the largest litter a teacher can pick |
| `06-stage-litter-6.png` | Stage at the smallest |

The stage reads left to right: each parent's genotype sits in a grid of square
cells (square because students meet Punnett squares later and should recognise
the cell). A randomiser draws one copy of each gene. The copy that is **not**
drawn goes to a labelled rail rather than vanishing — the original activity made
the unused copy disappear, which teaches that it was destroyed. The two drawn
half-sets meet in the middle and a puppy lands in the tray.

## What I want feedback on

1. **Is the stage legible at a glance, or is it busy?** It has got more elaborate
   over several passes and I think it may have crossed from "clear" into
   "cluttered". If so, what would you cut first?
2. **Do the curved connectors help or hurt?** They were straight diagonals
   before, which looked arbitrary. I am not sure the cure was better than the
   disease.
3. **Does the flow read without narration** — can you tell what happens in what
   order, and that each parent contributes one copy per gene?
4. **The discard rail.** Does "OTHER EGGS / kept, not lost" land, or does it just
   add objects to the screen?
5. **The record's nine-column tally** — is the trait grouping readable, or do the
   numbers blur together?
6. Anything that would confuse a 13-year-old that an adult reads straight past.

## Already known, no need to report

- Dark mode is unbuilt; these are light only.
- The dogs are placeholder art. All puppies currently draw identically and show
  the same genotype, because F1 really is uniform — but it reads as a bug.
- At a litter of 10 the puppy drawing drops to 115px wide, which may be too small
  to read a beard off once the real art exists.
- The wording **"OTHER EGGS / kept, not lost"**. The rail holds exactly one tile
  per gene — the copy that was *not* drawn — so "other eggs" (plural) may be the
  wrong words for what is actually "the other copy of each gene". Comments on
  the wording welcome; it is the one label I am least sure of.
