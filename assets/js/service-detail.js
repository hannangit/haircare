/* Renders an individual service page from SERVICES. Called as renderServicePage('box-braids'). */
function renderServicePage(id) {
  const s = serviceById(id);
  if (!s) {
    document.querySelector('main .wrap').innerHTML =
      '<p>Sorry, we couldn\'t find that service. <a href="' + rootPath('services.html') + '">Back to the full menu &rarr;</a></p>';
    return;
  }

  setCategory(categorySlug(s.category));
  document.title = s.title + ' | African Hair Care, Milton Keynes';
  document.getElementById('bc-title').textContent = s.title;

  /* ---- Gallery ---- */
  const imgs = s.images;
  document.getElementById('gallery').innerHTML = `
    <div class="main-img"><img src="${imgs[0]}" alt="${s.alt}"></div>
    <div class="thumbs">${imgs.slice(1, 3).map(src => `<div class="th"><img src="${src}" alt="${s.alt}"></div>`).join('')}</div>
  `;

  /* ---- Above the fold: price, duration, booking CTAs ---- */
  document.getElementById('sidebar').innerHTML = `
    <div class="price-row"><span class="amount${priceOf(s) ? '' : ' amount--tbc'}">${priceOf(s) ? money(s.price) : 'On request'}</span>${priceOf(s) ? '<span class="per">from</span>' : ''}</div>
    <div class="price-sub">Final price depends on length, size and hair type — confirmed at your consultation.</div>
    <div class="avail sidebar-avail">${icon('clock', 14)}${durationText(s)} in the chair</div>
    <div class="sidebar-included">${s.hair === 'included' ? 'Hair is included in this price.' : s.hair === 'client' ? 'Please bring your own hair — we\'ll tell you how much.' : 'No extension hair needed.'}</div>
    <button class="btn btn-black" type="button" data-book="${s.id}">Request this appointment</button>
    <a class="btn btn-outline" href="${CONFIG.whatsapp}" data-booking-link target="_blank" rel="noopener">${icon('calendar', 18)} Book online</a>
    <p class="sidebar-note">${icon('verified', 13)} £${SERVICE_DEFAULTS.deposit} deposit, taken when we confirm your time.</p>
  `;

  /* ---- Main information column ---- */
  const specRows = [
    ['Category', s.category],
    ['From', priceOf(s) ? money(s.price) : 'On request'],
    ['Time in the chair', durationText(s)],
    ['Extension hair', hairText(s)],
    ['Patch test', s.patchTest ? 'Required, at least 48 hours before' : 'Not needed'],
    ['Children', s.kids ? 'Suitable for under-12s' : 'Ages 12 and over'],
    ['Consultation', 'Free, before every appointment'],
    ['Deposit', money(SERVICE_DEFAULTS.deposit) + ' — comes off the final price'],
    ['Changes & cancellations', SERVICE_DEFAULTS.cancellationHours + ' hours\' notice']
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  document.getElementById('info').innerHTML = `
    <div class="chip-row">
      <span class="chip chip-available">Booking now</span>
      ${s.patchTest ? '<span class="chip chip-urgent">Patch test needed</span>' : ''}
      ${s.kids ? '<span class="chip chip-neutral">Kids welcome</span>' : ''}
    </div>
    <span class="eyebrow">${s.category}</span>
    <h1>${s.title}</h1>
    <div class="detail-meta detail-meta--icon">${icon('location', 15)} ${CONFIG.address}</div>

    <div class="rule-labeled">At a glance</div>
    ${specGrid(s)}

    <div class="rule-labeled">About this service</div>
    <p class="detail-desc">${s.description || 'Full details for this service are available on request — send us a message and we will come back to you with pricing and timings.'}</p>

    ${s.feats.length ? `<div class="detail-feats">${s.feats.map(f => `<span>${f}</span>`).join('')}</div>` : ''}

    ${s.prep.length ? `<div class="rule-labeled">Before your appointment</div>
    <ul class="bullets-check">${s.prep.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}

    ${s.aftercare ? `<div class="rule-labeled">Aftercare</div>
    <p class="detail-desc">${s.aftercare}</p>
    <p class="nearby-links"><a href="${rootPath('care/aftercare.html')}">Full aftercare guide &rarr;</a></p>` : ''}

    <div class="rule-labeled">Service information</div>
    <div class="spec-table"><dl>
      ${specRows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}
    </dl></div>

    <div class="rule-labeled">Good to know</div>
    <div class="nearby-list">
      <div class="n-item">${icon('chat', 18)}<span>Free consultation first</span></div>
      <div class="n-item">${icon('card', 18)}<span>Card, cash or bank transfer</span></div>
      <div class="n-item">${icon('parking', 18)}<span>Parking a 2-minute walk away</span></div>
      <div class="n-item">${icon('transport', 18)}<span>5 minutes from MK Central</span></div>
      <div class="n-item">${icon('access', 18)}<span>Step-free access</span></div>
      <div class="n-item">${icon('users', 18)}<span>Children welcome in the salon</span></div>
    </div>
    <p class="nearby-links">
      <a href="${rootPath('visit-us.html')}">Getting here &amp; opening hours &rarr;</a>
      &nbsp;·&nbsp; <a href="${rootPath('booking.html')}">How booking works &rarr;</a>
    </p>
  `;

  /* ---- Repeated CTA after the detail content ---- */
  const band = document.getElementById('detail-cta');
  if (band) {
    band.innerHTML = `
      <div class="detail-cta-band">
        <div>
          <h3>Ready to book ${s.title.toLowerCase()}?</h3>
          <p>${[priceText(s), durationText(s), '£' + SERVICE_DEFAULTS.deposit + ' deposit to secure your slot'].join(' · ')}</p>
        </div>
        <button class="btn btn-gold" type="button" data-book="${s.id}">Request this appointment</button>
      </div>`;
  }

  /* ---- Similar services (same ServiceCard component as the menu) ---- */
  const similar = SERVICES
    .filter(x => x.id !== s.id)
    .sort((a, b) => (b.category === s.category) - (a.category === s.category))
    .slice(0, 3);
  document.getElementById('similar').innerHTML = similar.map(ServiceCard).join('');
}
