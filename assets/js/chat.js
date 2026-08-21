/* ═══════════════════════════════════════════════════════════════════════════
   CHAT WIDGET — bottom-right, WhatsApp-shaped, no third party.

   Tapping a question puts it on the right as if the visitor typed it, then the
   answer arrives on the left after a short pause. Anything not on the list
   hands over to real WhatsApp, which is the only place a person actually
   answers. There is no model behind this and it never free-types: every word
   it says came out of the `faq` tab of the owner's sheet.

   The whole widget is built here rather than sitting in markup, so 35 pages
   carry one empty div and the widget can change in one file.

   Loads after config.js, providers.js and data.js, before/after main.js — it
   only needs FAQ, CONFIG and PROVIDERS to exist by the time it renders.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MAX_QUESTIONS = 8;          // more than this and it stops being a shortcut
  var root, panel, log, chips, launcher, badge;
  var open = false;
  var asked = {};                 // questions already answered this visit
  var greeted = false;

  function esc(v) {
    return window.AHC ? AHC.escHtml(v) : String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escA(v) {
    return window.AHC ? AHC.escAttr(v) : esc(v).replace(/"/g, '&quot;');
  }
  function reduceMotion() {
    return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function questions() {
    if (typeof FAQ === 'undefined' || !FAQ || !FAQ.length) return [];
    return FAQ.filter(function (f) { return f && f.q && f.a; }).slice(0, MAX_QUESTIONS);
  }
  function waHref(subject) {
    return window.PROVIDERS ? PROVIDERS.waLink(subject || 'a question') : '';
  }

  /* ─── Building the shell ────────────────────────────────────────────────*/
  function build() {
    root = document.getElementById('chat-root');
    if (!root) return false;

    var name = esc(CONFIG.businessName || 'us');
    root.innerHTML =
      '<button class="chat-launcher" type="button" id="chat-launcher"' +
      ' aria-expanded="false" aria-controls="chat-panel" aria-label="Ask a question">' +
        '<span class="chat-launcher-icon" aria-hidden="true">' +
          (window.icon ? icon('chat', 24) : '') +
        '</span>' +
        '<span class="chat-launcher-close" aria-hidden="true">&#10005;</span>' +
        '<span class="chat-badge" id="chat-badge" aria-hidden="true">1</span>' +
      '</button>' +
      '<section class="chat-panel" id="chat-panel" role="dialog" aria-modal="false"' +
      ' aria-label="Questions and answers" hidden>' +
        '<header class="chat-hd">' +
          '<span class="chat-av" aria-hidden="true">' + (window.icon ? icon('sparkle', 20) : '') + '</span>' +
          '<span class="chat-hd-text">' +
            '<b>' + name + '</b>' +
            '<span class="chat-status"><i class="chat-dot" aria-hidden="true"></i>Answers to the usual questions</span>' +
          '</span>' +
          '<button class="chat-x" type="button" id="chat-close" aria-label="Close chat">&#10005;</button>' +
        '</header>' +
        '<div class="chat-log" id="chat-log" role="log" aria-live="polite" aria-atomic="false"></div>' +
        '<div class="chat-chips" id="chat-chips"></div>' +
        '<footer class="chat-ft">' +
          '<a class="chat-wa" id="chat-wa" href="#" target="_blank" rel="noopener">' +
            (window.icon ? icon('whatsapp', 18) : '') +
            '<span>Ask us anything on WhatsApp</span>' +
          '</a>' +
          '<p class="chat-disclaimer">Automated answers &mdash; ' +
          'WhatsApp reaches a real person.</p>' +
        '</footer>' +
      '</section>';

    panel    = document.getElementById('chat-panel');
    log      = document.getElementById('chat-log');
    chips    = document.getElementById('chat-chips');
    launcher = document.getElementById('chat-launcher');
    badge    = document.getElementById('chat-badge');
    return true;
  }

  /* ─── Messages ──────────────────────────────────────────────────────────*/
  function bubble(side, html, cls) {
    var row = document.createElement('div');
    row.className = 'chat-row chat-row--' + side + (cls ? ' ' + cls : '');
    row.innerHTML = '<div class="chat-bubble">' + html + '</div>';
    log.appendChild(row);
    scrollDown();
    return row;
  }

  function scrollDown() {
    // rAF so it measures after the new row has been laid out.
    requestAnimationFrame(function () { log.scrollTop = log.scrollHeight; });
  }

  function typing() {
    return bubble('in', '<span class="chat-typing" aria-label="Typing">' +
      '<i></i><i></i><i></i></span>', 'chat-row--typing');
  }

  function greet() {
    if (greeted) return;
    greeted = true;
    bubble('in', esc(CONFIG.chatGreeting ||
      'Hi! Tap a question below, or message us on WhatsApp.'));
  }

  /* ─── Chips ─────────────────────────────────────────────────────────────*/
  function renderChips() {
    if (!chips) return;
    var list = questions().filter(function (f) { return !asked[f.q]; });
    if (!list.length) {
      chips.innerHTML = '<p class="chat-chips-done">That is everything we get asked ' +
        'most. Anything else, message us below.</p>';
      return;
    }
    chips.innerHTML = list.map(function (f) {
      return '<button class="chat-chip" type="button" data-q="' + escA(f.q) + '">' +
        esc(f.q) + '</button>';
    }).join('');
  }

  function answer(q) {
    var found = null;
    questions().forEach(function (f) { if (f.q === q) found = f; });
    if (!found) return;

    asked[q] = true;
    bubble('out', esc(found.q));
    renderChips();

    var wait = reduceMotion() ? 0 : 550;
    var t = wait ? typing() : null;
    setTimeout(function () {
      if (t) t.remove();
      bubble('in', esc(found.a));
      scrollDown();
    }, wait);
  }

  /* ─── Open / close ──────────────────────────────────────────────────────*/
  function setOpen(next) {
    open = next;
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('chat-is-open', open);
    if (badge) badge.hidden = true;
    if (open) {
      greet();
      renderChips();
      refreshWa();
      scrollDown();
      // Focus the close button, not the first chip: landing on a chip reads
      // out a question the visitor never chose.
      var x = document.getElementById('chat-close');
      if (x) x.focus();
    } else {
      launcher.focus();
    }
  }

  function refreshWa() {
    var a = document.getElementById('chat-wa');
    if (!a) return;
    var href = waHref('a question');
    if (href) { a.href = href; a.hidden = false; } else { a.hidden = true; }
  }

  /* ─── Wiring ────────────────────────────────────────────────────────────*/
  function init() {
    if (!build()) return;
    if (!questions().length && !waHref()) { root.innerHTML = ''; return; }

    launcher.addEventListener('click', function () { setOpen(!open); });
    document.getElementById('chat-close').addEventListener('click', function () { setOpen(false); });

    chips.addEventListener('click', function (e) {
      var btn = e.target.closest('.chat-chip');
      if (btn) answer(btn.dataset.q);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) setOpen(false);
    });

    refreshWa();
  }

  /* Live sheet data lands after first paint; the questions may have changed.
     Only the chips are rebuilt — rewriting the log would erase the
     conversation the visitor is in the middle of. */
  function refresh() {
    if (!root) return;
    refreshWa();
    if (open) renderChips();
  }

  window.AHC_CHAT = { refresh: refresh, open: function () { if (root) setOpen(true); } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
