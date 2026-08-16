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
function initHours() {
  const targets = document.querySelectorAll('[data-hours]');
  if (!targets.length) return;
  // getDay() is Sunday-first; OPENING_HOURS is Monday-first.
  const todayIndex = (new Date().getDay() + 6) % 7;
  const rows = OPENING_HOURS.map((h, i) => `<div class="hours-row${i === todayIndex ? ' is-today' : ''}">
      <span class="hours-day">${h.day}${i === todayIndex ? ' <span class="hours-today">Today</span>' : ''}</span>
      <span class="hours-time${h.hours === 'Closed' ? ' is-closed' : ''}">${h.hours}</span>
    </div>`).join('');
  targets.forEach(el => { el.innerHTML = rows; });
}

/* ---------- Announcement ticker ----------
   The track holds the message list twice: the keyframe translates -50%, which
   lands exactly on the start of the second copy, so the loop has no visible
   seam. The duplicate is aria-hidden so it isn't read out twice. */
function initTicker() {
  const track = document.getElementById('ticker-track');
  if (!track || typeof TICKER_MESSAGES === 'undefined') return;

  const today = OPENING_HOURS[(new Date().getDay() + 6) % 7];
  const items = [
    today.hours === 'Closed'
      ? '<b>Closed today</b> — book online any time'
      : '<b>Open today</b> ' + today.hours,
    ...TICKER_MESSAGES
  ];
  const group = items.map(m => '<span class="ticker-item">' + m + '</span>').join('');

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

/* ---------- ServiceCard — the single card component used everywhere ---------- */
function ServiceCard(s) {
  const href = rootPath('services/' + s.id + '.html');

  // Only facts that vary between services. "Free consultation" is true of
  // everything on the menu, so putting it on every card carries no signal.
  const badges = [
    { on: s.hair === 'included', label: 'Hair included' },
    { on: s.hair === 'client', label: 'Bring your own hair' },
    { on: s.hair === null, label: 'No extension hair' },
    { on: s.kids, label: 'Kids welcome' },
    { on: s.patchTest, label: 'Patch test needed', warn: true }
  ].filter(b => b.on);

  return `<article class="prop">
    <a href="${href}" tabindex="-1" aria-hidden="true">
      <div class="ph">
        <img src="${s.images[0]}" alt="${s.alt}" loading="lazy">
        <span class="roomtype">${s.category}</span>
      </div>
    </a>
    <div class="body">
      <h4><a href="${href}">${s.title}</a></h4>
      <div class="meta">${s.description ? s.description.split('. ')[0] + '.' : s.category}</div>
      <div class="price-row">
        <span class="amount${priceOf(s) ? '' : ' amount--tbc'}">${priceOf(s) ? money(s.price) : 'On request'}</span>
        ${priceOf(s) ? '<span class="per">from</span>' : ''}
      </div>
      <div class="avail">${icon('clock', 14)}${durationText(s)}</div>
      ${badges.length ? `<ul class="amenity-list">
        ${badges.map(b => `<li${b.warn ? ' class="warn"' : ''}>${b.label}</li>`).join('')}
      </ul>` : ''}
      <div class="actions">
        <a class="btn btn-outline btn-sm" href="${href}">Details</a>
        <button class="btn btn-gold btn-sm" type="button" data-book="${s.id}">Book</button>
      </div>
    </div>
  </article>`;
}

/* ---------- Category tiles (homepage) ----------
   The homepage advertises the kinds of work we do, not individual line items;
   each tile deep-links into the menu with the Category filter already applied. */
function initCategories() {
  const el = document.getElementById('categories');
  if (!el) return;
  el.innerHTML = categoryList().map(c => {
    const n = categoryCount(c.name);
    return `<a class="cat-tile" href="${rootPath('services.html')}?category=${encodeURIComponent(c.name)}">
      <span class="cat-tile-name">${c.name}</span>
      <span class="cat-tile-blurb">${c.blurb}</span>
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
function initSearch() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  // A filter with no data behind it can only ever return nothing, so hide it
  // until the corresponding fields are populated in services-data.js.
  const filterFields = { 'f-category': 'category', 'f-price': 'price', 'f-duration': 'duration' };
  Object.entries(filterFields).forEach(([id, field]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const group = el.closest('.control-group');
    if (group) group.hidden = !hasFilterableData(field);
  });

  document.querySelectorAll('[data-filter]').forEach(el => el.addEventListener('change', applyFilters));
  const searchBtn = document.querySelector('[data-action="search"]');
  if (searchBtn) searchBtn.addEventListener('click', applyFilters);

  // Deep link from a homepage category tile: /services.html?category=Braids
  const category = new URLSearchParams(location.search).get('category');
  const catEl = document.getElementById('f-category');
  if (category && catEl && [...catEl.options].some(o => o.value === category)) {
    catEl.value = category;
    applyFilters();
    return;
  }
  renderGrid(SERVICES);
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
function openBooking(id) {
  const s = serviceById(id);
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
function initServicePicker() {
  const pick = document.getElementById('m-service-pick');
  if (!pick) return;
  pick.innerHTML = '<option value="">Not sure yet — help me choose</option>' +
    categoryList().map(c => `<optgroup label="${c.name}">` +
      SERVICES.filter(s => s.category === c.name)
        .map(s => `<option value="${s.id}">${s.title} — ${priceText(s)}</option>`).join('') +
      '</optgroup>').join('');
  // Keep the hidden field (used for the payload) in step with the visible picker.
  pick.addEventListener('change', () => {
    document.getElementById('m-service').value = pick.value || 'general-booking';
  });
}

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
  initHours();
  initTicker();
  initConsult();
  initCategories();
  initSearch();
  initServicePicker();

  // Global click delegation for declarative actions
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action], [data-book]');
    if (!t) return;
    if (t.dataset.book !== undefined) { openBooking(t.dataset.book); return; }
    switch (t.dataset.action) {
      case 'toggle-menu':   toggleMenu(); break;
      case 'close-menu':    setMenu(false); break;
      case 'clear-filters': clearFilters(); break;
      case 'open-stylist':  openStylist(); break;
      case 'consult-collapse': setConsult(true); break;
      case 'consult-expand':   setConsult(false); break;
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

  // Booking widget, only once a URL is configured. An empty iframe would render
  // as a broken frame, so the on-page booking options stay until it is set.
  const embed = document.getElementById('booking-embed');
  if (embed && CONFIG.bookingEmbedUrl) {
    embed.innerHTML = '<iframe src="' + CONFIG.bookingEmbedUrl + '" title="Book an appointment" loading="lazy"></iframe>';
    embed.hidden = false;
    const manual = document.getElementById('booking-manual');
    if (manual) manual.hidden = true;
  }

  // Social links appear only once a real handle is configured — an icon that
  // links to "#" is worse than no icon.
  document.querySelectorAll('[data-social]').forEach(el => {
    const url = CONFIG[el.dataset.social];
    if (url) { el.href = url; el.hidden = false; }
  });

  // CONFIG-driven links (each already has a working WhatsApp fallback href)
  document.querySelectorAll('[data-booking-link]').forEach(el => { if (CONFIG.bookingUrl) el.href = CONFIG.bookingUrl; });
  document.querySelectorAll('[data-complaints]').forEach(el => { if (CONFIG.complaintsFormUrl) el.href = CONFIG.complaintsFormUrl; });
});
