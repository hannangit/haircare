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

  /* ─── Reviews ───────────────────────────────────────────────────────────*/
  function renderReviews() {
    var host = document.getElementById('reviews-embed');
    if (!host) return;
    var p = String(CONFIG.reviewsProvider || "none").toLowerCase();
    var id = CONFIG.reviewsId;

    // Clear first: a rejected or changed provider must not leave the previous
    // embed sitting there.
    host.innerHTML = "";

    if (p === 'none' || !id) {
      // Remove the whole section rather than leaving an empty heading.
      var section = host.closest('section');
      if (section) section.remove();
      return;
    }

    if (p === 'jotform') {
      host.innerHTML = '<div id="JFWebsiteWidget-' + esc(id) + '"></div>';
      var s = document.createElement('script');
      s.src = 'https://www.jotform.com/website-widgets/embed/' + encodeURIComponent(id);
      s.async = true;
      host.appendChild(s);
      return;
    }

    if (p === 'iframe') {
      if (!/^https?:\/\//i.test(id)) return;     // same URL whitelist as everywhere
      host.innerHTML = '<iframe src="' + esc(id) + '" title="Customer reviews" ' +
        'loading="lazy" style="border:0;width:100%;min-height:420px"></iframe>';
    }
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
