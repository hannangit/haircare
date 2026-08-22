/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDERS — booking, reviews and WhatsApp, driven entirely by CONFIG.

   Everything third-party is loaded from here rather than being written into
   35 pages of markup. Swapping Calendly for Google Bookings, or JotForm for a
   Google reviews iframe, is a config change and nothing else.

   Loads after config.js, before main.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── WhatsApp ──────────────────────────────────────────────────────────
     One number in config; every format derived. Handles "+44 (0)7700 900123",
     which would otherwise become 4407700900123. */
  function waDigits(raw) {
    var s = String(raw || '').replace(/[^\d+]/g, '');
    s = s.replace(/^(\+\d{1,3})0(\d)/, '$1$2');      // drop the bracketed trunk 0
    s = s.replace(/^\+/, '');
    if (/^0\d/.test(s)) s = '44' + s.slice(1);       // UK national -> international
    return s;
  }

  function waLink(serviceName) {
    var num = waDigits(CONFIG.whatsappNumber || CONFIG.phone);
    if (!num) return '';
    var msg = String(CONFIG.whatsappMessage || '')
      .replace(/\{business\}/g, CONFIG.businessName || 'there')
      .replace(/\{service\}/g, serviceName || 'an appointment');
    return 'https://wa.me/' + num + (msg ? '?text=' + encodeURIComponent(msg) : '');
  }

  function telLink() {
    var s = String(CONFIG.phone || '').replace(/[^\d+]/g, '')
              .replace(/^(\+\d{1,3})0(\d)/, '$1$2');
    return s ? 'tel:' + s : '';
  }

  /* ─── Booking ───────────────────────────────────────────────────────────*/
  function bookingProvider() {
    var p = String(CONFIG.bookingProvider || 'none').toLowerCase();
    if (!CONFIG.bookingUrl) return 'none';
    return (p === 'calendly' || p === 'google') ? p : 'none';
  }

  /* Calendly themes the scheduler from the URL, so it follows Dark/Light
     instead of dropping a bright panel onto a dark site. */
  function calendlyUrl(serviceName) {
    var url = CONFIG.bookingUrl;
    var light = document.documentElement.dataset.theme === 'light';
    var p = new URLSearchParams();
    p.set('background_color', light ? 'FBF4EA' : '180E1A');
    p.set('text_color',       light ? '2E1528' : 'F3EBE3');
    p.set('primary_color',    light ? '8C601F' : 'D9AE62');
    p.set('hide_gdpr_banner', '1');
    if (serviceName) p.set('utm_content', serviceName);
    return url + (url.indexOf('?') !== -1 ? '&' : '?') + p.toString();
  }

  /* Load the provider's script once, on demand. Nothing third-party is
     requested on pages where nobody books. */
  var calendlyLoading = null;
  function loadCalendly() {
    if (window.Calendly) return Promise.resolve(true);
    if (calendlyLoading) return calendlyLoading;
    calendlyLoading = new Promise(function (resolve) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(css);

      var s = document.createElement('script');
      s.src = 'https://assets.calendly.com/assets/external/widget.js';
      s.async = true;
      s.onload = function () { resolve(!!window.Calendly); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);

      setTimeout(function () { resolve(!!window.Calendly); }, 6000);
    });
    return calendlyLoading;
  }

  /* Open the scheduler. Returns true if it handled it, false if the caller
     should fall back (to WhatsApp). */
  function openScheduler(serviceName) {
    var p = bookingProvider();
    if (p === 'calendly') {
      loadCalendly().then(function (ok) {
        if (ok && window.Calendly) Calendly.initPopupWidget({ url: calendlyUrl(serviceName) });
        else window.open(CONFIG.bookingUrl, '_blank', 'noopener');
      });
      return true;
    }
    if (p === 'google') {
      // Google appointment schedules have no popup API; a new tab is the
      // supported route.
      window.open(CONFIG.bookingUrl, '_blank', 'noopener');
      return true;
    }
    return false;
  }

  /* Inline scheduler on the booking page. */
  function renderInlineScheduler() {
    var host = document.getElementById('booking-embed');
    if (!host) return;
    var p = bookingProvider();
    if (p === 'none' || !CONFIG.bookingEmbedInline) return;

    if (p === 'calendly') {
      loadCalendly().then(function (ok) {
        if (!ok) return;                     // the manual contact options stay
        host.innerHTML = '';
        host.hidden = false;
        // Calendly expands to fit unless its parent has a height of its own.
        host.style.height = '700px';
        // The API is initInlineWidget (SINGULAR) and takes parentElement.
        // Calendly only auto-scans for .calendly-inline-widget at its own load
        // time, so an element injected after that must be initialised by hand.
        window.Calendly.initInlineWidget({ url: calendlyUrl(null), parentElement: host });
        showManualHeading();
      });
      return;
    }
    if (p === 'google') {
      var src = CONFIG.bookingUrl;
      if (src.indexOf('gv=true') === -1) src += (src.indexOf('?') !== -1 ? '&' : '?') + 'gv=true';
      host.innerHTML = '<iframe src="' + esc(src) + '" title="Book an appointment" ' +
        'style="border:0;width:100%;height:700px" frameborder="0"></iframe>';
      host.hidden = false;
      showManualHeading();
    }
  }
  function showManualHeading() {
    var h = document.getElementById('booking-manual-heading');
    if (h) h.hidden = false;
  }

  /* ─── Reviews ───────────────────────────────────────────────────────────
     A salon usually collects reviews in more than one place — Google and
     Facebook at least — so this takes a LIST, from the sheet's `reviews` tab.
     One source embeds on its own; two or more get a tab strip, and only the
     visible one is ever loaded. Three widgets loading at once on the homepage
     would cost real seconds for two panels nobody has looked at.

     `page` on a row scopes it: blank shows everywhere, a value shows only on
     the page whose embed carries the matching data-reviews-key.

     With no `reviews` tab at all it falls back to the single
     settings/reviews_provider + reviews_id pair, and then to config.js, so an
     older sheet keeps working untouched. */
  var lastReviewsKey = null;

  /* A JotForm website-widget "embed link" is a SCRIPT, not a page. Framing it
     shows the customer 30KB of JavaScript source instead of reviews — which is
     an easy mistake, because JotForm hands you a URL and `iframe` is the row
     that says "paste a link here". So the URL decides, not the cell: this shape
     always means jotform, and the widget id is taken out of it.

     Everything else is inferred when `provider` is blank, and an obvious
     mismatch is dropped with a console note rather than rendered. */
  var JF_EMBED = /^https?:\/\/(?:www\.)?jotform\.com\/website-widgets\/embed\/([A-Za-z0-9_-]+)/i;

  function normaliseSource(provider, id, label) {
    var p = String(provider || '').toLowerCase();
    var v = String(id === null || id === undefined ? '' : id).trim();
    if (!v) return null;

    var jf = JF_EMBED.exec(v);
    if (jf) return { provider: 'jotform', id: jf[1] };

    var isUrl = /^https?:\/\//i.test(v);
    if (!p || (p !== 'jotform' && p !== 'iframe' && p !== 'none')) {
      p = isUrl ? 'iframe' : 'jotform';                 // blank or misspelt
    }
    if (p === 'none') return null;

    // jotform wants a bare widget id; some other URL cannot be turned into one.
    if (p === 'jotform' && isUrl) {
      warnSource(label, 'is set to jotform but holds a link that is not a JotForm widget');
      return null;
    }
    // Never frame a script: that is what put JavaScript on the page.
    if (p === 'iframe' && /\.js(\?|#|$)/i.test(v)) {
      warnSource(label, 'points at a .js script, which cannot be embedded as a page');
      return null;
    }
    // A bare id can only be a JotForm widget id, whatever the cell says. The
    // value is more trustworthy than the dropdown next to it.
    if (p === 'iframe' && !isUrl) return { provider: 'jotform', id: v };

    return { provider: p, id: v };
  }

  function warnSource(label, why) {
    console.warn('[reviews] ' + (label || 'source') + ' ignored — it ' + why + '.');
  }

  function sourcesFor(host) {
    var pageKey = host.getAttribute('data-reviews-key') || '';
    var list = [];

    if (typeof REVIEW_SOURCES !== 'undefined' && REVIEW_SOURCES && REVIEW_SOURCES.length) {
      REVIEW_SOURCES.forEach(function (r) {
        if (!r || !r.id) return;
        if (r.page && r.page !== pageKey) return;
        var n = normaliseSource(r.provider, r.id, 'reviews row "' + (r.name || '') + '"');
        if (n) list.push({ name: r.name, provider: n.provider, id: n.id, page: r.page });
      });
    }
    if (list.length) return list;

    // A sheet that has the reviews tab and emptied it means "no reviews".
    // Only a sheet with no reviews tab at all falls through to the old pair.
    if (CONFIG.reviewsTabPresent) return [];

    // Fallback: the single-widget settings, still supported.
    var provider = String(CONFIG.reviewsProvider || 'none').toLowerCase();
    var id = CONFIG.reviewsId;
    var per = pageKey && CONFIG.reviewsById && CONFIG.reviewsById[pageKey];
    if (per) {
      if (per.id) id = per.id;
      if (per.provider) provider = per.provider;
    }
    var norm = normaliseSource(provider, id, 'settings reviews_id');
    if (!norm) return [];
    return [{ name: 'Reviews', provider: norm.provider, id: norm.id, page: pageKey }];
  }

  /* Put one embed into one container. Called on first view of a panel, never
     before — so switching tabs is what triggers the third-party request. */
  function mountEmbed(el, provider, id) {
    var p = String(provider || '').toLowerCase();
    el.innerHTML = '';

    if (p === 'jotform') {
      el.innerHTML = '<div id="JFWebsiteWidget-' + esc(id) + '"></div>';
      var s = document.createElement('script');
      s.src = 'https://www.jotform.com/website-widgets/embed/' + encodeURIComponent(id);
      s.async = true;
      el.appendChild(s);
      return true;
    }
    if (p === 'iframe') {
      if (!/^https?:\/\//i.test(id)) return false;   // same URL whitelist as everywhere
      if (/\.js(\?|#|$)/i.test(id)) return false;    // belt and braces: never frame a script
      el.innerHTML = '<iframe src="' + esc(id) + '" title="Customer reviews" ' +
        'loading="lazy" style="border:0;width:100%;min-height:420px"></iframe>';
      return true;
    }
    return false;
  }

  function renderReviews() {
    var host = document.getElementById('reviews-embed');
    if (!host) return;

    var list = sourcesFor(host);

    // Re-rendering an unchanged set would re-inject the third-party scripts on
    // every render pass, so nothing happens unless something actually moved.
    var key = list.map(function (r) {
      return (r.name || '') + '|' + r.provider + '|' + r.id;
    }).join('||');
    if (key === lastReviewsKey) return;
    lastReviewsKey = key;

    host.innerHTML = '';

    // Hidden rather than removed: the sheet may still be in flight, and a
    // removed section cannot come back when it lands.
    var section = host.closest('section');
    if (!list.length) {
      if (section) section.hidden = true;        // no empty heading left behind
      return;
    }
    if (section) section.hidden = false;

    if (list.length === 1) {
      if (!mountEmbed(host, list[0].provider, list[0].id)) host.innerHTML = '';
      return;
    }

    var strip = document.createElement('div');
    strip.className = 'tablist rev-tabs';
    strip.setAttribute('role', 'tablist');
    strip.setAttribute('aria-label', 'Where our reviews come from');

    var panels = document.createElement('div');
    panels.className = 'rev-panels';

    list.forEach(function (src, i) {
      var uid = 'rev-' + i;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn';
      btn.setAttribute('role', 'tab');
      btn.id = uid + '-tab';
      btn.setAttribute('aria-controls', uid);
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.textContent = src.name || ('Reviews ' + (i + 1));
      strip.appendChild(btn);

      var panel = document.createElement('div');
      panel.className = 'rev-panel';
      panel.id = uid;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', uid + '-tab');
      panel.hidden = i !== 0;
      panels.appendChild(panel);

      function show() {
        list.forEach(function (_, j) {
          strip.children[j].setAttribute('aria-selected', String(j === i));
          panels.children[j].hidden = j !== i;
        });
        // Load on first view only.
        if (!panel.dataset.loaded) {
          panel.dataset.loaded = '1';
          mountEmbed(panel, src.provider, src.id);
        }
      }
      btn.addEventListener('click', show);
      btn.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = strip.children[(i + dir + list.length) % list.length];
        next.focus();
        next.click();
      });
      if (i === 0) {
        panel.dataset.loaded = '1';
        mountEmbed(panel, src.provider, src.id);
      }
    });

    host.appendChild(strip);
    host.appendChild(panels);
  }

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.PROVIDERS = {
    waLink: waLink,
    telLink: telLink,
    bookingProvider: bookingProvider,
    openScheduler: openScheduler,
    renderInlineScheduler: renderInlineScheduler,
    renderReviews: renderReviews
  };
})();
