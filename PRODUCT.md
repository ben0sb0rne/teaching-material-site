# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain static HTML/CSS/JS. No build step, no package manager; serves from any
static host and from `file://`. Confirmed direction: migrate to Vite
(multi-page, content-hashed) and ship as a WordPress plugin at Phase 1. The
repo is Phase 0 — `npm` does not exist here yet, so the `npm run dev|build|pack`
commands in `CLAUDE.md` describe the destination, not the present. Build toward
engines and the plugin; do not assume a toolchain is installed. Reasoning is in
`docs/STACK.md`.

## Users

Ben's own middle school science students, grades 6, 7 and 8, working on
school-issued touchscreen Chromebooks during class.

Each activity is designed for one specific grade, and the site sections
activities by grade rather than presenting one undifferentiated list. An
activity's reading level and instruction copy follow its target grade.

Two real secondary paths, neither a separate audience:

- Absent students, who receive a printed version.
- Substitute teachers, running the folder from a USB stick or ZIP.

No department, district or public distribution is planned.

## Product Purpose

Replace the publisher's online activities with simulations that work on the
hardware the students actually have — starting with Chemical Interactions and
extending to the equivalent units in the other two grades. Target ~20
activities.

Success is mundane and total: a student opens an activity on a Chromebook
mid-lesson and it works. No network, no plugin, no dependence on a working
trackpad, no scrolling to find the controls.

## Positioning

The simulations are real deterministic models, not recorded animations. Seeded
RNG plus a fixed timestep means whether something dissolves is an outcome
rather than a script — and that single property buys scrubbable timelines, fair
side-by-side comparisons, and reproducible bug reports.

The publisher's version depends on a runtime Google discontinued in 2016 and
still fetches it from `gstatic.com` at lesson time. Running with no network at
all is the thing being fixed.

## Operating Context

- School-issued touchscreen Chromebooks. Trackpads are unreliable by March.
- Locked-down school network: CDNs, external fonts and analytics are blocked
  or unwanted.
- Projector and Chromebooks are rarely set to the same colour scheme, so light
  and dark both ship.
- Links reach students through Google Classroom and get copied into notebooks,
  so a URL handed out is a URL that must keep working.
- Delivery today: static folder served anywhere, or `file://` from a USB stick.
  Planned: WordPress plugin with a standalone URL per activity plus an
  embeddable iframe block for inline use mid-lesson. The embed is an iframe
  deliberately — WordPress themes leak global CSS, and an iframe is the only
  embedding method a theme update cannot silently break.
- Absent students get a printed copy.
- Per-activity pipeline (`docs/STACK.md`): capture the original, query
  graphify, build in ponytail mode, verify against the checklist, polish,
  break with worst-case content, ship.

## Capabilities and Constraints

Confirmed:

- ~20 activities, each thin: content plus configuration on top of a shared
  engine. Five engines planned — `particle-sim`, `sort-bins`,
  `label-diagram`, `sequence`, `data-grapher`. A sixth needs justifying.
- Activities are sectioned by target grade (6, 7, 8).
- Pointer Events only. Never `mousedown`/`touchstart` — mouse-only handlers
  fail silently on a touchscreen Chromebook.
- Every interaction has a keyboard path.
- 48px minimum touch targets (`--tap`).
- All colour from kit tokens; no hex outside the token file.
- Light and dark both correct.
- `prefers-reduced-motion` honoured.
- No CDN, no external fonts, no analytics, no network at runtime.
- No framework in the activity core. Plain JS, because simulations run
  per-frame and re-render-on-state-change fights that.
- Simulations deterministic: seeded RNG, fixed timestep. Stepping to frame N
  must equal seeking to frame N.
- It prints.
- The one-screen rule: at 1366x768 with no scrolling, a student sees the
  activity title, one line telling them what to do, the interactive stage, and
  the primary controls. At rest, no more than three controls visible. A
  persistent instruction banner is a failure.

Explicitly undecided:

- Whether kit chrome ever adopts Preact. Deferred until three activities
  genuinely need it.
- Pretty URLs via a WordPress rewrite rule. Worth doing before URLs are handed
  to students; not yet decided.

## Brand Commitments

- Name in use: "Science Activities". Plugin/package name `osborne-activities`.
- The publisher's artwork and wording are off limits. Mechanics and science are
  fair game; assets and prose are drawn in code and written fresh.
- Voice in the existing copy: plain, direct, addressed to the student. No
  exclamation marks, no mascot energy. An activity description states what the
  student will see — "Watch sugar and calcium carbonate meet water, one
  particle collision at a time."

## Evidence on Hand

- `activities/explore-dissolving/` — one complete activity. `sim.js` is a real
  particle model; `SUBSTANCES[x].breakChance` encodes solubility as a single
  number (sugar `0.08`, calcium carbonate `0`). A particle counts as surface
  when it has fewer than five neighbours left in the pile, which is what makes
  the heap erode from the outside in.
- `shared/kit.css` — the incumbent design system: tokens, light/dark, shell,
  controls, 48px targets, custom easings. 333 lines.
- `index.html` — landing page, one tile per activity.
- `CLAUDE.md`, `README.md`, `docs/STACK.md` — enforceable rules, operating
  notes, and architecture reasoning, including a known backlog: Explore
  Dissolving needs a density pass against the one-screen rule (how-to banner
  to a `?` popover, legend into the lens, tally into the control bar,
  walkthrough collapsed to one line, subtitle gone).
- The publisher's originals were walked for the one captured activity. They are
  anti-reference, not source material.

Not on hand, and not to be invented: student data, usage numbers, other
teachers' feedback, test-score outcomes, or any testimonial or efficacy claim.

## Product Principles

1. Consistency is the job, not a nice-to-have. Twenty hand-tuned interfaces is
   twenty interfaces a student has to relearn, and they pay that cost every
   time they open one.
2. Activities stay thin. Real logic belongs in an engine or the kit. If an
   activity folder is growing logic, that is the signal to extract.
3. Rules beat taste at scale. Taste does not survive activity seventeen at
   11pm, so the one-screen rule and the hard rules are enforceable rather than
   advisory.
4. Determinism is a feature, not an implementation detail. It is what makes an
   engine reusable rather than merely shared.
5. Build for the hardware in the room: a touchscreen Chromebook with a broken
   trackpad on a network that blocks things.
6. Three real activities tell you the shape; one does not. Do not build kit
   features for hypothetical future activities.

## Accessibility & Inclusion

No external standard has been named; these requirements are established and
enforced per activity:

- Completable with keyboard only.
- Screen reader gets a sensible live-region narration.
- 48px minimum touch targets.
- `prefers-reduced-motion` honoured.
- Light and dark both correct.
- No horizontal overflow at 360, 768 or 1366 wide.
- Printable, for absent students.

Reading level follows each activity's target grade, which means the same
interaction pattern may need different instruction copy at grade 6 and grade 8.
