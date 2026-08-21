document.getElementById("out").textContent = "script parsed and started";
const out = [];
const flush = () => { document.getElementById('out').textContent = out.join('\n'); };
const log  = (...a) => { out.push(a.join(' ')); flush(); };
const pass = (name, ok, detail) => log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   ' + detail : ''));
let fails = 0;
const S = w => (w && w.AHC ? w.AHC.snapshot() : {});
const chk = (name, ok, detail) => { if (!ok) fails++; pass(name, ok, detail); };

function frame(src) {
  return new Promise(resolve => {
    document.querySelectorAll("iframe").forEach(x => x.remove());   // one at a time
    const f = document.createElement("iframe");
    f.style.cssText = 'width:1280px;height:900px;border:0;position:absolute;left:-9999px';
    f.src = src;
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      resolve({ f, w: f.contentWindow, d: f.contentDocument });
    };
    f.onload = finish;
    setTimeout(finish, 2500);   // never wait forever on a blocked subresource
    document.body.appendChild(f);
  });
}

// Load a page, then apply a payload through the real data layer and re-render.
async function ready(w, ms) {
  const t0 = Date.now();
  while (!(w && w.AHC && w.AHC_RENDER) && Date.now() - t0 < (ms || 8000)) {
    await new Promise(r => setTimeout(r, 100));
  }
  return !!(w && w.AHC);
}

async function frameReady(src) {
  const r = await frame(src);
  await ready(r.f.contentWindow);
  return { f: r.f, w: r.f.contentWindow, d: r.f.contentDocument };
}

async function withPayload(src, url) {
  const { f } = await frame(src);
  if (!await ready(f.contentWindow)) chk(src + " loaded its data layer", false, "AHC never appeared");
  const w = f.contentWindow, d = f.contentDocument;
  let payload = null;
  try {
    const res = await fetch(url);
    payload = await res.json();
  } catch (e) { /* handled by the assertions */ }
  if (payload && w && w.AHC) {
    w.AHC.apply(payload);
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 250));
  }
  return { f, w, d, payload };
}

(async function () {

  // ─── 1. FIXTURE REPLACES FALLBACK ───────────────────────────────────────
  log('=== 1. Live fixture data replaces the built-in values ===');
  {
    const { w, d } = await withPayload('../services.html', '../seed/test-fixture.json');
    const cards = [...d.querySelectorAll('.prop')];
    const names = cards.map(c => c.querySelector('h4').textContent.trim());
    chk('fallback replaced by fixture', names.every(n => n.startsWith('FIXTURE')),
        names.slice(0, 3).join(' | '));
    chk('row count is the fixture\'s 3', cards.length === 3, 'got ' + cards.length);

    // trap 1: client-side sort
    chk('sorted by sort_order client-side', names[0] === 'FIXTURE Sorted First',
        'first = ' + names[0]);

    // "£42.50" -> 42.5
    const amounts = cards.map(c => c.querySelector('.amount').textContent.trim());
    chk('"£42.50" coerced to a number', amounts[0] === '£42.5', 'got ' + amounts[0]);

    // zero vs empty
    const freeCard = cards.find(c => c.querySelector('h4').textContent.includes('Free Consultation'));
    chk('price 0 renders as Free, not "On request"',
        freeCard && freeCard.querySelector('.amount').textContent.trim() === 'Free',
        freeCard ? freeCard.querySelector('.amount').textContent.trim() : 'card missing');

    // trap 4 / new category learned by the filter
    const opts = [...d.getElementById('f-category').options].map(o => o.value);
    chk('filter learned the sheet-only category', opts.includes('FIXTURE Nails'), opts.join(','));

    // filters still work on dynamic data
    d.getElementById('f-category').value = 'FIXTURE Nails';
    d.getElementById('f-category').dispatchEvent(new w.Event('change'));
    await new Promise(r => setTimeout(r, 100));
    chk('filtering dynamic data works', d.querySelectorAll('.prop').length === 1,
        'showing ' + d.querySelectorAll('.prop').length);

    // trap 3: selection survives a re-render
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 100));
    chk('filter selection survives re-render',
        d.getElementById('f-category').value === 'FIXTURE Nails',
        'value = ' + d.getElementById('f-category').value);

    // trap 2: re-render must not double-bind
    const before = d.querySelectorAll('.prop').length;
    w.AHC_RENDER(); w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 100));
    chk('repeated renders do not duplicate cards',
        d.querySelectorAll('.prop').length === before, 'now ' + d.querySelectorAll('.prop').length);
  }

  // ─── 2. CONTACT DETAILS EVERYWHERE ──────────────────────────────────────
  log('');
  log('=== 2. Contact details update on every page ===');
  for (const page of ['../index.html', '../visit-us.html', '../care/complaints.html', '../booking.html']) {
    const { w, d } = await withPayload(page, '../seed/test-fixture.json');
    const tel  = d.querySelector('[data-contact-href="phone"]');
    const wa   = d.querySelector('[data-contact-href="whatsapp"]');
    const mail = d.querySelector('[data-contact="email"]');
    const okTel = !tel  || tel.getAttribute('href') === 'tel:+447700900999';
    const okWa  = !wa   || wa.getAttribute('href') === 'https://wa.me/447700900999';
    const okMail= !mail || mail.textContent.trim() === 'fixture-hello@example.com';
    chk(page + ' contact updated', okTel && okWa && okMail,
        (tel ? tel.getAttribute('href') : '-') + '  ' + (wa ? wa.getAttribute('href') : '-'));
  }
  // trap 7: "+44 (0)7700 900999" must not become 4407700900999
  {
    const { w, d } = await withPayload('../index.html', '../seed/test-fixture.json');
    const wa = d.querySelector('[data-contact-href="whatsapp"]');
    chk('trunk-zero phone normalised (no 4407700...)',
        wa && wa.getAttribute('href') === 'https://wa.me/447700900999',
        wa ? wa.getAttribute('href') : 'not found');
    const tel = d.querySelector('[data-contact-href="phone"]');
    chk('tel: derived from the same single number',
        tel && tel.getAttribute('href') === 'tel:+447700900999',
        tel ? tel.getAttribute('href') : 'not found');
    const addr = d.querySelector('[data-contact="address"]');
    chk('address kept on one line (no comma split)',
        addr && addr.textContent.indexOf('Unit 9, Fixture House') === 0,
        addr ? addr.textContent.trim() : 'not found');
    const ig = d.querySelector('[data-contact-href="instagram"]');
    chk('instagram shown when the cell has a URL', ig && !ig.hidden,
        ig ? ('hidden=' + ig.hidden) : 'not found');
  }

  // ─── 3. PROMOS + DATE RANGES ────────────────────────────────────────────
  log('');
  log('=== 3. Promotions and date windows ===');
  {
    const { w, d } = await withPayload('../index.html', '../seed/test-fixture.json');
    const items = [...d.querySelectorAll('.ticker-item')].map(i => i.textContent.trim());
    chk('running promo shown', items.some(t => t.includes('currently running')), items[0] || '-');
    chk('expired promo hidden', !items.some(t => t.includes('has expired')));
    chk('future promo hidden', !items.some(t => t.includes('not started yet')));
  }

  // ─── 4. HOURS + TEAM ────────────────────────────────────────────────────
  log('');
  log('=== 4. Hours and team ===');
  {
    const { w, d } = await withPayload('../visit-us.html', '../seed/test-fixture.json');
    const days = [...d.querySelectorAll('.hours-day')].map(x => x.textContent.trim());
    chk('hours came from the fixture', days[0].startsWith('FIXTURE Monday'), days[0]);
    const times = [...d.querySelectorAll('.hours-time')].map(x => x.textContent.trim());
    chk('blank hours cell means Closed', times[1] === 'Closed', 'got ' + times[1]);
  }
  {
    const { w, d } = await withPayload('../team.html', '../seed/test-fixture.json');
    chk('lead card rendered', /FIXTURE Owner/.test(d.getElementById('team-lead').textContent));
    chk('grid rendered', /FIXTURE Stylist/.test(d.getElementById('team-grid').textContent));
    chk('team count matches fixture', d.querySelectorAll('.team-card').length === 2,
        'cards = ' + d.querySelectorAll('.team-card').length);
  }

  // ─── 5. MALFORMED PAYLOAD ───────────────────────────────────────────────
  log('');
  log('=== 5. Malformed payload: bad rows skipped, markup inert ===');
  {
    const { w, d } = await withPayload("../services.html", "../seed/test-malformed.json");
    const cards = [...d.querySelectorAll('.prop')];
    const names = cards.map(c => c.querySelector('h4').textContent.trim());
    chk('rows with no id/name skipped', !names.some(n => n.includes('must be skipped')), names.join(' | '));
    chk('id with spaces rejected', !S(w).SERVICES.some(s => s.id.includes(' ')));
    chk('good rows still rendered', cards.length === 3, 'rendered ' + cards.length);

    const bad = S(w).SERVICES.find(s => s.id === 'bad-price');
    chk('"ninety" -> null, not 0', bad && bad.price === null, 'price = ' + (bad && bad.price));
    chk('unreadable duration -> null', bad && bad.duration === null);

    const wrong = S(w).SERVICES.find(s => s.id === 'wrong-types');
    chk('hair "banana" -> null', wrong && wrong.hair === null, 'hair = ' + (wrong && wrong.hair));
    chk('patch_test "maybe" -> false', wrong && wrong.patchTest === false);

    // markup must be inert
    chk('no <script> element injected from a cell', d.querySelectorAll('.prop script').length === 0);
    chk('no <img onerror> injected', d.querySelectorAll('.prop h4 img').length === 0);
    const xss = names.find(n => n.includes('img src'));
    chk('tags rendered as text, not markup', !!xss, xss || 'not found');

    chk('javascript: instagram dropped', S(w).CONFIG.instagram === '', 'got "' + S(w).CONFIG.instagram + '"');
    chk('data: booking_url dropped', S(w).CONFIG.bookingUrl !== "data:text/html,<script>alert(1)</script>");
    const promoLinks = [...d.querySelectorAll('.ticker-item a')].map(a => a.getAttribute('href'));
    chk('javascript: promo link dropped', !promoLinks.some(h => /javascript:/i.test(h || '')),
        promoLinks.join(',') || 'none');

    chk('deposit "free" ignored, kept previous', S(w).SERVICE_DEFAULTS.deposit === 20,
        'deposit = ' + S(w).SERVICE_DEFAULTS.deposit);
    chk('empty hours tab did not wipe hours', S(w).OPENING_HOURS.length === 7,
        'hours rows = ' + S(w).OPENING_HOURS.length);
  }

  // ─── 6. FAILURE MODES ───────────────────────────────────────────────────
  log('');
  log('=== 6. Failure modes ===');
  // Cache-before-paint: seed a valid cache, then load a page with NO endpoint.
  // Nothing calls apply() here — if the fixture values appear, the cache was
  // applied synchronously at parse time, before the first render.
  {
    const payload = await (await fetch('../seed/test-fixture.json')).json();
    try {
      localStorage.setItem('ahc-sheet-cache',
        JSON.stringify({ schema: '1', at: Date.now(), payload: payload }));
    } catch (e) {}
    const { w, d } = await frameReady('../services.html');
    const names = [...d.querySelectorAll('.prop h4')].map(x => x.textContent.trim());
    chk('dead endpoint + valid cache: cached data renders',
        names.length === 3 && names[0] === 'FIXTURE Sorted First', names.join(' | '));
    chk('cache applied before first paint (no apply() called here)',
        d.querySelectorAll('.prop').length === 3);

    // An expired cache must be ignored in favour of the built-in values.
    try {
      localStorage.setItem('ahc-sheet-cache',
        JSON.stringify({ schema: '1', at: Date.now() - (60 * 60 * 1000), payload: payload }));
    } catch (e) {}
    const r2 = await frameReady('../services.html');
    chk('expired cache ignored, built-in menu returns',
        r2.d.querySelectorAll('.prop').length === 25,
        'cards = ' + r2.d.querySelectorAll('.prop').length);

    // A cache written by an older schema must not be trusted.
    try {
      localStorage.setItem('ahc-sheet-cache',
        JSON.stringify({ schema: '0', at: Date.now(), payload: payload }));
    } catch (e) {}
    const r3 = await frameReady('../services.html');
    chk('stale schema version ignored',
        r3.d.querySelectorAll('.prop').length === 25,
        'cards = ' + r3.d.querySelectorAll('.prop').length);

    try { localStorage.removeItem('ahc-sheet-cache'); } catch (e) {}
  }
  {
    // endpoint dead, no cache
    const { w, d } = await frameReady('../services.html');
    await new Promise(r => setTimeout(r, 300));
    try { w.localStorage.removeItem('ahc-sheet-cache'); } catch (e) {}
    S(w).CONFIG.sheetEndpoint = '../definitely-not-there.json';
    w.AHC.reload();
    await new Promise(r => setTimeout(r, 900));
    chk('dead endpoint + no cache: built-in menu still renders',
        d.querySelectorAll('.prop').length === 25, 'cards = ' + d.querySelectorAll('.prop').length);
    const body = d.body.textContent;
    chk('no customer-facing error text', !/error|failed|unavailable|something went wrong/i.test(body));
  }
  {
    // endpoint returns HTML (the "not shared with Anyone" case, trap 4)
    const { w, d } = await frameReady('../services.html');
    await new Promise(r => setTimeout(r, 300));
    S(w).CONFIG.sheetEndpoint = '../index.html';
    let warned = '';
    const orig = w.console.warn; w.console.warn = (...a) => { warned += a.join(' '); orig.apply(w.console, a); };
    w.AHC.reload();
    await new Promise(r => setTimeout(r, 900));
    chk('HTML response detected with a clear message', /HTML, not JSON/.test(warned), warned.slice(0, 90));
    chk('page still renders after HTML response', d.querySelectorAll('.prop').length === 25);
  }
  {
    // localStorage throwing
    const { w, d } = await frameReady('../services.html');
    await new Promise(r => setTimeout(r, 300));
    Object.defineProperty(w, 'localStorage', {
      get() { throw new Error('storage blocked'); }, configurable: true
    });
    let threw = false;
    try { w.AHC.reload(); await new Promise(r => setTimeout(r, 500)); } catch (e) { threw = true; }
    chk('localStorage throwing does not break the page', !threw);
    chk('page still renders with storage blocked', d.querySelectorAll('.prop').length >= 3,
        'cards = ' + d.querySelectorAll('.prop').length);
  }

  // ─── 7. REGRESSION ──────────────────────────────────────────────────────
  log('');
  log('=== 7. Regression: existing UI still works ===');
  {
    const { w, d } = await frameReady('../services.html');
    await new Promise(r => setTimeout(r, 400));
    chk('nav links present', d.querySelectorAll('.nav-links > a').length === 4);
    d.querySelector('.burger').click();
    await new Promise(r => setTimeout(r, 350));
    const m = d.getElementById('mmenu');
    chk('mobile drawer opens', m.classList.contains('open'));
    d.querySelector('.menu-close').click();
    await new Promise(r => setTimeout(r, 350));
    chk('mobile drawer closes', !m.classList.contains('open'));

    d.querySelector('[data-enquire]').click();
    await new Promise(r => setTimeout(r, 200));
    chk("Enquire opens the booking panel", !d.getElementById("modal").hidden);
    chk("panel offers WhatsApp with the service prefilled",
        /Knotless%20Box%20Braids|Knotless+Box+Braids/.test(d.getElementById("m-whatsapp").getAttribute("href") || ""),
        decodeURIComponent((d.getElementById("m-whatsapp").getAttribute("href") || "").split("text=")[1] || ""));
    d.getElementById('m-close').click();

    const bookBtns = d.querySelectorAll('[data-book]');
    chk('book buttons still present', bookBtns.length > 0, bookBtns.length + ' buttons');
    chk('ticker rendered', d.querySelectorAll('.ticker-item').length > 0);
    chk('theme switch present', d.querySelectorAll('[data-theme-set]').length === 4);
    chk('no horizontal overflow', d.documentElement.scrollWidth <= w.innerWidth,
        d.documentElement.scrollWidth + ' vs ' + w.innerWidth);
  }

  log('');
  log(fails === 0 ? '=== ALL TESTS PASSED ===' : '=== ' + fails + ' TEST(S) FAILED ===');
  document.getElementById('out').textContent = out.join('\n');
})().catch(e => {
  document.getElementById('out').textContent = out.join('\n') + '\n\nHARNESS ERROR: ' + e.message + '\n' + e.stack;
});
