/* ==========================================================================
   particle-sim — drawing and playback.

   Lens renders one simulation into a circular canvas. Player owns the clock,
   the transport controls and the timeline, across however many lenses are on
   screen. Neither knows what the particles represent.
   ========================================================================== */

(function (global) {
  'use strict';

  var PS = global.ParticleSim;

  /* One sphere, one size, perfectly sharp. The world is flat everywhere
     except here: the sphere is the single modelled object on the plate, the
     way it is on a Modern Plastics cover. No depth tiers, no defocus —
     nothing recedes, because nothing is in perspective. */
  function makeSprite(px, base, lit, dim) {
    var dpr = window.devicePixelRatio || 1;
    var half = px + 1;
    var size = Math.max(8, Math.ceil(half * 2 * dpr));

    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var cen = size / 2, r = px * dpr;
    var lx = cen - r * 0.34, ly = cen - r * 0.42;

    // Body: lit shoulder, saturated core, dark terminator.
    var body = g.createRadialGradient(lx, ly, r * 0.04, cen, cen + r * 0.1, r * 1.22);
    body.addColorStop(0, lit);
    body.addColorStop(0.34, base);
    body.addColorStop(1, dim);
    g.beginPath();
    g.arc(cen, cen, r, 0, Math.PI * 2);
    g.fillStyle = body;
    g.fill();

    // Bounce light along the lower-right limb: what stops a sphere reading
    // as a flat disc with a dot on it.
    var bounce = g.createRadialGradient(cen + r * 0.42, cen + r * 0.5, 0,
                                        cen + r * 0.42, cen + r * 0.5, r * 0.78);
    bounce.addColorStop(0, 'rgba(255,255,255,.26)');
    bounce.addColorStop(1, 'rgba(255,255,255,0)');
    g.save();
    g.beginPath();
    g.arc(cen, cen, r, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = bounce;
    g.fillRect(0, 0, size, size);
    g.restore();

    // Hard specular. These covers never use a soft bloom; it is a small,
    // bright, almost-clipped highlight with a tight falloff.
    var spec = g.createRadialGradient(lx, ly, 0, lx, ly, r * 0.30);
    spec.addColorStop(0, 'rgba(255,255,255,1)');
    spec.addColorStop(0.35, 'rgba(255,255,255,.85)');
    spec.addColorStop(0.72, 'rgba(255,255,255,.12)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    g.beginPath();
    g.arc(lx, ly, r * 0.30, 0, Math.PI * 2);
    g.fillStyle = spec;
    g.fill();

    c.halfCss = half;
    return c;
  }

  /* Ringing forty particles makes a band, not an emphasis. Past this many,
     dimming everything else is the clearer signal on its own. */
  var RING_LIMIT = 18;
  var DIM = 0.35;

  /* Optical grain. Every real objective has some: sensor noise, dust on the
     glass, scatter in the medium. A perfectly clean field is the one thing
     that always reads as a render. Built once per lens, tiled as a pattern.
     Math.random is fine here — this never touches the simulation. */
  function makeGrain(size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var img = g.createImageData(size, size);
    for (var i = 0; i < img.data.length; i += 4) {
      // Half dark speckle, half light, each with its own low alpha. A
      // mid-grey tile under an overlay blend is mathematically identity,
      // which is how the first attempt at this managed to render nothing.
      var v = Math.random() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 42;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function Lens(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;              // { palette(), groups }
    this.sim = opts.sim || null;
    this.sprites = {};
    this.grain = makeGrain(96);
    this.w = this.h = 0;
  }

  Lens.prototype.setSim = function (sim) { this.sim = sim; };

  Lens.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var dpr = window.devicePixelRatio || 1;
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.pal = this.opts.palette();
    this.rad = Math.min(this.w, this.h) / 2;

    /* One sprite per kind, at that kind's own size. `pr` stays as the
       largest of them: it only sets line weights, and a hairline scaled to
       the smallest species disappears next to the largest. */
    this.sprites = {};
    this.prOf = {};
    this.pr = 0;
    for (var kind in this.pal.kinds) {
      var k = this.pal.kinds[kind];
      var pr = (this.sim ? this.sim.radiusOf(kind) : 0.052) * this.rad;
      this.prOf[kind] = pr;
      this.pr = Math.max(this.pr, pr);
      this.sprites[kind] = makeSprite(pr, k.base, k.lit, k.dim);
    }
  };

  Lens.prototype.draw = function (highlight, bonds) {
    if (!this.w || !this.sim) return;
    var ctx = this.ctx, w = this.w, h = this.h;
    var cx = w / 2, cy = h / 2, rad = this.rad, pr = this.pr;
    var p = this.sim.particles, i, q;
    var test = highlight && this.opts.groups[highlight];

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = this.pal.bg;
    ctx.fillRect(0, 0, w, h);

    if (bonds) {
      // Bonds are drawn between fixed particles, so the solid's own size
      // sets how far a neighbour counts as bonded.
      var bondR = p.length ? p[0].r : this.sim.cfg.particleRadius;
      var reach = bondR * this.sim.cfg.exposureReach;
      var reach2 = reach * reach;
      ctx.strokeStyle = this.pal.bond;
      ctx.lineWidth = Math.max(1.5, pr * 0.22);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (i = 0; i < p.length; i++) {
        if (!p[i].fixed) continue;
        for (var j = i + 1; j < p.length; j++) {
          if (!p[j].fixed) continue;
          var dx = p[j].x - p[i].x, dy = p[j].y - p[i].y;
          if (dx * dx + dy * dy > reach2) continue;
          ctx.moveTo(cx + p[i].x * rad, cy + p[i].y * rad);
          ctx.lineTo(cx + p[j].x * rad, cy + p[j].y * rad);
        }
      }
      ctx.stroke();
    }

    /* Hydration links. Without them a caged solute is just another dot in a
       field of solvent, and the cage — the whole point of the physics — is
       invisible. Drawn under the particles so they read as attachment, not
       as a diagram laid over the top. */
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = this.pal.link || this.pal.bond;
    ctx.lineWidth = Math.max(1, pr * 0.24);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (i = 0; i < p.length; i++) {
      if (p[i].host < 0 || p[i].gone) continue;
      var h0 = p[p[i].host];
      if (!h0) continue;
      ctx.moveTo(cx + p[i].x * rad, cy + p[i].y * rad);
      ctx.lineTo(cx + h0.x * rad, cy + h0.y * rad);
    }
    ctx.stroke();
    ctx.restore();

    var marked = [];
    for (i = 0; i < p.length; i++) {
      q = p[i];
      if (q.gone) continue;   // boiled off
      var on = !test || test(q);
      if (test && on) marked.push(q);
      ctx.globalAlpha = on ? 1 : DIM;
      var sprite = this.sprites[q.kind];
      if (!sprite) continue;
      var sh = sprite.halfCss;
      ctx.drawImage(sprite, cx + q.x * rad - sh, cy + q.y * rad - sh, sh * 2, sh * 2);
    }
    ctx.globalAlpha = 1;

    if (test && marked.length && marked.length <= RING_LIMIT) {
      ctx.strokeStyle = this.pal.ring;
      ctx.lineWidth = Math.max(2, pr * 0.28);
      for (i = 0; i < marked.length; i++) {
        var markR = (this.prOf[marked[i].kind] || pr) * 1.35;
        ctx.beginPath();
        ctx.arc(cx + marked[i].x * rad, cy + marked[i].y * rad, markR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    this.grainOver(ctx, w, h);

    /* The stirrer, inside the field of view and nowhere else. It is huge,
       far out of focus, and it sweeps through rather than spinning: the bowl
       travels a circle while the spoon holds its orientation. The phase comes
       from the model, so anything else reading the same phase — a spoon drawn
       over the beaker, say — moves on the same stroke. */
    var stir = this.sim.stirProgress ? this.sim.stirProgress() : null;
    if (stir && stir.strength > 0.001) {
      /* The three cues that say "this is orbiting, not sliding": at the far
         side of the circle it is smaller, fainter and softer; at the near side
         it swells, brightens and sharpens. One number drives all three, so
         they can never disagree. */
      var d = stir.depth;
      var size = 0.50 + 0.26 * d;
      /* The same reach the flow circulates about, so the bar and the current
         it drives are the same stroke rather than two that merely look alike. */
      var reach = this.sim.cfg.stirReach;
      var sx = cx + stir.x * rad * reach;
      var sy = cy + stir.y * rad * reach;
      ctx.save();
      ctx.globalAlpha = (0.26 + 0.34 * d) * stir.strength;
      ctx.filter = 'blur(' + Math.max(8, rad * (0.16 - 0.05 * d)) + 'px)';
      ctx.fillStyle = this.pal.stirrer || this.pal.rim;
      ctx.beginPath();
      ctx.ellipse(sx, sy, rad * size, rad * size * 1.26, 0, 0, Math.PI * 2);
      ctx.fill();
      // handle, running out past the edge of the field
      var hw = rad * size * 0.30, tw = rad * size * 0.185;
      ctx.beginPath();
      ctx.moveTo(sx - hw, sy - rad * size * 0.73);
      ctx.lineTo(sx - tw, sy - rad * size * 4.2);
      ctx.lineTo(sx + tw, sy - rad * size * 4.2);
      ctx.lineTo(sx + hw, sy - rad * size * 0.73);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    this.optics(ctx, cx, cy, rad, w, h);
  };

  /* The objective's own grain. Shared with the activity's dry frame for the
     same reason the eyepiece is: a texture that is only there while the model
     is running is not a property of the instrument, and switching between the
     two canvases made it appear and disappear. Drawn inside whatever clip the
     caller has set, because it belongs to the field and not to the plate. */
  Lens.prototype.grainOver = function (ctx, w, h) {
    var pat = ctx.createPattern(this.grain, 'repeat');
    if (!pat) return;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /* The eyepiece: everything between the specimen and the eye, and nothing
     that depends on what the specimen is. Vignette, reticle, scale bar, the
     colour fringe at the field stop and the rim.

     Split out of draw() because the activity has a second canvas — a dry
     frame for the states with no water to simulate — and an eyepiece that is
     only there while the model is running is not an eyepiece. It reads as the
     overlay coming and going. Call it with nothing clipped; it clips for the
     parts that belong inside the field and releases that before the rim. */
  Lens.prototype.optics = function (ctx, cx, cy, rad, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.clip();

    /* Vignetting. No objective lights its field evenly to the edge, and this
       is the cheapest, strongest thing that stops a circle reading as a circle
       drawn on a page. Black rather than the ground colour, because real
       vignetting darkens whatever theme you are in. */
    var vig = ctx.createRadialGradient(cx, cy, rad * 0.52, cx, cy, rad);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.72, 'rgba(0,0,0,.10)');
    vig.addColorStop(1, 'rgba(0,0,0,.46)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    /* The reticle is etched on the eyepiece, not floating in the specimen, so
       it is drawn after the vignette and never dimmed by it. */

    // Hairline crosshair with a clear centre, and ticks round the barrel.
    ctx.strokeStyle = this.pal.hair;
    ctx.lineWidth = 1;
    var gap = rad * 0.10;
    ctx.beginPath();
    ctx.moveTo(cx - rad, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + rad, cy);
    ctx.moveTo(cx, cy - rad); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + rad);
    ctx.stroke();

    ctx.beginPath();
    for (var a = 0; a < 360; a += 7.5) {
      var rad1 = (a % 30 === 0) ? rad * 0.93 : rad * 0.965;
      var t = a * Math.PI / 180;
      ctx.moveTo(cx + Math.cos(t) * rad1, cy + Math.sin(t) * rad1);
      ctx.lineTo(cx + Math.cos(t) * rad, cy + Math.sin(t) * rad);
    }
    ctx.stroke();

    /* The scale bar. The activity owns what one is worth, because the engine
       has no idea what its particles are. It replaces the magnification chip
       the plate used to carry, which claimed a number that was never right. */
    var sc = this.opts.scale;
    if (sc) {
      /* Sat just under the left arm of the crosshair, where the field is only
         ever sparse solvent. The lower quadrants are where the heap lives, and
         a scale bar buried in the pile is no scale bar. Its own colour,
         because the hairlines are deliberately faint and a label a reader has
         to decipher is not a label. */
      var rc = this.pal.reticle || this.pal.rim;
      var barW = rad * sc.fraction;
      var bx = cx - rad * 0.80, by = cy + rad * 0.19, serif = Math.max(3, rad * 0.024);
      ctx.strokeStyle = rc;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + barW, by);
      ctx.moveTo(bx, by - serif); ctx.lineTo(bx, by + serif);
      ctx.moveTo(bx + barW, by - serif); ctx.lineTo(bx + barW, by + serif);
      ctx.stroke();
      ctx.fillStyle = rc;
      ctx.font = '700 ' + Math.max(11.5, rad * 0.062) + 'px ' + (this.pal.font || 'sans-serif');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(sc.label, bx + barW / 2, by - serif - 2);
    }

    ctx.restore();

    /* Chromatic aberration at the field stop. Two arcs a pixel apart, one
       warm one cool: what every objective does at the edge of its field, and
       what no rendered circle does by accident. */
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(126,176,255,.34)';
    ctx.beginPath(); ctx.arc(cx, cy - 1, rad - 4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,150,92,.28)';
    ctx.beginPath(); ctx.arc(cx, cy + 1, rad - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, rad - 2, 0, Math.PI * 2);
    ctx.strokeStyle = this.pal.rim;
    ctx.lineWidth = 4;
    ctx.stroke();
  };


  /* ---------------------------------------------------------------------- */

  /* Owns the clock and the transport. The activity tells it which sims and
     lenses are live, and what decoration the current walkthrough step wants. */
  function Player(opts) {
    this.o = opts;                 // { els, duration, decor(), onFrame() }
    this.sims = [];
    this.lenses = [];
    this.playing = false;
    this.acc = 0;
    this.last = 0;

    // A surface may present this as a running simulation rather than a
    // player, in which case it ships no transport at all.
    var self = this, e = opts.els;
    if (e.playBtn) e.playBtn.addEventListener('click', function () { self.toggle(); });
    if (e.resetBtn) e.resetBtn.addEventListener('click', function () { self.reset(); });
    if (e.stirBtn) e.stirBtn.addEventListener('click', function () { self.stir(); });
    if (e.scrub) {
      e.scrub.addEventListener('input', function () {
        self.pause();
        self.seek(parseInt(e.scrub.value, 10));
      });
      e.scrub.max = opts.duration;
    }
  }

  Player.prototype.setActive = function (sims, lenses) {
    this.sims = sims;
    this.lenses = lenses;
    for (var i = 0; i < lenses.length; i++) lenses[i].setSim(sims[i]);
  };

  Player.prototype.lead = function () { return this.sims[0]; };

  Player.prototype.resize = function () {
    for (var i = 0; i < this.lenses.length; i++) this.lenses[i].resize();
    this.render();
  };

  Player.prototype.render = function () {
    var d = this.o.decor();
    for (var i = 0; i < this.lenses.length; i++) {
      this.lenses[i].draw(d.highlight, d.bonds);
    }
    this.o.onFrame();
  };

  /* No end. A simulation that stops dead at a duration is a video with extra
     steps, and this surface ships no transport to scrub back from. cfg.duration
     survives only to clamp the ?t= deep link. */
  Player.prototype.play = function () {
    this.playing = true;
    this.last = performance.now();
    if (this.o.els.playBtn) {
      this.o.els.playBtn.setAttribute('aria-pressed', 'true');
      this.o.els.playBtn.classList.add('is-playing');
    }
    if (this.o.els.playLabel) this.o.els.playLabel.textContent = 'Pause';
    var self = this;
    requestAnimationFrame(function (t) { self.tick(t); });
  };

  Player.prototype.pause = function () {
    this.playing = false;
    if (this.o.els.playBtn) {
      this.o.els.playBtn.setAttribute('aria-pressed', 'false');
      this.o.els.playBtn.classList.remove('is-playing');
    }
    if (this.o.els.playLabel) this.o.els.playLabel.textContent = 'Play';
  };

  Player.prototype.toggle = function () { this.playing ? this.pause() : this.play(); };

  Player.prototype.tick = function (now) {
    if (!this.playing) return;
    var dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;

    var step = this.sims[0].cfg.dt, guard = 0;
    while (this.acc >= step && guard < 8) {
      for (var i = 0; i < this.sims.length; i++) this.sims[i].step();
      this.acc -= step;
      guard++;
    }

    if (this.o.els.scrub) this.o.els.scrub.value = this.lead().frame;
    this.render();

    var self = this;
    requestAnimationFrame(function (t) { self.tick(t); });
  };

  Player.prototype.seek = function (frame) {
    for (var i = 0; i < this.sims.length; i++) this.sims[i].seek(frame);
    if (this.o.els.scrub) this.o.els.scrub.value = this.lead().frame;
    this.render();
  };

  /* Reset puts the run back to zero; it does not stop it. A surface with no
     Play button has nothing to offer a student who resets into a frozen
     field, and the clock is dropped rather than carried so the first frame
     after a reset is a frame, not a catch-up burst. */
  Player.prototype.reset = function () {
    for (var i = 0; i < this.sims.length; i++) this.sims[i].reset();
    this.acc = 0;
    this.last = performance.now();
    if (this.o.els.scrub) this.o.els.scrub.value = 0;
    this.render();
  };

  /* Reports whether a stroke actually began. Every sim is asked, never
     short-circuited, so two stations stay in step; the answer is true if any
     of them took it. A caller that does more than start the stroke — the
     activity raises turbidity and narrates per press — needs to know, or a
     refused press still clouds the water. */
  Player.prototype.stir = function () {
    var began = false;
    for (var i = 0; i < this.sims.length; i++) {
      if (this.sims[i].stir()) began = true;
    }
    if (!this.playing) this.play();
    return began;
  };

  PS.Lens = Lens;
  PS.Player = Player;
})(window);
