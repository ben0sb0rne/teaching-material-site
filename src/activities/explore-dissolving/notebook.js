/* ==========================================================================
   The lab notebook.

   Three pages of typed items. Each item is data: it names the event (or
   events) on the activity's bus that complete it, an optional condition on
   them, and the line it writes into that page's Observations. Nothing here
   knows what dissolving is.

   Three item types, and only three:

     observe     completes when its trigger fires
     prediction  a choice is committed first; the trigger completes it
     choice      completes on the pick, or on the correct pick

   The four types the first draft of this called for — fill-in-the-blank,
   claim-evidence-reasoning, a free-text note and a self-rating — are the
   four where the student is writing rather than observing, and they are on
   the paper exit ticket instead. A text box in a simulation is a worse
   place to argue than a table of students is.

   `tags` are for the teacher, not the student: a 5E phase and a learning
   goal per item. They are never rendered. docs/lesson-day2.md is where they
   are read.
   ========================================================================== */

(function (global) {
  'use strict';

  /* Each item:
       id          stable, for completion tracking
       type        'observe' (the default), 'prediction' or 'choice'
       challenge   true to sit under Challenges rather than in the main list
       text        what the student reads
       choices     labels, for 'prediction' and 'choice'
       correct     index of the right one; omit when there is no wrong answer
       min         for 'choice': how many must be picked (default 1)
       nudge       shown under a wrong pick; the item stays open
       trigger     { event, when(detail, state) } — when() is optional
       all         several triggers; the item completes when every one has
                   fired, in any order
       vars        (details, state) -> substitutions for {braces} in the
                   completion line. `details` is one matched event detail per
                   trigger, in the order they are listed.
       completion  the line written into Observations
  */
  var CONTENT = {
    pages: [
      {
        id: 'lab',
        title: 'Lab',
        items: [
          /* First, because the zoom is the first thing on screen and because
             every other item depends on it: a student who reads the viewport
             as one grain cannot reason about particles at all. This is the
             misconception the posttests actually showed. */
          { id: 'lab-scale',
            type: 'choice',
            tags: 'Engage · CG5',
            text: 'Step the viewport out to the beaker and back in again. The ' +
                  'whole round view is 13.6 nanometres across. How much of one ' +
                  'grain of salt is that?',
            choices: ['The whole grain',
                      'About half a grain',
                      'A tiny part of one grain',
                      'Several grains at once'],
            correct: 2,
            nudge: 'Zoom out one step and read the scale bar. A grain of salt is ' +
                   'about 0.3 millimetres; this view is 13.6 nanometres.',
            completion: 'It would take about 22,000 of these views to cross one ' +
                        'grain of salt. The viewport is inside a grain, not ' +
                        'around one.' },

          { id: 'lab-predict',
            type: 'prediction',
            tags: 'Engage · CG2',
            text: 'When salt seems to disappear in water, what happens to its particles?',
            choices: ['They melt',
                      'They break off and spread through the water',
                      'They turn into water',
                      'They are destroyed'],
            trigger: { event: 'identified',
                       when: function (d) { return d.id === 'particle-nacl-free'; } },
            completion: 'Predicted: {choice}. The salt particles broke off the ' +
                        'solid and spread through the water.' },

          { id: 'lab-surface',
            tags: 'Explore · CG3',
            text: 'Load salt and calcium carbonate, as your group did. Identify a ' +
                  'particle on the surface of a pile, and one buried inside it.',
            all: [
              { event: 'particleSelected',
                when: function (d) { return d.fixed && !d.buried; } },
              { event: 'particleSelected',
                when: function (d) { return d.buried; } }
            ],
            completion: 'Only the surface particles can touch the water.' },

          { id: 'lab-dissolved',
            tags: 'Explore · CG2 · CG4',
            text: 'Add water and stir. Identify a dissolved salt particle.',
            trigger: { event: 'identified',
                       when: function (d) { return d.id === 'particle-nacl-free'; } },
            completion: 'The beaker looks clear, but the dissolved salt is still ' +
                        'there, spread among the water particles.' },

          { id: 'lab-expert',
            tags: 'Explore · CG1',
            text: 'Load the substance your group tested, and run it.',
            trigger: { event: 'reading',
                       when: function (d) { return !!expert(d); } },
            vars: function (ds, state) {
              var k = expert(ds[0]);
              return { substance: state.label(ds[0][k].substance),
                       n: ds[0][k].free, tempC: ds[0].tempC };
            },
            completion: '{substance}, {tempC} °C: {n} of 50 dissolved at 15 seconds.' },

          { id: 'lab-temps',
            tags: 'Explore · CG3',
            text: 'Run your substance at 20 °C, then again at 100 °C. Do not stir.',
            all: [
              { event: 'reading',
                when: function (d) { return d.stirs === 0 && d.tempC <= 20 && !!expert(d); } },
              { event: 'reading',
                when: function (d, state) {
                  var first = state.partAt('lab-temps', 0);
                  if (!first || d.stirs !== 0 || d.tempC < 100) return false;
                  // The same sample at both temperatures, or it is not a comparison.
                  return expert(d) && d[expert(d)].substance === first[expert(first)].substance;
                } }
            ],
            vars: function (ds, state) {
              var k = expert(ds[0]);
              return { substance: state.label(ds[0][k].substance) };
            },
            completion: 'Tested {substance} at 20 °C and at 100 °C under the ' +
                        'same conditions.' },

          { id: 'lab-boil',
            tags: 'Explore · CG2',
            text: 'Boil a sample dry, as your well tray did. Identify what is left.',
            all: [
              { event: 'boiledDry' },
              { event: 'identified',
                when: function (d) { return /-recovered$/.test(d.id || ''); } }
            ],
            vars: function (ds, state) {
              var key = (ds[1].id || '').replace(/^particle-/, '').replace(/-recovered$/, '');
              return { substance: state.label(key) };
            },
            completion: 'The water boiled away. The {substance} stayed behind.' },

          { id: 'ch-hot-caco3',
            type: 'prediction',
            challenge: true,
            tags: 'Explore · CG1',
            text: 'Will calcium carbonate dissolve at 100 °C?',
            choices: ['Yes', 'No'],
            trigger: { event: 'reading',
                       when: function (d) {
                         return d.tempC >= 100 &&
                                (d.left.substance === 'caco3' || d.right.substance === 'caco3');
                       } },
            completion: 'Predicted {choice}. At 100 °C the calcium carbonate ' +
                        'stayed undissolved.' },

          { id: 'ch-freeze',
            challenge: true,
            tags: 'Explore · CG3',
            text: 'Freeze the instant a particle breaks free.',
            trigger: { event: 'frozen',
                       when: function (d) {
                         return d.sinceFreed !== null && d.sinceFreed <= 0.5;
                       } },
            completion: 'A water particle hit a surface particle and knocked it loose.' }
        ]
      },

      {
        id: 'explain',
        title: 'Explain',
        items: [
          { id: 'exp-filter',
            type: 'choice',
            tags: 'Explain · CG1',
            text: 'Your filter caught the calcium carbonate but let the salt ' +
                  'through. Using the viewport, why?',
            choices: ['Dissolved salt is single particles; calcium carbonate stays ' +
                      'in clumps of many particles',
                      'Each calcium carbonate particle is bigger than a salt particle',
                      'Salt is lighter, so it floats through'],
            correct: 0,
            nudge: 'Compare the two viewports after stirring.',
            completion: 'Dissolved salt is separate particles that slip through the ' +
                        'filter. Calcium carbonate stays stuck together in grains.' },

          { id: 'exp-caco3',
            type: 'choice',
            tags: 'Explain · CG1',
            text: 'Calcium carbonate did not dissolve because…',
            choices: ['Its particles stay held together when they are hit',
                      'Water never hits it',
                      'It is too heavy to move'],
            correct: 0,
            nudge: 'Identify a calcium carbonate particle while the water runs, ' +
                   'then try again.',
            completion: 'Calcium carbonate gets hit just as often, but its ' +
                        'particles stay held together.' },

          { id: 'ch-limits',
            type: 'choice',
            challenge: true,
            tags: 'Explain · ALD3',
            text: 'What does this model leave out? Choose at least two.',
            choices: ['Water is drawn bigger than it really is',
                      'A real spoonful has billions of particles',
                      'Real sugar browns into caramel when boiled dry',
                      'Real calcium chloride warms the water and stays damp',
                      'Water and solute attract each other, not just collide'],
            min: 2,
            completion: 'Model limits: {choice}.' }
        ]
      },

      {
        id: 'apply',
        title: 'Apply',
        note: 'The rest of Apply is on your exit ticket.',
        items: [
          { id: 'app-kettle',
            type: 'choice',
            tags: 'Elaborate · CG4',
            text: 'A kettle used every day gets a white crust inside. Where does ' +
                  'it come from?',
            choices: ['Minerals left behind when the water boils away',
                      'Rust from the metal',
                      'Dirt from the air'],
            correct: 0,
            nudge: 'Boil a sample dry and look at what stays in the beaker.',
            completion: 'Kettle crust is dissolved minerals, left behind each time ' +
                        'the water boils away.' }
        ]
      }
    ]
  };

  /* Which station, if either, holds the substance a group brought from the
     bench. Salt and chalk are the pair everyone tested, so they do not
     count; the left one wins when both do. Returns 'left', 'right' or null,
     which is also why it reads as a truth test at the call sites. */
  var EXPERT = { sucrose: 1, nahco3: 1, mgso4: 1, cacl2: 1 };
  function expert(reading) {
    if (reading.left && EXPERT[reading.left.substance]) return 'left';
    if (reading.right && EXPERT[reading.right.substance]) return 'right';
    return null;
  }

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function fill(text, vars) {
    return text.replace(/\{(\w+)\}/g, function (whole, key) {
      return vars && vars[key] != null ? vars[key] : whole;
    });
  }

  function allItems() {
    var out = [];
    CONTENT.pages.forEach(function (p) {
      p.items.forEach(function (i) { out.push(i); });
    });
    return out;
  }

  function Notebook(opts) {
    this.root = opts.root;
    this.bus = opts.bus;
    this.say = opts.say || function () {};
    /* Substance keys reach the notebook on the bus; the words for them live
       in the activity's table, so they are handed over rather than copied. */
    this.labels = opts.labels || {};

    this.items = [];          // { spec, page, el, nudgeEl }
    this.lines = {};          // page id -> the lines written on it
    this.done = {};
    this.answers = {};        // item id -> a label, or an array of them
    this.parts = {};          // item id -> matched detail per `all` trigger

    this.render();
    this.subscribe();
  }

  /* The words for a substance key, lower case for the middle of a sentence. */
  Notebook.prototype.label = function (key) {
    return (this.labels[key] || key).toLowerCase();
  };

  /* What the nth trigger of a multi-part item matched, for a later part that
     has to agree with an earlier one. */
  Notebook.prototype.partAt = function (id, n) {
    return (this.parts[id] || [])[n] || null;
  };

  Notebook.prototype.render = function () {
    var self = this;
    this.root.classList.add('notebook');
    this.root.innerHTML = '';
    this.items = [];
    this.pages = {};

    /* Plain buttons with aria-pressed, not a tablist. A tablist owes the
       keyboard arrow keys, a roving tabindex and Home/End; three buttons in
       the ordinary tab order owe nothing and work the same way here. */
    var bar = el('div', 'notebook__tabs');
    CONTENT.pages.forEach(function (page) {
      var btn = el('button', 'notebook__tab');
      btn.type = 'button';
      btn.textContent = page.title;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', function () { self.show(page.id); });
      bar.appendChild(btn);
      self.pages[page.id] = { spec: page, tab: btn };
    });
    this.root.appendChild(bar);

    CONTENT.pages.forEach(function (page) {
      var sheet = el('div', 'notebook__page');
      self.pages[page.id].el = sheet;
      self.lines[page.id] = self.lines[page.id] || [];

      var top = el('div', 'notebook__top');
      var core = page.items.filter(function (i) { return !i.challenge; });
      var extra = page.items.filter(function (i) { return i.challenge; });

      if (core.length) top.appendChild(self.section(page, 'Objectives', core, 'objective'));
      if (extra.length) top.appendChild(self.section(page, 'Challenges', extra, 'challenge'));
      sheet.appendChild(top);

      var head = el('p', 'notebook__head notebook__head--obs');
      head.textContent = 'Observations';
      sheet.appendChild(head);

      var obs = el('ul', 'notebook__obs');
      self.pages[page.id].obs = obs;
      sheet.appendChild(obs);

      if (page.note) {
        var note = el('p', 'notebook__note');
        note.textContent = page.note;
        sheet.appendChild(note);
      }

      self.root.appendChild(sheet);
    });

    this.show(CONTENT.pages[0].id);
    this.repaint();
  };

  Notebook.prototype.section = function (page, title, list, kind) {
    var head = el('p', 'notebook__head notebook__head--' + kind + 's');
    head.textContent = title;
    var ul = el('ul', 'notebook__list');
    for (var i = 0; i < list.length; i++) ul.appendChild(this.item(list[i], page, kind));
    var wrap = el('div');
    wrap.appendChild(head);
    wrap.appendChild(ul);
    return wrap;
  };

  Notebook.prototype.show = function (id) {
    var self = this;
    Object.keys(this.pages).forEach(function (k) {
      var on = k === id;
      self.pages[k].el.hidden = !on;
      self.pages[k].tab.setAttribute('aria-pressed', on ? 'true' : 'false');
      self.pages[k].tab.classList.toggle('is-on', on);
    });
    this.page = id;
  };

  Notebook.prototype.item = function (spec, page, kind) {
    var li = el('li', 'notebook__item notebook__item--' + kind);
    li.appendChild(el('i', 'notebook__mark'));

    var body = el('div');
    var text = el('div', 'notebook__text');
    text.textContent = spec.text;
    body.appendChild(text);

    var entry = { spec: spec, page: page.id, el: li };

    if (spec.type === 'prediction' || spec.type === 'choice') {
      body.appendChild(this.picker(spec, li, entry));
      entry.nudgeEl = el('p', 'notebook__nudge');
      entry.nudgeEl.hidden = true;
      body.appendChild(entry.nudgeEl);
    }

    li.appendChild(body);
    this.items.push(entry);
    return li;
  };

  /* One row of tappable answers, for both the types that have them.

     A prediction is committed before it can be judged: the choice is
     recorded on the tap and the item completes later, when its trigger
     fires. A choice completes on the tap itself — or on the right tap, when
     the item has a correct answer.

     Real buttons, so the keyboard reaches them without a key handler. */
  Notebook.prototype.picker = function (spec, li, entry) {
    var self = this;
    var wrap = el('div', 'notebook__choices');
    var many = spec.min > 1;

    spec.choices.forEach(function (label, index) {
      var btn = el('button', 'notebook__choice');
      btn.type = 'button';
      var inner = el('span');
      inner.textContent = label;
      btn.appendChild(inner);
      btn.setAttribute('aria-pressed', 'false');

      btn.addEventListener('click', function () {
        if (self.done[spec.id]) return;
        self.pick(spec, entry, wrap, btn, label, index, many);
      });

      wrap.appendChild(btn);
    });

    li.classList.add('notebook__item--has-choices');
    return wrap;
  };

  Notebook.prototype.pick = function (spec, entry, wrap, btn, label, index, many) {
    var was = this.answers[spec.id];

    if (many) {
      var picked = this.answers[spec.id] = this.answers[spec.id] || [];
      var at = picked.indexOf(label);
      if (at >= 0) picked.splice(at, 1); else picked.push(label);
      btn.classList.toggle('is-picked', at < 0);
      btn.setAttribute('aria-pressed', at < 0 ? 'true' : 'false');
    } else {
      this.answers[spec.id] = label;
      Array.prototype.forEach.call(wrap.children, function (other) {
        var on = other === btn;
        other.classList.toggle('is-picked', on);
        other.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      /* Committed, so the page folds the answers down to the one chosen. A
         prediction waits for its trigger before it is complete, and four
         full-width buttons sitting there until then is most of a screen. */
      entry.el.classList.add('is-answered');
    }

    /* The first answer and every revision: a changed answer is evidence of
       changed thinking, so the record keeps what it was before. */
    this.bus.emit('answered', { id: spec.id, value: this.answers[spec.id],
                                revisedFrom: was === undefined ? null : was });
    this.say('Answer recorded: ' + label + '.', true);

    if (spec.type !== 'choice') return;

    if (many) {
      if (this.answers[spec.id].length >= spec.min) this.complete(entry, []);
      return;
    }
    if (spec.correct === undefined || index === spec.correct) {
      this.complete(entry, []);
      return;
    }
    // Wrong, and the item stays open. A nudge, not a verdict.
    if (entry.nudgeEl && spec.nudge) {
      entry.nudgeEl.textContent = spec.nudge;
      entry.nudgeEl.hidden = false;
      this.say(spec.nudge, true);
    }
  };

  Notebook.prototype.subscribe = function () {
    var self = this;
    var seen = {};
    this.items.forEach(function (entry) {
      var list = entry.spec.all || (entry.spec.trigger ? [entry.spec.trigger] : []);
      list.forEach(function (t) {
        if (seen[t.event]) return;
        seen[t.event] = true;
        self.bus.on(t.event, function (detail) { self.check(t.event, detail); });
      });
    });
  };

  Notebook.prototype.check = function (event, detail) {
    detail = detail || {};
    for (var i = 0; i < this.items.length; i++) {
      var entry = this.items[i];
      var spec = entry.spec;
      if (this.done[spec.id]) continue;

      var list = spec.all || (spec.trigger ? [spec.trigger] : []);
      if (!list.length) continue;

      // An unanswered prediction waits: the point is to commit first.
      if (spec.type === 'prediction' && this.answers[spec.id] === undefined) continue;

      var got = this.parts[spec.id] = this.parts[spec.id] || [];
      var moved = false;
      for (var n = 0; n < list.length; n++) {
        if (got[n] !== undefined) continue;          // that part already fired
        if (list[n].event !== event) continue;
        if (list[n].when && !list[n].when(detail, this)) continue;
        got[n] = detail;
        moved = true;
        break;                                        // one event, one part
      }
      if (!moved) continue;

      var whole = true;
      for (var m = 0; m < list.length; m++) if (got[m] === undefined) whole = false;
      if (whole) this.complete(entry, got);
    }
  };

  Notebook.prototype.complete = function (entry, details) {
    var spec = entry.spec;
    this.done[spec.id] = true;
    entry.el.classList.add('is-done');
    if (entry.nudgeEl) entry.nudgeEl.hidden = true;

    var vars = { choice: [].concat(this.answers[spec.id] || []).join(', ') };
    if (spec.vars) {
      var extra = spec.vars(details || [], this);
      for (var k in extra) if (extra.hasOwnProperty(k)) vars[k] = extra[k];
    }

    var line = fill(spec.completion, vars);
    this.write(entry.page, line);
    this.say('Observed: ' + line, true);
    this.bus.emit('itemComplete', { id: spec.id });

    /* The hook a reward hangs off later. Core items on Lab and Explain only:
       the challenges are optional and Apply is homework. */
    var core = allItems().filter(function (i) {
      return !i.challenge && i.id.indexOf('app-') !== 0;
    });
    var self = this;
    if (core.every(function (i) { return self.done[i.id]; })) {
      this.bus.emit('coreComplete', {});
    }
  };

  /* Observations are written on the paper's ruled lines, one list per page.

     They scroll rather than being dropped. The first draft of this threw
     the oldest line away once the page was full, which was fine when a page
     held three items and wrote three lines; a page that holds eight and is
     the record a student hands in cannot quietly lose five of them. The
     newest is scrolled to, because that is the one just written. */
  Notebook.prototype.write = function (page, line) {
    this.lines[page].push(line);
    this.repaint(page);
    var obs = this.pages[page].obs;
    obs.scrollTop = obs.scrollHeight;
  };

  Notebook.prototype.repaint = function (page) {
    var self = this;
    var pages = page ? [page] : Object.keys(this.pages);
    pages.forEach(function (id) {
      var obs = self.pages[id].obs;
      obs.innerHTML = '';
      self.lines[id].forEach(function (text) {
        var li = document.createElement('li');
        li.textContent = text;
        obs.appendChild(li);
      });
    });
  };

  Notebook.prototype.reset = function () {
    this.done = {};
    this.lines = {};
    this.answers = {};
    this.parts = {};
    this.render();
  };

  Notebook.prototype.progress = function () {
    var items = allItems();
    return { done: Object.keys(this.done).length, total: items.length };
  };

  Notebook.content = CONTENT;
  global.Notebook = Notebook;
})(window);
