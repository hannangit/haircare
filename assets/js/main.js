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

/* ---------- Booking / enquiry panel ----------
   One panel, two ways through: message us on WhatsApp, or open the scheduler.
   Both come from CONFIG via PROVIDERS, so a new site changes config.js only. */
function openPanel(opts) {
  const esc = window.AHC ? AHC.escHtml : (v => v);
  const service = opts && opts.service ? opts.service : null;
  const serviceName = service ? service.title : null;

  document.getElementById('m-title').textContent =
    (opts && opts.title) || (serviceName ? 'Book ' + serviceName : 'Book an appointment');

  const sub = document.getElementById('m-sub');
  sub.textContent = (opts && opts.sub) ||
    (service ? [service.category, priceText(service), durationText(service)].filter(Boolean).join(' · ') : '');

  // The notice is the same on every route, so it lives in config rather than
  // being repeated in markup.
  const notice = document.getElementById('m-notice');
  const noticeText = (opts && opts.notice !== undefined) ? opts.notice : CONFIG.bookingNotice;
  notice.textContent = noticeText || '';
  notice.hidden = !noticeText;

  const wa = document.getElementById('m-whatsapp');
  const waHref = window.PROVIDERS ? PROVIDERS.waLink((opts && opts.waSubject) || serviceName) : '';
  if (waHref) { wa.href = waHref; wa.hidden = false; } else { wa.hidden = true; }

  const book = document.getElementById('m-book');
  const hasScheduler = window.PROVIDERS && PROVIDERS.bookingProvider() !== 'none';
  book.hidden = !hasScheduler || (opts && opts.hideScheduler === true);
  book.onclick = () => { PROVIDERS.openScheduler(serviceName); };

  document.getElementById('m-note').textContent = (opts && opts.note) || '';
  openModal();
  initIcons();
}

/* Both entry points land on the same panel: "Book" leads with the scheduler,
   "Enquire" leads with the same options because the answer to "can I ask a
   question" is also "message us". */
function openBooking(id) { openPanel({ service: serviceById(id) }); }
function openEnquiryForm(service) { openPanel({ service: service }); }

function openStylist() {
  openPanel({
    title: 'Work with us',
    sub: 'Chair rental · commission · full-time',
    notice: '',
    waSubject: 'renting a chair',
    hideScheduler: true,
    note: 'Send us a message and we will arrange a call and a look around.'
  });
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

  // Inline scheduler and reviews, both provider-driven from config.
  if (window.PROVIDERS) {
    PROVIDERS.renderInlineScheduler();
    PROVIDERS.renderReviews();
  }

  // Social links appear only once a real handle is configured — an icon that
  // links to "#" is worse than no icon.
  document.querySelectorAll('[data-social]').forEach(el => {
    const url = CONFIG[el.dataset.social];
    if (url) { el.href = url; el.hidden = false; }
  });

  // "Book online" links open the scheduler rather than navigating away.
  document.querySelectorAll("[data-booking-link]").forEach(el => {
    el.addEventListener("click", e => {
      if (!window.PROVIDERS || PROVIDERS.bookingProvider() === "none") return;
      e.preventDefault();
      PROVIDERS.openScheduler(null);
    });
  });
  document.querySelectorAll('[data-complaints]').forEach(el => { if (CONFIG.complaintsFormUrl) el.href = CONFIG.complaintsFormUrl; });
});
