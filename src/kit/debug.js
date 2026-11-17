/* ==========================================================================
   The debug menu — one panel, every page.

   It is locked by default. Load any page once with `?debug` and this machine
   remembers; after that Ctrl-Shift-D opens the panel anywhere on the site. A
   school Chromebook never had that visit, so the chord does nothing there and
   a student cannot stumble into it. The Lock button forgets again.

   Settings live in one localStorage key so they survive a reload and apply
   across pages. Anything that is read at boot — the texture set — reloads the
   page when it changes; anything read live — the shortcuts — does not.
   ========================================================================== */

(function (global) {
  'use strict';

  var KEY = 'tms.debug';
  /* `notebook` is off by default on purpose, not as a debug convenience:
     Explore Dissolving ships with its notebook column dark until the
     items are ready, and a default of 'on' would put thirteen unfinished
     buttons in front of a class. Like `outlines`, what the class means is
     the activity's business; a page with no such rules just carries it. */
  var DEFAULTS = { textures: 'finished', shortcuts: 'on', outlines: 'off',
                   notebook: 'off' };

  /* Private windows and cleared site data both throw or come back empty, and
     neither is a reason for the site to stop working. */
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = read();
  var panel = null;

  var unlocking = /[?&]debug\b/.test(global.location.search) && !state.unlocked;
  if (unlocking) {
    state.unlocked = true;
    save();
  }

  var Debug = {
    get: function (name) {
      return state[name] == null ? DEFAULTS[name] : state[name];
    },
    set: function (name, value) {
      state[name] = value;
      save();
    },
    unlocked: function () { return state.unlocked === true; }
  };

  /* ---- the one thing a script can actually do about the cache ------------

     `location.reload(true)` has been ignored for years. Re-fetching every
     resource with `cache: 'reload'` genuinely replaces the stored entry, and
     the reload that follows then picks up the new copies. This is the escape
     hatch for files cached by a server that sent no Cache-Control — which is
     every file served before tools/serve.py existed. */
  function clearCacheAndReload(button) {
    var urls = performance.getEntriesByType('resource')
      .map(function (r) { return r.name; })
      .filter(function (u) { return /\.(webp|js|css|json|woff2?|png|jpe?g|svg)$/i.test(u); });

    /* The page itself is a `navigation` entry, not a `resource` one, so it is
       not in the list above — and a stale document is the worst kind, because
       it can be pointing at scripts that no longer exist.

       Each query string is its own cache entry, so the plain address is a
       separate stale copy from the ?debug one you are most likely reading
       this from. Both get flushed, or the menu disappears the moment you
       navigate back to the address without the query. */
    urls.push(global.location.href);
    if (global.location.search) urls.push(global.location.pathname);

    button.disabled = true;
    button.textContent = 'Clearing ' + urls.length + '…';
    Promise.all(urls.map(function (u) {
      return fetch(u, { cache: 'reload' }).catch(function () {});
    })).then(function () { global.location.reload(); });
  }

  /* ---- the panel --------------------------------------------------------- */

  function button(label, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  /* A row of mutually exclusive choices, as a radio group would be but
     without the name-collision risk of radios injected into someone else's
     page. aria-pressed carries the state to a screen reader. */
  function choices(labelText, name, options, onPick) {
    var row = document.createElement('div');
    row.className = 'dbg__row';

    var label = document.createElement('span');
    label.className = 'dbg__label';
    label.textContent = labelText;
    row.appendChild(label);

    var group = document.createElement('div');
    group.className = 'dbg__set';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', labelText);

    var buttons = options.map(function (opt) {
      var b = button(opt.label, function () {
        Debug.set(name, opt.value);
        buttons.forEach(function (other, i) {
          other.setAttribute('aria-pressed', String(options[i].value === opt.value));
        });
        if (onPick) onPick(opt.value);
      });
      b.setAttribute('aria-pressed', String(Debug.get(name) === opt.value));
      group.appendChild(b);
      return b;
    });

    row.appendChild(group);
    return row;
  }

  function build() {
    var el = document.createElement('div');
    el.className = 'dbg';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Debug menu');
    el.hidden = true;

    var head = document.createElement('h2');
    head.textContent = 'Debug';
    el.appendChild(head);

    el.appendChild(choices('Textures', 'textures', [
      { label: 'Finished', value: 'finished' },
      { label: 'Placeholder', value: 'placeholder' }
    ], function () { global.location.reload(); }));   // the set is read at boot

    el.appendChild(choices('Keyboard shortcuts', 'shortcuts', [
      { label: 'On', value: 'on' },
      { label: 'Off', value: 'off' }
    ]));

    el.appendChild(choices('Layer outlines', 'outlines', [
      { label: 'Off', value: 'off' },
      { label: 'On', value: 'on' }
    ], outlines));

    el.appendChild(choices('Notebook', 'notebook', [
      { label: 'Off', value: 'off' },
      { label: 'On', value: 'on' }
    ], notebook));

    var actions = document.createElement('div');
    actions.className = 'dbg__row';
    var clear = button('Clear cache and reload', function () { clearCacheAndReload(clear); });
    clear.className = 'dbg__wide';
    actions.appendChild(clear);
    el.appendChild(actions);

    var lock = button('Lock this machine', function () {
      state.unlocked = false;
      save();
      toggle(false);
    });
    lock.className = 'dbg__wide dbg__quiet';
    el.appendChild(lock);

    document.body.appendChild(el);
    return el;
  }

  function toggle(show) {
    if (!panel) panel = build();
    panel.hidden = show === false ? true : show === true ? false : !panel.hidden;
    if (!panel.hidden) {
      var first = panel.querySelector('button');
      if (first) first.focus();
    }
  }

  /* Backtick. Every modifier chord worth having is already bound by one
     browser or another — Ctrl-Shift-D was, in all of them — and a bare key
     that no page uses for anything is the one thing nothing argues over. */
  document.addEventListener('keydown', function (e) {
    if (!Debug.unlocked()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
    /* `code` is the physical key and survives a layout where backtick is not
       where a US keyboard puts it; `key` catches the reverse, a layout that
       puts backtick on some other key. Either will do. */
    if (e.code === 'Backquote' || e.key === '`') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Escape' && panel && !panel.hidden) {
      toggle(false);
    }
  });

  /* The layer view belongs to the activity's stylesheet; a page without those
     rules simply carries a class nothing matches. */
  function outlines(on) {
    if (document.body) document.body.classList.toggle('is-debug', on === 'on');
  }

  /* Read live rather than at boot, so the row needs no page reload: the
     column is only ever hidden with display:none, never unbuilt. */
  function notebook(on) {
    if (document.body) document.body.classList.toggle('no-notebook', on === 'off');
  }
  ready(function () {
    outlines(Debug.get('outlines'));
    notebook(Debug.get('notebook'));
  });

  /* A key is not enough on its own. Backtick is bound to something in some
     browsers, modifier chords are bound to something in all of them, and a
     keyboard layout can put a character anywhere — three attempts at a key
     all failed somewhere. A visible target cannot be stolen by any of that.

     It only exists once this machine is unlocked, so a class never sees it,
     and it doubles as the test: if this tab is not showing it, the script is
     not running and no key would have worked either. */
  function handle() {
    var h = document.createElement('button');
    h.type = 'button';
    h.className = 'dbg-tab';
    h.textContent = 'debug';
    h.title = 'Open the debug menu (backtick)';
    h.addEventListener('click', function () { toggle(); });
    document.body.appendChild(h);
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  if (Debug.unlocked()) ready(handle);

  /* Open it on the visit that unlocks, so that step proves itself. */
  if (unlocking) ready(function () { toggle(true); });

  Debug.toggle = toggle;
  if (global.Kit) global.Kit.debug = Debug;
  global.KitDebug = Debug;          // the landing page loads no kit.js
})(window);
