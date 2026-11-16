/* ==========================================================================
   Shared UI glue for every activity: the parts that have nothing to do with
   what the activity is about.

   No dependencies, no build step, loads from file:// or any static host.
   ========================================================================== */

(function (global) {
  'use strict';

  var Kit = {};

  Kit.$ = function (id, root) { return (root || document).getElementById(id); };

  /* Screen-reader announcements. Throttled, because a running simulation
     would otherwise push a new message into the live region every frame and
     the reader would never finish a sentence. */
  Kit.announcer = function (el, minGapMs) {
    var last = -Infinity;
    var gap = minGapMs == null ? 4000 : minGapMs;
    return function (msg, force) {
      var now = Date.now();
      if (!force && now - last < gap) return;
      last = now;
      el.textContent = msg;
    };
  };

  /* A popover anchored to its trigger. Closes on outside click and Escape.
     Visibility is a class, not the hidden attribute, so it can transition. */
  Kit.popover = function (btn, pop) {
    function set(open) {
      pop.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      set(btn.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', function (e) {
      if (!pop.contains(e.target)) set(false);
    });
    return { close: function () { set(false); } };
  };

  /* A tablist. A radio group answers "which one", a tablist answers "which
     view", and switching what the stage is showing is the second. Carries the
     roving tabindex and arrow keys the pattern expects, so the whole thing is
     reachable with one Tab stop and the arrow keys. */
  Kit.tabs = function (buttons, onPick) {
    var list = Array.prototype.slice.call(buttons);

    function select(value, focus) {
      list.forEach(function (b) {
        var on = b.dataset.value === value;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        b.classList.toggle('is-seated', on);
        if (on && focus) b.focus();
      });
    }

    function pick(b, focus) {
      select(b.dataset.value, focus);
      onPick(b.dataset.value);
    }

    list.forEach(function (b, i) {
      b.addEventListener('click', function () { pick(b, false); });
      b.addEventListener('keydown', function (e) {
        var to = { ArrowRight: i + 1, ArrowLeft: i - 1,
                   Home: 0, End: list.length - 1 }[e.key];
        if (to == null) return;
        e.preventDefault();
        pick(list[(to + list.length) % list.length], true);
      });
    });

    return { select: function (v) { select(v, false); } };
  };

  /* Step-through walkthrough. Owns the stepping and the two buttons; the
     activity decides what each step does to what is on screen. */
  Kit.story = function (opts) {
    var steps = [];
    var i = 0;

    function render() {
      var step = steps[i];
      if (!step) return;
      opts.textEl.textContent = step.text;
      opts.stepEl.textContent = (i + 1) + ' / ' + steps.length;
      opts.prevBtn.disabled = i === 0;
      opts.nextBtn.disabled = i === steps.length - 1;
      opts.onChange(step, i, steps.length);
    }

    function go(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      render();
    }

    opts.prevBtn.addEventListener('click', function () { go(i - 1); });
    opts.nextBtn.addEventListener('click', function () { go(i + 1); });

    return {
      load: function (next) { steps = next; go(0); },
      go: go,
      current: function () { return steps[i] || {}; },
      index: function () { return i; }
    };
  };

  global.Kit = Kit;
})(window);
