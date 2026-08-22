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
  log('=== I. One cell renames the business everywhere ===');
  {
    const { w, d } = await ready(await frame('../index.html'));
    w.AHC.apply({ ok: true, tabs: { contact: [
      { key: 'business_name', value: 'Shadai Beauty Rooms' },
      { key: 'phone', value: '07123 456789' },
      { key: 'email_general', value: 'hi@shadai.co.uk' }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 300));
    chk('header brand renamed', d.querySelector('.brand').textContent === 'Shadai Beauty Rooms',
        d.querySelector('.brand').textContent);
    chk('footer brand renamed', d.querySelector('.foot-brand').textContent === 'Shadai Beauty Rooms');
    chk('legal line renamed', /^Shadai Beauty Rooms Ltd/.test(d.querySelector('.footer-legal p').textContent.trim()),
        d.querySelector('.footer-legal p').textContent.trim());
    chk('copyright renamed', /Shadai Beauty Rooms Ltd$/.test(d.querySelector('.footer-copyright').textContent.trim()));
    chk('phone follows', d.querySelector('[data-contact="phone"]').textContent === '07123 456789');
    chk('email follows', d.querySelector('[data-contact="email"]').textContent === 'hi@shadai.co.uk');
    chk('whatsapp link rebuilt from the new number',
        d.querySelector('[data-contact-href="whatsapp"]').getAttribute('href').indexOf('wa.me/447123456789') !== -1,
        d.querySelector('[data-contact-href="whatsapp"]').getAttribute('href').slice(0, 40));
  }

  log('');
  log('=== J. Homepage hero comes from the sheet ===');
  {
    const { w, d } = await ready(await frame('../index.html'));
    w.AHC.apply({ ok: true, tabs: { settings: [
      { key: 'hero_eyebrow', value: 'Bletchley, Milton Keynes' },
      { key: 'hero_title', value: 'Textured hair, *properly looked after*.' },
      { key: 'hero_text', value: 'A new paragraph straight from the spreadsheet.' }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 300));
    const h1 = d.querySelector('#zone-hero');
    chk('eyebrow from the sheet', d.querySelector('.ghero-in .eyebrow').textContent === 'Bletchley, Milton Keynes');
    chk('headline from the sheet', h1.textContent === 'Textured hair, properly looked after.', h1.textContent);
    chk('*asterisks* became the gold accent',
        !!h1.querySelector('em') && h1.querySelector('em').textContent === 'properly looked after');
    chk('paragraph from the sheet',
        /straight from the spreadsheet/.test(d.querySelector('.ghero-in p').textContent));

    // The rich field escapes first, so a cell can add emphasis and nothing else.
    w.AHC.apply({ ok: true, tabs: { settings: [
      { key: 'hero_title', value: '<img src=x onerror=alert(1)> *ok*' }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 200));
    chk('no img injected through the headline', !h1.querySelector('img'));
    chk('tags shown as text', /<img src=x/.test(h1.textContent), h1.textContent.slice(0, 34));
    chk('emphasis still works alongside', !!h1.querySelector('em'));
  }

  log('');
  log('=== K. Reviews widget is configured from the sheet ===');
  {
    const { w, d } = await ready(await frame('../index.html'));
    await new Promise(r => setTimeout(r, 900));

    w.AHC.apply({ ok: true, tabs: { settings: [
      { key: 'reviews_provider', value: 'iframe' },
      { key: 'reviews_id', value: 'https://example.com/google-reviews' }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 300));
    let ifr = d.querySelector('#reviews-embed iframe');
    chk('google/facebook embed swapped in from the sheet',
        !!ifr && ifr.src.indexOf('example.com/google-reviews') !== -1, ifr ? ifr.src : 'none');

    // Unchanged config must not re-inject the third-party embed.
    const before = d.querySelector('#reviews-embed').innerHTML;
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 200));
    chk('re-render with no change is a no-op',
        d.querySelector('#reviews-embed').innerHTML === before);

    w.AHC.apply({ ok: true, tabs: { settings: [
      { key: 'reviews_provider', value: 'iframe' },
      { key: 'reviews_id', value: 'javascript:alert(1)' }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 200));
    chk('javascript: reviews id refused at the sheet boundary',
        !d.querySelector('#reviews-embed iframe'));

    // Per-page override: the embed asks for a named key, the sheet answers.
    const host = d.getElementById('reviews-embed');
    host.setAttribute('data-reviews-key', 'services');
    w.AHC.apply({ ok: true, tabs: { settings: [
      { key: 'reviews_provider', value: 'iframe' },
      { key: 'reviews_id', value: 'https://example.com/default' },
      { key: 'reviews_id_services', value: 'https://example.com/services-only' }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 300));
    ifr = d.querySelector('#reviews-embed iframe');
    chk('per-page reviews id wins over the default',
        !!ifr && ifr.src.indexOf('services-only') !== -1, ifr ? ifr.src : 'none');
  }

  log('');
  log('=== L. Google AND Facebook together ===');
  {
    const { w, d } = await ready(await frame('../index.html'));
    await new Promise(r => setTimeout(r, 900));
    const host = d.getElementById('reviews-embed');

    w.AHC.apply({ ok: true, tabs: { reviews: [
      { name: 'Google',     provider: 'iframe', id: 'https://example.com/google',   page: '', sort_order: 1 },
      { name: 'Facebook',   provider: 'iframe', id: 'https://example.com/facebook', page: '', sort_order: 2 },
      { name: 'Trustpilot', provider: 'iframe', id: 'https://example.com/trust',    page: '', sort_order: 3 }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 300));

    const tabs = host.querySelectorAll('.rev-tabs .tab-btn');
    const panels = host.querySelectorAll('.rev-panel');
    chk('a tab per source', tabs.length === 3,
        [...tabs].map(b => b.textContent).join(' | '));
    chk('tabs are in sort_order', tabs[0].textContent === 'Google' && tabs[2].textContent === 'Trustpilot');
    chk('first tab selected', tabs[0].getAttribute('aria-selected') === 'true');
    chk('only the visible source is loaded', host.querySelectorAll('iframe').length === 1,
        host.querySelectorAll('iframe').length + ' iframes');

    tabs[1].click();
    await new Promise(r => setTimeout(r, 250));
    chk('clicking a tab loads that source', host.querySelectorAll('iframe').length === 2);
    chk('and shows its panel', !panels[1].hidden && panels[0].hidden);
    chk('the right embed landed in it',
        panels[1].querySelector('iframe').src.indexOf('facebook') !== -1,
        panels[1].querySelector('iframe').src);
    chk('unvisited source still not loaded', !panels[2].querySelector('iframe'));
    chk('selection moved', tabs[0].getAttribute('aria-selected') === 'false' &&
                           tabs[1].getAttribute('aria-selected') === 'true');

    // A single source is a plain embed — a lone tab labels nothing.
    w.AHC.apply({ ok: true, tabs: { reviews: [
      { name: 'Google', provider: 'iframe', id: 'https://example.com/only', page: '', sort_order: 1 }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 250));
    chk('one source: no tab strip', !host.querySelector('.rev-tabs'));
    chk('one source: embedded directly',
        !!host.querySelector('iframe') && host.querySelector('iframe').src.indexOf('only') !== -1);

    // page scoping
    host.setAttribute('data-reviews-key', 'services');
    w.AHC.apply({ ok: true, tabs: { reviews: [
      { name: 'Everywhere',   provider: 'iframe', id: 'https://example.com/all',      page: '',         sort_order: 1 },
      { name: 'Services only', provider: 'iframe', id: 'https://example.com/services', page: 'services', sort_order: 2 },
      { name: 'Other page',   provider: 'iframe', id: 'https://example.com/other',    page: 'visit',    sort_order: 3 }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 250));
    const scoped = [...host.querySelectorAll('.rev-tabs .tab-btn')].map(b => b.textContent);
    chk('blank page shows everywhere, matching key shows, others do not',
        scoped.length === 2 && scoped[0] === 'Everywhere' && scoped[1] === 'Services only',
        scoped.join(' | '));
    host.removeAttribute('data-reviews-key');

    // a bad row is dropped without taking the good ones with it
    w.AHC.apply({ ok: true, tabs: { reviews: [
      { name: 'Good', provider: 'iframe', id: 'https://example.com/good',  page: '', sort_order: 1 },
      { name: 'Evil', provider: 'iframe', id: 'javascript:alert(1)',       page: '', sort_order: 2 },
      { name: 'Empty', provider: 'iframe', id: '',                         page: '', sort_order: 3 }
    ] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 250));
    chk('javascript: and blank rows dropped, good one kept',
        !host.querySelector('.rev-tabs') && host.querySelector('iframe').src.indexOf('good') !== -1,
        host.querySelector('iframe').src);

    // emptying the tab is how the section is turned off
    w.AHC.apply({ ok: true, tabs: { reviews: [] } });
    w.AHC_RENDER();
    await new Promise(r => setTimeout(r, 250));
    chk('every row inactive hides the whole section', d.getElementById('reviews').hidden);
  }

  log('');
  log('=== M. A mis-paired reviews cell never shows JavaScript ===');
  {
    const { w, d } = await ready(await frame('../index.html'));
    await new Promise(r => setTimeout(r, 900));
    const host = d.getElementById('reviews-embed');
    const JFID = '01a00cf8ad38700088a2f53d63cc358f83ae';
    const JFURL = 'https://www.jotform.com/website-widgets/embed/' + JFID;

    const set = async (provider, id) => {
      w.AHC.apply({ ok: true, tabs: { reviews: [
        { name: 'Google', provider: provider, id: id, page: '', sort_order: 1 }
      ] } });
      w.AHC_RENDER();
      await new Promise(r => setTimeout(r, 300));
      const ifr = host.querySelector('iframe');
      return {
        jotform: !!host.querySelector('[id^=JFWebsiteWidget]'),
        iframeSrc: ifr ? ifr.src : null,
        hidden: d.getElementById('reviews').hidden
      };
    };

    // The reported bug: a JotForm script URL framed as a page rendered 30KB of
    // JavaScript source to the customer.
    let r = await set('iframe', JFURL);
    chk('jotform URL marked iframe becomes the jotform widget', r.jotform && !r.iframeSrc);
    chk('  and is never framed', !r.iframeSrc);

    r = await set('jotform', JFID);
    chk('jotform + bare id still works', r.jotform);

    r = await set('jotform', JFURL);
    chk('jotform + the URL by mistake works', r.jotform);

    r = await set('', JFID);
    chk('blank provider + bare id inferred as jotform', r.jotform);

    r = await set('', 'https://example.com/reviews');
    chk('blank provider + https link inferred as iframe',
        !!r.iframeSrc && r.iframeSrc.indexOf('example.com') !== -1);

    r = await set('iframe', JFID);
    chk('iframe + bare id falls back to jotform rather than nothing', r.jotform);

    r = await set('jotfrom', JFID);
    chk('misspelt provider still resolves from the value', r.jotform);

    r = await set('iframe', 'https://cdn.example.com/widget.js');
    chk('a .js link is refused, not framed', !r.iframeSrc && r.hidden);

    r = await set('jotform', 'https://example.com/not-a-widget');
    chk('jotform + an unrelated link is refused', !r.jotform && !r.iframeSrc && r.hidden);
  }

  log('');
  log(fails === 0 ? '=== ALL PROVIDER TESTS PASSED ===' : '=== ' + fails + ' FAILED ===');
})().catch(e => { log(''); log('HARNESS ERROR: ' + e.message); log(e.stack); });
