# Stack and workflow

Why the project is put together the way it is. `CLAUDE.md` is the enforceable
summary; this is the reasoning, for when you want to change something and need
to know what it was holding up.

---

## The actual problem

Twenty activities is the number where **consistency stops being a nice-to-have
and becomes the whole job.** One activity, hand-tuned, is easy. Twenty
hand-tuned activities are twenty slightly different interfaces, and students
pay for that difference every single time they open one.

So the design goal is not "build twenty activities". It is **build five
engines and a design system, then configure twenty activities on top of them.**
Everything below follows from that.

The second problem is polish. The first Explore Dissolving draft works
correctly and still has too much on screen. That is a *systemic* failure, not
a one-off — it happened because nothing told me when to stop adding panels.
Hence the one-screen rule in `CLAUDE.md`. Rules beat taste at scale, because
taste does not survive activity seventeen at 11pm.

---

## Stack decisions

### Plain JS, no framework, in the activity core

These are simulations and canvas renderers running at 60fps. React's model —
re-render on state change — is actively hostile to that, and the usual escape
hatches (refs, `useRef` mutation, bypassing reconciliation) mean you are
writing plain JS anyway with extra ceremony on top.

The kit chrome (buttons, panels, walkthrough) *could* justify Preact later.
Start without. Adding it when three activities genuinely need it is cheap;
removing it once twenty depend on it is not.

### Vite, multi-page build

Chosen for exactly three things:

- **Content hashing.** We lost real time to a stale `sim.js` during the first
  build — measured a change that had not loaded and nearly mis-tuned the
  simulation because of it. Hashed filenames make that class of bug impossible.
- **Bundling**, so each activity is one JS request instead of five.
- **A dev server with hot reload**, replacing `python3 -m http.server`.

Source stays framework-free, so the output is still plain HTML/CSS/JS. Nothing
about this choice leaks into how activities are written.

Cost: a `node_modules` and a lockfile. Worth it at twenty activities. It would
not be worth it at two.

### Standalone pages *and* an embeddable block

Both, because they serve different moments:

- **Standalone URL** is what you paste into Google Classroom, what a student
  opens on a Chromebook, what goes full-screen. This is the main path.
- **Embedded block** is for dropping an activity inline in a lesson page
  mid-explanation.

Same build output serves both. The embed is an iframe, not an inline mount,
and that is deliberate: **WordPress themes leak global CSS aggressively.** An
iframe is the only embedding method where a theme update cannot silently
break twenty activities at once.

### Shipped as a WordPress plugin

The alternative — uploading to `wp-content/uploads/` over SFTP — works but is
fragile: security plugins sometimes block script execution there, and there is
no version history.

A plugin folder gives you:

- Install and update through **WP Admin → Plugins → Upload**, no FTP, no CI,
  no shell on the host
- The shortcode ships with the activities, so they can never be out of sync
- A real version number, and a one-click rollback by uploading the previous zip

```
wp-content/plugins/osborne-activities/
  osborne-activities.php     registers [activity id="..."] and the block
  embed.js                   iframe height bridge
  dist/                      the built activities
```

Standalone URL:

```
/wp-content/plugins/osborne-activities/dist/explore-dissolving/
```

That URL is ugly but works on day one. If it bothers you, add a rewrite rule
later so `/activities/explore-dissolving/` resolves to it — about fifteen
lines of PHP, and worth doing before you hand URLs to students, since those
links end up in their notebooks.

---

## Engines

The reuse thesis, checked against the actual Chemical Interactions contents:

| Engine | Covers |
| --- | --- |
| `particle-sim` | Explore Dissolving, Particles in Solids/Liquids/Gases, Gas in a Syringe, Energy Transfer by Collision, Mixing Hot and Cold Water |
| `sort-bins` | classification, soluble/insoluble, conductor/insulator, Two-Substance Reactions |
| `label-diagram` | Periodic Table, apparatus diagrams, parts-of-a-system |
| `sequence` | Energy Flow, procedure ordering, cycles |
| `data-grapher` | Thermometer, heating curves, trial data entry → plot |

`particle-sim` alone plausibly covers **five or six** of the twenty. That is
where the leverage is, and it is already built — `activities/explore-dissolving/sim.js`
is 90% of a general engine. Generalising it is the highest-value refactor
available and should happen before activity three, not after activity ten.

Deterministic simulation is the property that makes the engine reusable rather
than just shared. Seeded RNG plus fixed timestep buys you scrubbable
timelines, fair side-by-side comparisons, and reproducible bug reports — for
free, in every activity built on it.

---

## The per-activity pipeline

Repeat this for all twenty. Steps 1 and 6 are the ones that get skipped and
should not be.

**1 — Capture the original.** Open it, walk every branch, screenshot each
state. Write `spec.md` in the activity folder: what it does, the pedagogical
beats in order, what is worth keeping, what to drop. Twenty minutes here saves
rebuilding the wrong thing.

**2 — Ask graphify.** What engine fits? What exists already? Never start from
a blank file.

**3 — Build in ponytail mode.** Content and config on top of an engine. If
real logic appears, it belongs in the engine, not the activity.

**4 — Verify.** The checklist in `CLAUDE.md`, all of it, every time.

**5 — Polish.** `emil-design-eng`, then the craft skills, then `animate` if
motion is genuinely warranted, then `mobile-native`.

**6 — Break it.** `break-ui` with worst-case content: long substance names,
missing data, extreme values. Catches the things a happy-path demo never will.

**7 — Ship.** Add to `activities.json`, build, pack, upload.

---

## Phasing

The single biggest risk is **designing the kit for twenty activities before
building three.** Everything you believe about what twenty activities need,
based on one, is a guess.

- **Phase 0** — Extract the kit from Explore Dissolving. Generalise `sim.js`
  into the `particle-sim` engine. *(Mostly done; the extraction is not.)*
- **Phase 1** — Build two more activities on **different** engines. Pick ones
  that stress the kit differently — a `sort-bins` and a `data-grapher`. Three
  data points reveal the real shape.
- **Phase 2** — `ponytail-audit` across all three. Collapse duplication into
  the kit. *Freeze the kit API here.* This is the moment the project either
  stays coherent or does not.
- **Phase 3** — Production-line the remaining seventeen. Should average well
  under a day each by this point, most of it content and spec work.

Resist starting Phase 3 early. The seventeen get much cheaper after Phase 2,
and much more expensive if Phase 2 never happens.

---

## Where the tooling fits

**graphify** — the defence against divergence. Its value grows with repo size,
so it matters most exactly when you are least able to hold the whole thing in
your head. Query before building; re-run after each activity.

**ponytail** — the default implementation mode, and `ponytail-audit` on a
cadence (every ~4 activities). The audit is the important half. Without it,
duplication accumulates quietly and you find out at activity eighteen.

**Design skills** — these are a *pipeline*, not a menu. Order matters: fix
structure before detail, detail before motion, motion before performance.
Running `animate` on a layout that is still wrong wastes both passes.

`impeccable` and `taste-skill` are not installed in this session yet. Slot
them into step 5 after `emil-design-eng`; read them properly the first time
they are used rather than assuming what they contain.

---

## Known backlog

**Explore Dissolving's density pass is done.** For the record, what came out
and where it went:

| Was | Now |
| --- | --- |
| Eyebrow kicker above the title | Deleted (craft floor bans it outright) |
| Subtitle paragraph | Deleted |
| Permanent how-to banner | `?` popover in the top bar |
| Three large substance cards | Segmented control, inline with the instruction |
| Legend block + tally line + progress rail | One status strip, plus a 3px rail on the card's bottom edge |
| 96px dead padding under a sticky toolbar with nothing after it | Removed |

It now fits 1366×768 with no scroll, and the lens grew from roughly 320px to
388px because the stage fills the row height instead of being letterboxed by
the column width.

Two things worth knowing for the next activity:

- **A flex child whose children are all absolutely positioned has no
  intrinsic height**, so `flex: 1 1 auto` collapses it to zero. The stage
  needs `flex: none` plus `aspect-ratio` wherever the row height is not
  definite. This will bite every activity with a canvas stage.
- **Screenshots of the preview pane under viewport emulation are scaled and
  cannot be trusted for judging whether a layout fills the screen.** Measure
  with `getBoundingClientRect` and `elementFromPoint` instead; they disagreed
  here and the measurements were right.

**Phase 0 is done.** The kit and the `particle-sim` engine are extracted:

```
src/kit/kit.css + kit.js            design system, popover, radio group, walkthrough
src/engines/particle-sim/sim.js     deterministic model, placement helpers, rules
src/engines/particle-sim/view.js    canvas lens + playback/transport
src/activities/explore-dissolving/  config and content only
```

The extraction was verified by behaviour, not by inspection: stepping to frame
900 still equals seeking to frame 900, particle for particle. If you touch
`sim.js`, re-run that check — the rng call order is load-bearing and nothing
else will tell you it moved.

The dissolution curve is the other half of that check, and it has **moved
once, on purpose**:

| | 2s | 5s | 10s | 20s | 30s | 40s | 45s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| at extraction | 4 | 12 | 18 | 24 | 34 | 41 | 43 |
| now | 4 | 11 | 21 | 31 | 37 | 41 | 43 |

That is not drift. It is the exposure rule being rewritten so a particle counts
as on the surface when nothing sits above it, rather than when nothing sits
near it — which frees particles faster early while still landing on 43 by 45 s.
The bottom row is the baseline to check against.

**Next: Phase 1.** Two more activities on *different* engines, then the
`ponytail-audit` and the kit freeze. The Vite build and the WordPress plugin
belong in there too.
