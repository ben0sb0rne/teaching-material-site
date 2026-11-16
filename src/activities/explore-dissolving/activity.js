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
     collision is something you can watch happen. The field is still 6.79 nm
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

  /* The field width is picked, not arbitrary. At 6.79 nm the fifty solute
     particles fill five whole rows of the floor — 6, 9, 10, 12, 13 — so the
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

  var STATIONS = ['sugar', 'caco3'];

  /* Solubility is one number: the chance a hard enough collision frees a
     surface particle. Insoluble is the same rule with a chance of zero — it
     gets hit just as often and never lets go.

     It lives on BUILD because it is not a property of sugar, it is whatever
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
  var SUBSTANCE = {
    sugar: { label: 'Sugar', breakChance: BUILD.breakChance, clouds: false },
    // What will not dissolve can still be stirred up into suspension.
    caco3: { label: 'Calcium carbonate', breakChance: 0, clouds: true }
  };

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
    'particle-sugar-pile': ['Sugar particle', 'Sugar, the solute. Held in the pile by attraction to other sugar particles.'],
    'particle-sugar-free': ['Sugar particle', 'Dissolved sugar. Part of the solution.'],
    'particle-caco3':      ['Calcium carbonate particle', 'Calcium carbonate, the main ingredient in chalk. Insoluble in water.'],
    'scalebar':  ['Scale bar', '1 nanometre, one billionth of a metre.'],
    'viewport':  ['Viewport', 'Magnified tens of millions of times.'],
    'register':  ['Register', 'Particles dissolved. One light per particle.'],
    'counter':   ['Counter', 'Particles dissolved, out of ' + SOLUTE + '.'],
    'heat':      ['Water temperature', 'Hotter water is faster particles, so they hit the solid harder and more often.'],
    'clock':     ['Clock', 'Seconds since water was added.'],
    'freeze':    ['Freeze', 'Pauses the simulation.'],
    'stir':      ['Stir', 'Spins the stir bars in both beakers.'],
    'reset':     ['Reset', 'Drains both beakers and adds fresh samples.'],
    'dispense':  ['Dispense water', 'Adds 250 mL of water to both beakers at once.'],
    'nameplate-sugar': ['Sugar', 'Sugar, C₁₂H₂₂O₁₁.'],
    'nameplate-caco3': ['Calcium carbonate', 'Calcium carbonate, CaCO₃.'],
    'beaker':    ['Beaker', '250 mL beaker.'],
    'stirbar':   ['Stir bar', 'Magnetic stir bar. Spins when the stir plate is on.'],
    'stirplate': ['Stir plate', 'Magnetic stir plate. Spins the stir bar from below.'],
    'nozzle':    ['Nozzle', 'Water outlet.'],
    'chute':     ['Powder chute', 'Adds a measured sample of powder.'],
    /* The head is one part in the art, so it answers for the whole assembly
       it carries rather than claiming to be any one of them. */
    'head':      ['Sample head', 'Carries the water nozzle, the powder chute and the probe.']
  };

  var DEFAULT_ID = ['No selection', 'Select an object to identify it.'];

  /* ---- the engine ------------------------------------------------------- */

  function makeSim(key) {
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
        breakChance: SUBSTANCE[key].breakChance
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
  function paletteFor(key) {
    return function () {
      var cs = getComputedStyle(document.documentElement);
      function v(n) { return cs.getPropertyValue(n).trim(); }
      return {
        kinds: {
          solvent: { base: v('--p-water'), lit: v('--p-water-lit'), dim: v('--p-water-dim') },
          solute:  { base: v('--p-' + key), lit: v('--p-' + key + '-lit'),
                     dim: v('--p-' + key + '-dim') }
        },
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
          'aria-label="Magnified view of ' + SUBSTANCE[station].label.toLowerCase() +
          ' in water"></canvas>' +
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
      'nameplate-{s}': { make: function (node, id, station) {
        node.dataset.id = 'nameplate-' + station;
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

  function start(instrument) {
    inst = instrument;

    STATIONS.forEach(function (key) {
      var st = {
        key: key,
        sim: makeSim(key),
        lens: new PS.Lens($('lens-' + key), { palette: paletteFor(key), groups: GROUPS }),
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
        clouds: SUBSTANCE[key].clouds,
        turb: 0, everStirred: false, level: 0, pileAt: 1
      };
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
    notebook = new Notebook({ root: $('notebook'), bus: bus, say: say });

    inst.onResize = resize;
    resize();
    identify(null);           // the readout starts at its default, not blank
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
      /* The model, for checking determinism and for running a sample far
         enough forward to see something without waiting for the display. */
      player: player,
      sims: stations,
      read: function () {
        var out = { state: state, stateT: +stateT.toFixed(3), frozen: frozen,
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
    if (!stirring) bus.emit('stirStarted', {});
    stirring = true;
    STATIONS.forEach(function (k) {
      var st = stations[k];
      if (!st.clouds) return;
      st.everStirred = true;
      st.turb = Math.min(TURBIDITY.cap, st.turb + TURBIDITY.stirStep);
    });
  }

  function setFrozen(on) {
    setFrozenSilently(on);
    if (on) { player.pause(); say('Simulation frozen.', true); bus.emit('frozen', {}); }
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
      bus.emit('fillComplete', {});
      STATIONS.forEach(function (k) { stations[k].pour.show(false); });
    }

    if (next === 'resetting') {
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
      var spin = Math.max(stations.sugar.sim.stirProgress().strength,
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
          bus.emit('particleFreed', { substance: k, count: free });
          if (free === SOLUTE) bus.emit('allDissolved', { substance: k, count: free });
        }
        lastFree[k] = free;
        /* The mound is gone while there is water, and comes back as the
           water leaves: that is the solute arriving back out of solution. */
        st.pileAt = 1 - boilLevel;
      });

      var strength = stations.sugar.sim.stirProgress().strength;
      if (stirring && strength <= 0.001) { stirring = false; bus.emit('stirEnded', {}); }
    }
  }

  /* Boiling.

     Held at 100 C the water goes, and what was dissolved in it has nowhere
     left to stay: the solute comes back out onto the heap. That is the thing
     worth seeing — dissolving did not destroy the sugar, and here it is
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
    bus.emit('boiledDry', {});
    enter('loaded');
  }

  /* Cloudiness, per station. Only a solid that will not dissolve has any:
     once it has been stirred up it settles slowly toward a faint haze and
     never returns to clear while there is water in the beaker. */
  function turbidity(st, dt) {
    if (!st.clouds || !st.everStirred) return;
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
    keys.stir.set(stations.sugar.sim.stirProgress().strength > 0.001);
    /* And it goes dim while the hand has nothing left. A deliberate stirrer
       never sees this — three strokes are there from the start and one comes
       back every 8 s — but a cap that presses and does nothing reads as a
       broken button rather than as an arm that is tired. */
    keys.stir.enable(stations.sugar.sim.stirLeft >= 1);

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
      say(freeOf('sugar') + ' of ' + SOLUTE + ' sugar particles and ' +
          freeOf('caco3') + ' of ' + SOLUTE + ' calcium carbonate particles have ' +
          'dissolved after ' + (player.lead().frame / 60).toFixed(0) + ' seconds.');
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
    var pal = paletteFor(st.key)();

    g.clearRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = pal.bg;
    g.fillRect(0, 0, w, h);

    var p = st.sim.particles;
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
        var hit = particleAt(st, e.clientX, e.clientY);
        if (!hit) return;
        identify(nameFor(st, hit.p));
        bus.emit('particleSelected', {
          substance: hit.p.kind === 'solute' ? k : 'water',
          index: hit.i,
          buried: hit.p.kind === 'solute' && hit.p.fixed && !hit.p.exposed
        });
      });
    });
  }

  function particleAt(st, clientX, clientY) {
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
    if (st.key === 'caco3') return 'particle-caco3';
    return particle.fixed ? 'particle-sugar-pile' : 'particle-sugar-free';
  }

  /* ---- small helpers ---------------------------------------------------- */

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
