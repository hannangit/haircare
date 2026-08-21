document.getElementById('out').textContent = 'running...';
const out = [];
const flush = () => { document.getElementById('out').textContent = out.join('\n'); };
const log = (...a) => { out.push(a.join(' ')); flush(); };
let fails = 0;
const C = w => (w && w.AHC ? w.AHC.snapshot().CONFIG : {});
// Top-level `const` is lexical, not a window property, so the globals are only
// reachable through the accessor the data layer exposes.
const S = w => (w && w.AHC ? w.AHC.snapshot() : {});
const chk = (n, ok, d) => { if (!ok) fails++; log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '   ' + d : '')); };

function frame(src) {
  return new Promise(res => {
    document.querySelectorAll('iframe').forEach(x => x.remove());
    const f = document.createElement('iframe');
    f.style.cssText = 'width:1280px;height:900px;border:0;position:absolute;left:-9999px';
    f.src = src;
    let done = false;
    const fin = () => { if (!done) { done = true; res(f); } };
    f.onload = fin; setTimeout(fin, 3000);
    document.body.appendChild(f);
  });
}
async function ready(f) {
  const t0 = Date.now();
  while (!(f.contentWindow && f.contentWindow.PROVIDERS && f.contentWindow.AHC_RENDER) && Date.now() - t0 < 8000) {
    await new Promise(r => setTimeout(r, 100));
  }
  return { w: f.contentWindow, d: f.contentDocument };
}

(async function () {
  log('=== A. WhatsApp button ===');
  {
    const { w, d } = await ready(await frame('../services.html'));
    d.querySelector('[data-enquire]').click();
    await new Promise(r => setTimeout(r, 300));
    const wa = d.getElementById('m-whatsapp');
    chk('panel opens', !d.getElementById('modal').hidden);
    chk('whatsapp button visible', wa && !wa.hidden);
    const href = wa.getAttribute('href');
    // Derived from CONFIG, not hardcoded: the phone number is a per-site value
    // and this suite has to keep passing after someone changes it.
    const expected = String(C(w).whatsappNumber || C(w).phone)
      .replace(/[^\d+]/g, '').replace(/^(\+\d{1,3})0(\d)/, '$1$2').replace(/^\+/, '')
      .replace(/^0(\d)/, '44$1');
    chk('wa.me link with the configured number',
        href.indexOf('https://wa.me/' + expected + '?text=') === 0,
        href.slice(0, 60) + '  (expected ' + expected + ')');
    const msg = decodeURIComponent((href.split('text=')[1] || ''));
    chk('message prefilled with business name', msg.includes('African Hair Care'), msg);
    chk('message prefilled with the service', /Knotless Box Braids/.test(msg), msg);
    chk('no formspree form left in the modal', !d.getElementById('m-form'));
  }

  log('');
  log('=== B. Booking notice ===');
  {
    const { w, d } = await ready(await frame('../services.html'));
    d.querySelector('[data-book]').click();
    await new Promise(r => setTimeout(r, 300));
    const n = d.getElementById('m-notice');
    chk('notice shown', n && !n.hidden);
    chk('mentions arriving at start time', /arrive at your booked start time/i.test(n.textContent));
    chk('mentions running longer than the slot', /run longer than the slot/i.test(n.textContent));
    chk('mentions payment confirms the booking', /only confirmed once payment/i.test(n.textContent));
    chk('mentions the calendar just shows slots', /just shows you our available slots/i.test(n.textContent));
    chk('scheduler button present', !d.getElementById('m-book').hidden);
  }

  log('');
  log('=== C. Provider switching (no markup changes) ===');
  {
    const { w, d } = await ready(await frame('../index.html'));
    chk('no calendly script hardcoded in the page', !d.querySelector('script[src*="calendly"]'));
    chk('no jotform script hardcoded in the page', !d.querySelector('script[src*="jotform"][data-static]'));
    chk('reviews host exists', !!d.getElementById('reviews-embed'));
    await new Promise(r => setTimeout(r, 1200));
    chk('jotform injected from config', !!d.querySelector('#reviews-embed script[src*="jotform"]'),
        'provider = ' + C(w).reviewsProvider);

    // switch provider at runtime and re-render
    C(w).reviewsProvider = 'iframe';
    C(w).reviewsId = 'https://example.com/reviews';
    w.PROVIDERS.renderReviews();
    await new Promise(r => setTimeout(r, 200));
    const ifr = d.querySelector('#reviews-embed iframe');
    chk('switching to iframe provider works', !!ifr && ifr.src.indexOf('example.com') !== -1,
        ifr ? ifr.src : 'none');

    // javascript: url must be refused
    C(w).reviewsId = 'javascript:alert(1)';
    w.PROVIDERS.renderReviews();
    await new Promise(r => setTimeout(r, 200));
    chk('javascript: reviews URL refused', !d.querySelector('#reviews-embed iframe'));
  }

  log('');
  log('=== D. bookingProvider = none falls back to WhatsApp ===');
  {
    const { w, d } = await ready(await frame('../services.html'));
    C(w).bookingProvider = 'none';
    d.querySelector('[data-book]').click();
    await new Promise(r => setTimeout(r, 300));
    chk('scheduler button hidden', d.getElementById('m-book').hidden);
    chk('whatsapp still offered', !d.getElementById('m-whatsapp').hidden);
  }

  log('');
  log('=== E. Google Bookings provider ===');
  {
    const { w, d } = await ready(await frame('../book-appointment.html'));
    C(w).bookingProvider = 'google';
    C(w).bookingUrl = 'https://calendar.google.com/calendar/appointments/schedules/ABC123';
    w.PROVIDERS.renderInlineScheduler();
    await new Promise(r => setTimeout(r, 400));
    const ifr = d.querySelector('#booking-embed iframe');
    chk('google schedule embeds inline', !!ifr, ifr ? ifr.src.slice(0, 70) : 'none');
    chk('gv=true appended for embedding', ifr && ifr.src.indexOf('gv=true') !== -1);
  }

  log('');
  log('=== F. Regression ===');
  {
    const { w, d } = await ready(await frame('../services.html'));
    chk('menu still renders', d.querySelectorAll('.prop').length === 25,
        'cards = ' + d.querySelectorAll('.prop').length);
    chk('nav intact', d.querySelectorAll('.nav-links > a').length === 4);
    chk('ticker renders', d.querySelectorAll('.ticker-item').length > 0);
    chk('no horizontal overflow', d.documentElement.scrollWidth <= w.innerWidth,
        d.documentElement.scrollWidth + ' vs ' + w.innerWidth);
    d.querySelector('.burger').click();
    await new Promise(r => setTimeout(r, 350));
    chk('drawer opens', d.getElementById('mmenu').classList.contains('open'));
  }

  log('');
  log('=== G. Enquire and Book do not offer each other ===');
  {
    const { w, d } = await ready(await frame('../services.html'));

    d.querySelector('.prop [data-enquire]').click();
    await new Promise(r => setTimeout(r, 300));
    chk('enquire: titled as a question', /^Ask about /.test(d.getElementById('m-title').textContent),
        d.getElementById('m-title').textContent);
    chk('enquire: no scheduler button', d.getElementById('m-book').hidden);
    chk('enquire: whatsapp offered', !d.getElementById('m-whatsapp').hidden);
    chk('enquire: call offered', !d.getElementById('m-call').hidden,
        d.getElementById('m-call').getAttribute('href'));
    chk('enquire: dials the configured number',
        /^tel:\+?\d+$/.test(d.getElementById('m-call').getAttribute('href') || ''));
    chk('enquire: booking terms not shown', d.getElementById('m-notice').hidden);

    d.getElementById('m-close').click();
    await new Promise(r => setTimeout(r, 250));

    d.querySelector('.prop [data-book]').click();
    await new Promise(r => setTimeout(r, 300));
    chk('book: titled as a booking', /^Book /.test(d.getElementById('m-title').textContent),
        d.getElementById('m-title').textContent);
    chk('book: scheduler offered', !d.getElementById('m-book').hidden);
    chk('book: no whatsapp shortcut', d.getElementById('m-whatsapp').hidden);
    chk('book: no call shortcut', d.getElementById('m-call').hidden);
    chk('book: booking terms shown', !d.getElementById('m-notice').hidden);
  }

  log('');
  log('=== H. Chat widget ===');
  {
    const { w, d } = await ready(await frame('../index.html'));
    await new Promise(r => setTimeout(r, 400));
    const L = d.getElementById('chat-launcher');
    const P = d.getElementById('chat-panel');
    chk('launcher present', !!L);
    chk('panel closed at rest', P.hidden);

    L.click();
    await new Promise(r => setTimeout(r, 250));
    chk('panel opens', !P.hidden);
    chk('greeting shown', d.querySelectorAll('.chat-row--in').length === 1);
    const chips = d.querySelectorAll('.chat-chip');
    chk('questions offered', chips.length > 0, 'chips = ' + chips.length);

    chips[0].click();
    await new Promise(r => setTimeout(r, 900));
    chk('question echoed as the visitor', d.querySelectorAll('.chat-row--out').length === 1);
    chk('answer returned',
        d.querySelectorAll('.chat-row--in:not(.chat-row--typing) .chat-bubble').length === 2);
    chk('answered question removed from the list',
        d.querySelectorAll('.chat-chip').length === chips.length - 1);
    chk('whatsapp handover present',
        /^https:\/\/wa\.me\//.test(d.getElementById('chat-wa').getAttribute('href') || ''));

    // A sheet cell must not be able to contribute markup here either.
    S(w).FAQ.length = 0;
    S(w).FAQ.push({ q: '<img src=x onerror=alert(1)>', a: '<script>bad()<\/script>', sort: 1 });
    w.AHC_CHAT.refresh();
    await new Promise(r => setTimeout(r, 200));
    d.querySelector('.chat-chip').click();
    await new Promise(r => setTimeout(r, 900));
    chk('no img injected from a cell', !d.querySelector('.chat-log img'));
    chk('no script injected from a cell', !d.querySelector('.chat-log script'));
    // The LAST outbound bubble: the first is the genuine question asked above.
    const outRows = d.querySelectorAll('.chat-row--out');
    chk('tags rendered as text', /<img src=x/.test(outRows[outRows.length - 1].textContent),
        outRows[outRows.length - 1].textContent.slice(0, 40));

    L.click();
    await new Promise(r => setTimeout(r, 200));
    chk('panel closes again', P.hidden);
  }

  log('');
  log(fails === 0 ? '=== ALL PROVIDER TESTS PASSED ===' : '=== ' + fails + ' FAILED ===');
})().catch(e => { log(''); log('HARNESS ERROR: ' + e.message); log(e.stack); });
