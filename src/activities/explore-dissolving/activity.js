/* ==========================================================================
   Explore Dissolving — content, configuration and behaviour.

   The physics is in engines/particle-sim and the panel is in instrument.js.
   This file says what the particles are, what a collision means, what the
   instrument's states are, and what every object on the bench is called.

   Both stations always do the same thing at the same time, under the
   engine's side-by-side comparison: one seed, one clock, two solids. That is
   what makes it a fair test rather than two demonstrations.
   ========================================================================== */

(function () {
  'use strict';

  var $ = Kit.$;
  var PS = window.ParticleSim;

  var SEED = 20250826;     // one seed everywhere, so compared runs share water
  var SOLUTE = 50;         // one LED per particle: the register is 5 x 10
  /* ---- how big a particle is, and how many ------------------------------

     Two builds, one switch.

     TO SCALE is the honest one. A water molecule is about 0.28 nm across and
     a sucrose molecule about 0.90 nm, so water is drawn a third of the
     solute's span, and it takes seven hundred of them to fill the field to
     the same occupancy. It is also close to unreadable: the water is dust, and the one
     thing a student is here to see — water hammering a solid apart and
     carrying the pieces off — is too small to follow. It is kept, with the
     numbers it was measured at, for a lesson that is about scale.

     SCHEMATIC is what ships. Every particle is the solute's size, so a
     collision is something you can watch happen. The field is still 13.58 nm
     across and the solute is still 0.90 nm, so the scale bar still measures
     the solid honestly; the water is knowingly drawn oversized, the way a
     textbook diagram does it.

     Each build carries its own water count and its own breakChance, because
     both follow from how hard the pile is being hit. Occupancy is held at
     about half the field either way, so neither looks emptier than the
     other. Both are gases: particles fly between collisions, which is the
     thing the model is for — a collision carrying energy into the solid is
     what a student is meant to see.

     SOLVENT is the number to turn down if a school Chromebook struggles:
     the cost is in drawing them, not in the collisions. */
  var TO_SCALE = false;

  var WATER_NM = 0.28, SOLUTE_NM = 0.90, FIELD_NM = 6.79;

  var BUILD = TO_SCALE
    ? { waterNm: WATER_NM,  solvent: 700, breakChance: 0.015 }
    : { waterNm: SOLUTE_NM, solvent: 70,  breakChance: 0.05 };

  var SOLVENT = BUILD.solvent;

  /* The field radius is picked, not arbitrary. At a radius of 6.79 nm — so
     13.58 nm across — the fifty solute particles fill five whole rows of the floor — 6, 9, 10, 12, 13 — so the
     heap is level across the top, its widest row is the top one, and nothing
     is left over to perch on the summit as a stub. That heap stands about a
     third of the way up the field, leaving the rest to the water. */
  var RADII = {
    solvent: (BUILD.waterNm / 2) / FIELD_NM,
    solute:  (SOLUTE_NM / 2) / FIELD_NM      // 0.0663 of the field radius
  };

  // What 1 nm is worth as a fraction of the field's radius.
  var NM_FRACTION = 1 / FIELD_NM;
  var DURATION = 3600;     // 60 seconds at 60 frames a second

  /* ---- the magnification chain ------------------------------------------

     Students read this viewport as one grain of the powder. It is not. The
     field is 13.58 nm across and a grain of table salt is about 0.3 mm, so
     one grain is some 22,000 of these views wide. The zoom says so by
     starting at the beaker and stepping in, naming the instrument that
     could see each step — and the last step names none, because nothing
     can see a particle.

     Fields are DIAMETERS in nanometres. FIELD_NM is the field's RADIUS, so
     the live field is FIELD_NM * 2. Get that wrong and every bar in steps
     1-3 is exactly twice too long and looks entirely plausible.

     The BAR runs in clean decades — 10 mm, 1 mm, 0.1 mm, 1 nm — because
     that is what a student reads. The FIELDS do not, and deliberately: the
     third step is 0.4 mm rather than a tidy 1 mm so that one grain of
     table salt, the lesson's reference case, very nearly fills the frame.
     At 1 mm it was eight grains with "One grain" written under it, which
     is the same lie the zoom exists to correct. Round field widths are
     worth nothing to anybody; landing on the grain is the whole ask.

     100 mm at the first step, not 70: the viewport is circularly clipped,
     and a 70 mm beaker in a 70 mm field would lose its corners. */
  var MM = 1e6;                     // nanometres in a millimetre

  var ZOOM = [
    { field: 100 * MM, bar: 10 * MM, barLabel: '10 mm',
      barDesc: '10 millimetres — one centimetre.',
      cap: 'The beaker',
      viewDesc: 'This is what your eyes see — 100 millimetres across.',
      reticleAt: [0, 0.60] },

    { field: 10 * MM, bar: 1 * MM, barLabel: '1 mm',
      barDesc: '1 millimetre.',
      cap: 'Grains of powder',
      viewDesc: '10 millimetres across. A hand lens shows the powder is separate grains.',
      reticleAt: [0, 0] },

    /* No line and no reticle, both on purpose. The line is written per
       substance, because a grain of Epsom salts overruns this frame while
       chalk is dust. And the box the next view comes from would be a
       hundredth of a point across — not a drawing problem but the whole
       lesson, so the readout says the number instead. */
    { field: 0.4 * MM, bar: 0.1 * MM, barLabel: '0.1 mm',
      barDesc: 'One tenth of a millimetre.',
      cap: null, viewDesc: null,      // both written per substance
      reticleAt: null },

    { field: FIELD_NM * 2, bar: 1, barLabel: '1 nm',
      barDesc: '1 nanometre, one billionth of a metre.',
      cap: null,                      // the working view carries no caption
      viewDesc: '13.6 nanometres across — 22,000 of these would cross one grain of table salt.',
      reticleAt: null }
  ];

  var LAST = ZOOM.length - 1;

  /* The scale bar in stage points. 313 is box[2] of viewport-field-{s}, and
     the same unit top and bottom means the ratio carries the physics. */
  function barPoints(bar, field) { return 313 * bar / field; }

  /* The shipped bar is 23.05 points. This is the guard on the radius-versus
     -width confusion above, and the one check in here not to skip. */
  console.assert(Math.abs(barPoints(1, FIELD_NM * 2) - 23.05) < 0.01,
                 'scale bar: FIELD_NM is the field radius, not its width');

  /* Where grains sit at the middle two steps, in world units like the
     particles, so `rad` scales them and a resize costs nothing.

     Its own generator, never sim.rng: one draw from the model's stream
     would shift every tuned number in this file and nothing on screen would
     say so. Seeded rather than Math.random, so a screenshot repeats. One
     array for both stations — same positions, different habits, is the
     comparison this activity is built on. */
  var SCATTER = (function () {
    var s = SEED, out = [];
    function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    for (var i = 0; i < 240; i++) {
      var a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.94;
      out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, rot: rnd() * Math.PI,
                 aspect: 0.6 + rnd() * 0.8, size: 0.7 + rnd() * 0.6 });
    }
    // One grain dead centre, so the box at the second step lands on a grain
    // rather than in the gap between two, and the third is visibly that
    // same grain.
    out[0].x = out[0].y = 0;
    return out;
  })();

  /* Positions on the bench, not substances. The only permanent thing about
     a station is where it is; what is in the beaker changes. */
  var STATIONS = ['left', 'right'];

  // The lab's first comparison, so the machine opens on what the class did.
  var STARTS = { left: 'nacl', right: 'caco3' };

  /* The order the nameplate steps through. Salt and chalk first because they
     are the pair every group tested. */
  var CYCLE = ['nacl', 'caco3', 'sucrose', 'nahco3', 'mgso4', 'cacl2'];

  /* Solubility is one number: the chance a hard enough collision frees a
     surface particle. Insoluble is the same rule with a chance of zero — it
     gets hit just as often and never lets go.

     It lives on BUILD because it is not a property of the substance, it is
     whatever
     holds the pace a student sees given how often the pile is being hit.
     Re-measure it whenever the field size, the particle sizes, the water
     count or the collision model moves.

     Measured on the shipping seed, particles freed by the second:

       to scale, 700 water, 0.015 — 10 at 6s, 25 at 20s, 40 at 36s, 50 at 55s
       schematic, 70 water, 0.05  — 10 at 8s, 25 at 23s, 40 at 42s, 50 at 66s

     The arc a student actually watches is the same; the schematic build
     finishes its last few sooner. That tail is not worth tuning. With only
     seventy water particles the dissolving is a small number of discrete
     events, and across three seeds the time to free all fifty ranged from
     66 to 142 seconds at a single breakChance — the first forty are steady,
     the last ten are luck. 0.05 is the value that lands the steady part on
     the to-scale build's curve. */
  /* The six white powders from Investigation 1. They look identical in the
     beaker, which is the lesson's own point: what tells them apart is how
     they behave, not how they look.

     `breakChance` is a target for the ORDER a student sees, not physics —
     calcium chloride fastest, sodium bicarbonate slowest of the soluble
     ones, calcium carbonate never. Measure each on the shipping seed the way
     the BUILD comment describes and record the curves before trusting them.

     `recovered` is what a particle says after a boil has driven it back out
     of solution, and it is where the honest caveats live: the model puts
     every substance back unchanged, and three of these really would not come
     back the same. */
  var SUBSTANCE = {
    nacl: {
      label: 'Sodium chloride', common: 'table salt', formula: 'NaCl',
      /* Grain size in millimetres, and crystal habit, for the zoom's
         "one grain" step. ESTIMATES — not measured off the kit bottles.
         They decide whether that step shows one grain, part of one, or
         dust, so check them against the real powders before teaching off
         the picture. Calcium chloride moves most: ice melt is 2-3 mm
         pellets, a lab granule nearer 0.5. */
      grain: [0.3, 'cube'],
      breakChance: BUILD.breakChance * 1.1, clouds: false, residue: 'cubes',
      free: 'Dissolved sodium chloride. Part of the solution.',
      recovered: 'Sodium chloride, back out of solution. The same substance you started with.'
    },
    caco3: {
      label: 'Calcium carbonate', common: 'chalk', formula: 'CaCO\u2083',
      grain: [0.005, 'chunk'],
      // What will not dissolve can still be stirred up into suspension.
      // Never dissolves, so nothing ever comes back out as crystals.
      breakChance: 0, clouds: true, residue: false,
      pile: 'Calcium carbonate, the main ingredient in chalk. Insoluble in water.',
      recovered: 'Calcium carbonate. It never dissolved, so nothing had to come back.'
    },
    sucrose: {
      label: 'Sucrose', common: 'table sugar', formula: 'C\u2081\u2082H\u2082\u2082O\u2081\u2081',
      grain: [0.5, 'chunk'],
      breakChance: BUILD.breakChance, clouds: false, residue: 'glassy',
      free: 'Dissolved sucrose. Part of the solution.',
      recovered: 'Recovered sucrose. On a real stove, sugar heated past dry browns into caramel, a new substance.'
    },
    nahco3: {
      label: 'Sodium bicarbonate', common: 'baking soda', formula: 'NaHCO\u2083',
      grain: [0.07, 'chunk'],
      breakChance: BUILD.breakChance * 0.3, clouds: false, residue: 'crystal',
      free: 'Dissolved sodium bicarbonate. Part of the solution.',
      recovered: 'Recovered sodium bicarbonate. Real baking soda heated past dry breaks down into sodium carbonate, a new substance.'
    },
    mgso4: {
      label: 'Magnesium sulfate', common: 'Epsom salts', formula: 'MgSO\u2084',
      grain: [1.5, 'needle'],
      breakChance: BUILD.breakChance * 0.9, clouds: false, residue: 'needles',
      free: 'Dissolved magnesium sulfate. Part of the solution.',
      recovered: 'Magnesium sulfate, back out of solution. Real crystals often grow as needles.'
    },
    cacl2: {
      label: 'Calcium chloride', common: 'ice melt', formula: 'CaCl\u2082',
      grain: [2.5, 'chunk'],
      breakChance: BUILD.breakChance * 1.5, clouds: false, residue: 'crystal',
      free: 'Dissolved calcium chloride. Dissolving it releases thermal energy, so a real beaker warms up.',
      recovered: 'Recovered calcium chloride. A real sample pulls water from the air and stays damp.'
    }
  };

  // What a station currently holds, which is the only thing that varies.
  function sub(st) { return SUBSTANCE[st.substance]; }

  /* The lamp art the register reaches for by name: one pair per substance,
     because a station holds whichever of the six it was given. The
     instrument publishes these as --img-* so the CSS never names a folder. */
  var LAMPS = [];
  Object.keys(SUBSTANCE).forEach(function (k) {
    LAMPS.push('led-' + k + '-off', 'led-' + k + '-on');
  });

  /* ---- timings, in seconds (spec 6.2 and 6.5) --------------------------- */

  /* `done` is `rise`, deliberately: the model takes over the instant the
     last drop lands on its mark. Any gap between the two is a beat where the
     water sits frozen in a full beaker, which is the one moment the illusion
     has nothing to hide behind. The stream's tail keeps falling afterwards;
     nothing says those have to end together. */
  var FILL = { stream: 0.15, rise: 1.45, done: 1.45, wet: 0.5 };

  /* The drain is the slow part, because emptying a vessel is: the level
     falls fastest when the beaker is full and crawls at the end. */
  var RESET = { leds: 0.3, drain: 1.6, hold: 1.8, powder: 2.8, done: 3.0,
                dry: 0.45,     // how long the old powder takes to tip out
                rise: 0.3 };   // how far above its slot the fresh sample starts

  /* Cloudiness. A beaker-level effect only: the viewport particles are never
     touched by it.

     Sugar never clouds — it goes into solution and the water stays clear.
     Calcium carbonate is clear too until it is stirred, and then it will not
     settle out again: stirring is what separates the two, which is the point
     a student is meant to notice. */
  var TURBIDITY = { cap: 0.70, stirStep: 0.26, haze: 0.08, settle: 15 };

  var VORTEX_POINTS = 12;   // how far the surface dips at full spin
  var BAR_TURNS = 6;        // stir bar revolutions a second at full spin
  var POUR_STAGGER = 0.55;  // of the pour spent waiting, for the deepest drop
  var DRAIN_FALL = 0.18;    // of the field a drop falls through before it is gone
  var DRY_SHAKE = 0.75;     // seconds the dry powder keeps moving after a stir
  var POUR_LOOPS = 2.2;     // sprite loops a second: the stream's highlights
  var POWDER_LOOPS = 1.8;   // and the falling grains

  /* Eighteen bubbles a beaker reads as a rolling boil rather than a simmer,
     and is few enough to stay on the compositor. The beaker is 162 points
     wide and the stage runs at 0.77 of that on a 1366 Chromebook, so a
     bubble has to be 5 to 11 points across to be seen from the back of a
     room at all. */
  var BUBBLES = 18;

  /* Water temperature. The engine's `speed` is already the mean kinetic
     energy of the field — its own comment calls it "effectively temperature" —
     so heat is a multiplier on it and no other physics changes.

     The multipliers are schematic, not physical. Particle speed goes as the
     square root of absolute temperature, so 20 C to 100 C is sqrt(373/293):
     about 13% faster. True, and invisible. These are exaggerated until the
     difference is watchable inside a lesson, which is the same trade the
     particle sizes already make and is recorded the same way. Measured
     curves are in the build report. */
  /* Left at the boil, the water goes. `onset` is how long it takes to get
     there and `dry` how long it takes to boil away once it does, both in
     seconds of model time. Slow enough to watch, short enough for a lesson. */
  /* `ramp` is how long the bubbles take to come up once it reaches the boil.
     Below 100 °C `boilT` decays at twice the rate it builds, so they go in
     half that — the right asymmetry: a pan comes off the boil faster than it
     comes to it. */
  var BOIL = { at: 100, onset: 18, dry: 16, ramp: 2 };

  var HEAT = { min: 20, max: 100, fast: 2.3 };

  /* Presets the H key steps through, and where the ticks are drawn. The
     slider itself is continuous: a student can sit it anywhere between. */
  var HEAT_MARKS = [20, 60, 100];

  /* Linear from 1 at room temperature to `fast` at the boil. Schematic, as
     above: the honest curve is a square root and barely moves. */
  function speedFor(c) {
    return 1 + (c - HEAT.min) / (HEAT.max - HEAT.min) * (HEAT.fast - 1);
  }

  /* ---- the text every object answers to (spec 8.1) ---------------------- */

  var IDENTITY = {
    'particle-water':      ['Water particle', 'Water, the solvent. Constantly moving and colliding.'],
    /* Both are rewritten by setZoom as the chain is stepped; these are the
       values for its last link, where the instrument spends its working
       life. The viewport's old line claimed a magnification, which is not a
       property of this instrument at all: `fit` sizes the stage from the
       window, so the same page is about 2.8 million times on a Chromebook
       and 22 million on the projector. A field width is a property of the
       model and never changes. Salt is the yardstick rather than the
       specimen, so the line holds whichever of the six is loaded. */
    'scalebar':  ['Scale bar', '1 nanometre, one billionth of a metre.'],
    'viewport':  ['Viewport', '13.6 nanometres across — it would take 22,000 of these to cross one grain of table salt.'],
    'register':  ['Register', 'Particles dissolved. One light per particle.'],
    'counter':   ['Counter', 'Particles dissolved, out of ' + SOLUTE + '.'],
    'heat':      ['Water temperature', 'Hotter water is faster particles, so they hit the solid harder and more often.'],
    'clock':     ['Clock', 'Seconds since water was added.'],
    'freeze':    ['Freeze', 'Pauses the simulation.'],
    'stir':      ['Stir', 'Spins the stir bars in both beakers.'],
    'reset':     ['Reset', 'Drains both beakers and adds fresh samples.'],
    'dispense':  ['Dispense water', 'Adds 250 mL of water to both beakers at once.'],
    'beaker':    ['Beaker', '250 mL beaker.'],
    'stirbar':   ['Stir bar', 'Magnetic stir bar. Spins when the stir plate is on.'],
    'stirplate': ['Stir plate', 'Magnetic stir plate. Spins the stir bar from below.'],
    'nozzle':    ['Nozzle', 'Water outlet.'],
    'chute':     ['Powder chute', 'Adds a measured sample of powder.'],
    /* The head is one part in the art, so it answers for the whole assembly
       it carries rather than claiming to be any one of them. */
    'head':      ['Sample head', 'Carries the water nozzle, the powder chute and the probe.']
  };

  /* Three lines per substance plus a nameplate line, written out from the
     table rather than by hand: six substances by four states is twenty-four
     entries, and a hand-written set would drift from the table the first
     time a word changed. */
  Object.keys(SUBSTANCE).forEach(function (k) {
    var q = SUBSTANCE[k];
    var low = q.label.toLowerCase();
    IDENTITY['particle-' + k + '-pile'] = [q.label + ' particle',
      q.pile || (q.label + ', the solute. Held in the pile by attraction to other ' + low + ' particles.')];
    IDENTITY['particle-' + k + '-free'] = [q.label + ' particle', q.free || q.pile];
    IDENTITY['particle-' + k + '-recovered'] = [q.label + ' particle', q.recovered];
    IDENTITY['nameplate-' + k] = [q.label, q.label + ', ' + q.formula + '.'];
  });

  var DEFAULT_ID = ['No selection', 'Select an object to identify it.'];

  /* ---- the engine ------------------------------------------------------- */

  function makeSim(substance) {
    return new PS.Sim({
      seed: SEED,
      duration: DURATION,
      radii: RADII,

      /* Small enough that a change of direction mostly means something was
         hit. Damping the collisions as well was tried and removed; `bounce`
         in sim.js says why. */
      jitter: 0.12,

      /* Stirring turns the water onto a common path rather than only making
         it faster, so a stirred beaker reads as a current and a hot one as a
         swarm. Without this the two controls would look identical and the
         activity would be teaching that stirring warms the water. */
      stirSwirl: 0.35,

      // Water cannot work its way underneath a heap sitting on the floor.
      sediment: 'solute',

      // Half a particle may cross the edge, so the field reads as a window.
      overhang: 1,

      setup: function (sim) {
        sim.packPile('solute', SOLUTE);     // no randomness, so it goes first
        sim.fillRandom('solvent', SOLVENT);
      },
      onImpact: PS.rules.dissolve({
        solvent: 'solvent',
        breakChance: SUBSTANCE[substance].breakChance
      })
    });
  }

  var GROUPS = {
    solvent: function (p) { return p.kind === 'solvent'; },
    bound:   function (p) { return p.kind === 'solute' && p.fixed; },
    free:    function (p) { return p.kind === 'solute' && !p.fixed; }
  };

  /* One palette per station: the solute colour is the substance's own, and
     the solvent is water in both. Re-read on resize and on theme change, as
     the engine expects. */
  function paletteFor(st) {
    return function () {
      var key = st.substance;
      var cs = getComputedStyle(document.documentElement);
      function v(n) { return cs.getPropertyValue(n).trim(); }
      return {
        kinds: {
          solvent: { base: v('--p-water'), lit: v('--p-water-lit'), dim: v('--p-water-dim') },
          solute:  { base: v('--p-' + key), lit: v('--p-' + key + '-lit'),
                     dim: v('--p-' + key + '-dim') }
        },
        /* The macro links of the zoom chain. See --powder in the stylesheet:
           colour per substance is a convention the particle view needs and
           a claim about appearance that 10 mm cannot support. */
        powder: { base: v('--powder'), lit: v('--powder-lit'), dim: v('--powder-dim') },
        bg: v('--lens-bg'),
        hair: v('--lens-hair'),
        rim: v('--lens-hair'),
        ring: v('--display-ink'),
        bond: 'rgba(255,255,255,.16)',
        link: 'rgba(255,255,255,.22)',
        reticle: '#fff',
        font: v('--font'),
        /* The engine draws a stirrer sweeping through the field whenever the
           model is stirring. This instrument stirs magnetically, from a bar
           on the beaker floor, and the spec drops the spoon entirely — so it
           is made invisible here rather than by touching the engine. The
           stir is still visible in the field, as faster particles. */
        stirrer: 'rgba(0,0,0,0)'
      };
    };
  }

  /* ---- a very small event bus ------------------------------------------- */

  /* The notebook listens; nothing else needs to. Objectives and challenges
     are written against these names, so they are the activity's contract. */
  function makeBus() {
    var map = {};
    return {
      on: function (name, fn) { (map[name] = map[name] || []).push(fn); },
      emit: function (name, detail) {
        var list = map[name];
        for (var i = 0; list && i < list.length; i++) list[i](detail);
      }
    };
  }

  /* ---- boot ------------------------------------------------------------- */

  var say = Kit.announcer($('live'));
  var bus = makeBus();

  Instrument.boot({
    stage: $('stage'),
    manifest: 'layer-manifest.json',
    assets: 'assets/layers/',
    stations: STATIONS,
    lamps: LAMPS,
    build: builders(),
    onIdentify: identify
  }).then(start).catch(function (err) {
    var boot = $('boot');
    boot.hidden = false;
    boot.textContent = 'This activity could not load its layout (' + err.message +
      '). It needs to be served over http — try the dev server rather than ' +
      'opening the file directly.';
  });

  /* ---- what the code-drawn layers are made of --------------------------- */

  /* Every layer the manifest marks "code" is built here. The boxes are the
     manifest's; what is inside them comes from the sketches. */
  function builders() {
    function fill(node, html) { node.innerHTML = html; }

    /* The boil. One element per bubble, each with its own column, size,
       rise time and phase, written once at build time: nothing here runs
       per frame and nothing here touches the model's rng.

       Golden-ratio steps across the width so no two share a column, and a
       phase of i/BUBBLES so the launches are evenly spread whatever a
       bubble's rise time is — which is also what gives reduced motion a
       believable static scatter, since it simply stops them where they are. */
    function bubbles() {
      var out = '<i class="water__boil" aria-hidden="true">';
      for (var i = 0; i < BUBBLES; i++) {
        var secs = 0.95 + (i % 3) * 0.3;
        out += '<i class="bubble" style="' +
          '--bx:' + (18 + (i * 0.618 % 1) * 64).toFixed(1) + '%;' +
          '--bw:' + (5 + (i % 5) * 1.6).toFixed(1) + 'px;' +
          '--bt:' + secs.toFixed(2) + 's;' +
          '--bd:-' + (i / BUBBLES * secs).toFixed(2) + 's"></i>';
      }
      return out + '</i>';
    }

    return {
      'display-readout': { make: function (node) {
        node.classList.add('display');
        fill(node, '<b class="display__name" id="idName"></b>' +
                   '<span class="display__desc" id="idDesc"></span>');
      } },

      'display-clock': { make: function (node) {
        node.classList.add('display', 'clock');
        node.dataset.id = 'clock';
        fill(node, '<b class="clock__value" id="clock">00.0</b>' +
                   '<span class="clock__label">SECONDS</span>');
      } },

      'display-counter-{s}': { make: function (node, id, station) {
        node.classList.add('display', 'counter');
        node.dataset.id = 'counter';
        fill(node, '<b class="counter__n" data-count="' + station + '">00</b>' +
                   '<span class="counter__of">/ ' + SOLUTE + '</span>');
      } },

      'register-leds-{s}': { make: function (node, id, station) {
        node.dataset.id = 'register';
        this.registers = this.registers || {};
        this.registers[station] = this.register(node, SOLUTE);
      } },

      'register-panel-{s}': { make: function (node) { node.dataset.id = 'register'; } },

      /* The viewport: the engine's canvas, the dry-pile frame over it, and
         the scale bar on its own dark plate so particles cannot hide it. */
      'viewport-field-{s}': { make: function (node, id, station) {
        node.classList.add('viewport');
        node.dataset.id = 'viewport';
        var box = this.box(id);
        /* The span the serifs mark out. The CSS adds one tick width on top,
           because a serif marks a position with its centre line and the two
           half-ticks at the ends would otherwise make the bar read long. */
        var bar = (box[2] / 2) * NM_FRACTION;
        node.innerHTML =
          '<canvas class="viewport__live" id="lens-' + station + '" role="img" ' +
          /* Generic at build time — layers are placed before the stations
             exist. setSubstance writes the real one. */
          'aria-label="Magnified view of the sample in water"></canvas>' +
          '<canvas class="viewport__dry" id="dry-' + station + '" aria-hidden="true"></canvas>' +
          /* Just under the left arm of the crosshair, where the field is only
             ever sparse solvent: the heap stands a little under half the
             field, and a scale bar buried in it is no scale bar. */
          '<span class="scalebar" data-id="scalebar" style="left:' +
          (box[2] * 0.09).toFixed(1) + 'px; top:' + (box[3] * 0.42).toFixed(1) + 'px">' +
          '<span class="scalebar__label">1 nm</span>' +
          '<span class="scalebar__bar" style="--nm-bar:' + bar.toFixed(2) + 'px"></span></span>';
      } },

      'notebook-text': { make: function (node) { node.id = 'notebook'; } },

      /* A slider, because the temperature is a continuous quantity and sliding
         it up is the gesture that matches raising it. The whole panel is the
         control, so the target is the full 248 x 55 points — well past the
         48 point minimum even though the slot itself is thinner. */
      'heat': { tag: 'div', make: function (node) {
        node.dataset.id = 'heat';
        node.tabIndex = 0;
        node.setAttribute('role', 'slider');
        node.setAttribute('aria-label', 'Water temperature');
        node.setAttribute('aria-valuemin', HEAT.min);
        node.setAttribute('aria-valuemax', HEAT.max);
        node.innerHTML =
          /* A screen, then the slot, side by side on one line. The temperature
             is shown on a display rather than engraved on the panel, because
             engraving does not change — and the legend goes on the glass with
             it, which is the only way screen and slot both sit on the
             centreline the keys beside them do.

             TEMP, not WATER TEMP: the full words are 152 of the panel's 248
             points, which leaves no throw worth dragging. It is printed beside
             a key that says WATER and reads out in °C. */
          '<span class="heat__screen display">' +
          '<span class="heat__legend">' +
          '<span class="heat__name">TEMP</span>' +
          '<i class="heat__boil">BOIL</i>' +
          '</span>' +
          '<i class="heat__digits" id="heatValue"></i>' +
          '</span>' +
          '<span class="heat__track">' +
          HEAT_MARKS.map(function (c) {
            return '<i class="heat__mark" style="left:' +
              ((c - HEAT.min) / (HEAT.max - HEAT.min) * 100).toFixed(2) + '%"></i>';
          }).join('') +
          '<i class="heat__thumb"></i></span>';
      } },

      /* Keycaps are real buttons, so they need to be buttons from the start. */
      'key-freeze':   { tag: 'button' },
      'key-stir':     { tag: 'button' },
      'key-reset':    { tag: 'button' },
      'key-dispense': { tag: 'button' },

      'beaker-{s}':    { make: function (node) { node.dataset.id = 'beaker'; } },
      'stirplate-{s}': { make: function (node) { node.dataset.id = 'stirplate'; } },
      'head-{s}':      { make: function (node) { node.dataset.id = 'head'; } },
      /* The sample plate. A real <button>, which is how it takes a tap at
         all — the raster rule above kills pointer events on every layer that
         is not one — and how Enter and Space come for free. applySubstance
         fills the text; the art underneath is blank. */
      'nameplate-{s}': { tag: 'button', make: function (node) {
        node.type = 'button';
        node.classList.add('plate');
        node.style.backgroundImage = this.url('nameplate');
        node.innerHTML =
          '<i class="plate__dot" aria-hidden="true"></i>' +
          '<b class="plate__name"></b>' +
          '<span class="plate__formula"></span>';
      } },
      'sprite-stirbar-{s}': { make: function (node) { node.dataset.id = 'stirbar'; } },
      'sprite-pour-{s}':    { make: function (node) { node.dataset.id = 'nozzle'; } },
      'sprite-powder-{s}':  { make: function (node) { node.dataset.id = 'chute'; } },

      /* Masked layers get the classes that carry their clip and transform. */
      'water-{s}':     { make: function (node) {
        node.classList.add('water');
        /* Inside the water layer, not beside it: the water's own clip-path is
           then the surface the bubbles burst at, and a falling level needs no
           second mask. */
        node.insertAdjacentHTML('beforeend', bubbles());
      } },
      /* What the wall looks like through the water: the ground again, raised.
         A line seen through glass and liquid sits higher than it really is,
         and the skirting's top edge at y 883 runs straight through the water
         column, so that edge stepping up and snapping back at the glass is
         the strongest refraction cue a flat elevation has. Cloning the whole
         ground rather than faking the one edge means it keeps tracking the
         real textures and needs nothing maintained when they change. */
      'refract-{s}': { make: function (node) {
        node.classList.add('refract');
        /* The skirting's edge and nothing else. The wall was in here too and
           had to come out: it is a near-uniform 239 grey whose only feature
           is the tile seams, so shifting it moved nothing except a seam, and
           a seam that jumps reads as a rendering fault rather than as water.
           Refraction needs an edge to bend, and the skirting is the only one
           the water crosses — the counter's is at 946, below the beaker. */
        node.innerHTML = '<i class="refract__trim"></i>';
      } },

      'turbidity-{s}': { make: function (node) { node.classList.add('turbidity'); } },
      'pile-{s}':      { make: function (node) { node.classList.add('pile'); } }
    };
  }

  /* ---- the running instrument ------------------------------------------- */

  var inst, player, notebook;
  var state = 'loaded';
  var stateT = 0;           // seconds in the current state

  /* Which link of the magnification chain both viewports are showing. It
     starts at the beaker, so a student's first sight of the field is not a
     field — which is the whole reason this exists. */
  var zoom = 0;

  /* What the notebook needs to know about a run, and nothing else keeps.
     All three are cleared when a fresh run starts, not when one ends, so a
     student reading the beakers after a boil still sees the run's numbers. */
  var stirs = 0;            // real stir presses since the water went in
  var lastFreedAt = null;   // model seconds when a particle last broke free
  var readingSent = false;  // the 15 s reading fires once per run

  /* 15 s is after the dissolving has a shape and before anything else can
     muddy it: at 100 C the water does not start boiling off until 18 s. */
  var READING_AT = 15;
  var animT = 0;            // decorative clock: streams, grains, held by Freeze
  var barPhase = 0;         // stir bar rotation, in turns
  var shakeT = 0;           // seconds left of the dry powder being stirred
  var dryLean = 0;          // -1..1, where the dry powder was left sitting
  var frozen = false;
  var engineReset = false;  // the engine is reset once per Reset, mid-refill
  var keys = {};
  var heatEl = null;        // the slider
  var tempC = 20;           // water temperature, degrees
  var boilT = 0;            // seconds held at the boil
  var boilLevel = 1;        // what is left in the beaker, 1 down to 0
  var drying = false;       // water gone, solid still walking back to its slots
  var boilShown = '';       // the last --boil written; the whole stage inherits it
  var stations = {};
  var lastFree = {};
  var stirring = false;
  var idNow = null;

  /* Decorative motion is what goes when a student asks for less of it. The
     water still arrives and the register still fills; the stream, the
     grains, the vortex and the LED cascade stop drawing the eye. */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function identify(key) {
    var text = IDENTITY[key] || DEFAULT_ID;
    $('idName').textContent = text[0].toUpperCase();
    $('idDesc').textContent = text[1];
    if (key && key !== idNow) bus.emit('identified', { id: key });
    idNow = key;
  }

  /* The heap's picture. Poured, it is the shared white powder — all six
     look alike in a beaker, which is the lesson's point. After a boil has
     driven the sample back out of solution it is that substance's own
     crystal, which is the thing a hand lens shows and the thing the FOSS
     I-Check asks a student to read.

     Branching on the table's `residue`, never on whether a file is there:
     Instrument.url only falls back to the placeholder set when it has a
     listing to check against, and in production it has none — so a missing
     render would leave the mound invisible with nothing to say why. */
  function paintPile(st) {
    var shape = st.recovered && sub(st).residue;
    st.pile.style.backgroundImage =
      inst.url(shape ? 'residue-' + shape : 'pile-' + st.key);
  }

  /* Everything on screen that names or colours the sample. One place, so
     what a swap has to touch is written down once: the collision rule, the
     lamps, the field's colours and what a screen reader is told. */
  function applySubstance(st, key) {
    st.substance = key;
    st.sim.cfg.onImpact = PS.rules.dissolve({
      solvent: 'solvent',
      breakChance: SUBSTANCE[key].breakChance
    });

    /* The lamps are art per substance and the halo is CSS over it. Set on
       the register layer rather than written as a selector, because there
       is no selector for "the station holding sodium chloride". */
    var leds = inst.layers['register-leds-' + st.key];
    if (leds) {
      leds.style.setProperty('--led-off-img', 'var(--img-led-' + key + '-off)');
      leds.style.setProperty('--led-on-img', 'var(--img-led-' + key + '-on)');
      leds.style.setProperty('--led-on', 'var(--led-' + key + ')');
    }

    var plate = inst.layers['nameplate-' + st.key];
    if (plate) {
      plate.dataset.id = 'nameplate-' + key;
      plate.style.setProperty('--plate-dot', 'var(--led-' + key + ')');
      plate.querySelector('.plate__name').textContent = SUBSTANCE[key].label;
      plate.querySelector('.plate__formula').textContent = SUBSTANCE[key].formula;
    }

    labelField(st);           // the one writer; it knows the zoom as well
    paintPile(st);
    st.lens.resize();          // re-reads the palette, so the field recolours
  }

  /* Changing the sample is Reset with different powder in the chute, which
     is both what the machine would do and the only safe way to do it:
     `onImpact` is read fresh on every collision, so swapping it on a live
     sim leaves `sim.snaps` holding frames produced under the old rule, and a
     later seek would replay to a state the run never had. reset() is what
     throws that ring away. */
  function setSubstance(st, key) {
    applySubstance(st, key);
    bus.emit('sampleChanged', { station: st.key, substance: key });
    /* Restarted, not skipped if one is already running: a student stepping
       to the sixth sample taps five times, and what has to land is the last
       tap. Each restart re-runs the sequence from the top, so the drain and
       the fresh powder play once, after they stop. */
    enter('resetting');
  }

  /* Tapping a plate loads the next sample. Only while the beakers are dry:
     a swap is a Reset, and resetting mid-run would throw away the comparison
     the student is in the middle of. In every other state the plate still
     identifies itself, which is what the readout is for. */
  function cyclePlate(st) {
    /* Only while the beakers are dry. Mid-run a swap would throw away the
       comparison the student is in the middle of; mid-swap it is just the
       next tap of the same choice. */
    if (state !== 'loaded' && state !== 'resetting') return;
    var at = CYCLE.indexOf(st.substance);
    setSubstance(st, CYCLE[(at + 1) % CYCLE.length]);
    say((st.key === 'left' ? 'Left' : 'Right') + ' sample: ' +
        sub(st).label.toLowerCase() + '.');
  }

  function start(instrument) {
    inst = instrument;

    STATIONS.forEach(function (key) {
      var st = {
        key: key,
        substance: STARTS[key],
        sim: makeSim(STARTS[key]),
        dry: $('dry-' + key),
        water: inst.layers['water-' + key],
        turbidity: inst.layers['turbidity-' + key],
        refract: inst.layers['refract-' + key],
        pile: inst.layers['pile-' + key],
        count: document.querySelector('[data-count="' + key + '"]'),
        register: inst.registers[key],
        geo: inst.geometry['water-' + key],
        pour: inst.sprites['sprite-pour-' + key],
        powder: inst.sprites['sprite-powder-' + key],
        bar: inst.sprites['sprite-stirbar-' + key],
        turb: 0, everStirred: false, level: 0, pileAt: 1
      };
      /* Built after the station object exists: the palette reads
         st.substance when it is called, so a swap recolours the field by
         re-reading rather than by rebuilding the lens. */
      st.lens = new PS.Lens($('lens-' + key), { palette: paletteFor(st), groups: GROUPS });
      applySubstance(st, st.substance);
      inst.layers['nameplate-' + key].addEventListener('click', (function (s) {
        return function () { cyclePlate(s); };
      })(st));
      st.bar.show(true);

      /* How far a bubble rises, and where the floor it leaves is: the same
         two numbers the water's own surface is drawn from, so a re-rendered
         beaker with a different geometry.json moves all of it together and no
         coordinate ends up in the CSS. The floor is not the bottom of the
         box — there are five points of glass below it. */
      var wbox = inst.box('water-' + key)[3];
      /* The clone is the whole stage, pulled back by this layer's own corner
         so its tiles land where the real ones do. */
      var rbox = inst.box('refract-' + key);
      st.refract.style.setProperty('--gx', rbox[0] + 'px');
      st.refract.style.setProperty('--gy', rbox[1] + 'px');
      /* Where the glass is, as an inset from each side of the box. */
      st.refract.style.setProperty('--wl', ((st.geo.leftFrac || 0) * 100).toFixed(3) + '%');
      st.refract.style.setProperty('--wr', ((1 - (st.geo.rightFrac || 1)) * 100).toFixed(3) + '%');

      st.water.style.setProperty('--rise',
        ((surfaceFrac(st, 0) - surfaceFrac(st, 1)) * wbox).toFixed(1) + 'px');
      st.water.style.setProperty('--floor',
        ((1 - surfaceFrac(st, 0)) * wbox).toFixed(1) + 'px');
      stations[key] = st;
      lastFree[key] = 0;
    });

    player = new PS.Player({
      duration: DURATION,
      els: {},
      decor: function () { return { highlight: null, bonds: false }; },
      onFrame: function () {}
    });
    player.setActive(sims(), lenses());

    buildKeys();
    buildHeat();
    /* The words for a substance key: they live in the table above, and the
       notebook is handed them rather than keeping a second copy. */
    var labels = {};
    Object.keys(SUBSTANCE).forEach(function (k) { labels[k] = SUBSTANCE[k].label; });
    notebook = new Notebook({ root: $('notebook'), bus: bus, say: say, labels: labels });

    inst.onResize = resize;
    identify(null);           // the readout starts at its default, not blank
    /* Before the first paint, so the scale bar is never caught reading a
       nanometre over a picture of a beaker — and after the default above,
       because the first thing worth reading is what the glass is showing. */
    setZoom(0);
    resize();
    enter('loaded');
    requestAnimationFrame(loop);

    document.addEventListener('keydown', shortcut);
    wireParticlePicking();
    expose();
  }

  /* With ?debug in the URL, the instrument can be driven by a clock of the
     caller's choosing rather than the display's. That is how the fill and
     reset sequences are checked: a browser that is throttling frames cannot
     be timed, but a known dt always lands on the same numbers.

     Nothing here is reachable without the flag, and nothing in the activity
     reads it. */
  function expose() {
    if (!/[?&]debug\b/.test(location.search)) return;
    window.__dissolving = {
      step: step,
      /* Hand the clock over: the display stops driving frames so a caller
         can step the instrument itself. */
      hold: function (on) { held = on !== false; },
      press: function (name) { keys[name].el.click(); },
      /* The event stream, so a scripted run can assert what the notebook
         would have been told. Read-only in practice: nothing in the
         activity subscribes. */
      bus: bus,
      /* The model, for checking determinism and for running a sample far
         enough forward to see something without waiting for the display. */
      player: player,
      sims: stations,
      read: function () {
        var out = { state: state, stateT: +stateT.toFixed(3), frozen: frozen,
                    zoom: zoom,
                    boil: +boilShown || 0,
                    clock: $('clock').textContent, stations: {} };
        STATIONS.forEach(function (k) {
          var st = stations[k];
          out.stations[k] = {
            level: +st.level.toFixed(3),
            pile: +st.pileAt.toFixed(3),
            turbidity: +(+st.turbidity.style.opacity).toFixed(3),
            counter: st.count.textContent,
            lit: document.querySelectorAll(
              '[data-layer="register-leds-' + k + '"] .is-lit').length,
            pour: st.pour.el.style.display !== 'none',
            powder: st.powder.el.style.display !== 'none',
            dryFade: +(+st.dry.style.opacity || 0).toFixed(3)
          };
        });
        return out;
      }
    };
  }

  function sims() { return STATIONS.map(function (k) { return stations[k].sim; }); }
  function lenses() { return STATIONS.map(function (k) { return stations[k].lens; }); }

  function resize() {
    player.resize();          // re-rasterises each lens at the new scale
    STATIONS.forEach(function (k) { drawDry(stations[k]); });
  }

  /* ---- keys ------------------------------------------------------------- */

  function buildKeys() {
    keys.freeze = inst.key('key-freeze', {
      up: 'key-freeze-up', down: 'key-freeze-down',
      label: 'Freeze', latching: true,
      press: function () { if (modelLive()) setFrozen(!frozen); }
    });
    keys.freeze.el.dataset.id = 'freeze';

    keys.stir = inst.key('key-stir', {
      up: 'key-stir-up', down: 'key-stir-down',
      label: 'Stir',
      press: stir
    });
    keys.stir.el.dataset.id = 'stir';

    keys.reset = inst.key('key-reset', {
      up: 'key-reset-up', down: 'key-reset-down',
      label: 'Reset',
      press: function () { if (state !== 'filling' && state !== 'resetting') enter('resetting'); }
    });
    keys.reset.el.dataset.id = 'reset';

    keys.dispense = inst.key('key-dispense', {
      up: 'key-dispense-ready', down: 'key-dispense-spent',
      label: 'Dispense water',
      press: function () { if (state === 'loaded') enter('filling'); }
    });
    keys.dispense.el.dataset.id = 'dispense';
  }

  /* The model is live from the moment the water starts arriving, not from the
     moment it has all arrived, so Freeze can hold it from there too. While
     the player started at `running` this said `state === 'running'`, and the
     key was dead for the 1.45 s of the pour even though the field behind the
     dry frame was already moving. Holding during the pour stops `stateT` as
     well, so the pour itself holds where it is — which is what Freeze says it
     does. */
  function modelLive() { return state === 'filling' || state === 'running'; }

  function stir() {
    if (frozen || state === 'filling' || state === 'resetting') return;

    /* Stirring a dry sample does not dissolve anything, but the bar still
       turns and the powder still gets pushed about. Without this the key
       feels broken before the water arrives. */
    if (state === 'loaded') {
      /* Reduced motion gets the outcome instead of the movement: the mound
         leans the other way and stays there. A stir still reads as having
         done something, and nothing animates to say so. */
      if (reduced.matches) dryLean = dryLean >= 0 ? -1 : 1;
      else shakeT = DRY_SHAKE;
      say('Stirred the dry powder. Nothing dissolves until water is added.', true);
      bus.emit('stirStarted', { dry: true });
      return;
    }

    /* A hand with nothing left starts no stroke, so nothing downstream may
       act as though one began. Without this, leaning on the key still drives
       the turbidity to its cap and fires a stirStarted every press — the
       water would look thoroughly stirred while the model ignored it. */
    if (!player.stir()) return;
    if (!stirring) { stirs += 1; bus.emit('stirStarted', {}); }
    stirring = true;
    STATIONS.forEach(function (k) {
      var st = stations[k];
      if (!sub(st).clouds) return;
      st.everStirred = true;
      st.turb = Math.min(TURBIDITY.cap, st.turb + TURBIDITY.stirStep);
    });
  }

  function setFrozen(on) {
    setFrozenSilently(on);
    if (on) {
      player.pause();
      say('Simulation frozen.', true);
      /* How long ago a particle last broke free, so the notebook can tell a
         student who froze on the moment from one who froze at random. */
      bus.emit('frozen', { t: now(),
                           sinceFreed: lastFreedAt === null ? null
                                     : +(now() - lastFreedAt).toFixed(2) });
    }
    else { player.play(); say('Simulation resumed.', true); bus.emit('unfrozen', {}); }
  }

  function buildHeat() {
    heatEl = inst.layers.heat;
    var track = heatEl.querySelector('.heat__track');

    /* Pointer Events only: one path covers mouse, pen and a Chromebook's
       touchscreen, and capture keeps the drag alive if the finger leaves. */
    function fromPointer(e) {
      var r = track.getBoundingClientRect();
      if (!r.width) return;
      setTemp(HEAT.min + (e.clientX - r.left) / r.width * (HEAT.max - HEAT.min));
    }

    /* Half the actuator, in page pixels. The slot is 14 points tall and 10 is
       half the 20 point grip, so its rendered height gives the stage scale
       without going to look for it. */
    function reach(r) { return r.height / 14 * 10; }

    heatEl.addEventListener('pointerdown', function (e) {
      /* The whole panel is the target, which is what clears 48 points when the
         slot itself is 14 — but a press on the nameplate beside the slot must
         not slam the temperature down to the cold end. Left of the throw it
         only takes focus, so the keyboard still has it. */
      var r = track.getBoundingClientRect();
      if (r.width && e.clientX < r.left - reach(r)) {
        heatEl.focus();
        e.preventDefault();
        return;
      }
      heatEl.setPointerCapture(e.pointerId);
      heatEl.dataset.dragging = 'true';
      fromPointer(e);
      e.preventDefault();
    });
    heatEl.addEventListener('pointermove', function (e) {
      if (heatEl.hasPointerCapture(e.pointerId)) fromPointer(e);
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      heatEl.addEventListener(type, function () { delete heatEl.dataset.dragging; });
    });

    heatEl.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1,
                   PageUp: 10, PageDown: -10 }[e.key];
      if (step != null) { e.preventDefault(); setTemp(tempC + step); return; }
      if (e.key === 'Home') { e.preventDefault(); setTemp(HEAT.min); }
      if (e.key === 'End')  { e.preventDefault(); setTemp(HEAT.max); }
    });

    paintHeat();
  }

  /* The engine clears `heat` on reset along with everything else, so this is
     also how a reset gets the plate's setting back: the hot plate does not
     switch itself off because the samples were changed. */
  function applyHeat() {
    STATIONS.forEach(function (k) { stations[k].sim.heat = speedFor(tempC); });
  }

  function paintHeat() {
    var at = (tempC - HEAT.min) / (HEAT.max - HEAT.min);
    heatEl.style.setProperty('--at', at.toFixed(4));
    heatEl.dataset.boiling = tempC >= BOIL.at ? 'true' : 'false';
    heatEl.setAttribute('aria-valuenow', Math.round(tempC));
    heatEl.setAttribute('aria-valuetext', Math.round(tempC) + ' \u00B0C');
    $('heatValue').textContent = Math.round(tempC) + ' \u00B0C';
  }

  function setTemp(c) {
    c = Math.max(HEAT.min, Math.min(HEAT.max, Math.round(c)));
    if (c === tempC) return;
    tempC = c;
    paintHeat();
    applyHeat();
    /* Dragging would otherwise say eighty numbers on the way up, so only the
       marks and the ends are worth interrupting a screen reader for. */
    if (!heatEl.dataset.dragging || HEAT_MARKS.indexOf(c) >= 0) {
      say('Water at ' + c + ' degrees.', true);
    }
  }

  function shortcut(e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    /* A bare key is the instrument's; a modified one is the browser's. Without
       this, Cmd-R resets the samples and never reloads, because the
       preventDefault below swallows it — and Cmd-W dispenses water on its way
       to closing the tab. Shift is not excluded: the map carries S and R. */
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // Turned off from the debug menu, for working on the page without the
    // instrument answering every letter.
    if (Kit.debug && Kit.debug.get('shortcuts') === 'off') return;
    // Space on a focused button belongs to that button.
    if (e.key === ' ' && e.target.tagName === 'BUTTON') return;
    /* H jumps to the next marked temperature and wraps, so the three the
       lesson actually compares are one key away without dragging. */
    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      var next = HEAT_MARKS.filter(function (c) { return c > tempC; })[0];
      setTemp(next == null ? HEAT_MARKS[0] : next);
      return;
    }
    /* Z steps the magnification chain and wraps, so the whole thing can be
       replayed for the next class without reloading. No keycap: the three
       -controls-at-rest budget is spent, and the viewport itself is the
       affordance a student finds without being told.

       Only while the beakers are dry, the same gate a sample swap has and
       for a harder reason. Once water is in, the dry canvas is hidden and
       the live field is what you are looking at, so stepping out would
       leave the scale bar reading 1 mm over the model and would silently
       stop every particle identifying itself — particleAt answers nothing
       below the last link. */
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      if (state === 'loaded' || state === 'resetting') {
        setZoom((zoom + 1) % ZOOM.length);
      }
      return;
    }
    var hit = { ' ': keys.freeze, s: keys.stir, S: keys.stir, r: keys.reset,
                R: keys.reset, w: keys.dispense, W: keys.dispense }[e.key];
    if (!hit) return;
    e.preventDefault();
    hit.el.click();
  }

  /* ---- states ----------------------------------------------------------- */

  function enter(next) {
    state = next;
    stateT = 0;
    if (next !== 'running') { boilT = 0; boilLevel = 1; drying = false; }
    // Fresh powder, or powder about to be flooded: either way it sits level.
    dryLean = 0;

    if (next === 'loaded') {
      player.pause();
      setFrozenSilently(false);
      keys.dispense.set(false);
      keys.dispense.enable(true);
      keys.reset.set(false);
      STATIONS.forEach(function (k) {
        var st = stations[k];
        st.level = 0; st.turb = 0; st.everStirred = false; st.pileAt = 1;
        st.pour.show(false);
        st.powder.show(false);
      });
    }

    if (next === 'filling') {
      /* Water arriving means the chain is over: whatever step a student is
         on, the field they now need is the model. Deliberately not done for
         `resetting`, so swapping the sample keeps the zoom and the crystal
         habit visibly changes under it. */
      if (zoom < LAST) setZoom(LAST);
      keys.dispense.set(true);
      keys.dispense.enable(false);
      /* Every run starts from the same field, however the last one ended —
         boiled dry leaves no water to dissolve anything in, and a fair test
         needs two students' runs to match whatever they did before. Reset
         rebuilds it too, a little earlier, so this is sometimes the second
         rebuild in a row: it is deterministic and costs 120 particles. */
      player.reset();
      applyHeat();                      // the plate is still on; the engine forgot
      /* Running from the moment the water starts arriving, not from the
         moment it has all arrived. The dry frame lowers each drop onto its
         own place in a field that is already moving, so a drop is in motion
         as it lands and the handoff to the live canvas is a cross-fade
         between two moving pictures rather than the whole field starting at
         once. The clock starts when the student presses the key, which is
         also when the beaker starts holding water. */
      player.play();
      bus.emit('dispensed', {});
      // Both beakers go clear. Only stirring will tell them apart.
      STATIONS.forEach(function (k) {
        stations[k].pour.show(true);
        stations[k].turb = 0;
      });
    }

    if (next === 'running') {
      // Already playing: the clock started when the water did, in `filling`.
      say('Water added.', true);
      stirs = 0; lastFreedAt = null; readingSent = false;
      STATIONS.forEach(function (k) {
        stations[k].recovered = false;
        paintPile(stations[k]);
      });
      bus.emit('fillComplete', { tempC: Math.round(tempC), left: stations.left.substance,
                                 right: stations.right.substance });
      STATIONS.forEach(function (k) { stations[k].pour.show(false); });
    }

    if (next === 'resetting') {
      STATIONS.forEach(function (k) {
        stations[k].recovered = false;
        paintPile(stations[k]);
      });
      setFrozenSilently(false);
      player.pause();
      keys.reset.set(true);
      engineReset = false;
      if (stirring) { stirring = false; bus.emit('stirEnded', {}); }

      var wet = 0;
      STATIONS.forEach(function (k) {
        stations[k].drainFrom = stations[k].level;
        stations[k].pileFrom = stations[k].pileAt;
        wet = Math.max(wet, stations[k].level);
      });
      /* An empty beaker has nothing to drain, so most of the sequence is
         dead time — but the old sample is still sitting in it, and whipping
         it away between frames is what looked wrong. Start far enough in to
         skip the drain, and leave time for the powder to tip out. */
      if (wet === 0) stateT = RESET.drain - RESET.dry;

      bus.emit('resetStarted', {});
    }
  }

  function setFrozenSilently(on) {
    frozen = on;
    keys.freeze.set(on);
    /* The cover glass lifts while the field is held. Holding it is the one
       moment a student is reading particles rather than watching them, and a
       reflection over that is in the way. Delegated to from setFrozen, so the
       class is written in one place and reaches the Freeze key, a reset and
       the end of a boil alike. */
    document.body.classList.toggle('is-frozen', !!on);
  }

  /* ---- the frame -------------------------------------------------------- */

  var last = 0;

  var held = false;          // only ever set by the debug hook

  function loop(now) {
    // A clamp, so a tab that was in the background for a minute resumes
    // rather than leaping through a whole reset in one frame.
    var dt = last ? Math.min(0.25, (now - last) / 1000) : 0;
    last = now;
    if (!held) step(dt);
    requestAnimationFrame(loop);
  }

  /* One frame, given how much time has passed. Split out from the rAF loop
     so the whole sequence can be driven by a known clock instead of by the
     display: see the debug hook at the bottom. */
  function step(dt) {
    // Freeze stops the clock, the sprites and every mask exactly where they
    // are, so nothing creeps forward while the model is held.
    if (!frozen) {
      stateT += dt;
      animT += dt;
      advance(dt);

      // Outside the state switch, because every state has cloudiness to
      // settle and a stir that may still be winding down.
      STATIONS.forEach(function (k) { turbidity(stations[k], dt); });

      /* The bar turns for the model's stir, and also for a dry one where
         there is no model to ask. */
      shakeT = Math.max(0, shakeT - dt);
      var spin = Math.max(player.lead().stirProgress().strength,
                          shakeT / DRY_SHAKE);
      barPhase += spin * BAR_TURNS * dt;
    }
    paint();
  }

  function advance(dt) {
    if (state === 'filling') {
      var level = ease(clamp((stateT - FILL.stream) / (FILL.rise - FILL.stream)));
      STATIONS.forEach(function (k) {
        var st = stations[k];
        st.level = level;
        // The dry mound goes the moment the water reaches it. What happens
        // to the solid after that is the viewport's story, not the beaker's.
        st.pileAt = 1 - clamp(stateT / FILL.wet);
      });
      if (stateT >= FILL.done) enter('running');
      return;
    }

    if (state === 'resetting') {
      /* Torricelli: the outflow goes as the square root of the depth, so the
         level falls as the square of the time left. Fast, then a long slow
         finish — which is what emptying a beaker actually looks like. */
      var fall = Math.pow(1 - clamp(stateT / RESET.drain), 2);
      var refill = clamp((stateT - RESET.hold) / (RESET.powder - RESET.hold));

      STATIONS.forEach(function (k) {
        var st = stations[k];
        if (stateT < RESET.drain) {
          // Drains from wherever it actually stood, so resetting a beaker
          // that holds nothing does not conjure a beaker full of water.
          st.level = st.drainFrom * fall;
          // Any powder still dry tips out over the last of the drain rather
          // than disappearing between one frame and the next.
          st.pileAt = st.pileFrom *
            (1 - clamp((stateT - (RESET.drain - RESET.dry)) / RESET.dry));
        } else {
          st.level = 0;
          st.pileAt = 0;
        }
        st.register.cascade(1 - clamp(stateT / RESET.leds));
        st.powder.show(stateT >= RESET.hold && stateT < RESET.powder);
        if (stateT >= RESET.hold) st.pileAt = refill;
      });

      /* The engine is reset as the fresh powder starts falling, not as it
         finishes, so the viewport has the new pile in it while the mound is
         still growing in the beaker. */
      if (stateT >= RESET.hold && !engineReset) {
        engineReset = true;
        player.reset();
        applyHeat();            // the plate is still on; the engine forgot
        player.render();        // the live canvas is under the dry frame
        STATIONS.forEach(function (k) {
          lastFree[k] = 0;
          /* The fresh sample arrives rather than appearing: lifted clear of
             the field, then walked down into its slots by the same return a
             boil uses. It lands while the beaker's own powder is still
             falling, so the two views are pouring the same sample in. */
          stations[k].sim.liftHome(reduced.matches ? 0 : RESET.rise);
          drawDry(stations[k]);
        });
      }

      /* Walked, not stepped. The field is full of solvent that is not in the
         beaker yet, and stepping the model here would dissolve the fresh
         sample before it had finished landing. */
      if (engineReset) {
        STATIONS.forEach(function (k) { stations[k].sim.returnHome(); });
      }

      if (stateT >= RESET.done) {
        enter('loaded');
        say('Reset complete.', true);
        bus.emit('resetComplete', {});
      }
      return;
    }

    if (state === 'running') {
      boil(dt);
      /* Boiling dry ends the run, and everything below belongs to one still
         going: it would stamp a full beaker and no mound back over what
         `enter('loaded')` just set, because `boilLevel` is reset to 1 on the
         way out. That is what used to put the water back and take the solid
         away at the exact moment the point was being made. */
      if (state !== 'running') return;

      STATIONS.forEach(function (k) {
        var st = stations[k];
        st.level = boilLevel;
        var free = st.sim.count(GROUPS.free);

        if (free > lastFree[k]) {
          lastFreedAt = now();
          bus.emit('particleFreed',
                   { station: k, substance: st.substance, count: free,
                     t: now(), tempC: Math.round(tempC), stirs: stirs });
          if (free === SOLUTE) {
            bus.emit('allDissolved',
                     { station: k, substance: st.substance, count: free,
                     t: now(), tempC: Math.round(tempC), stirs: stirs });
          }
        }
        lastFree[k] = free;
        /* The mound is gone while there is water, and comes back as the
           water leaves: that is the solute arriving back out of solution. */
        st.pileAt = 1 - boilLevel;
      });

      sendReading();

      var strength = player.lead().stirProgress().strength;
      if (stirring && strength <= 0.001) { stirring = false; bus.emit('stirEnded', {}); }
    }
  }

  /* One reading per run, at fifteen seconds, which is the row the notebook
     writes down.

     The counts are read off each sim's snapshot at exactly frame 900 rather
     than off the live field, because the Player takes up to eight model
     steps per display frame: by the time a frame notices the clock has
     passed fifteen seconds the model may be at 903, and how far past
     depends on how the browser paced its frames. Two students running the
     same sample at the same temperature have to get the same number. */
  function sendReading() {
    var frame = READING_AT * 60;
    if (readingSent || player.lead().frame < frame) return;

    var detail = { t: READING_AT, tempC: Math.round(tempC), stirs: stirs };
    var short = false;
    STATIONS.forEach(function (k) {
      var at = stations[k].sim.countAt(frame, GROUPS.free);
      if (at === null) short = true;
      detail[k] = { substance: stations[k].substance, free: at };
    });
    // No snapshot for that frame means the run never passed through it.
    if (short) return;

    readingSent = true;
    bus.emit('reading', detail);
  }

  /* Boiling.

     Held at 100 C the water goes, and what was dissolved in it has nowhere
     left to stay: the solute comes back out onto the heap. That is the thing
     worth seeing — dissolving did not destroy the sample, and here it is
     again. Below the boil the beaker cools off faster than it heated up.

     Only as much can stay in solution as there is water to hold it, which is
     what ties the counter falling to the level falling. */
  function boil(dt) {
    /* Past the point of no return: the water has gone and the solid is on its
       way back to its slots. Checked before the temperature, because the last
       grains are always still travelling when the water runs out and a hand
       on the slider during that second would otherwise strand the run with a
       half-rebuilt heap and a clock that never stops. */
    if (drying) {
      var flying = 0;
      STATIONS.forEach(function (k) { flying += stations[k].sim.landing(); });
      if (flying) return;
      drying = false;
      finishDry();
      return;
    }

    if (tempC < BOIL.at) {
      boilT = Math.max(0, boilT - dt * 2);
      boilLevel = 1;
      return;
    }

    boilT += dt;
    if (boilT < BOIL.onset) return;

    var went = clamp((boilT - BOIL.onset) / BOIL.dry);
    boilLevel = 1 - went;

    STATIONS.forEach(function (k) {
      var sim = stations[k].sim;
      var goneNow = sim.count(function (q) { return q.gone; });
      var wantGone = Math.round(SOLVENT * went);
      if (wantGone > goneNow) sim.evaporate(wantGone - goneNow);

      var canHold = Math.round(SOLUTE * boilLevel);
      var free = sim.count(GROUPS.free);
      /* Reduced motion gets the result without the journey: the grain is
         simply back in its slot. */
      if (free > canHold) sim.settle(free - canHold, reduced.matches);
    });

    if (went < 1) return;

    /* Dry.

       The field is left exactly as the boil made it: every solvent particle
       gone, every solute particle back on the heap. It is not rebuilt here,
       and that is the whole point — a rebuild puts the water back, which is
       the one thing this is showing does not happen. What a student is
       looking at when it finishes is the simulation's own result, not a
       fresh one that happens to resemble it.

       The last partial step is finished off first, because `went` reaching 1
       between frames can leave a few of each behind. */
    /* Left at 0, not reset to 1: the frames that follow are still 'running'
       while the last grains walk home, and the beaker has to stay empty and
       the mound up through all of them. `enter` puts it back. */
    boilLevel = 0;
    STATIONS.forEach(function (k) {
      var sim = stations[k].sim;
      sim.evaporate(SOLVENT);                       // whatever water is left
      sim.settle(SOLUTE, reduced.matches);          // and anything loose in it
      lastFree[k] = 0;
    });
    /* The heap is not whole yet — the last grains are still walking back to
       their slots, and stopping the clock on them is what would leave them in
       mid-air. The branch above finishes the job on the frame they land. */
    drying = true;
  }

  /* The water is gone, the solid is back in the pile it started as, and the
     instrument is where a student found it. */
  function finishDry() {
    player.render();                    // the lens holds the finished heap
    say('The water boiled away. The solid is left behind.', true);
    /* Whatever dissolved is back on the heap, so from here a pile particle
       answers with its recovered line rather than its in-the-pile one. The
       next run clears it; `loaded` does not, because this IS loaded. */
    STATIONS.forEach(function (k) {
      stations[k].recovered = true;
      paintPile(stations[k]);
    });
    bus.emit('boiledDry', { t: now(), tempC: Math.round(tempC),
                            left: stations.left.substance,
                            right: stations.right.substance });
    enter('loaded');
  }

  /* Cloudiness, per station. Only a solid that will not dissolve has any:
     once it has been stirred up it settles slowly toward a faint haze and
     never returns to clear while there is water in the beaker. */
  function turbidity(st, dt) {
    if (!sub(st).clouds || !st.everStirred) return;
    st.turb += (TURBIDITY.haze - st.turb) * Math.min(1, dt / TURBIDITY.settle);
  }

  /* ---- drawing ---------------------------------------------------------- */

  function paint() {
    /* Reset zeroes the readings before it touches the engine, so the panel
       is seen to clear rather than jumping when the model is rebuilt a
       second later. Everywhere else this is 1 and the readings are live. */
    var resetting = state === 'resetting';
    var roll = resetting ? 1 - clamp(stateT / RESET.leds) : 1;

    /* The bubbles come up as the water comes to the boil and go as it comes
       off: `boilT` already ramps both ways, so there is no second clock and
       no second piece of state. One plate and one temperature, so it is
       written once for both beakers — and only when it changes, because the
       whole stage inherits it. */
    var boiling = clamp(boilT / BOIL.ramp).toFixed(3);
    if (boiling !== boilShown) {
      inst.stage.style.setProperty('--boil', boilShown = boiling);
    }

    $('clock').textContent = pad((player.lead().frame / 60) * roll, 1);

    /* The Stir key stays down for as long as the engine's stir lasts, which
       is the only feedback a keyboard press gets: a click carries no pointer
       to hold the cap down. Reset already does this for its own sequence. */
    keys.stir.set(player.lead().stirProgress().strength > 0.001);
    /* And it goes dim while the hand has nothing left. A deliberate stirrer
       never sees this — three strokes are there from the start and one comes
       back every 8 s — but a cap that presses and does nothing reads as a
       broken button rather than as an arm that is tired. */
    keys.stir.enable(player.lead().stirLeft >= 1);

    STATIONS.forEach(function (k) {
      var st = stations[k];
      var free = st.sim.count(GROUPS.free);
      var shown = Math.round(free * roll);

      st.count.textContent = shown < 10 ? '0' + shown : String(shown);
      // While resetting, the cascade owns the register.
      if (!resetting) st.register.set(free);

      // The surface, dipped in the middle while the bar is spinning.
      var strength = st.sim.stirProgress().strength;
      var box = inst.box('water-' + k);
      var dip = reduced.matches ? 0
              : (VORTEX_POINTS / box[3]) * strength * st.level;
      st.water.style.clipPath = waterClip(st, st.level, dip);
      st.turbidity.style.clipPath = st.water.style.clipPath;
      st.refract.style.clipPath = st.water.style.clipPath;
      st.turbidity.style.opacity = st.turb * st.level;
      st.pile.style.setProperty('--pile', st.pileAt.toFixed(4));
      st.pile.style.setProperty('--shake', (dryShove() * 3.5).toFixed(2) + 'px');

      // The stream hangs from the nozzle down to the water surface.
      if (state === 'filling') {
        var grow = clamp(stateT / FILL.stream);
        var pourBox = inst.box('sprite-pour-' + k);
        var surface = box[1] + surfaceFrac(st, st.level) * box[3];
        var full = surface - pourBox[1];
        st.pour.el.style.height = (grow < 1 ? full * grow : full).toFixed(1) + 'px';
      }

      /* The stream and the grains run on their own clock, not the stir's:
         they are falling, not being spun. Reduced motion holds them on one
         frame rather than hiding them, so the stream is still there. */
      var decor = reduced.matches ? 0 : animT;
      st.pour.phase(decor * POUR_LOOPS);
      st.powder.phase(decor * POWDER_LOOPS + 0.3);
      st.bar.phase(reduced.matches ? 0 : barPhase);

      /* The stand-in canvas is only needed while the field is not yet the
         engine's to draw. It cross-fades out over the last of the pour, onto
         a live field already showing the same particles in the same places —
         so the only thing the fade hides is the optics coming up. */
      if (state === 'running') {
        st.dry.style.opacity = 0;
      } else {
        st.dry.style.opacity = clamp((1 - st.level) / 0.12);
        drawDry(st, st.level, state === 'resetting');
      }
    });

    if (state === 'running' && !frozen) {
      /* Built from the stations rather than welded together, or a swapped
         sample would be narrated under the old substance's name. */
      say(STATIONS.map(function (k) {
        return freeOf(k) + ' of ' + SOLUTE + ' ' +
               sub(stations[k]).label.toLowerCase() + ' particles';
      }).join(' and ') +
          ' have dissolved after ' + (player.lead().frame / 60).toFixed(0) + ' seconds.');
    }
  }

  function freeOf(k) { return stations[k].sim.count(GROUPS.free); }

  /* Dry powder being pushed round the beaker: a shove that rocks back and
     dies away. Nothing dissolves, but the key does something. Under reduced
     motion there is no rocking and the powder is simply left leaning, which
     `stir` sets and `enter` clears.

     Returned as a bare -1..1 so the beaker's mound and the viewfinder's heap
     can each scale it to their own size. If only one of them moved, the two
     views would disagree about whether the stir did anything. */
  function dryShove() {
    if (shakeT > 0) return Math.sin(shakeT * 26) * (shakeT / DRY_SHAKE);
    return dryLean;
  }

  function surfaceFrac(st, level) {
    var geo = st.geo || { surfaceFrac: 0.2, floorFrac: 0.973 };
    return geo.floorFrac - (geo.floorFrac - geo.surfaceFrac) * level;
  }

  /* The water mask: a flat surface at the current level, dipped in the middle
     by the vortex. Sampled rather than curved because clip-path has no
     curves, and fourteen points across a 160-point beaker is already finer
     than the pixel grid at any scale this runs at. */
  /* How far water climbs the glass, as a fraction of the beaker's height.
     Water wets glass, so the surface is never the straight edge a fill level
     would be — it rises where it meets the wall. Schematic, like the particle
     sizes: a real meniscus in a 70 mm beaker is a millimetre or two, and one
     drawn to scale is invisible at the size this is seen. */
  var MENISCUS = 0.022;

  /* The waterline. One curve carries both of the things it has to say: the
     meniscus lifts it where it touches the glass, and a turning stir bar
     pulls the middle down. Together they are the shape a stirred beaker
     actually takes — high at the walls, hollow in the centre — and at rest
     the dip is zero and the climb is all that is left. */
  function waterClip(st, level, dip) {
    var top = surfaceFrac(st, level);
    var pts = [];
    var n = 28;              // enough that the curve reads as a curve
    for (var i = 0; i <= n; i++) {
      var x = i / n;
      var climb = 1 - Math.sin(Math.PI * x);     // 1 at both walls, 0 mid-span
      /* Scaled by the level, because the climb lifts the line and an empty
         beaker would otherwise keep a bead of water in each bottom corner —
         the surface would sit above the texture's own lower edge. No water,
         no meniscus, which is also the truth of it. */
      var y = top + dip * Math.sin(Math.PI * x)
                  - MENISCUS * level * climb * climb;
      pts.push((x * 100).toFixed(2) + '% ' + (clamp(y) * 100).toFixed(3) + '%');
    }
    pts.push('100% 100%', '0% 100%');
    return 'polygon(' + pts.join(',') + ')';
  }

  /* ---- the zoom ---------------------------------------------------------

     Drawn rather than painted. `drawDry` re-reads the palette every frame,
     so grains follow the theme and all six substances for free; six painted
     steps would have been twenty-four files and a placeholder fallback.

     Nothing in here reads st.sim. The model is not involved in any of it,
     and SCATTER has its own generator, so no draw can shift the stream. */

  var NONE = [];            // drawDry's particle loop, switched off

  /* Two surfaces, because the field is only about 240 CSS px across and a
     teaching sentence will not fit in the bottom of a circle that size.
     Three or four words go on the glass; the sentence goes in the readout,
     which is 512 points wide and is the instrument's own text surface.

     How much of a grain the view holds is the one thing that depends on
     the powder: a grain of Epsom salts overruns the frame and chalk is
     dust, so "one grain" over either would be the lie the zoom exists to
     correct. */
  function howMuch(st) {
    /* Against the frame, not against a guess: `one` only once the grain
       very nearly fills the field, because a grain at a third of the width
       means eight of them on screen. */
    var frac = sub(st).grain[0] * MM / ZOOM[zoom].field;
    return frac >= 1.15 ? 'part'
         : frac >= 0.55 ? 'one'
         : frac >= 0.12 ? 'few'
         : frac >= 0.02 ? 'heap' : 'dust';
  }

  function capFor(st) {
    var z = ZOOM[zoom];
    if (z.cap !== null) return z.cap;
    var much = howMuch(st);
    return much === 'part' ? 'Part of one grain'
         : much === 'one'  ? 'One grain'
         : much === 'few'  ? 'A few grains'
         : much === 'heap' ? 'A heap of grains'
         : 'Dust';
  }

  function viewLine(st, spoken) {
    var z = ZOOM[zoom];
    if (z.viewDesc !== null) return z.viewDesc;

    var q = sub(st), low = q.label.toLowerCase();
    var much = howMuch(st);
    var size = mmText(q.grain[0], spoken);
    // What the live field will be, as a fraction of one grain of this powder.
    var next = 'The next view is 1/' + round2(q.grain[0] * MM / (FIELD_NM * 2));

    if (much === 'part') {
      return 'Part of one grain of ' + low + ', ' + size + '. ' + next + ' of it.';
    }
    if (much === 'one') {
      return 'One grain of ' + low + ', ' + size + ' across. ' + next + ' of it.';
    }
    if (much === 'dust') {
      return q.label + ' dust, ' + size + ' a grain. ' + next + ' of one.';
    }
    return (much === 'few' ? 'A few grains of ' : 'A heap of grains of ') +
           low + ', ' + size + ' each. ' + next + ' of one.';
  }

  /* The one line on screen telling a student what to do, which is what the
     one-screen rule asks for and this activity has never had. It names both
     ways in, because the tap is the one a student finds and the key is the
     one a student on a keyboard needs — without it they would meet the
     beaker at boot, have no way forward, and press Dispense straight past
     the whole chain. It goes once the chain is done. */
  function withHint(line) {
    return zoom === 0 ? line + ' Tap it or press Z to zoom in.' : line;
  }

  /* The readout is a fixed plate that clips after about eighty-eight
     characters of prose, so it gets the abbreviation; the field's
     accessible name has no such limit and a screen reader should not be
     left to make something of "µm". Measured, not guessed. */
  function mmText(mm, spoken) {
    return mm < 0.1
      ? Math.round(mm * 1000) + (spoken ? ' micrometres' : ' µm')
      : mm + (spoken ? ' millimetres' : ' mm');
  }

  /* 22091 reads as 22,000. The size is the point, the digits are not, and
     the grain figures they come from are estimates anyway. */
  function round2(n) {
    var r = n < 1000 ? Math.round(n / 10) * 10 : Math.round(n / 1000) * 1000;
    return r.toLocaleString('en-US');
  }

  /* One writer for the field's accessible name. The substance and the
     magnification both belong in it, and two writers would drift. */
  function labelField(st) {
    var canvas = $('lens-' + st.key);
    if (!canvas) return;
    canvas.setAttribute('aria-label', zoom === LAST
      ? 'Magnified view of ' + sub(st).label.toLowerCase() + ' in water'
      : withHint(viewLine(st, true)) + ' Sample: ' + sub(st).label.toLowerCase() + '.');
  }

  /* Stepping the chain. Both stations always, never one: they are one
     instrument at one magnification, and the fair test the whole activity
     rests on needs them to agree about scale. */
  function setZoom(n) {
    zoom = n;
    var z = ZOOM[n];

    STATIONS.forEach(function (k) {
      var st = stations[k];
      var wrap = st.dry.parentNode;
      var label = wrap.querySelector('.scalebar__label');
      var bar = wrap.querySelector('.scalebar__bar');
      if (label) label.textContent = z.barLabel;
      if (bar) {
        bar.style.setProperty('--nm-bar',
          barPoints(z.bar, z.field).toFixed(2) + 'px');
      }
      labelField(st);
    });

    /* IDENTITY is read at hover time, so writing it is how the readout
       follows the zoom. The viewport's line stays substance-free: the key
       is shared by both stations and they hold different powders. */
    IDENTITY.scalebar = ['Scale bar', z.barDesc];
    /* One key, two stations, and at the "one grain" step they can hold
       powders that fill the frame very differently — so the shared entry
       takes the left station's wording and the readout follows whichever
       field the pointer is actually over. */
    IDENTITY.viewport = ['Viewport', withHint(viewLine(stations.left))];

    /* The readout is where the sentence lives, and nothing is being
       hovered when a key steps the chain, so point it at the viewport
       itself. This is the instrument's own text surface doing the job the
       glass is too small for. */
    identify('viewport');

    var l = withHint(viewLine(stations.left, true));
    var r = withHint(viewLine(stations.right, true));
    /* Forced: the announcer's four-second gap would eat three of the four
       steps from a student tapping straight through. */
    say(l === r ? l : 'Left: ' + l + ' Right: ' + r, true);
  }

  function drawZoom(g, st, cx, cy, rad, pal) {
    var z = ZOOM[zoom];
    if (zoom === 0) beakerSchematic(g, st, cx, cy, rad, pal);
    else grainField(g, st, cx, cy, rad, pal, z);

    /* Where the next view comes from, the idiom every powers-of-ten diagram
       uses. It exists at the first two steps and cannot exist at the third:
       13.58 nm inside four tenths of a millimetre is a hundredth of a
       point — a jump of 29,455 against the tidy tens above it. That
       impossibility is the lesson, so the caption says it instead. */
    if (z.reticleAt) {
      var side = 2 * rad * (ZOOM[zoom + 1].field / z.field);
      reticle(g, cx + z.reticleAt[0] * rad, cy + z.reticleAt[1] * rad,
              side, pal.reticle || '#fff');
    }
  }

  /* A diagram, deliberately not a picture: the real beaker is on the bench
     two hundred points to the left and a canvas near-match would lose to it
     every time. Its job is to hold the box showing where the next view
     comes from. The rim runs off the top of the circular field, which is
     what a round aperture does to something this size. */
  function beakerSchematic(g, st, cx, cy, rad, pal) {
    var bw = 1.4 * rad, bh = 1.36 * rad;       // 70 mm wide in a 100 mm field
    /* Lifted a tenth of the radius so the base clears the caption. The rim
       runs off the top of the circle instead, which is what a round
       aperture does to something this size and reads as it should. */
    var lift = rad * 0.1;
    var x = cx - bw / 2, top = cy - bh / 2 - lift, base = cy + bh / 2 - lift;

    g.save();
    /* Drawn in the reticle's own white rather than --lens-hair, which at
       #2A3E57 on a #0F1D2E field is invisible at arm's length on a
       classroom projector. This is a diagram on the glass, and it should
       read as one. */
    g.lineWidth = Math.max(1.5, rad * 0.018);
    g.strokeStyle = pal.reticle || '#fff';
    g.globalAlpha = 0.5;
    g.beginPath();
    g.moveTo(x, top);
    g.lineTo(x, base);
    g.lineTo(x + bw, base);
    g.lineTo(x + bw, top);
    g.stroke();

    /* Whatever is actually in the beaker, so the schematic cannot disagree
       with the bench three hundred points away. */
    if (st.level > 0.01) {
      g.globalAlpha = 0.22;
      g.fillStyle = pal.kinds.solvent.base;
      var surface = base - bh * 0.78 * st.level;
      g.fillRect(x, surface, bw, base - surface);
      g.globalAlpha = 0.7;
      g.beginPath();
      g.moveTo(x, surface);
      g.lineTo(x + bw, surface);
      g.stroke();
    }

    // The mound: the only part of this a student is being pointed at.
    g.globalAlpha = 1;
    g.fillStyle = pal.powder.base;    // the same white heap the real beaker shows
    var mw = bw * 0.54, mh = bh * 0.1 * Math.max(0.15, st.pileAt);
    g.beginPath();
    g.moveTo(cx - mw / 2, base);
    g.quadraticCurveTo(cx, base - mh * 2.2, cx + mw / 2, base);
    g.fill();
    g.restore();
  }

  /* Packed grains on a jittered grid pitched to the grain itself, so the
     field is as densely covered at 10 mm as at 1 mm with no per-step count
     to tune. SCATTER supplies the jitter, indexed rather than drawn from,
     so it is the same powder every load. */
  function grainField(g, st, cx, cy, rad, pal, z) {
    var q = sub(st);
    var k = pal.powder;                            // white, whichever powder
    var span = 2 * q.grain[0] * MM / z.field;      // grain width, world units
    var px = span * rad;

    /* Finer than a pixel and a half is not a grain any more, it is dust —
       which is exactly what chalk is at these scales, and what makes it
       cloud water. Forty thousand sub-pixel dots would say the same thing
       far more slowly, and grainOver's noise lands on top either way. */
    if (px < 1.6) {
      g.fillStyle = k.dim || k.base;
      g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      return;
    }

    /* Bigger than the frame: one grain, placed so an edge crosses the field
       rather than filling it flat. Without that, a 2.5 mm pellet and 5 um
       dust are the same picture. */
    if (span > 1.7) {
      var off = (span / 2 - 0.5) * 0.72;
      blob(g, cx - off * rad, cy - off * rad, px, 0.42, 1, q.grain[1], k);
      return;
    }

    // The same shove the heap gets, so a dry stir moves both or neither.
    var shove = rad * dryShove() * 0.05;
    var pitch = px * 1.04;
    var half = Math.ceil(rad / pitch) + 1;

    /* Past about six pixels a grain the grid runs to thousands of cells,
       and what it would draw is dust anyway — so hand it to the flat fill
       above rather than paint 6,000 specks twice a frame. */
    if ((2 * half + 1) * (2 * half + 1) > 1500) {
      g.fillStyle = k.dim || k.base;
      g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      return;
    }

    for (var iy = -half; iy <= half; iy++) {
      for (var ix = -half; ix <= half; ix++) {
        /* The middle one is drawn last, below, so a larger neighbour
           cannot paint over the grain the previous step's box was
           pointing at — it is the one the student came here to see. */
        if (ix === 0 && iy === 0) continue;

        /* Keyed to the cell, not to a running count, so a grain keeps its
           shape when the window resizes and the grid grows around it. */
        var j = SCATTER[(((iy + 64) * 131 + (ix + 64)) >>> 0) % SCATTER.length];
        var gx = cx + ix * pitch + j.x * pitch * 0.34 + shove;
        var gy = cy + iy * pitch + j.y * pitch * 0.34;
        var dx = gx - cx, dy = gy - cy;
        if (dx * dx + dy * dy > (rad + px) * (rad + px)) continue;
        blob(g, gx, gy, px * j.size, j.rot, j.aspect, q.grain[1], k);
      }
    }

    // SCATTER[0] carries no jitter, so this one sits dead centre.
    blob(g, cx + shove, cy, px * SCATTER[0].size, SCATTER[0].rot,
         SCATTER[0].aspect, q.grain[1], k);
  }

  /* One grain. Three habits cover six substances because at these scales
     size does most of the work — a 5 um chunk is dust whatever shape you
     give it — and the two the FOSS I-Check names are the cube and the
     needle. */
  function blob(g, x, y, d, rot, aspect, habit, k) {
    var r = d / 2;

    /* Below a few pixels every facet is invisible and only the cost is
       real. Hundreds of these are on screen at the wider steps. */
    if (d < 5) {
      g.fillStyle = k.base;
      g.fillRect(x - r, y - r, d, d);
      return;
    }

    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = k.base;

    if (habit === 'cube') {
      g.fillRect(-r, -r * aspect, d, d * aspect);
      g.fillStyle = k.lit;                    // a lit face, or it is a square
      g.fillRect(-r, -r * aspect, d, d * aspect * 0.32);
    } else if (habit === 'needle') {
      g.fillRect(-r, -r * 0.2, d, d * 0.2);
      g.fillStyle = k.lit;
      g.fillRect(-r, -r * 0.2, d, d * 0.07);
    } else {
      g.beginPath();
      g.ellipse(0, 0, r, r * aspect, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = k.lit;
      g.beginPath();
      g.ellipse(-r * 0.2, -r * 0.26, r * 0.48, r * aspect * 0.4, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // Corners rather than a closed box, which would hide the grain inside it.
  function reticle(g, x, y, side, ink) {
    var h = side / 2, arm = side * 0.32;
    var w = Math.max(1, side * 0.045);

    g.save();
    g.beginPath();
    for (var i = 0; i < 4; i++) {
      var sx = (i === 1 || i === 2) ? 1 : -1;
      var sy = i < 2 ? -1 : 1;
      g.moveTo(x + sx * h - sx * arm, y + sy * h);
      g.lineTo(x + sx * h, y + sy * h);
      g.lineTo(x + sx * h, y + sy * h - sy * arm);
    }
    /* Twice: a dark stroke under a light one. The field behind this is a
       beaker on near-black at one step and a wall of near-white grains at
       the next, and a single colour vanishes into one or the other. */
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,.55)';
    g.lineWidth = w * 2.6;
    g.stroke();
    g.strokeStyle = ink;
    g.lineWidth = w;
    g.stroke();
    g.restore();
  }

  /* On the glass rather than in the DOM: no CSS, no print rule, no z-index
     to get wrong, it cannot escape the cover glass, and it scales with the
     stage like the reticle it belongs to. A screen reader is served by the
     field's aria-label and by say(), not by this. */
  function zoomCaption(g, st, cx, cy, rad, pal) {
    var text = capFor(st);
    if (!text) return;

    var size = rad * 0.115;
    var baseY = cy + rad * 0.84;        // clear of the beaker's base line

    g.save();
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.clip();
    g.font = '600 ' + size.toFixed(2) + 'px ' + (pal.font || 'sans-serif');

    /* A chord, not the diameter: this far down the circle there is much
       less than 2r to write on, and the refit is what stops a longer
       substance name running out through the glass. */
    var dy = (baseY - cy) / rad;
    var room = 2 * rad * Math.sqrt(Math.max(0.05, 1 - dy * dy)) - size;
    var wide = g.measureText(text).width;
    if (wide > room) {
      size *= room / wide;
      g.font = '600 ' + size.toFixed(2) + 'px ' + (pal.font || 'sans-serif');
      wide = g.measureText(text).width;
    }

    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';

    /* Its own plate, the way the scale bar has one, hugging the text so
       its corners cannot reach the rim: white on whatever the field
       happens to be is unreadable at one theme or the other. */
    g.fillStyle = pal.bg;
    g.globalAlpha = 0.95;
    g.fillRect(cx - wide / 2 - size * 0.4, baseY - size * 0.95,
               wide + size * 0.8, size * 1.32);
    g.globalAlpha = 1;
    g.fillStyle = '#fff';
    g.fillText(text, cx, baseY);
    g.restore();
  }

  /* The dry state, and the pour.

     The engine expects a field already full of water, so while the beaker is
     filling it stays paused and this canvas stands in for it: the solute
     where the engine put it, and the water arriving from above.

     Particles are drawn with the lens's own sprites, so what is on this
     canvas and what the engine draws a moment later are the same pixels. At
     the end of the pour every particle is exactly on its frame-0 position,
     and the canvas cross-fades out onto a live field that already matches.

     `pour` runs 0 (dry) to 1 (full). Reset runs it backwards, which reads as
     the water leaving. */
  function drawDry(st, pour, draining) {
    var canvas = st.dry;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var dpr = window.devicePixelRatio || 1;
    var want = Math.round(rect.width * dpr);
    if (canvas.width !== want) {
      canvas.width = want;
      canvas.height = Math.round(rect.height * dpr);
    }

    var g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    var w = rect.width, h = rect.height;
    var rad = Math.min(w, h) / 2, cx = w / 2, cy = h / 2;
    var pal = paletteFor(st)();

    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = pal.bg;
    g.fillRect(0, 0, w, h);

    /* The zoomed-out links of the chain are not the model, so they are not
       particles: a beaker, or a field of grains. Same clip, same grain
       overlay, same optics — only the subject changes, and the loop below
       is handed nothing to draw. */
    if (zoom < LAST) drawZoom(g, st, cx, cy, rad, pal);

    var p = zoom < LAST ? NONE : st.sim.particles;
    for (var i = 0; i < p.length; i++) {
      var q = p[i];
      var sprite = st.lens.sprites[q.kind];
      if (!sprite) continue;

      var x = cx + q.x * rad, y = cy + q.y * rad;

      // Just under a particle's width, so the heap is seen to shift.
      if (q.kind === 'solute') x += rad * dryShove() * 0.05;

      if (q.kind !== 'solute') {
        var depth = (q.y + 1) / 2;                 // 0 at the top, 1 at the floor

        if (draining) {
          /* Leaving, not arriving. The surface is at `pour` above the floor,
             and whatever it uncovers falls out through the bottom — so the
             water goes down the way it does from a beaker instead of being
             lifted back out of the top it came in by. */
          var over = (1 - depth) - pour;
          if (over > 0) {
            var d = clamp(over / DRAIN_FALL);
            if (d >= 1) continue;
            // Far enough that even a drop on the floor clears the field.
            y += rad * 2.2 * easeFall(d);
          }
        } else {
          if (pour <= 0) continue;
          /* Each drop waits its turn by how deep it is going: the floor of
             the field fills first and the surface last, so the level rises
             rather than the whole field fading up at once. */
          var u = clamp((pour - (1 - depth) * POUR_STAGGER) /
                        (1 - POUR_STAGGER));
          if (u <= 0) continue;
          // Falls in from above the field and settles on its mark.
          var from = cy - rad * 1.45;
          y = from + (y - from) * ease(u);
        }
      }

      var sh = sprite.halfCss;
      g.drawImage(sprite, x - sh, y - sh, sh * 2, sh * 2);
    }

    /* Inside the clip, where the live canvas puts it too, so the two frames
       carry the same texture and the handoff between them is invisible. */
    st.lens.grainOver(g, w, h);
    g.restore();

    /* The same eyepiece the live canvas gets. Without it the reticle, the
       vignette and the rim belong to the model running rather than to the
       instrument, and they vanish every time this frame comes up — which is
       every state but one. */
    st.lens.optics(g, cx, cy, rad, w, h);
    if (zoom < LAST) zoomCaption(g, st, cx, cy, rad, pal);
  }

  /* ---- particles are identifiable too ----------------------------------- */

  /* Hit-tested against the engine's own positions, read-only. A pointer names
     whatever it is over; a tap names what it lands on and records it, which
     is what a challenge about a buried particle needs. */
  function wireParticlePicking() {
    STATIONS.forEach(function (k) {
      var st = stations[k];
      var canvas = st.dry.parentNode;

      canvas.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var hit = particleAt(st, e.clientX, e.clientY);
        identify(hit ? nameFor(st, hit.p) : 'viewport');
      });

      canvas.addEventListener('click', function (e) {
        /* Inward only, and never wrapping: a student poking between
           particles at the last step must not be thrown back to the
           beaker. Z is the key that cycles. */
        if (zoom < LAST) { setZoom(zoom + 1); return; }
        var hit = particleAt(st, e.clientX, e.clientY);
        if (!hit) return;
        identify(nameFor(st, hit.p));
        bus.emit('particleSelected', {
          station: k,
          /* Buried means the water cannot reach it, which is the whole
             reason a lump dissolves from the outside in. `fixed` is sent
             alongside because "on the surface of the pile" and "already
             dissolved" are both unburied, and they are not the same thing. */
          fixed: hit.p.kind === 'solute' && hit.p.fixed,
          buried: hit.p.kind === 'solute' && hit.p.fixed && !hit.p.exposed,
          substance: hit.p.kind === 'solute' ? st.substance : 'water',
          index: hit.i,
          buried: hit.p.kind === 'solute' && hit.p.fixed && !hit.p.exposed
        });
      });
    });
  }

  function particleAt(st, clientX, clientY) {
    /* Nothing on the glass is a particle until the chain reaches the model.
       Without this, hovering a grain at the hand-lens step names a sodium
       chloride particle that is nowhere on screen, and the readout lies
       about the very thing the zoom is there to correct. */
    if (zoom < LAST) return null;
    var rect = st.dry.getBoundingClientRect();
    if (!rect.width) return null;

    var rad = Math.min(rect.width, rect.height) / 2;
    var ux = (clientX - (rect.left + rect.width / 2)) / rad;
    var uy = (clientY - (rect.top + rect.height / 2)) / rad;

    // Only the solute is in the beaker before the water arrives.
    var dryOnly = state === 'loaded' || state === 'resetting';
    var reach = st.sim.cfg.particleRadius * 1.5;
    var best = null, bestD = reach;
    var p = st.sim.particles;

    for (var i = 0; i < p.length; i++) {
      if (dryOnly && p[i].kind !== 'solute') continue;
      var dx = p[i].x - ux, dy = p[i].y - uy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = { p: p[i], i: i }; }
    }
    return best;
  }

  function nameFor(st, particle) {
    if (particle.kind === 'solvent') return 'particle-water';
    /* After a boil the heap is what came back out of solution, so it says so
       until the next run. Calcium carbonate's recovered line is the one that
       points out nothing had to come back. */
    if (particle.fixed && st.recovered) return 'particle-' + st.substance + '-recovered';
    return 'particle-' + st.substance + (particle.fixed ? '-pile' : '-free');
  }

  /* ---- small helpers ---------------------------------------------------- */

  // Seconds since the water went in, which is what the clock shows.
  function now() { return player.lead().frame / 60; }

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }      // ease-out
  function easeFall(t) { return t * t; }                   // gathering speed

  /* Two digits before the point, always, so the clock never changes width.
     Padded off the formatted string rather than the number, because 9.95
     rounds up to "10.0" and would otherwise be padded to three digits. */
  function pad(v, dp) {
    var s = v.toFixed(dp);
    return s.indexOf('.') === 1 ? '0' + s : s;
  }
})();
