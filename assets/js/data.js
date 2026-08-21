/* ═══════════════════════════════════════════════════════════════════════════
   GOOGLE SHEETS DATA LAYER

   One fetch per page load. Loads AFTER config.js and services-data.js — those
   define the built-in values, which double as the final fallback — and BEFORE
   main.js, which renders from the same globals.

   The globals are MUTATED IN PLACE (SERVICES.length = 0; SERVICES.push(...))
   rather than reassigned. Every existing reference in main.js keeps pointing at
   the same array, so no component had to be rewritten to become dynamic.

   Order of operations:
     1. parse time      — apply cached sheet data synchronously, before paint
     2. DOMContentLoaded — main.js renders from cache-or-fallback. There is never
                           a moment with no data, so no loading state is needed.
     3. fetch lands     — apply live data, re-render silently
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CACHE_KEY = 'ahc-sheet-cache';
  var SCHEMA    = '1';                 // bump to invalidate every cached copy
  var TTL_MS    = 12 * 60 * 1000;      // 12 minutes

  /* ─── Coercion ──────────────────────────────────────────────────────────
     Deliberately strict about "zero" vs "empty": 0 is a real price, '' is a
     missing one. Everything returns null when unreadable, never a silent 0. */

  function str(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).trim();
    return s === '' ? null : s;
  }

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var cleaned = String(v).replace(/[^0-9.\-]/g, '');   // "£42.50" -> "42.50"
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
    var n = parseFloat(cleaned);
    return isFinite(n) ? n : null;                       // "ninety" -> null
  }

  function bool(v) {
    if (v === true || v === false) return v;
    if (v === null || v === undefined || v === '') return null;
    var s = String(v).trim().toLowerCase();
    if (s === 'true' || s === 'yes' || s === 'y' || s === '1') return true;
    if (s === 'false' || s === 'no' || s === 'n' || s === '0') return false;
    return null;
  }

  /* Only plainly http(s) survives. A javascript: or data: value typed into a
     cell must never reach an href — checked here as well as server-side. */
  function safeUrl(v) {
    var s = str(v);
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) return null;
    for (var i = 0; i < s.length; i++) { var cc = s.charCodeAt(i); if (cc < 32 || cc === 127) return null; }
    return s;
  }

  /* Lists split on newline (or pipe), never on comma, so an address or a
     feature like "Small, medium or large" survives as one item. */
  function list(v) {
    var s = str(v);
    if (!s) return [];
    return s.split(/\r?\n|\s*\|\s*/)
            .map(function (x) { return x.trim(); })
            .filter(function (x) { return x !== ''; });
  }

  /* Sorted client-side as well as server-side: cached and fixture payloads
     would otherwise render in whatever order they happened to arrive in. */
  function sortBy(arr) {
    return arr.sort(function (a, b) {
      var x = (a.sort === null || a.sort === undefined) ? 9999 : a.sort;
      var y = (b.sort === null || b.sort === undefined) ? 9999 : b.sort;
      return x - y;
    });
  }

  function rows(payload, tab) {
    return (payload && payload.tabs && Array.isArray(payload.tabs[tab])) ? payload.tabs[tab] : null;
  }

  /* key/value tabs (contact, settings) arrive as [{key, value}, ...] */
  function kv(arr) {
    var out = {};
    (arr || []).forEach(function (r) {
      var k = str(r.key);
      if (k) out[k] = r.value;
    });
    return out;
  }

  /* ─── Phone normalisation ───────────────────────────────────────────────
     One number in the sheet; every format derived from it. Expected input:
     "+44 7700 900123" or "07700 900123". Also handles "+44 (0)7700 900123",
     which would otherwise become 4407700900123. */
  function digits(raw) {
    var s = String(raw || '').replace(/[^\d+]/g, '');
    return s.replace(/^(\+\d{1,3})0(\d)/, '$1$2');    // drop the bracketed trunk 0
  }
  function telHref(raw) { var d = digits(raw); return d ? 'tel:' + d : ''; }
  function waLink(raw) {
    var d = digits(raw).replace(/^\+/, '');
    if (/^0\d/.test(d)) d = '44' + d.slice(1);        // UK national -> international
    return d ? 'https://wa.me/' + d : '';
  }

  /* ─── Escaping — a cell must not be able to contribute markup ───────────*/
  function escHtml(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(v) {
    return escHtml(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ─── Apply a payload onto the live globals ─────────────────────────────
     Each section is independent: one malformed tab must not cost the others,
     and a tab yielding nothing usable leaves existing data alone rather than
     blanking the page. */
  function apply(payload) {
    var applied = [];

    // ---- services ----
    var svc = rows(payload, 'services');
    if (svc) {
      var parsed = [];
      svc.forEach(function (r) {
        var id = str(r.id), name = str(r.name);
        if (!id || !name) return;                       // skip this row only
        if (!/^[a-z0-9-]+$/i.test(id)) return;
        var cat = str(r.category) || "Other";
        var photo = safeUrl(r.image_url);
        var hair = str(r.hair);
        hair = hair ? hair.toLowerCase() : null;
        parsed.push({
          id: id,
          name: name,
          title: name,
          category: cat,
          price: num(r.price),
          duration: num(r.duration_mins),
          // blank = "not applicable", a real third state, not a missing value
          hair: (hair === 'included' || hair === 'client') ? hair : null,
          patchTest: bool(r.patch_test) === true,
          kids: bool(r.kids) === true,
          description: str(r.description),
          feats: list(r.feats),
          sort: num(r.sort_order),
          // A photo from the sheet wins; otherwise the generated artwork.
          images: photo ? [photo] : ((typeof placeholderImage === "function")
            ? [placeholderImage(cat, name, 0), placeholderImage(cat, name, 1), placeholderImage(cat, name, 2)]
            : []),
          alt: name + ' at African Hair Care'
        });
      });
      if (parsed.length) {
        sortBy(parsed);
        SERVICES.length = 0;
        Array.prototype.push.apply(SERVICES, parsed);
        applied.push('services:' + parsed.length);
      }
    }

    // ---- categories ----
    var cats = rows(payload, 'categories');
    if (cats) {
      var pc = [];
      cats.forEach(function (r) {
        var name = str(r.name);
        if (!name) return;
        pc.push({
          name: name,
          slug: str(r.slug) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          blurb: str(r.blurb) || '',
          image: safeUrl(r.image_url),
          sort: num(r.sort_order)
        });
      });
      if (pc.length) {
        sortBy(pc);
        CATEGORIES.length = 0;
        Array.prototype.push.apply(CATEGORIES, pc);
        applied.push('categories:' + pc.length);
      }
    }

    // ---- contact (key/value) ----
    var contact = rows(payload, 'contact');
    if (contact) {
      var c = kv(contact), patch = {};
      if (str(c.phone))           patch.phone = str(c.phone);
      if (str(c.email_general))   patch.email = str(c.email_general);
      if (str(c.email_feedback))  patch.emailFeedback = str(c.email_feedback);
      if (str(c.address))         patch.address = str(c.address);
      if (str(c.maps_query))      patch.mapsQuery = str(c.maps_query);
      if (str(c.company_no))      patch.companyNo = str(c.company_no);
      if (str(c.nhbf_no))         patch.nhbfNo = str(c.nhbf_no);
      if (str(c.insurer))         patch.insurer = str(c.insurer);
      if (safeUrl(c.booking_url)) patch.bookingUrl = safeUrl(c.booking_url);
      // A cleared instagram cell is a deliberate "show no icon", so blank
      // clears rather than falling back.
      if (c.instagram_url !== undefined) patch.instagram = safeUrl(c.instagram_url) || '';
      if (str(c.whatsapp_number)) patch.whatsapp = waLink(str(c.whatsapp_number));
      if (patch.phone) {
        patch.phoneHref = telHref(patch.phone);
        if (!str(c.whatsapp_number)) patch.whatsapp = waLink(patch.phone);
      }
      if (Object.keys(patch).length) {
        Object.assign(CONFIG, patch);
        applied.push('contact:' + Object.keys(patch).length);
      }
    }

    // ---- opening hours ----
    var hrs = rows(payload, 'hours');
    if (hrs) {
      var ph = [];
      hrs.forEach(function (r) {
        var day = str(r.day);
        if (!day) return;
        // Blank hours means closed — clearing the cell is how a closed day is
        // marked, so it must not fall back to the previous value.
        ph.push({ day: day, hours: str(r.hours) || 'Closed', sort: num(r.sort_order) });
      });
      if (ph.length) {
        sortBy(ph);
        OPENING_HOURS.length = 0;
        Array.prototype.push.apply(OPENING_HOURS, ph);
        applied.push('hours:' + ph.length);
      }
    }

    // ---- promotions / ticker ----
    var promos = rows(payload, 'promos');
    if (promos) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var pp = [];
      promos.forEach(function (r) {
        var msg = str(r.message);
        if (!msg) return;
        var from = str(r.start_date), to = str(r.end_date), d;
        if (from) { d = new Date(from); if (!isNaN(d.getTime()) && today < d.setHours(0, 0, 0, 0)) return; }
        if (to)   { d = new Date(to);   if (!isNaN(d.getTime()) && today > d.setHours(23, 59, 59, 0)) return; }
        pp.push({ text: msg, url: safeUrl(r.link_url), sort: num(r.sort_order) });
      });
      if (pp.length) {
        sortBy(pp);
        TICKER_MESSAGES.length = 0;
        pp.forEach(function (p) {
          TICKER_MESSAGES.push(p.url
            ? '<a href="' + escAttr(p.url) + '">' + escHtml(p.text) + '</a>'
            : escHtml(p.text));
        });
        applied.push('promos:' + pp.length);
      }
    }

    // ---- team ----
    var team = rows(payload, 'team');
    if (team && typeof TEAM !== 'undefined') {
      var pt = [];
      team.forEach(function (r) {
        var name = str(r.name);
        if (!name) return;
        pt.push({
          name: name,
          role: str(r.role) || '',
          area: str(r.specialism) || '',
          quote: str(r.quote) || '',
          // No phone or email. Clients ask for a stylist when they book, so
          // the endpoint stopped publishing staff contact details entirely.
          photo: safeUrl(r.image_url),
          lead: bool(r.is_lead) === true,
          sort: num(r.sort_order)
        });
      });
      if (pt.length) {
        sortBy(pt);
        TEAM.length = 0;
        Array.prototype.push.apply(TEAM, pt);
        applied.push('team:' + pt.length);
      }
    }

    // ---- faq (drives the chat widget) ----
    var faq = rows(payload, 'faq');
    if (faq && typeof FAQ !== 'undefined') {
      var pf = [];
      faq.forEach(function (r) {
        var q = str(r.question), a = str(r.answer);
        if (!q || !a) return;                          // half a Q&A helps nobody
        pf.push({ q: q, a: a, sort: num(r.sort_order) });
      });
      if (pf.length) {
        sortBy(pf);
        FAQ.length = 0;
        Array.prototype.push.apply(FAQ, pf);
        applied.push('faq:' + pf.length);
      }
    }

    // ---- settings (key/value) ----
    var settings = rows(payload, 'settings');
    if (settings) {
      var s = kv(settings), sp = {};
      var dep = num(s.deposit);
      var can = num(s.cancellation_hours);
      if (dep !== null) sp.deposit = dep;               // 0 is a valid deposit
      if (can !== null) sp.cancellationHours = can;
      if (Object.keys(sp).length) Object.assign(SERVICE_DEFAULTS, sp);

      if (str(s.chair_rent_weekly)) CONFIG.chairRent    = str(s.chair_rent_weekly);
      if (str(s.consult_title))     CONFIG.consultTitle = str(s.consult_title);
      if (str(s.consult_body))      CONFIG.consultBody  = str(s.consult_body);
      if (str(s.consult_cta))       CONFIG.consultCta   = str(s.consult_cta);
      if (str(s.intro_text))        CONFIG.introText    = str(s.intro_text);
      if (str(s.chat_greeting))     CONFIG.chatGreeting = str(s.chat_greeting);
      if (str(s.stylist_note))      CONFIG.stylistNote  = str(s.stylist_note);
      applied.push('settings');
    }

    return applied;
  }

  /* ─── Cache (localStorage, entirely optional) ───────────────────────────
     Every read and write is wrapped: the site keeps working when storage is
     blocked, full, or disabled in private mode. */
  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || obj.schema !== SCHEMA) return null;
      if (!obj.at || (Date.now() - obj.at) > TTL_MS) return null;
      return obj.payload;
    } catch (e) { return null; }
  }
  function writeCache(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ schema: SCHEMA, at: Date.now(), payload: payload }));
    } catch (e) { /* quota, private mode, blocked — not fatal */ }
  }

  /* main.js exposes AHC_RENDER once it has bound its listeners. Renders are
     kept separate from binds, so calling this again never double-binds. */
  function rerender() {
    if (typeof window.AHC_RENDER === 'function') {
      try { window.AHC_RENDER(); } catch (e) { console.warn('[sheet] re-render failed', e); }
    }
  }

  function load() {
    var url = (typeof CONFIG !== 'undefined' && CONFIG.sheetEndpoint) || '';
    if (!url) return;                        // no endpoint: built-in values stand

    fetch(url, { method: 'GET', redirect: 'follow' })
      .then(function (res) {
        var type = res.headers.get('content-type') || '';
        // An Apps Script web app not shared with "Anyone" answers 200 with a
        // sign-in PAGE, so a bare JSON.parse would fail confusingly.
        if (type.indexOf('text/html') !== -1) {
          throw new Error('endpoint returned HTML, not JSON — deploy the web app with access set to "Anyone"');
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        if (!payload || payload.ok !== true) {
          throw new Error('payload not ok: ' + (payload && payload.error ? payload.error : 'unknown'));
        }
        var applied = apply(payload);
        if (!applied.length) {
          console.warn('[sheet] nothing usable in payload — keeping current data');
          return;
        }
        writeCache(payload);
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', rerender);
        } else {
          rerender();
        }
        console.info('[sheet] live data applied —', applied.join(', '));
      })
      .catch(function (err) {
        // Never surfaced to a customer: the page is already showing cached or
        // built-in content, which is real content, not a placeholder.
        console.warn('[sheet] using cached/built-in data —', err.message);
      });
  }

  // 1. Cache first, synchronously, so the first paint is never empty.
  var cached = readCache();
  if (cached) {
    try {
      var n = apply(cached);
      if (n.length) console.info('[sheet] cache applied —', n.join(', '));
    } catch (e) { console.warn('[sheet] bad cache ignored', e); }
  }

  // 2. Then go and see whether the sheet has changed.
  load();

  // Exposed for main.js, and for poking at from the console while testing.
  window.AHC = {
    reload: load,
    apply: apply,
    escHtml: escHtml,
    escAttr: escAttr,
    telHref: telHref,
    waLink: waLink,
    clearCache: function () { try { localStorage.removeItem(CACHE_KEY); } catch (e) {} },
    // Top-level const/let are lexical globals, not window properties, so this is
    // the only way to inspect what the sheet actually produced - from the
    // console, or from the test harness.
    snapshot: function () {
      return {
        CONFIG: CONFIG,
        SERVICES: SERVICES,
        CATEGORIES: CATEGORIES,
        OPENING_HOURS: OPENING_HOURS,
        TICKER_MESSAGES: TICKER_MESSAGES,
        SERVICE_DEFAULTS: SERVICE_DEFAULTS,
        TEAM: (typeof TEAM !== "undefined" ? TEAM : null),
        FAQ: (typeof FAQ !== "undefined" ? FAQ : null)
      };
    }
  };
})();
