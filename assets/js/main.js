/* Shared site behaviour: navigation, the service menu search, the ServiceCard
   component, the booking / stylist-application modal, tabs and the entry transition.
   All event listeners are bound here — no inline handlers in the HTML. */

/* ---------- Category mood theming ----------
   Braids, locs, weaves, natural hair and beauty each carry their own accent.
   Set on <body> so a filtered menu or a service page picks up its own colour. */
function setCategory(slug) {
  if (slug) document.body.setAttribute('data-category', slug);
  else document.body.removeAttribute('data-category');
}

/* ---------- Entry transition ---------- */
function initIntro() {
  const overlay = document.getElementById('intro-loader');
  const root = document.documentElement;
  if (!overlay || !root.classList.contains('intro-active')) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hold = reduce ? 300 : 2000;
  const fade = reduce ? 0 : 800;      // matches the CSS transition duration

  setTimeout(() => {
    overlay.classList.add('fade-out');
    try { sessionStorage.setItem('introShown', 'true'); } catch (e) { /* private mode */ }
    setTimeout(() => { root.classList.remove('intro-active'); overlay.remove(); }, fade);
  }, hold);
}

/* ---------- Colour theme (Dark / Light) ----------
   Dark is the brand default and lives in :root, so only "light" ever sets the
   attribute. A script in each page head applies the saved choice before first
   paint, otherwise a light-theme visitor gets a dark flash on every load. */
function applyTheme(name) {
  const root = document.documentElement;
  if (name === 'light') root.dataset.theme = 'light';
  else delete root.dataset.theme;
  try { localStorage.setItem('ahc-theme', name); } catch (e) { /* private mode */ }
  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.themeSet === name));
  });
}
function initTheme() {
  const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.themeSet === current));
    b.addEventListener('click', () => applyTheme(b.dataset.themeSet));
  });
}

/* ---------- Tabs ----------
   Markup: .tabs > .tablist > button[data-tab="id"] , then .tab-panel[data-panel="id"].
   Honours a #hash matching a tab key so other pages can deep-link into a panel. */
function initTabs() {
  document.querySelectorAll('.tabs').forEach(group => {
    const btns = [...group.querySelectorAll('[data-tab]')];
    const panels = [...group.querySelectorAll('[data-panel]')];
    if (!btns.length) return;

    const select = key => {
      btns.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === key)));
      panels.forEach(p => { p.hidden = p.dataset.panel !== key; });
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(b.dataset.tab));
      b.addEventListener('keydown', e => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = btns[(i + dir + btns.length) % btns.length];
        next.focus(); select(next.dataset.tab);
      });
    });
    const hash = decodeURIComponent(location.hash.replace('#', ''));
    const wanted = btns.find(b => b.dataset.tab === hash);
    select(wanted ? hash : btns[0].dataset.tab);
  });
}

/* ---------- Navigation ---------- */
/* Mobile drawer. Class-driven so it can animate, with the page behind it
   locked from scrolling while it is open. */
function setMenu(open) {
  const m = document.getElementById('mmenu');
  if (!m) return;
  const backdrop = document.getElementById('menu-backdrop');
  const burger = document.querySelector('.burger');
  m.classList.toggle('open', open);
  if (backdrop) backdrop.classList.toggle('open', open);
  if (burger) burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) {
    const first = m.querySelector('.menu-close');
    if (first) first.focus();
  } else if (burger) {
    burger.focus();
  }
}
function menuIsOpen() {
  const m = document.getElementById('mmenu');
  return !!m && m.classList.contains('open');
}
function toggleMenu() { setMenu(!menuIsOpen()); }
function initMobileMenu() {
  const m = document.getElementById('mmenu');
  if (!m) return;
  // Any link tap inside the drawer should close it, including same-page anchors.
  m.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuIsOpen()) setMenu(false); });
  // Returning to desktop width must not leave the drawer stuck open.
  window.addEventListener('resize', () => { if (window.innerWidth > 992 && menuIsOpen()) setMenu(false); });
}
function closeAllDropdowns() {
  document.querySelectorAll('.nav-item.open').forEach(i => {
    i.classList.remove('open');
    const b = i.querySelector('.nav-toggle');
    if (b) b.setAttribute('aria-expanded', 'false');
  });
}
function initNav() {
  document.querySelectorAll('.nav-item .nav-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const item = btn.closest('.nav-item');
      const wasOpen = item.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });
  document.addEventListener('click', closeAllDropdowns);
}

/* ---------- Inline SVG icon injection (replaces per-page inline scripts) ---------- */
function initIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    if (el.dataset.iconDone) return;
    el.innerHTML = icon(el.dataset.icon, +el.dataset.iconSize || undefined);
    el.dataset.iconDone = '1';
  });
}

/* ---------- Opening hours (rendered wherever [data-hours] appears) ---------- */
function renderHours() {
  const targets = document.querySelectorAll('[data-hours]');
  if (!targets.length) return;
  // getDay() is Sunday-first; OPENING_HOURS is Monday-first.
  const todayIndex = (new Date().getDay() + 6) % 7;
  const rows = OPENING_HOURS.map((h, i) => `<div class="hours-row${i === todayIndex ? ' is-today' : ''}">
      <span class="hours-day">${window.AHC ? AHC.escHtml(h.day) : h.day}${i === todayIndex ? ' <span class="hours-today">Today</span>' : ''}</span>
      <span class="hours-time${h.hours === "Closed" ? " is-closed" : ""}">${window.AHC ? AHC.escHtml(h.hours) : h.hours}</span>
    </div>`).join('');
  targets.forEach(el => { el.innerHTML = rows; });
}

/* ---------- Announcement ticker ----------
   The track holds the message list twice: the keyframe translates -50%, which
   lands exactly on the start of the second copy, so the loop has no visible
   seam. The duplicate is aria-hidden so it isn't read out twice. */
function renderTicker() {
  const track = document.getElementById('ticker-track');
  if (!track || typeof TICKER_MESSAGES === 'undefined') return;

  // Offers only. Opening hours live on Find Us and in the footer, where someone
  // looking for them can actually read them rather than wait for a loop.
  const group = TICKER_MESSAGES.map(m => '<span class="ticker-item">' + m + '</span>').join('');

  track.innerHTML = group + '<span aria-hidden="true">' + group + '</span>';
  document.getElementById('ticker').hidden = false;

  // A short list on a wide screen would leave a gap before the wrap, so pace the
  // animation by content width rather than a fixed duration.
  const width = track.scrollWidth / 2;
  if (width) track.style.animationDuration = Math.max(30, Math.round(width / 45)) + 's';
}

/* ---------- Floating consultation offer ----------
   Collapsed state is remembered, so the card doesn't re-open on every page. */
function setConsult(collapsed) {
  const el = document.getElementById('consult');
  if (!el) return;
  el.classList.toggle('is-collapsed', collapsed);
  const pill = el.querySelector('.consult-pill');
  if (pill) pill.setAttribute('aria-expanded', String(!collapsed));
  try { localStorage.setItem('ahc-consult', collapsed ? 'collapsed' : 'open'); } catch (e) { /* private mode */ }
}
function initConsult() {
  const el = document.getElementById('consult');
  if (!el) return;
  let stored = null;
  try { stored = localStorage.getItem('ahc-consult'); } catch (e) { /* private mode */ }
  // Default to collapsed: an offer that covers content unasked is an annoyance.
  setConsult(stored !== 'open');
}

/* ---------- Back to top ----------
   Only appears once there is something to scroll back from. */
function initToTop() {
  const btn = document.querySelector('.to-top');
  if (!btn) return;
  const toggle = () => btn.classList.toggle('is-visible', window.scrollY > 600);
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
  // A page opened at an #anchor, or restored mid-page on a back navigation,
  // is already scrolled before any scroll event fires.
  window.addEventListener('load', toggle);
}
function scrollToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  // Send focus back to the top of the document, or a keyboard user is left
  // stranded at the bottom of the tab order.
  const first = document.querySelector('.skip-link');
  if (first) first.focus({ preventScroll: true });
}

/* ---------- ServiceCard — the single card component used everywhere ----------
   There are no per-service detail pages any more: the card carries the full
   description, and anything beyond that is an enquiry. Every sheet-sourced
   value is escaped — a spreadsheet cell must not contribute markup. */
function ServiceCard(s) {
  const esc = window.AHC ? AHC.escHtml : (v => v);
  const escA = window.AHC ? AHC.escAttr : (v => v);

  // Only facts that vary between services. "Free consultation" is true of
  // everything on the menu, so putting it on every card carries no signal.
  const badges = [
    { on: s.hair === 'included', label: 'Hair included' },
    { on: s.hair === 'client', label: 'Bring your own hair' },
    { on: s.hair === null, label: 'No extension hair' },
    { on: s.kids, label: 'Kids welcome' },
    { on: s.patchTest, label: 'Patch test needed', warn: true }
  ].filter(b => b.on);

  // === null, not truthiness: a £0 service is a real price and must render as
  // "Free", not fall through to "On request".
  const hasPrice = priceOf(s) !== null;
  const priceLabel = !hasPrice ? 'On request' : (s.price === 0 ? 'Free' : money(s.price));

  return `<article class="prop">
    <div class="ph">
      <img src="${escA(s.images[0])}" alt="${escA(s.alt)}" loading="lazy">
      <span class="roomtype">${esc(s.category)}</span>
    </div>
    <div class="body">
      <h4>${esc(s.title)}</h4>
      <div class="meta">${esc(s.description || s.category)}</div>
      <div class="price-row">
        <span class="amount${hasPrice && s.price !== 0 ? '' : ' amount--tbc'}">${esc(priceLabel)}</span>
        ${hasPrice && s.price !== 0 ? '<span class="per">from</span>' : ''}
      </div>
      <div class="avail">${icon('clock', 14)}${esc(durationText(s))}</div>
      ${badges.length ? `<ul class="amenity-list">
        ${badges.map(b => `<li${b.warn ? ' class="warn"' : ''}>${esc(b.label)}</li>`).join('')}
      </ul>` : ''}
      ${s.feats && s.feats.length ? `<div class="detail-feats">
        ${s.feats.map(f => `<span>${esc(f)}</span>`).join('')}
      </div>` : ''}
      <div class="actions">
        <button class="btn btn-outline btn-sm" type="button" data-enquire="${escA(s.id)}">Enquire</button>
        <button class="btn btn-gold btn-sm" type="button" data-book="${escA(s.id)}">Book</button>
      </div>
    </div>
  </article>`;
}

/* ---------- Category tiles (homepage) ----------
   The homepage advertises the kinds of work we do, not individual line items;
   each tile deep-links into the menu with the Category filter already applied. */
function renderCategories() {
  const el = document.getElementById('categories');
  if (!el) return;
  const esc = window.AHC ? AHC.escHtml : (v => v);
  el.innerHTML = categoryList().map(c => {
    const n = categoryCount(c.name);
    return `<a class="cat-tile" href="${rootPath('services.html')}?category=${encodeURIComponent(c.name)}">
      <span class="cat-tile-name">${esc(c.name)}</span>
      <span class="cat-tile-blurb">${esc(c.blurb)}</span>
      <span class="cat-tile-foot">
        <span class="cat-tile-sub">${n} ${n === 1 ? 'service' : 'services'}</span>
        <span class="cat-tile-go" aria-hidden="true">→</span>
      </span>
    </a>`;
  }).join('');
}

/* ---------- Service menu search ---------- */
function renderGrid(list) {
  const g = document.getElementById('grid');
  if (!g) return;
  const count = document.getElementById('count');
  if (count) count.textContent = list.length + (list.length === 1 ? ' service' : ' services');

  if (!list.length) {
    g.innerHTML = `<div class="noresults">
      <h3>No services match your current filters.</h3>
      <p>Try widening your search, or clear the filters to see the whole menu.</p>
      <button class="btn btn-black" type="button" data-action="clear-filters">Clear filters</button>
    </div>`;
    return;
  }
  g.innerHTML = list.map(ServiceCard).join('');
}
function filterValue(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function applyFilters() {
  const category = filterValue('f-category');
  const price = +(filterValue('f-price') || 99999);
  const duration = +(filterValue('f-duration') || 99999);
  const extra = filterValue('f-extra');

  renderGrid(SERVICES.filter(s => {
    if (category && s.category !== category) return false;
    if (priceOf(s) !== null && priceOf(s) > price) return false;
    if (s.duration !== null && s.duration > duration) return false;
    if (extra === 'kids' && !s.kids) return false;
    if (extra === 'hair' && s.hair !== 'included') return false;
    if (extra === 'no-patch-test' && s.patchTest) return false;
    return true;
  }));
  setCategory(category ? categorySlug(category) : null);
}
function clearFilters() {
  document.getElementById('f-category').value = '';
  document.getElementById('f-price').value = '99999';
  document.getElementById('f-duration').value = '99999';
  document.getElementById('f-extra').value = '';
  applyFilters();
}
/* Bound ONCE. Kept separate from rendering so that re-rendering after the sheet
   arrives cannot attach a second copy of every listener. */
function bindSearch() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  document.querySelectorAll('[data-filter]').forEach(el => el.addEventListener('change', applyFilters));
  const searchBtn = document.querySelector('[data-action="search"]');
  if (searchBtn) searchBtn.addEventListener('click', applyFilters);
}

/* Safe to call repeatedly. Rebuilds the category options from the live data,
   preserving whatever the visitor had chosen. */
function renderSearch() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  const catEl = document.getElementById('f-category');
  if (catEl) {
    // Rebuilding a <select> wipes the current choice, so capture and restore it.
    const wanted = catEl.value || new URLSearchParams(location.search).get('category') || '';
    const esc = window.AHC ? AHC.escHtml : (v => v);
    catEl.innerHTML = '<option value="">All services</option>' +
      categoryList().map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('');
    if (wanted && [...catEl.options].some(o => o.value === wanted)) catEl.value = wanted;
  }

  // A filter with nothing behind it can only ever return nothing, so it hides.
  // Deliberately tolerant: one blank cell in a new row used to remove an entire
  // filter site-wide, so a filter now survives as long as SOME row can use it.
  const filterFields = { 'f-category': 'category', 'f-price': 'price', 'f-duration': 'duration' };
  Object.entries(filterFields).forEach(([id, field]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const usable = SERVICES.some(s => s[field] !== null && s[field] !== undefined);
    const group = el.closest('.control-group');
    if (group) group.hidden = !usable;
  });

  applyFilters();
}

/* ---------- Modal: booking (client) and chair application (stylist) ---------- */
let lastFocusedEl = null;

function modalEl() { return document.getElementById('modal'); }
function focusableInModal() {
  return [...modalEl().querySelectorAll('a[href], button:not([disabled]), input, textarea, select')]
    .filter(el => el.offsetParent !== null);
}
function openModal() {
  const m = modalEl();
  lastFocusedEl = document.activeElement;
  m.hidden = false;
  m.classList.add('show');
  document.body.style.overflow = 'hidden';
  const first = focusableInModal().find(el => el.id !== 'm-close') || document.getElementById('m-close');
  if (first) first.focus();
}
function closeModal() {
  const m = modalEl();
  m.classList.remove('show');
  m.hidden = true;
  document.body.style.overflow = '';
  if (lastFocusedEl) { lastFocusedEl.focus(); lastFocusedEl = null; }
}

/* Show only the fields relevant to the current audience. */
function setModalAudience(kind) {
  document.querySelectorAll('#m-form [data-audience]').forEach(el => {
    el.hidden = el.getAttribute('data-audience') !== kind;
  });
  const isStylist = kind === 'stylist';
  document.getElementById('m-submit').textContent = isStylist ? 'Send my application' : 'Request this appointment';
  document.getElementById('m-message-label').innerHTML = isStylist
    ? 'Tell us about your work <span class="opt">(optional)</span>'
    : 'Anything we should know? <span class="opt">(optional)</span>';
  document.getElementById('m-message').placeholder = isStylist
    ? 'Where you trained, who you have worked with, the clients you bring…'
    : 'Hair length, a style reference, allergies, anything you are worried about…';
  document.getElementById('m-note').innerHTML = isStylist
    ? '<b>No CV needed to apply.</b><br>We\'ll arrange a call and invite you in to see the space.'
    : '<b>This is a request, not a confirmed slot.</b><br>We\'ll come back with times that work and take the £' + SERVICE_DEFAULTS.deposit + ' deposit then.';
}
function resetModalForm(kind) {
  document.getElementById('m-form').style.display = 'block';
  document.getElementById('m-success').style.display = 'none';
  const err = document.getElementById('m-error');
  err.style.display = 'none';
  err.textContent = '';
  document.querySelectorAll('#m-form .field').forEach(f => f.classList.remove('invalid'));
  document.getElementById('m-submit').disabled = false;
  setModalAudience(kind);
}
/* ---------- Calendly ----------
   Booking runs through Calendly. The buttons are unchanged — every [data-book]
   still opens "a booking thing", it is just Calendly's popup now instead of the
   built-in form. The form stays in the page as the fallback for when Calendly
   is blocked or unconfigured, and it is still what stylist applications use. */
function calendlyUrl(service) {
  let url = CONFIG.bookingUrl;
  if (!url) return '';

  const p = new URLSearchParams();
  // Calendly themes the scheduler from the URL, so it can follow Dark/Light
  // instead of dropping a bright white panel onto the dark site.
  const light = document.documentElement.dataset.theme === 'light';
  p.set('background_color', light ? 'FBF4EA' : '180E1A');
  p.set('text_color',       light ? '2E1528' : 'F3EBE3');
  p.set('primary_color',    light ? '8C601F' : 'D9AE62');
  p.set('hide_gdpr_banner', '1');
  // Carries the requested service through to the Calendly booking record —
  // otherwise that context is lost, which the old form used to capture.
  if (service) p.set('utm_content', service.title);

  return url + (url.includes('?') ? '&' : '?') + p.toString();
}

function openBooking(id) {
  const s = serviceById(id);

  if (window.Calendly && CONFIG.bookingUrl) {
    Calendly.initPopupWidget({ url: calendlyUrl(s) });
    return;
  }
  // Calendly blocked, still loading, or no link configured — use the built-in
  // enquiry form rather than leaving the button doing nothing.
  openEnquiryForm(s);
}

/* The original in-page booking form, now the fallback path. */
function openEnquiryForm(s) {
  const known = !!s;
  document.getElementById('m-title').textContent = known ? 'Book ' + s.title : 'Book an appointment';
  document.getElementById('m-sub').textContent = known
    ? [s.category, priceText(s), durationText(s)].filter(Boolean).join(' · ')
    : 'Tell us what you would like and we will find you a slot.';
  document.getElementById('m-service').value = known ? s.id : 'general-booking';
  resetModalForm('client');

  // Pre-select the service so the enquiry arrives with it already filled in.
  const pick = document.getElementById('m-service-pick');
  if (pick) pick.value = known ? s.id : '';

  const d = new Date(); d.setDate(d.getDate() + 3);
  const dateEl = document.getElementById('m-date');
  dateEl.min = new Date().toISOString().split('T')[0];
  dateEl.value = d.toISOString().split('T')[0];
  openModal();
}
function openStylist() {
  document.getElementById('m-title').textContent = 'Work with us';
  document.getElementById('m-sub').textContent = 'Chair rental · commission · full-time — no agency, no admin';
  document.getElementById('m-service').value = 'stylist-application';
  resetModalForm('stylist');
  openModal();
}

/* Populate the service picker from the menu, so it can never drift out of date. */
function bindServicePicker() {
  const pick = document.getElementById('m-service-pick');
  if (!pick) return;
  // Keep the hidden field (used for the payload) in step with the visible picker.
  pick.addEventListener('change', () => {
    document.getElementById('m-service').value = pick.value || 'general-booking';
  });
}
function renderServicePicker() {
  const pick = document.getElementById('m-service-pick');
  if (!pick) return;
  const esc = window.AHC ? AHC.escHtml : (v => v);
  const keep = pick.value;                       // survive a re-render mid-enquiry
  pick.innerHTML = '<option value="">Not sure yet — help me choose</option>' +
    categoryList().map(c => `<optgroup label="${esc(c.name)}">` +
      SERVICES.filter(s => s.category === c.name)
        .map(s => `<option value="${esc(s.id)}">${esc(s.title)} — ${esc(priceText(s))}</option>`).join('') +
      '</optgroup>').join('');
  if (keep && [...pick.options].some(o => o.value === keep)) pick.value = keep;
}

/* ---------- Contact details ----------
   The markup carries the built-in values as static text (which is also the
   fallback, and what search engines see); these hooks overwrite them from the
   live data. One phone number in the sheet, every format derived from it. */
function renderContact() {
  const wa = CONFIG.whatsapp || (window.AHC ? AHC.waLink(CONFIG.phone) : '');
  const tel = CONFIG.phoneHref || (window.AHC ? AHC.telHref(CONFIG.phone) : '');
  const values = {
    phone: CONFIG.phone,
    email: CONFIG.email,
    emailFeedback: CONFIG.emailFeedback,
    address: CONFIG.address,
    companyNo: CONFIG.companyNo,
    nhbfNo: CONFIG.nhbfNo,
    insurer: CONFIG.insurer
  };
  const hrefs = {
    phone: tel,
    email: CONFIG.email ? 'mailto:' + CONFIG.email : '',
    emailFeedback: CONFIG.emailFeedback ? 'mailto:' + CONFIG.emailFeedback : '',
    whatsapp: wa,
    instagram: CONFIG.instagram,
    maps: typeof mapsLinkUrl === 'function' ? mapsLinkUrl() : ''
  };

  document.querySelectorAll('[data-contact]').forEach(el => {
    const v = values[el.dataset.contact];
    if (v === undefined || v === null || v === '') return;   // blank leaves the built-in text
    // Address is the one multi-line field. Split on newline only — splitting on
    // commas would break "Unit 4, Silbury Arcade" across two lines.
    if (el.dataset.contact === 'address' && String(v).indexOf('\n') !== -1) {
      el.textContent = '';
      String(v).split(/\r?\n/).forEach((line, i) => {
        if (i) el.appendChild(document.createElement('br'));
        el.appendChild(document.createTextNode(line.trim()));
      });
    } else {
      el.textContent = v;                                    // textContent, never innerHTML
    }
  });

  document.querySelectorAll('[data-contact-href]').forEach(el => {
    const key = el.dataset.contactHref;
    const v = hrefs[key];
    // Instagram blank is a deliberate "no icon", so it hides rather than keeping
    // a stale link; everything else keeps its built-in href when blank.
    if (key === 'instagram') {
      if (v) { el.href = v; el.hidden = false; } else { el.hidden = true; }
      return;
    }
    if (v) el.href = v;
  });

  const embed = document.querySelector('[data-maps-embed]');
  if (embed && typeof mapEmbedUrl === 'function') embed.src = mapEmbedUrl();
}

/* ---------- Team ----------
   team.html has no server-rendered cards any more; the built-in TEAM array is
   the fallback and the sheet overrides it. */
function renderTeam() {
  const leadEl = document.getElementById('team-lead');
  const gridEl = document.getElementById('team-grid');
  if (!leadEl && !gridEl) return;
  if (typeof TEAM === 'undefined' || !TEAM.length) return;

  const esc = window.AHC ? AHC.escHtml : (v => v);
  const escA = window.AHC ? AHC.escAttr : (v => v);
  const initials = n => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const links = m => {
    const out = [];
    if (m.phone) out.push(`<a href="${escA(window.AHC ? AHC.telHref(m.phone) : 'tel:' + m.phone)}" aria-label="Call ${escA(m.name)}">Call</a>`);
    if (m.email) out.push(`<a href="mailto:${escA(m.email)}" aria-label="Email ${escA(m.name)}">Email</a>`);
    return out.length ? `<div class="team-links">${out.join('')}</div>` : '';
  };

  const lead = TEAM.filter(m => m.lead);
  const rest = TEAM.filter(m => !m.lead);

  if (leadEl) {
    leadEl.innerHTML = lead.map(m => `<div class="team-card team-card--lead">
      <div class="team-avatar" aria-hidden="true">${esc(initials(m.name))}</div>
      <div class="team-lead-body">
        <h4>${esc(m.name)}</h4>
        <div class="team-role">${esc(m.role)}</div>
        ${m.area ? `<div class="team-area">${esc(m.area)}</div>` : ''}
        ${m.quote ? `<p class="team-quote">&ldquo;${esc(m.quote)}&rdquo;</p>` : ''}
        ${links(m)}
      </div>
    </div>`).join('');
  }
  if (gridEl) {
    gridEl.innerHTML = rest.map(m => `<div class="team-card">
      <div class="team-avatar" aria-hidden="true">${esc(initials(m.name))}</div>
      <h4>${esc(m.name)}</h4>
      <div class="team-role">${esc(m.role)}</div>
      ${m.area ? `<div class="team-area">${esc(m.area)}</div>` : ''}
      ${links(m)}
    </div>`).join('');
  }
}

/* ---------- Editable copy ----------
   Small pieces of business wording the owner can change without touching code.
   Blank in the sheet keeps whatever the markup already says. */
function renderCopy() {
  const map = {
    'intro-text': CONFIG.introText,
    'consult-title': CONFIG.consultTitle,
    'consult-body': CONFIG.consultBody,
    'consult-cta': CONFIG.consultCta,
    'chair-rent': CONFIG.chairRent
  };
  document.querySelectorAll('[data-copy]').forEach(el => {
    const v = map[el.dataset.copy];
    if (v) el.textContent = v;
  });
  document.querySelectorAll('[data-deposit]').forEach(el => {
    if (SERVICE_DEFAULTS.deposit !== null && SERVICE_DEFAULTS.deposit !== undefined) {
      el.textContent = money(SERVICE_DEFAULTS.deposit);
    }
  });
}

/* ---------- One render pass ----------
   Everything below is safe to call repeatedly: it only writes markup, never
   binds a listener. data.js calls this again once live data lands. */
function renderAll() {
  renderContact();
  renderCopy();
  renderHours();
  renderTicker();
  renderCategories();
  renderSearch();
  renderServicePicker();
  renderTeam();
  initIcons();          // re-scan: freshly rendered markup contains data-icon
}
window.AHC_RENDER = renderAll;

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const field = input.closest('.field');
  const errEl = document.getElementById(inputId + '-err');
  if (message) {
    field.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    if (errEl) errEl.textContent = message;
  } else {
    field.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    if (errEl) errEl.textContent = '';
  }
  return !message;
}
function validateForm(isStylist) {
  const name = document.getElementById('m-fname').value.trim();
  const email = document.getElementById('m-email').value.trim();
  let ok = setFieldError('m-fname', name ? '' : 'Please enter your first name.');

  let emailMsg = '';
  if (!email) emailMsg = 'Please enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emailMsg = 'Please enter a valid email address, like jane@example.com.';
  ok = setFieldError('m-email', emailMsg) && ok;

  if (isStylist) {
    const spec = document.getElementById('m-specialism').value.trim();
    ok = setFieldError('m-specialism', spec ? '' : 'Please tell us what you specialise in.') && ok;
  }
  return ok;
}

async function submitForm(e) {
  if (e) e.preventDefault();
  const serviceId = document.getElementById('m-service').value;
  const isStylist = serviceId === 'stylist-application';
  const btn = document.getElementById('m-submit');
  const err = document.getElementById('m-error');
  err.style.display = 'none';

  if (!validateForm(isStylist)) {
    const firstInvalid = document.querySelector('#m-form .field.invalid input, #m-form .field.invalid select');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const payload = {
    enquiryType: isStylist ? 'Stylist application' : 'Appointment request',
    service: serviceId,
    firstName: document.getElementById('m-fname').value,
    lastName: document.getElementById('m-lname').value,
    email: document.getElementById('m-email').value,
    phone: document.getElementById('m-phone').value,
    message: document.getElementById('m-message').value
  };
  if (isStylist) {
    payload.specialism = document.getElementById('m-specialism').value;
    payload.experience = document.getElementById('m-experience').value;
    payload.portfolio = document.getElementById('m-portfolio').value;
  } else {
    payload.preferredDate = document.getElementById('m-date').value;
    payload.preferredTime = document.getElementById('m-time').value;
  }

  if (!CONFIG.formspreeEndpoint || CONFIG.formspreeEndpoint.includes('YOUR_FORM_ID')) {
    showSuccess(isStylist); // no live backend configured yet
    return;
  }

  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const res = await fetch(CONFIG.formspreeEndpoint, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Form submission failed');
    showSuccess(isStylist);
  } catch (_) {
    err.innerHTML = 'Something went wrong sending that. Please try again, or message us on <a href="' + CONFIG.whatsapp + '" target="_blank" rel="noopener">WhatsApp</a>.';
    err.style.display = 'block';
    btn.disabled = false;
    btn.textContent = original;
  }
}
function showSuccess(isStylist) {
  document.getElementById('m-form').style.display = 'none';
  document.getElementById('m-success').style.display = 'block';
  document.getElementById('m-success-title').textContent = isStylist ? 'Application sent' : 'Request sent';
  document.getElementById('m-success-txt').textContent = isStylist
    ? 'Thanks — your details are on their way to us.'
    : 'Thanks — your appointment request is on its way.';
  document.getElementById('m-success-next').innerHTML = isStylist
    ? 'We\'ll call you within a few days and invite you in to see the salon and meet the team.'
    : 'We\'ll confirm a time with you and take the <b>£' + SERVICE_DEFAULTS.deposit + ' deposit</b> then. Nothing is charged now.';
  const cta = document.getElementById('m-success-cta');
  cta.textContent = isStylist ? 'Read about working with us →' : 'See how booking works →';
  cta.href = rootPath(isStylist ? 'stylists.html' : 'booking.html');
  document.getElementById('m-close').focus();
}

/* ---------- Page init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initIntro();
  initTheme();
  initNav();
  initMobileMenu();
  initIcons();
  initTabs();
  initConsult();
  initToTop();

  // Bind listeners once...
  bindSearch();
  bindServicePicker();

  // ...then render. Cached or built-in data is already on the globals by now,
  // so the first paint always shows real content - no skeleton needed.
  renderAll();

  // Global click delegation for declarative actions
  document.addEventListener('click', e => {
    const t = e.target.closest("[data-action], [data-book], [data-enquire]");
    if (!t) return;
    if (t.dataset.enquire !== undefined) {
      // "Enquire" opens the in-page form, pre-set to this service. There are no
      // detail pages now, so this is where extra questions go.
      if (menuIsOpen()) setMenu(false);
      openEnquiryForm(serviceById(t.dataset.enquire));
      return;
    }
    if (t.dataset.book !== undefined) {
      // The drawer's own Book button would otherwise leave the drawer open
      // behind the modal, with both trying to own body.style.overflow.
      if (menuIsOpen()) setMenu(false);
      openBooking(t.dataset.book);
      return;
    }
    switch (t.dataset.action) {
      case 'toggle-menu':   toggleMenu(); break;
      case 'close-menu':    setMenu(false); break;
      case 'clear-filters': clearFilters(); break;
      case 'open-stylist':  openStylist(); break;
      case 'consult-collapse': setConsult(true); break;
      case "consult-expand":   setConsult(false); break;
      case "to-top":           scrollToTop(); break;
    }
  });

  // Service detail pages declare their listing on <body data-service="...">
  const sid = document.body.dataset.service;
  if (sid && typeof renderServicePage === 'function') renderServicePage(sid);

  // Modal wiring (markup injected on every page by build.sh)
  const m = modalEl();
  if (m) {
    m.addEventListener('click', e => { if (e.target === m) closeModal(); });
    document.getElementById('m-close').addEventListener('click', closeModal);
    document.getElementById('m-form').addEventListener('submit', submitForm);
    document.addEventListener('keydown', e => {
      if (m.hidden) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key !== 'Tab') return;
      const f = focusableInModal();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // Inline scheduler on the booking page. Calendly's script picks up
  // .calendly-inline-widget on load, so the container just needs to exist.
  const embed = document.getElementById('booking-embed');
  if (embed && CONFIG.bookingUrl && CONFIG.bookingEmbedInline) {
    embed.innerHTML = '<div class="calendly-inline-widget" data-url="' + calendlyUrl(null) +
                      '" style="min-width:320px;height:700px"></div>';
    embed.hidden = false;
    // The manual contact options stay: some people would rather message than
    // pick a slot, and they are the fallback if Calendly fails to load.
    const heading = document.getElementById('booking-manual-heading');
    if (heading) heading.hidden = false;
  }

  // Social links appear only once a real handle is configured — an icon that
  // links to "#" is worse than no icon.
  document.querySelectorAll('[data-social]').forEach(el => {
    const url = CONFIG[el.dataset.social];
    if (url) { el.href = url; el.hidden = false; }
  });

  // "Book online" links open the same Calendly popup rather than navigating
  // away; they keep their WhatsApp href as the no-JS fallback.
  document.querySelectorAll('[data-booking-link]').forEach(el => {
    if (!CONFIG.bookingUrl) return;
    el.href = CONFIG.bookingUrl;
    el.removeAttribute('target');
    el.addEventListener('click', e => {
      if (!window.Calendly) return;   // let the plain link through instead
      e.preventDefault();
      Calendly.initPopupWidget({ url: calendlyUrl(serviceById(document.body.dataset.service)) });
    });
  });
  document.querySelectorAll('[data-complaints]').forEach(el => { if (CONFIG.complaintsFormUrl) el.href = CONFIG.complaintsFormUrl; });
});
