/* ==========================================================================
   particle-sim — a deterministic model of particles moving in a bounded
   region, colliding, and optionally reacting when they hit each other.

   The engine owns the physics, the timeline and the determinism. An activity
   supplies the species, where the particles start, and what a collision
   means. Nothing here knows about dissolving.

   Determinism is the load-bearing property: the same seed and the same frame
   number always produce the same state. That is what lets a timeline scrub
   backwards, and what makes two sims a fair comparison when they share a
   seed. If you change this file, keep the order of rng() calls intact.

   Units: the domain is a circle of radius 1 at the origin, y increasing
   downward to match canvas coordinates.
   ========================================================================== */

(function (global) {
  'use strict';

  /* mulberry32 — small, fast, seedable. One integer of state, so it captures
     and restores along with the particles. */
  function Rng(seed) { this.a = seed >>> 0; }
  Rng.prototype.next = function () {
    this.a = (this.a + 0x6D2B79F5) >>> 0;
    var t = this.a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  var DEFAULTS = {
    seed: 1,
    radius: 1,            // domain radius
    particleRadius: 0.052,

    /* Species are not all the same size. A sucrose molecule is about three
       times the span of a water molecule, and drawing them alike is what
       makes a scale bar a lie. `radii` gives a radius per kind; anything not
       listed falls back to particleRadius, so a model with one size needs no
       changes.

       Mass stays equal. A big particle rebounds like a small one, which is
       wrong, but mass reaches into every collision and the activities that
       exist do not ask the question. */
    radii: null,          // { kind: radius }

    speed: 0.62,          // resting speed, units/second — effectively temperature
    jitter: 0.35,         // random turn per step, radians: the Brownian wobble

    /* How far a particle may cross the domain wall, as a fraction of its own
       radius. At 1 its centre reaches the wall and half of it sits outside,
       which a circular viewport then clips — so the field looks like a window
       onto something larger rather than a dish with everything tidied inside
       it. */
    overhang: 0,

    /* Name a kind here and free particles of other kinds cannot pass below
       the upper surface of its fixed particles. A heap resting on the floor
       is not supposed to have solvent working underneath it; that it can is
       an artefact of modelling a solid as loose discs. */
    sediment: null,
    stirMultiplier: 2.1,

    /* How much of the field's own rigid rotation is bled off each step.

       Stirring injects rotation far faster than anything here takes it out.
       One 1.6 s stroke lifts the circulation share from 0.08 to 0.60, and it
       takes the better part of a minute to fall back — so a student pressing
       Stir every few seconds drives it to 0.95 and holds it there. At that
       point the field is not a liquid of particles, it is a rotating solid
       body, and it stops behaving like particles at all.

       Water does not do this: the wall is no-slip and drag kills bulk
       rotation in seconds. Only the COHERENT part is removed — the single
       rigid-body rotation that best fits the field — so random thermal
       motion is untouched and a stroke still reads as one strong flow.
       Measured over five minutes of stirring every 8 s: 0.05 leaves the
       circulation at +0.03 between strokes and still peaks at 0.91 during
       one, against +0.93 and 0.99 with no drain at all. */
    spinDrain: 0.05,

    /* How far the spoon's circle reaches from the middle of the field, as a
       fraction of the domain radius. The flow circulates about it and the
       lens draws the bar at it, so the current and the thing driving it are
       one stroke. See `step` for why a travelling centre is the whole point;
       the figure is where the field stops orbiting the glass without the
       stroke swinging out of frame. */
    stirReach: 0.6,

    /* How hard a stir turns particles onto a common circular path, 0 to 1.

       Heat and stirring are not the same thing and should not look the same.
       Heat is thermal: every particle moves faster in its own direction, and
       the field jitters harder all over. Stirring is bulk flow: the water
       goes round together, which is why a stirred beaker reads as a current
       and a hot one reads as a swarm.

       Left at 0 a stir is only the speed multiplier, which is the old
       behaviour and what every other activity still gets. */
    stirSwirl: 0,
    stirSeconds: 1.6,

    /* A hand that tires. The reason a real beaker never ends up as a
       rotating solid body is not that water resists it — it is that an arm
       cannot keep it up. So a stroke is bought, and it has to be earned
       back: the reservoir holds `stirBudget` strokes when rested, every
       stroke costs one, and a press with less than one left is refused.
       A student gets three strokes straight away and is then held to one
       per `stirRecover` seconds, which is more forgiving than a lockout —
       a quick double stir is a real gesture and still works.

       Nothing here touches the stroke itself, because the stroke was never
       the problem: one still peaks at 0.73 circulation, which is what makes
       stirring read as a current and heat as a swarm. The frequency was the
       problem. Measured over five minutes of a leaned-on button, pressing
       thirty times a second: unthrottled, the field sits at 0.72 mean
       circulation and spends 97% of the lesson above 0.5 — a rotating
       solid. With this budget it sits at 0.19 and 22%, which is what one
       deliberate stir every 8 s already produced. Whatever the student does
       to the button, the field behaves as if they were stirring on purpose.

       8 s is the pace the lesson itself stirs at, so a deliberate stir is
       never the press that gets refused: at 6 s the field runs hotter
       (0.25 mean) and at 4 s it is back to a half-rotating body (0.36).
       The depth only sets the burst — 2, 3 and 4 all throttle the same.

       shortcut: this bounds coherent rotation, not the outer-rim share,
       which sustained pressing still leaves near 0.5 — but so does a single
       deliberate stir, and an unstirred beaker drifts to 0.49 on its own by
       the end of the lesson. Revisit only with a rim metric that separates
       the two; throttling cannot, short of refusing a stir every 40 s.

       On by default, because any activity that swirls has this bug: there
       is one activity today and it wants the throttle. Set stirRecover to 0
       to get the old unlimited hand back. */
    stirBudget: 3,        // strokes a rested hand holds
    stirRecover: 8,       // seconds to earn one stroke back
    exposureReach: 2.3,   // multiples of particle radius
    exposureMax: 4,       // fewer neighbours than this and a particle is on the surface
    dt: 1 / 60,
    duration: 3600,
    snapEvery: 60,        // one snapshot a second keeps scrubbing cheap
    setup: function () {},
    onImpact: null,       // (sim, fixedParticle, freeParticle, relSpeed)

    /* Solvation shell. When a solute particle breaks free it carries a
       cage of solvent with it. Six is both the real hydration number for
       sucrose and, usefully, the exact number of equal circles that fit
       around one in two dimensions. */
    shellSize: 0,
    shellGap: 2.04,       // multiples of particle radius, centre to centre
    shellPull: 7.5,       // how hard a shell member is steered to its slot
    shellSpin: 0.5,       // radians/second the cage rotates
    hydratedDrag: 0.62,   // a caged solute moves slower than bare solvent

    /* How hard a particle coming back out of solution is pulled to the slot
       `packPile` laid it in: the stiffness of a critically damped spring, so
       it eases out of the water, eases into the slot and never overshoots.
       A critically damped spring settles in about four over the square root
       of this, so 30 is a little under three quarters of a second — slow
       enough to watch a pile assemble, short enough that a reset is not
       waiting on it. At 0 a particle is simply put there. */
    settleReturn: 30
  };

  function Sim(config) {
    this.cfg = Object.assign({}, DEFAULTS, config);
    this.reset();
  }

  Sim.prototype.reset = function () {
    this.rng = new Rng(this.cfg.seed);
    this.frame = 0;
    this.stirUntil = -1;
    /* A multiplier on the resting speed, which is what `speed` already means:
       hotter water is faster particles. Runtime state, not config, because it
       changes mid-run and has to travel in the snapshot like the stir does. */
    this.heat = 1;
    this.stirStart = -1;
    /* Strokes left in the hand. Runtime state like `heat`, so it travels in
       the snapshot: without that, seeking past a stir hands the student a
       hand that is tired in one direction and rested in the other. */
    this.stirLeft = this.cfg.stirBudget;
    this.particles = [];
    this.cfg.setup(this);
    this.refreshExposure();
    this.refreshSurface();
    this.snaps = [this.capture()];
  };

  /* ---- placement helpers, called from an activity's setup() ------------- */

  Sim.prototype.radiusOf = function (kind) {
    var r = this.cfg.radii && this.cfg.radii[kind];
    return r == null ? this.cfg.particleRadius : r;
  };

  /* Hexagonally packed rows resting on the floor of the domain, built from
     the bottom up and centred. Uses no randomness, so it must run before
     anything that does if you want the rng stream to stay comparable between
     configurations.

     The heap is levelled: whatever is left over at the top is shared with the
     row beneath rather than dropped on as a stub, because a short row alone
     on the summit reads as a bump on an otherwise flat bed of sediment. The
     sides still follow the curve of the floor, which is what settled powder
     in a round vessel actually looks like. */
  Sim.prototype.packPile = function (kind, n, taper) {
    var pr = this.radiusOf(kind);
    var inner = this.cfg.radius - pr;
    var rowGap = pr * 1.732;

    // Each row that can hold at least one particle, and how many it holds.
    var slots = [];
    for (var row = 0; row < 24; row++) {
      var y = inner - row * rowGap;
      var half = Math.sqrt(Math.max(0, inner * inner - y * y));
      var cap = Math.floor((half * 2) / (pr * 2));
      if (cap >= 1) slots.push({ y: y, cap: cap });
    }

    var counts = [], placed = 0;
    for (var s = 0; s < slots.length && placed < n; s++) {
      // A taper narrows each placed row going up, for a deliberate mound.
      var fit = taper ? Math.min(slots[s].cap, taper - s) : slots[s].cap;
      if (fit < 1) continue;
      var take = Math.min(fit, n - placed);
      counts.push(take);
      placed += take;
    }

    /* Level the summit, but only where both rows can hold their share —
       otherwise the total would quietly change. */
    var top = counts.length - 1;
    if (top > 0 && counts[top] < counts[top - 1] * 0.75) {
      var spread = counts[top] + counts[top - 1];
      var lower = Math.ceil(spread / 2);
      if (lower <= slots[top - 1].cap && spread - lower <= slots[top].cap) {
        counts[top - 1] = lower;
        counts[top] = spread - lower;
      }
    }

    for (var r = 0; r < counts.length; r++) {
      var span = (counts[r] - 1) * pr * 2;
      for (var i = 0; i < counts[r]; i++) {
        /* The slot this one was laid in, kept on it. It never changes and it
           costs the snapshot nothing, because `reset` rebuilds the pile from
           the same rng-free arithmetic and every home comes back identical.
           It is what `settle` aims at, and it is the whole reason a boiled-dry
           heap is the pile the run started with rather than a flat spread of
           wherever each grain happened to be when the water left. */
        var hx = -span / 2 + i * pr * 2, hy = slots[r].y;
        this.particles.push({
          x: hx, y: hy,
          vx: 0, vy: 0, r: pr,
          kind: kind, fixed: true, exposed: false, freedAt: -1,
          host: -1, slot: -1, caged: false,
          homeX: hx, homeY: hy
        });
      }
    }

    // The heap is what the surface is made of, so it is knowable from here —
    // and fillRandom, which usually runs next, needs it to place above it.
    this.refreshSurface();
  };

  /* Scatters particles into whatever room is left. Rejection sampling is
     plenty while the occupied fraction stays modest. */
  Sim.prototype.fillRandom = function (kind, n) {
    var pr = this.radiusOf(kind);
    var inner = this.cfg.radius - pr;
    var placed = 0, attempts = 0;

    /* Generous, because the last few places are the hard ones: at the
       densities these fields run at, most throws land on something. */
    while (placed < n && attempts < 400000) {
      attempts++;
      var a = this.rng.next() * Math.PI * 2;
      var r = Math.sqrt(this.rng.next()) * inner;
      var x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (this.overlapsAny(x, y, pr)) continue;
      // Never start underneath the heap; it would have no way back out.
      if (this.belowSurface(x, y)) continue;

      var dir = this.rng.next() * Math.PI * 2;
      var sp = this.cfg.speed * (0.7 + this.rng.next() * 0.6);
      this.particles.push({
        x: x, y: y,
        vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, r: pr,
        kind: kind, fixed: false, exposed: false, freedAt: -1,
        host: -1, slot: -1, caged: false,
        homeX: null, homeY: null      // scattered, so no slot to go back to
      });
      placed++;
    }
  };

  /* Room for a particle of radius `r` at (x, y). Each neighbour is measured
     by its own size, so a small solvent can slip into a gap a large solute
     could not. */
  Sim.prototype.overlapsAny = function (x, y, r) {
    var p = this.particles;
    for (var i = 0; i < p.length; i++) {
      var dx = p[i].x - x, dy = p[i].y - y;
      var touch = r + p[i].r;
      if (dx * dx + dy * dy < touch * touch) return true;
    }
    return false;
  };

  /* ---- state ------------------------------------------------------------ */

  /* A fixed particle is exposed when solvent can actually reach it. The heap
     has settled on the floor, so the only way in is from above: a particle
     with another sitting over it is shielded, however few neighbours it has.
     (y increases downward, so "above" is a smaller y.) */
  /* The top of the heap, column by column.

     One flat line across the whole domain would leave solvent hovering over
     a pit once the middle of the heap had eroded away, so each column keeps
     its own height and the water follows the hollows down. Rebuilt with the
     exposure pass, which already walks the fixed particles and already runs
     often enough.

     Columns are indexed off the domain's left edge; a particle claims every
     column its own width covers. */
  /* Solid again, but not yet where it belongs: a particle `settle` has fixed
     that is still travelling to the slot `packPile` laid it in. Named once
     because three passes have to agree about it — the heap's surface, which
     it is not yet part of, what the water can dissolve, which it is not yet
     one of, and the end of a run, which waits for it. */
  function landing(q) {
    return q.fixed && q.homeX != null && (q.x !== q.homeX || q.y !== q.homeY);
  }

  Sim.prototype.refreshSurface = function () {
    if (!this.cfg.sediment) return;
    var p = this.particles, r = this.cfg.radius;

    if (!this.surface) {
      var probe = this.radiusOf(this.cfg.sediment);
      this.colW = probe * 2;
      this.surface = new Float64Array(Math.ceil((r * 2) / this.colW) + 1);
    }
    this.surface.fill(Infinity);

    for (var i = 0; i < p.length; i++) {
      var q = p[i];
      if (!q.fixed || q.kind !== this.cfg.sediment) continue;
      /* Still on its way back to its slot, so not yet part of the heap.
         Counting it where it flies would stand a surface column up in
         mid-water and clamp the remaining solvent above it. */
      if (landing(q)) continue;
      var from = Math.max(0, Math.floor((q.x - q.r + r) / this.colW));
      var to = Math.min(this.surface.length - 1,
                        Math.floor((q.x + q.r + r) / this.colW));
      /* The centre line, not the top of the particle. A barrier at the top
         would park solvent at exactly the distance where two particles
         touch without overlapping — which reads as contact but never
         registers as a collision, so nothing on the surface would ever
         dissolve. At the centre line solvent still settles into the dimples
         between particles and collides with them properly; it just cannot
         get underneath. */
      var top = q.y;
      for (var c = from; c <= to; c++) {
        if (top < this.surface[c]) this.surface[c] = top;
      }
    }
  };

  // Is a particle at (x, y) below the heap's surface?
  Sim.prototype.belowSurface = function (x, y) {
    if (!this.surface) return false;
    var c = Math.floor((x + this.cfg.radius) / this.colW);
    if (c < 0 || c >= this.surface.length) return false;
    return y > this.surface[c];
  };

  /* Keep one free particle above the heap. Its downward travel stops dead
     rather than bouncing: this is a floor it rests on, not a wall it hits. */
  Sim.prototype.restOnSurface = function (q) {
    if (!this.surface || q.fixed || q.gone || q.kind === this.cfg.sediment) return;
    var c = Math.floor((q.x + this.cfg.radius) / this.colW);
    if (c < 0 || c >= this.surface.length) return;
    var limit = this.surface[c];
    if (q.y > limit) {
      q.y = limit;
      if (q.vy > 0) q.vy = 0;
    }
  };

  Sim.prototype.refreshExposure = function () {
    var p = this.particles;

    for (var i = 0; i < p.length; i++) {
      if (!p[i].fixed) continue;
      // Measured in the sheltering particle's own size, so a heap of large
      // particles shields over a correspondingly larger span.
      var pr = p[i].r;
      var reach = pr * this.cfg.exposureReach;
      var reach2 = reach * reach;
      var overhead = pr * 1.35;   // how far sideways still counts as "over"
      var lift = pr * 0.45;       // how much higher it has to sit to shield
      var covered = false;
      for (var j = 0; j < p.length; j++) {
        if (j === i || !p[j].fixed) continue;
        var dx = p[j].x - p[i].x, dy = p[j].y - p[i].y;
        if (dx * dx + dy * dy > reach2) continue;
        if (dy < -lift && Math.abs(dx) < overhead) { covered = true; break; }
      }
      /* A grain on its way back to its slot is not yet on the heap, so the
         water has nothing to knock it off. Without this the boil dissolves
         the solid it is in the middle of recovering — 18 grains over one
         boil, measured — and the heap never closes. */
      p[i].exposed = !covered && !landing(p[i]);
    }
  };

  Sim.prototype.count = function (pred) {
    var n = 0;
    for (var i = 0; i < this.particles.length; i++) if (pred(this.particles[i])) n++;
    return n;
  };

  /* Cage the nearest unattached solvent around a newly freed solute. The
     choice is by distance, never by rng, so adding this does not shift the
     random stream the rest of the model runs on. */
  Sim.prototype.attachShell = function (soluteIndex) {
    var n = this.cfg.shellSize;
    if (!n) return;
    var p = this.particles, solute = p[soluteIndex];
    var near = [];
    for (var i = 0; i < p.length; i++) {
      var w = p[i];
      if (w.kind === solute.kind || w.fixed || w.host >= 0) continue;
      var dx = w.x - solute.x, dy = w.y - solute.y;
      near.push({ i: i, d: dx * dx + dy * dy });
    }
    near.sort(function (a, b) { return a.d - b.d || a.i - b.i; });
    var taken = Math.min(n, near.length);
    for (var k = 0; k < taken; k++) {
      p[near[k].i].host = soluteIndex;
      p[near[k].i].slot = k;
    }
    solute.caged = taken > 0;
  };

  Sim.prototype.release = function (particle, hitter) {
    particle.fixed = false;
    particle.exposed = false;
    particle.freedAt = this.frame;
    var dir = Math.atan2(particle.y - hitter.y, particle.x - hitter.x);
    dir += (this.rng.next() - 0.5) * 1.2;
    var sp = this.cfg.speed * (0.8 + this.rng.next() * 0.5);
    particle.vx = Math.cos(dir) * sp;
    particle.vy = Math.sin(dir) * sp;
    this.attachShell(this.particles.indexOf(particle));
    this.refreshExposure();
    this.refreshSurface();
  };

  // Shared, so frozen: callers read this, they never own it.
  var REST = Object.freeze({ strength: 0, x: 0, y: 0, turns: 0, depth: 0 });

  /* Boiling off the solvent.

     Water leaves from the top, so the highest particles go first. They are
     flagged rather than spliced out: `capture` indexes the array by position,
     and a snapshot taken before the boil has to restore onto the same array.

     What is left behind is the whole point of the thing — the solute never
     went anywhere, and as the water goes it has nowhere to stay dissolved. */
  Sim.prototype.evaporate = function (n) {
    var live = [];
    for (var i = 0; i < this.particles.length; i++) {
      var q = this.particles[i];
      if (!q.fixed && !q.gone && q.kind !== this.cfg.sediment) live.push(q);
    }
    live.sort(function (a, b) { return a.y - b.y; });   // top of the field first
    for (var k = 0; k < n && k < live.length; k++) live[k].gone = true;
    return live.length - Math.min(n, live.length);
  };

  /* Solute coming back out of solution: the lowest free particles are solid
     again and head back to the slot they were packed in. `step` walks them
     there; `instant` puts them there now, which is what someone who asked for
     less motion gets.

     Its own slot, not the nearest free one. The set of homes is exactly what
     `packPile` laid down, so the identity mapping rebuilds that pile exactly,
     needs no occupancy to track and adds nothing to the snapshot — and a
     vacancy refilled by the grain that left it is the truer picture anyway. */
  Sim.prototype.settle = function (n, instant) {
    var free = [];
    for (var i = 0; i < this.particles.length; i++) {
      var q = this.particles[i];
      if (q.kind === this.cfg.sediment && !q.fixed && !q.gone) free.push(q);
    }
    free.sort(function (a, b) { return b.y - a.y; });   // nearest the floor first
    var took = Math.min(n, free.length);
    for (var k = 0; k < took; k++) {
      var f = free[k];

      if (f.homeX == null) {
        /* Nothing packed it, so it joins the heap where it stands. A column
           dissolved hollow carries Infinity, which `refreshSurface` fills
           with and `belowSurface` reads correctly as "nothing here" — but
           assigning it puts the particle at a coordinate the next step turns
           into NaN, and a NaN particle is drawn nowhere. */
        var rest = Infinity;
        if (this.surface) {
          var c = Math.floor((f.x + this.cfg.radius) / this.colW);
          if (c >= 0 && c < this.surface.length) rest = this.surface[c];
        }
        if (!isFinite(rest)) {
          var inner = this.cfg.radius - f.r * (1 - this.cfg.overhang);
          rest = Math.sqrt(Math.max(0, inner * inner - f.x * f.x));
        }
        f.y = rest;
      } else if (instant || !this.cfg.settleReturn) {
        f.x = f.homeX; f.y = f.homeY;
      }

      f.vx = 0; f.vy = 0;        // the return starts from rest
      f.fixed = true;
      f.freedAt = -1;
      /* Rebuilt per particle rather than once at the end, so the next one
         to land in this column sees this one under it. */
      this.refreshSurface();
    }
    if (took) this.refreshExposure();
    return free.length - took;
  };

  /* One step of the walk home: every solid grain that is not in the slot
     `packPile` laid it in moves toward it on a critically damped spring, so
     it eases out of where it is and eases into its slot and never overshoots.

     Its own method because two things drive it. `step` runs it as part of the
     model, which is what recovers the solid as a beaker boils dry. A reset
     runs it on its own, with the clock stopped, because the field is full of
     solvent that is not in the beaker yet and stepping the model there would
     dissolve the fresh sample before it had landed.

     Nothing in it draws from the rng, and a grain already home takes the snap
     branch and is left exactly where it was, so a run that never boils and
     never resets is untouched to the bit. */
  Sim.prototype.returnHome = function () {
    var cfg = this.cfg, p = this.particles;
    var pull = cfg.settleReturn, damp = 2 * Math.sqrt(pull);
    for (var i = 0; i < p.length; i++) {
      var q = p[i];
      if (!q.fixed || q.gone || q.homeX == null) continue;
      var hx = q.homeX - q.x, hy = q.homeY - q.y;
      /* Within a three-hundredth of a radius it is put exactly in its slot.
         That is what makes a rebuilt heap identical to the one it started as
         rather than near it: a damped approach never quite arrives on its
         own, and the last tenth of a pixel would be a second of dead time. */
      if (!pull || hx * hx + hy * hy < 1e-5) {
        q.x = q.homeX; q.y = q.homeY; q.vx = 0; q.vy = 0;
        continue;
      }
      q.vx += (hx * pull - q.vx * damp) * cfg.dt;
      q.vy += (hy * pull - q.vy * damp) * cfg.dt;
      q.x += q.vx * cfg.dt;
      q.y += q.vy * cfg.dt;
    }
  };

  /* Lift the packed solid clear of the field so that it arrives rather than
     appears. `returnHome` then walks it down into the slots — the same
     return a boil uses, so fresh powder going in and recovered solid coming
     out of solution are visibly the same substance doing the same thing.

     A slot higher up the heap starts higher still, so the pile builds from
     the floor upward instead of the whole of it landing at once. At rise 0
     every grain is simply put in its slot, which is what someone who asked
     for less motion gets. */
  Sim.prototype.liftHome = function (rise) {
    var p = this.particles, r = this.cfg.radius;
    for (var i = 0; i < p.length; i++) {
      var q = p[i];
      if (q.homeX == null) continue;
      /* Higher slots start higher and are thrown harder, so they are still in
         the air while the floor of the pile is already down. Distance alone
         would not do it: a critically damped spring takes the same time to
         cross any gap, so without the throw all fifty land on the same frame
         and the pile arrives as one piece. */
      var high = 1 + (r - q.homeY);
      /* Thrown wide as well as high, so the pile gathers itself inward
         instead of descending in formation with every grain holding its
         column. Proportional to the slot's own offset, so it is a scatter
         that closes rather than a shuffle. */
      q.x = q.homeX * 1.25;   // 1.25, so the widest slot stays inside the glass
      q.y = q.homeY - rise * high;
      q.vx = 0;
      q.vy = -rise * high * Math.sqrt(this.cfg.settleReturn) * 0.9;
    }
    this.refreshSurface();
    this.refreshExposure();
  };

  /* How many are still on their way back. A run that ended mid-return would
     stop the clock on a half-rebuilt heap, so a caller winding one up waits
     on this. */
  Sim.prototype.landing = function () {
    var p = this.particles, k = 0;
    for (var i = 0; i < p.length; i++) if (landing(p[i])) k++;
    return k;
  };

  /* Returns false when the hand had nothing left, so a caller that does more
     than start the stroke — the activity raises turbidity per press — can
     skip it too. Otherwise mashing still maxes the cloudiness out. */
  Sim.prototype.stir = function () {
    if (this.cfg.stirRecover && this.stirLeft < 1) return false;
    this.stirLeft -= 1;
    this.stirStart = this.frame;
    this.stirUntil = this.frame + Math.round(this.cfg.stirSeconds / this.cfg.dt);
    return true;
  };

  /* The stir, as a phase anything can read. Returning it from the model
     rather than animating each spoon separately is what keeps a spoon in the
     lens and a spoon in the beaker on the same stroke: both read this.

     A stir is a circular translation, not a rotation. The bowl travels round
     the vessel while the spoon keeps its orientation, the way your hand does.
     x and y are offsets in [-1, 1] of whatever stir radius the caller uses;
     depth is 0 at the far side of that circle and 1 at the near side. */
  Sim.prototype.stirProgress = function () {
    if (this.stirStart < 0) return REST;

    var span = Math.max(1, this.stirUntil - this.stirStart);
    var t = (this.frame - this.stirStart) / span;
    if (t < 0 || t > 1) return REST;

    // Two turns and a bit, decelerating: a wrist slows before it stops. The
    // quarter turn taken off the front starts the stroke at the far side.
    var turns = (1 - Math.pow(1 - t, 2)) * 2.25;
    var angle = turns * Math.PI * 2 - Math.PI / 2;

    /* One envelope governs both how far out the bowl travels and how present
       it is. It opens fast, holds, then closes, so the stroke begins and ends
       exactly where the spoon rests instead of jumping out to the edge of its
       circle and parking there. The last turn spirals inward as it slows,
       which is what winding down actually looks like. */
    var env = Math.min(1, t / 0.08) * Math.min(1, (1 - t) / 0.30);

    /* Depth reads the raw angle, never y. y carries the envelope too, so it
       collapses to zero at both ends of the stroke and cannot say how far
       away the spoon is. */
    return { strength: env, turns: turns,
             depth: (Math.sin(angle) + 1) / 2,
             x: Math.cos(angle) * env, y: Math.sin(angle) * env };
  };

  /* ---- the step --------------------------------------------------------- */

  Sim.prototype.step = function () {
    var cfg = this.cfg;
    var p = this.particles, n = p.length, i, j, q;
    /* The hand recovers whether or not it is stirring, and the cap means a
       rested hand is at exactly `stirBudget` rather than at the sum of a
       class period's worth of additions. Arithmetic only: no rng draw, so a
       run that never stirs is untouched to the bit. */
    if (cfg.stirRecover) {
      this.stirLeft = Math.min(cfg.stirBudget,
                               this.stirLeft + cfg.dt / cfg.stirRecover);
    }
    var stirring = this.frame < this.stirUntil;
    var target = (stirring ? cfg.speed * cfg.stirMultiplier : cfg.speed) * this.heat;
    /* The same envelope the vortex and the stir bar read, so the current
       builds and dies away with them rather than snapping on. */
    var swirl = stirring && cfg.stirSwirl
      ? cfg.stirSwirl * this.stirProgress().strength : 0;
    /* Where the spoon is this frame. The circulation is about the spoon, not
       about the middle of the beaker. */
    var sweep = swirl ? this.stirProgress() : null;
    var sx = sweep ? sweep.x * cfg.stirReach : 0;
    var sy = sweep ? sweep.y * cfg.stirReach : 0;

    // Thermal motion: turn a little at random, drift back toward the speed
    // the temperature implies, then move.
    for (i = 0; i < n; i++) {
      q = p[i];
      if (q.fixed || q.gone) continue;
      var sp = Math.sqrt(q.vx * q.vx + q.vy * q.vy) || 1e-6;
      var ang = Math.atan2(q.vy, q.vx) + (this.rng.next() - 0.5) * cfg.jitter;
      if (swirl) {
        /* Turn toward the circulation at this particle's own position, so the
           whole field converges on one flow instead of each particle simply
           going faster. Speed is untouched: that belongs to heat.

           The circulation is about the spoon, which is travelling its own
           circle, and not about the middle of the beaker, which is not
           travelling anywhere.

           That is the whole fix. Aimed at a fixed centre, the field converges
           on the tangent in about ten steps whatever the swirl strength is,
           and a field all pointing one way is a rotating body with nothing
           holding it in: measured, half a minute of stirring put 98 of every
           100 free solute particles in the outer quarter of the radius,
           orbiting the glass. Aimed at a centre that is itself going round,
           every particle's target direction sweeps with it, so the field
           never settles into one rotation — which is what mixing is, and what
           the bar drawn in the viewport has been depicting all along.

           This is not the old carousel. That one was damping pooling energy
           into rigid rotation, and it was cured by making collisions elastic;
           this one had no radial component in it at all. */
        var dx = q.x - sx, dy = q.y - sy;
        var aim = Math.atan2(dx, -dy);
        var turn = (aim - ang) % (Math.PI * 2);
        if (turn > Math.PI) turn -= Math.PI * 2;
        if (turn < -Math.PI) turn += Math.PI * 2;
        ang += turn * swirl;
      }
      var want = q.caged ? target * cfg.hydratedDrag : target;
      sp += (want - sp) * 0.08;
      q.vx = Math.cos(ang) * sp;
      q.vy = Math.sin(ang) * sp;
      q.x += q.vx * cfg.dt;
      q.y += q.vy * cfg.dt;
    }

    /* Solid coming back out of solution, walking to the slot it was packed
       in. A critically damped spring on the particle's own velocity: it eases
       out of the water, eases into the slot, and never overshoots.

       It needs no new state. x, y, vx and vy are what the snapshot already
       carries, so a return survives a scrub and resumes exactly where it was.
       A fixed particle is skipped by the thermal pass, by the wall and by
       `restOnSurface`, and a collision moves only the free side of a pair, so
       this moves nothing anything else is moving. Nothing here draws from the
       rng, and a particle already in its slot takes the snap branch and is
       left exactly where it was — so a run that never boils is untouched to
       the bit. */
    this.returnHome();

    /* Bleed off rigid rotation: see `spinDrain`. Fitting one angular velocity
       to the whole field and removing a fraction of it costs two passes and
       no rng draw, so the stream is untouched and a run that never stirs is
       bit-identical — the fit is zero when there is nothing turning. */
    if (cfg.spinDrain) {
      var spinI = 0, spinL = 0, sq;
      for (i = 0; i < n; i++) {
        sq = p[i];
        if (sq.fixed || sq.gone) continue;
        spinL += sq.x * sq.vy - sq.y * sq.vx;
        spinI += sq.x * sq.x + sq.y * sq.y;
      }
      if (spinI > 1e-9) {
        var spin = (spinL / spinI) * cfg.spinDrain;
        for (i = 0; i < n; i++) {
          sq = p[i];
          if (sq.fixed || sq.gone) continue;
          sq.vx += spin * sq.y;
          sq.vy -= spin * sq.x;
        }
      }
    }

    // Steer every caged solvent toward its slot on the ring. A spring, not a
    // weld: the cage still jostles, still collides, and still looks alive.
    if (cfg.shellSize) {
      var step = Math.PI * 2 / cfg.shellSize;
      var spin = this.frame * cfg.dt * cfg.shellSpin;
      for (i = 0; i < n; i++) {
        q = p[i];
        if (q.host < 0 || q.gone) continue;
        var host = p[q.host];
        if (!host || host.fixed) { q.host = -1; q.slot = -1; continue; }
        // Centre to centre, so the cage sits off the host's own surface.
        var ring = (host.r + q.r) * (cfg.shellGap / 2);
        var a2 = spin + q.slot * step + q.host;
        var tx = host.x + Math.cos(a2) * ring;
        var ty = host.y + Math.sin(a2) * ring;
        q.vx += (tx - q.x) * cfg.shellPull * cfg.dt;
        q.vy += (ty - q.y) * cfg.shellPull * cfg.dt;
      }
    }

    // Keep everything inside the domain, each by its own size, less whatever
    // overhang is allowed past the edge.
    for (i = 0; i < n; i++) {
      q = p[i];
      if (q.fixed || q.gone) continue;
      var inner = cfg.radius - q.r * (1 - cfg.overhang);
      var d = Math.sqrt(q.x * q.x + q.y * q.y);
      if (d > inner) {
        var nx = q.x / d, ny = q.y / d;
        q.x = nx * inner; q.y = ny * inner;
        var dot = q.vx * nx + q.vy * ny;
        q.vx -= 2 * dot * nx;
        q.vy -= 2 * dot * ny;
      }
    }

    /* Pair collisions. At ~750 particles this is a quarter of a million
       checks a step and still well inside a frame, because the per-pair work
       is a subtraction and a compare. A spatial grid would buy speed at the
       cost of readability, and nothing yet needs it.

       Collisions are elastic: the whole normal component is reflected.

       Damping them was tried, to make a dense field settle and slide like a
       liquid rather than fly like a gas. It does that, and it also spins the
       whole field slowly round the centre, because rigid rotation is the one
       motion with no relative velocity in it for an inelastic collision to
       drain — so the thermal drift pumps energy in and it collects there,
       with nothing to take it out. In a circular domain that is a visible
       carousel. Measured: at restitution 0.6 the net rotation is 0.3 to 0.6
       of all motion, direction set by the seed; it is gone by 0.9, and so is
       the settling that was the point. The two are the same effect. */
    var bounce = 2;
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var a = p[i], b = p[j];
        if (a.gone || b.gone || (a.fixed && b.fixed)) continue;

        // They touch when the gap closes to the sum of the two radii, which
        // is the one place a mixed-size model differs from a uniform one.
        var contact = a.r + b.r;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d2 = dx * dx + dy * dy;
        if (d2 >= contact * contact || d2 === 0) continue;

        var dist = Math.sqrt(d2);
        var ux = dx / dist, uy = dy / dist;
        var rel = (a.vx - b.vx) * ux + (a.vy - b.vy) * uy;

        if (a.fixed || b.fixed) {
          // One is immovable: the free one bounces off it and keeps its
          // speed, the way a ball comes off a wall.
          var free = a.fixed ? b : a;
          var sgn = a.fixed ? 1 : -1;
          var push = contact - dist;
          free.x += ux * push * sgn;
          free.y += uy * push * sgn;
          var dotf = free.vx * ux + free.vy * uy;
          free.vx -= bounce * dotf * ux;
          free.vy -= bounce * dotf * uy;

          if (cfg.onImpact) cfg.onImpact(this, a.fixed ? a : b, free, Math.abs(rel));
        } else {
          // Equal masses: they trade the velocity component along the normal.
          // Perfectly elastic swaps it outright; damped, each keeps some.
          var overlap = (contact - dist) / 2;
          a.x -= ux * overlap; a.y -= uy * overlap;
          b.x += ux * overlap; b.y += uy * overlap;
          if (rel > 0) {
            var imp = rel * bounce / 2;
            a.vx -= imp * ux; a.vy -= imp * uy;
            b.vx += imp * ux; b.vy += imp * uy;
          }
        }
      }
    }

    /* Last word on where anything may be. It has to come after the
       collisions, because that is what shoves a particle through the heap's
       surface in the first place — enforcing it earlier only holds until two
       particles touch. */
    if (this.surface) {
      for (i = 0; i < n; i++) this.restOnSurface(p[i]);
    }

    if (this.frame % 10 === 0) { this.refreshExposure(); this.refreshSurface(); }
    this.frame++;

    /* Stop at `duration`, because seek() clamps there: a snapshot past it can
       never be restored, and a tab left open for a class period would grow by
       16 MB an hour per station for nothing. Seeking back from frame 100000
       still works — the nearest earlier snapshot is all seek() ever wants. */
    if (this.frame % cfg.snapEvery === 0 && this.frame <= cfg.duration) {
      this.snaps[this.frame / cfg.snapEvery] = this.capture();
    }
  };

  /* ---- timeline --------------------------------------------------------- */

  Sim.prototype.capture = function () {
    var n = this.particles.length;
    var xs = new Float64Array(n * 4);
    var flags = new Uint8Array(n);
    var freed = new Int32Array(n);
    var hosts = new Int32Array(n);
    var slots = new Int32Array(n);
    for (var i = 0; i < n; i++) {
      var q = this.particles[i];
      xs[i * 4] = q.x; xs[i * 4 + 1] = q.y;
      xs[i * 4 + 2] = q.vx; xs[i * 4 + 3] = q.vy;
      flags[i] = (q.fixed ? 1 : 0) | (q.exposed ? 2 : 0) | (q.gone ? 4 : 0);
      freed[i] = q.freedAt;
      hosts[i] = q.host;
      slots[i] = q.slot;
    }
    return { xs: xs, flags: flags, freed: freed, hosts: hosts, slots: slots,
             frame: this.frame, rng: this.rng.a,
             stirUntil: this.stirUntil, stirStart: this.stirStart,
             stirLeft: this.stirLeft, heat: this.heat };
  };

  /* How many particles matched `pred` at an earlier frame, read off the
     snapshot ring rather than by replaying it. Null when that frame was
     never captured — only multiples of `snapEvery` are.

     Read-only: it does not touch the live field, so it is safe to call
     mid-run. It exists because a caller that wants "how many had dissolved
     at fifteen seconds" cannot ask the live field — the Player takes up to
     eight steps per display frame, so by the time a frame notices it has
     passed 15 s the model may be three frames further on, and a reading
     that depends on how a browser paced its frames is not one two students
     can compare.

     The predicate is handed a plain object rather than the live particle,
     because a snapshot stores state, not identity: `kind` comes from the
     particle, since kinds never change, and the rest from the capture. */
  Sim.prototype.countAt = function (frame, pred) {
    var every = this.cfg.snapEvery;
    if (frame % every !== 0) return null;
    var snap = this.snaps[frame / every];
    if (!snap) return null;
    var n = 0;
    for (var i = 0; i < this.particles.length; i++) {
      if (pred({ kind: this.particles[i].kind,
                 fixed: !!(snap.flags[i] & 1),
                 exposed: !!(snap.flags[i] & 2),
                 gone: !!(snap.flags[i] & 4),
                 freedAt: snap.freed[i] })) n++;
    }
    return n;
  };

  Sim.prototype.restore = function (s) {
    for (var i = 0; i < this.particles.length; i++) {
      var q = this.particles[i];
      q.x = s.xs[i * 4]; q.y = s.xs[i * 4 + 1];
      q.vx = s.xs[i * 4 + 2]; q.vy = s.xs[i * 4 + 3];
      q.fixed = !!(s.flags[i] & 1);
      q.exposed = !!(s.flags[i] & 2);
      q.gone = !!(s.flags[i] & 4);
      q.freedAt = s.freed[i];
      q.host = s.hosts[i];
      q.slot = s.slots[i];
    }
    this.frame = s.frame;
    this.rng.a = s.rng;
    this.stirUntil = s.stirUntil;
    this.stirStart = s.stirStart;
    this.stirLeft = s.stirLeft;
    this.heat = s.heat;
  };

  /* Scrub to any frame by restoring the nearest earlier snapshot and
     replaying from there — at most one second of simulation. */
  Sim.prototype.seek = function (frame) {
    frame = Math.max(0, Math.min(this.cfg.duration, Math.round(frame)));
    if (frame === this.frame) return;

    var idx = Math.floor(frame / this.cfg.snapEvery);
    while (idx >= 0 && !this.snaps[idx]) idx--;

    if (idx < 0 || this.snaps[idx].frame > frame) {
      this.restore(this.snaps[0]);
    } else if (this.snaps[idx].frame > this.frame || frame < this.frame) {
      this.restore(this.snaps[idx]);
    }
    while (this.frame < frame) this.step();
  };

  /* ---- collision rules --------------------------------------------------- */

  /* A solid dissolving: a free particle of `solvent` kind, hitting an exposed
     surface particle hard enough, has `breakChance` of knocking it loose.
     An insoluble substance is the same rule with a chance of zero — it gets
     hit just as often and never lets go. */
  function dissolveRule(opts) {
    var solvent = opts.solvent;
    var hitMin = opts.hitMin == null ? 0.22 : opts.hitMin;
    return function (sim, solid, hitter, relSpeed) {
      if (!solid.exposed) return;
      if (hitter.kind !== solvent) return;
      if (relSpeed < hitMin) return;
      if (sim.rng.next() >= opts.breakChance) return;
      sim.release(solid, hitter);
    };
  }

  global.ParticleSim = { Sim: Sim, rules: { dissolve: dissolveRule } };
})(window);
