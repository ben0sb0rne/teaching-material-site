#!/usr/bin/env node
/* The determinism check the project rule asks for, plus the boil's invariant.
 *
 * Stepping to frame N must equal seeking to frame N, with heat and a boil in
 * the middle, because that is what makes a timeline scrubbable and two
 * students' runs a fair test. And boiling dry must leave every solute
 * particle, at a real position: the water goes, the solid does not.
 *
 *     node tools/check-sim.js
 */

const fs = require('fs');
const path = require('path');

const SIM = path.join(__dirname, '..', 'src', 'engines', 'particle-sim', 'sim.js');
const window = {};
new Function('window', fs.readFileSync(SIM, 'utf8'))(window);
const { Sim, rules } = window.ParticleSim;

/* The schematic build Explore Dissolving runs on. */
const CFG = {
  seed: 20250826, radius: 1, particleRadius: 0.052,
  radii: { solvent: 0.0662739322533137, solute: 0.0662739322533137 },
  speed: 0.62, jitter: 0.12, sediment: 'solute', stirSwirl: 0.35,
  /* The activity lets a particle's centre reach the wall, so half of it sits
     outside and the round viewport clips it. Without this the field tidies
     itself inside a smaller circle and every radius measured here is wrong
     about what ships. */
  overhang: 1,
  onImpact: rules.dissolve({ solvent: 'solvent', breakChance: 0.05 })
};
const SOLUTE = 50, SOLVENT = 70;
const HOT = 300, BOIL_FROM = 600, BOIL_OVER = 900;

function build() {
  const s = new Sim(CFG);
  s.packPile('solute', SOLUTE);        // no rng, so it goes first
  s.fillRandom('solvent', SOLVENT);
  return s;
}

/* One frame, driven the way the activity drives it. Keyed to the frame
   number and not to elapsed time, so two runs do the same thing. */
function frame(s, f) {
  s.heat = f > HOT ? 2.3 : 1;
  s.step();
  if (f <= BOIL_FROM || f % 30) return;
  const went = Math.min(1, (f - BOIL_FROM) / BOIL_OVER);
  const gone = s.count(q => q.gone);
  const wantGone = Math.round(SOLVENT * went);
  if (wantGone > gone) s.evaporate(wantGone - gone);
  const canHold = Math.round(SOLUTE * (1 - went));
  const free = s.count(q => q.kind === 'solute' && !q.fixed);
  if (free > canHold) s.settle(free - canHold);
}

function run(s, from, to, marks) {
  const shots = {};
  for (let f = from; f < to; f++) {
    frame(s, f);
    if (marks && marks.has(f + 1)) shots[f + 1] = s.capture();
  }
  return shots;
}

function diff(a, b) {
  let maxDiff = 0, nonFinite = 0, flagDiff = 0;
  for (let i = 0; i < a.xs.length; i++) {
    maxDiff = Math.max(maxDiff, Math.abs(a.xs[i] - b.xs[i]));
    if (!isFinite(a.xs[i])) nonFinite++;
  }
  for (let i = 0; i < a.flags.length; i++) if (a.flags[i] !== b.flags[i]) flagDiff++;
  for (let i = 0; i < a.freed.length; i++) if (a.freed[i] !== b.freed[i]) flagDiff++;
  return { maxDiff, nonFinite, flagDiff, rngSame: a.rng === b.rng, heat: a.heat === b.heat };
}

const CFG_DURATION = new Sim(CFG).cfg.duration;
const fails = [], open = [];
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log('  %s %s %s', ok ? 'ok  ' : 'FAIL', name.padEnd(30), JSON.stringify(got));
  if (!ok) fails.push(name + ': wanted ' + JSON.stringify(want));
}

/* A target that is not met yet and is known not to be. It prints, so the
   number is in front of whoever runs this, but it does not fail the run —
   otherwise the one thing still open hides every regression behind it. */
function pending(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log('  %s %s %s', ok ? 'MET ' : 'open', name.padEnd(30), JSON.stringify(got));
  if (!ok) open.push(name + ': wanted ' + JSON.stringify(want));
}

const MARKS = new Set([900, 1200, 1500]);
const clean = { maxDiff: 0, nonFinite: 0, flagDiff: 0, rngSame: true, heat: true };

console.log('stepping to N equals seeking to N');
const whole = run(build(), 0, 1600, MARKS);
for (const n of MARKS) check('frame ' + n, diff(whole[n], run(build(), 0, n, new Set([n]))[n]), clean);

/* And a snapshot taken mid-boil, restored, carries the boil's own state. */
const resumed = build();
run(resumed, 0, 900);
resumed.restore(whole[900]);
run(resumed, 900, 1200);
check('restore 900, run to 1200', diff(whole[1200], resumed.capture()), clean);

console.log('boiled dry leaves the solid behind');
const end = build();
run(end, 0, 1600);
const solute = end.particles.filter(q => q.kind === 'solute');
const water = end.particles.filter(q => q.kind === 'solvent');
check('solute still there', solute.filter(q => !q.gone).length, SOLUTE);
check('solute back on the heap', solute.filter(q => q.fixed && !q.gone).length, SOLUTE);
check('solute at a real position', solute.filter(q => !isFinite(q.x) || !isFinite(q.y)).length, 0);
check('water gone', water.filter(q => q.gone).length, SOLVENT);

/* ---- the heap a boil leaves behind -------------------------------------
 *
 * Compared as a SET of positions, because the particles are identical spheres:
 * which one ends in which slot is not something a student can see, and only
 * the shape of the pile is. */
console.log('the recovered pile is the pile it started as');
function positions(s) { return s.particles.filter(q => q.kind === 'solute').map(q => ({ x: q.x, y: q.y })); }
function slotKey(q) { return q.x.toFixed(4) + ',' + q.y.toFixed(4); }
function worstGap(from, to) {
  let worst = 0;
  for (const a of from) {
    let best = Infinity;
    for (const b of to) best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y));
    worst = Math.max(worst, best);
  }
  return worst;
}

const fresh = build();
const startAt = positions(fresh);
const startKeys = new Set(startAt.map(slotKey));
const boiled = build();
run(boiled, 0, 2600);                     // well past dry, so every glide has landed
const endAt = positions(boiled);
check('every slot refilled', endAt.filter(q => startKeys.has(slotKey(q))).length, SOLUTE);
check('no slot left empty', +worstGap(startAt, endAt).toFixed(4), 0);

/* ---- stirring mixes, it does not spin the field ------------------------
 *
 * A stir has to look different from heat — one shared circulation rather than
 * harder jitter — and then let go. Beyond 0.75 of the radius is 44% of the
 * area, so a field that has gone back to behaving like particles puts about
 * that share there.
 *
 * The regime that matters is TAPPING: a student presses Stir every few
 * seconds. Holding it down continuously is measured too, and is the case
 * `spinDrain` does not fix. */
console.log('stirring mixes the field, then lets go of it');
function fieldShape(s, kind) {
  const f = s.particles.filter(q => !q.fixed && !q.gone && (!kind || q.kind === kind));
  const rad = f.map(q => Math.hypot(q.x, q.y));
  let tan = 0, tot = 0;
  for (const q of s.particles.filter(q => !q.fixed && !q.gone)) {
    const d = Math.hypot(q.x, q.y) || 1e-9;
    tan += (-q.y / d) * q.vx + (q.x / d) * q.vy;
    tot += Math.hypot(q.vx, q.vy);
  }
  return { meanRadius: rad.reduce((a, b) => a + b, 0) / rad.length,
           outerShare: rad.filter(v => v > 0.75).length / rad.length,
           circulation: tan / (tot || 1e-9) };
}
function stirFor(everyFrames, seconds, heat) {
  const s = build();
  for (let f = 0; f < 900; f++) s.step();
  if (heat) s.heat = heat;
  for (let f = 0; f < seconds * 60; f++) { if (f % everyFrames === 0) s.stir(); s.step(); }
  return s;
}
const atRest = fieldShape(build(), 'solute');
for (let f = 0; f < 900; f++) {}
const tap8 = fieldShape(stirFor(480, 30), 'solute');
const tap3 = fieldShape(stirFor(180, 30), 'solute');
const held = fieldShape(stirFor(60, 30), 'solute');
const show = (n, v) => console.log('     %s solute: meanRadius %s  outerShare %s  circulation %s',
  n.padEnd(22), v.meanRadius.toFixed(3), v.outerShare.toFixed(3), v.circulation.toFixed(3));
show('tap every 8 s', tap8);
show('tap every 3 s', tap3);
show('held continuously', held);

/* Tapping is the real regime, and these are what spinDrain achieves there. */
check('tapping does not spin it', tap8.circulation <= 0.20, true);
check('tapping leaves it even', tap8.outerShare <= 0.50, true);
check('faster tapping still even', tap3.outerShare <= 0.58, true);

check('held stir stays even', held.outerShare <= 0.50, true);

/* outerShare is kept because it is cheap and it caught the original fault,
   but it is NOT the bar. It is a cumulative dose that never drains and it
   divides by the number of freed grains, so throttling the stir frees fewer
   grains, leaves the survivors sitting at the rim and pushes the number UP:
   measured, a six-second lockout made the lesson's own 8 s rhythm worse,
   0.444 to 0.600. Coherent rotation is the thing a student sees and the
   thing that behaves, so these three are the real guard. Four different
   designs passed the outerShare bar by making strokes weak or refusing them
   outright; each one of them fails below. */
console.log('a stir is a current, at every rhythm a student can produce');

function circulationOf(s) {
  let tan = 0, tot = 0;
  for (const q of s.particles.filter(q => !q.fixed && !q.gone)) {
    const d = Math.hypot(q.x, q.y) || 1e-9;
    tan += (-q.y / d) * q.vx + (q.x / d) * q.vy;
    tot += Math.hypot(q.vx, q.vy);
  }
  return tan / (tot || 1e-9);
}

/* 1. No press rhythm may leave the field a rotating solid body. Unthrottled
      this peaked at 0.835, which is what "they don't behave like particles"
      was describing. */
let worstCirc = 0, worstAt = '';
for (const r of [1, 2, 5, 10, 20, 30, 45, 60, 80, 96, 120, 180, 240, 300, 480]) {
  const c = Math.abs(circulationOf(stirFor(r, 30)));
  if (c > worstCirc) { worstCirc = c; worstAt = 'every ' + r + ' frames'; }
}
console.log('     worst coherent rotation: %s   (%s)', worstCirc.toFixed(3), worstAt);
check('no rhythm spins it solid', worstCirc <= 0.20, true);

/* 2. A LATER stroke must read as a current too. Throttling designs that
      weaken the stroke instead of spacing it pass every other check here and
      die on this one: the student judges it by their second press, not their
      first. */
const later = build();
for (let f = 0; f < 900; f++) later.step();
const peakNow = () => {
  let p = 0;
  for (let f = 0; f < 96; f++) { later.step(); p = Math.max(p, circulationOf(later)); }
  return p;
};
later.stir(); const firstPeak = peakNow();
for (let f = 0; f < 300; f++) later.step();          // a real five-second pause
later.stir(); const laterPeak = peakNow();
console.log('     first stroke %s, a stroke after a 5 s pause %s',
            firstPeak.toFixed(3), laterPeak.toFixed(3));
check('a later stroke is still a current', laterPeak >= 0.70, true);

/* 3. The lesson's own claim. A throttle that goes too far ends with a
      stirred beaker dissolving exactly what still water does, which teaches
      the opposite of the science. Measured: still 16, stirred 24, hot 35. */
function freedAfter(seconds, every) {
  const s = build();
  for (let f = 0; f < 900; f++) s.step();
  const before = s.count(q => q.kind === 'solute' && !q.fixed && !q.gone);
  for (let f = 0; f < seconds * 60; f++) {
    if (every && f % every === 0) s.stir();
    s.step();
  }
  return s.count(q => q.kind === 'solute' && !q.fixed && !q.gone) - before;
}
const stillFreed = freedAfter(20, 0);
const stirFreed = freedAfter(20, 180);
const eagerFreed = freedAfter(20, 60);
console.log('     dissolved in 20 s — still %d, stirred %d, leaned on %d',
            stillFreed, stirFreed, eagerFreed);
check('stirring still beats still water', stirFreed > stillFreed, true);
check('leaning on it beats still water', eagerFreed > stillFreed, true);

/* And it must still read as one flow while the stroke is running, or the
   heat-versus-stir distinction the activity is built on goes with it. */
const mid = build();
for (let f = 0; f < 900; f++) mid.step();
mid.stir();
let peak = 0;
for (let f = 0; f < 96; f++) { mid.step(); peak = Math.max(peak, fieldShape(mid).circulation); }
console.log('     peak circulation during one stroke: %s   (heat alone gives about 0.03)', peak.toFixed(3));
check('a stroke still reads as one flow', peak >= 0.70, true);

/* A lesson is fifty minutes, not sixty seconds. The timeline cannot reach
   past `duration`, so the snapshot ring must stop growing there — otherwise a
   tab left open all period quietly accumulates state nothing can restore. And
   seeking back from far beyond it must still land exactly where a fresh run
   does, which is the thing the cap could have broken. */
console.log('a long run does not hoard snapshots it cannot use');
const long = build();
for (let f = 0; f < 180000; f++) long.step();      // 50 minutes
check('snapshots stop at duration', long.snaps.length,
      CFG_DURATION / 60 + 1);
long.seek(1000);
const ref1k = build();
for (let f = 0; f < 1000; f++) ref1k.step();
check('seeking back from frame 180000 is exact',
      Math.max(...long.particles.map((q, i) =>
        Math.abs(q.x - ref1k.particles[i].x) +
        Math.abs(q.y - ref1k.particles[i].y))), 0);

/* The notebook's reading.
 *
 * The activity takes one reading per run, at fifteen seconds, and writes it
 * in a table two students compare. It reads the count off the snapshot ring
 * rather than off the live field, because the Player takes up to eight model
 * steps per display frame — a reading taken when a frame happens to notice
 * would depend on how the browser paced its frames.
 *
 * So: the snapshot at frame 900 has to exist, agree with the live field at
 * frame 900, and be the same number on a fresh run of the same sample. */
const READ_AT = 900;
const freeAt = s => s.countAt(READ_AT, q => q.kind === 'solute' && !q.fixed);

const liveAt900 = build();
for (let f = 0; f < READ_AT; f++) liveAt900.step();
const live = liveAt900.count(q => q.kind === 'solute' && !q.fixed);
for (let f = READ_AT; f < READ_AT + 40; f++) liveAt900.step();   // run past it
check('the 15 s reading survives running past it', freeAt(liveAt900), live);

const readA = build(), readB = build();
for (let f = 0; f < READ_AT + 120; f++) { readA.step(); readB.step(); }
check('two fresh runs read the same at 15 s', freeAt(readA), freeAt(readB));
check('the 15 s reading is a real count', freeAt(readA) > 0 && freeAt(readA) < SOLUTE, true);

// Only multiples of snapEvery are captured; anything else must say so.
check('an uncaptured frame reads null', readA.countAt(READ_AT + 1, () => true), null);

if (open.length) {
  console.log('\n%d target(s) still open — the stir still concentrates grains at the rim:', open.length);
  open.forEach(f => console.log('  ' + f));
}
if (fails.length) {
  console.log('\n%d check(s) FAILED:', fails.length);
  fails.forEach(f => console.log('  ' + f));
  process.exit(1);
}
console.log('\nno regressions');
