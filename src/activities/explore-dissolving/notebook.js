/* ==========================================================================
   The lab notebook.

   Objectives and challenges are data, not code: each one names an event on
   the activity's bus, an optional condition on that event, and the line it
   writes into Observations when it fires. Nothing here knows what dissolving
   is, so the real list can be written later without touching this file.

   The content below is deliberately placeholder. It exists so the mechanism
   can be tested, and it is meant to be replaced.
   ========================================================================== */

(function (global) {
  'use strict';

  /* Each item:
       id         stable, for completion tracking
       text       what the student reads
       trigger    { event, when(detail) } — when() is optional
       completion the line written into Observations
       type       'prediction' adds tappable choices, recorded before the
                  trigger is allowed to fire
   */
  var CONTENT = {
    objectives: [
      { id: 'obj-water',
        text: 'Placeholder objective: add water to both beakers.',
        trigger: { event: 'dispensed' },
        completion: 'Added 250 mL of water to both samples.' },

      { id: 'obj-first-free',
        text: 'Placeholder objective: watch one sugar particle break free.',
        trigger: { event: 'particleFreed',
                   when: function (d) { return d.substance === 'sugar'; } },
        completion: 'A sugar particle broke away from the pile.' },

      { id: 'obj-stir',
        text: 'Placeholder objective: stir both beakers.',
        trigger: { event: 'stirStarted' },
        completion: 'Stirred both beakers.' }
    ],

    challenges: [
      { id: 'cha-predict-caco3',
        type: 'prediction',
        text: 'Placeholder prediction: will the calcium carbonate dissolve?',
        choices: ['Yes', 'No'],
        trigger: { event: 'allDissolved',
                   when: function (d) { return d.substance === 'sugar'; } },
        completion: 'Recorded a prediction about calcium carbonate.' },

      { id: 'cha-all-sugar',
        text: 'Placeholder challenge: dissolve every sugar particle.',
        trigger: { event: 'allDissolved',
                   when: function (d) { return d.substance === 'sugar'; } },
        completion: 'Every sugar particle dissolved.' },

      { id: 'cha-identify',
        text: 'Placeholder challenge: identify a buried sugar particle.',
        trigger: { event: 'particleSelected',
                   when: function (d) {
                     return d.substance === 'sugar' && d.buried;
                   } },
        completion: 'Identified a particle buried inside the pile.' }
    ]
  };

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function Notebook(opts) {
    this.root = opts.root;
    this.bus = opts.bus;
    this.say = opts.say || function () {};
    this.items = [];
    this.lines = [];
    this.done = {};
    this.choices = {};
    this.render();
    this.subscribe();
  }

  Notebook.prototype.render = function () {
    var self = this;
    this.root.classList.add('notebook');
    this.root.innerHTML = '';
    this.items = [];

    /* Objectives and challenges share the space above the first ruled line,
       and are clipped to it: Observations has to start on that rule, so a
       longer list than this one scrolls out of sight rather than writing
       over the ruling. */
    var top = el('div', 'notebook__top');
    this.root.appendChild(top);

    function section(title, list, kind) {
      var head = el('p', 'notebook__head notebook__head--' + kind + 's');
      head.textContent = title;
      top.appendChild(head);

      var ul = el('ul', 'notebook__list');
      for (var i = 0; i < list.length; i++) {
        ul.appendChild(self.item(list[i], kind));
      }
      top.appendChild(ul);
    }

    section('Objectives', CONTENT.objectives, 'objective');
    section('Challenges', CONTENT.challenges, 'challenge');

    var head = el('p', 'notebook__head notebook__head--obs');
    head.textContent = 'Observations';
    this.root.appendChild(head);

    this.obs = el('ul', 'notebook__obs');
    this.root.appendChild(this.obs);
  };

  Notebook.prototype.item = function (spec, kind) {
    var li = el('li', 'notebook__item notebook__item--' + kind);
    li.appendChild(el('i', 'notebook__mark'));

    var body = el('div');
    var text = el('div', 'notebook__text');
    text.textContent = spec.text;
    body.appendChild(text);

    if (spec.type === 'prediction') body.appendChild(this.prediction(spec, li));
    li.appendChild(body);

    this.items.push({ spec: spec, el: li });
    return li;
  };

  /* A prediction is answered before it can be judged: the choice is recorded
     when it is tapped, and the item itself completes later, when its trigger
     fires. Real buttons, so a keyboard reaches them too. */
  Notebook.prototype.prediction = function (spec, li) {
    var self = this;
    var wrap = el('div', 'notebook__choices');

    spec.choices.forEach(function (label) {
      var btn = el('button', 'notebook__choice');
      btn.type = 'button';
      var inner = el('span');
      inner.textContent = label;
      btn.appendChild(inner);
      btn.setAttribute('aria-pressed', 'false');

      btn.addEventListener('click', function () {
        self.choices[spec.id] = label;
        Array.prototype.forEach.call(wrap.children, function (other) {
          var on = other === btn;
          other.classList.toggle('is-picked', on);
          other.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        self.bus.emit('predicted', { id: spec.id, choice: label });
        self.say('Prediction recorded: ' + label + '.', true);
      });

      wrap.appendChild(btn);
    });

    li.classList.add('notebook__item--has-prediction');
    return wrap;
  };

  Notebook.prototype.subscribe = function () {
    var self = this;
    var seen = {};
    this.items.forEach(function (entry) {
      var event = entry.spec.trigger.event;
      if (seen[event]) return;
      seen[event] = true;
      self.bus.on(event, function (detail) { self.check(event, detail); });
    });
  };

  Notebook.prototype.check = function (event, detail) {
    for (var i = 0; i < this.items.length; i++) {
      var entry = this.items[i];
      var spec = entry.spec;
      if (this.done[spec.id]) continue;
      if (spec.trigger.event !== event) continue;
      if (spec.trigger.when && !spec.trigger.when(detail || {})) continue;
      // An unanswered prediction waits: the point is to commit first.
      if (spec.type === 'prediction' && !this.choices[spec.id]) continue;
      this.complete(entry);
    }
  };

  Notebook.prototype.complete = function (entry) {
    var spec = entry.spec;
    this.done[spec.id] = true;
    entry.el.classList.add('is-done');
    this.write(spec.completion);
    this.say('Observed: ' + spec.completion, true);
    this.bus.emit('itemComplete', { id: spec.id });

    var total = CONTENT.objectives.length + CONTENT.challenges.length;
    if (Object.keys(this.done).length === total) {
      // The hook a future payoff hangs off. Nothing listens yet.
      this.bus.emit('allComplete', { items: total });
    }
  };

  /* Observations are written on the paper's ruled lines. A note that runs
     onto a second rule takes two, so how many fit is measured rather than
     counted: the oldest come off the top until the rest fit the page. */
  Notebook.prototype.write = function (line) {
    this.lines.push(line);
    this.paint();

    var guard = 0;
    while (this.lines.length > 1 &&
           this.obs.scrollHeight > this.obs.clientHeight && guard++ < 50) {
      this.lines.shift();
      this.paint();
    }
  };

  Notebook.prototype.paint = function () {
    this.obs.innerHTML = '';
    for (var i = 0; i < this.lines.length; i++) {
      var li = document.createElement('li');
      li.textContent = this.lines[i];
      this.obs.appendChild(li);
    }
  };

  Notebook.prototype.reset = function () {
    this.done = {};
    this.lines = [];
    this.choices = {};
    this.render();
  };

  Notebook.prototype.progress = function () {
    var total = CONTENT.objectives.length + CONTENT.challenges.length;
    return { done: Object.keys(this.done).length, total: total };
  };

  Notebook.content = CONTENT;
  global.Notebook = Notebook;
})(window);
