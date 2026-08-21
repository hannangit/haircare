/* Single source of truth for the service menu.
   Used by the services grid, the individual service pages, and the booking modal.

   ─────────────────────────────────────────────────────────────────────────────
   STATUS: placeholder pricing and timings.
   Every price, duration and description below is a plausible stand-in so the
   site can be seen working end to end. Confirm each one with the salon before
   go-live — see the checklist in README.md.
   ───────────────────────────────────────────────────────────────────────────── */

const SERVICE_DEFAULTS = {
  deposit: 20,              // non-refundable booking deposit, comes off the final price
  consultation: true,       // a free consultation is offered with every service
  cancellationHours: 48     // notice needed to move or cancel without losing the deposit
};

/* ─── Categories ──────────────────────────────────────────────────────────
   The slug drives the colour accent (see `body[data-category]` in style.css)
   and the placeholder artwork below. */
const CATEGORIES = [
  { name: 'Braids',        slug: 'braids',       blurb: 'Knotless, box, cornrows and Fulani styles.' },
  { name: 'Twists & Locs', slug: 'twists-locs',  blurb: 'Twists, starter locs, retwists and faux locs.' },
  { name: 'Weaves & Wigs', slug: 'weaves-wigs',  blurb: 'Sew-ins, wig installs, revamps and crochet.' },
  { name: 'Natural Hair',  slug: 'natural-hair', blurb: 'Silk press, treatments, trims and scalp care.' },
  { name: 'Beauty',        slug: 'beauty',       blurb: 'Lashes, brows, threading, waxing and makeup.' },
];

/* Deep, desaturated grounds so the generated artwork sits inside the dark
   palette rather than fighting it. The gold overlay is shared. */
const CATEGORY_ART = {
  'braids':       ['#2A1424', '#5E3A2A'],
  'twists-locs':  ['#241628', '#544026'],
  'weaves-wigs':  ['#28122C', '#553049'],
  'natural-hair': ['#152119', '#2F5340'],
  'beauty':       ['#2B1224', '#5E2F45']
};

function categorySlug(name) {
  const found = CATEGORIES.find(c => c.name === name);
  return found ? found.slug : String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Self-contained artwork so no listing ever shows a broken image before the
   real photography arrives. Swap `images` on a service to use a real photo. */
function placeholderImage(categoryName, label, variant) {
  const [from, to] = CATEGORY_ART[categorySlug(categoryName)] || ['#3A1D33', '#6E3A5F'];
  const v = variant || 0;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">' +
      '<defs>' +
        '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + from + '"/><stop offset="1" stop-color="' + to + '"/>' +
        '</linearGradient>' +
        '<linearGradient id="s" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#F0D49A" stop-opacity="0"/>' +
          '<stop offset=".5" stop-color="#D9AE62" stop-opacity=".55"/>' +
          '<stop offset="1" stop-color="#B98A3C" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<radialGradient id="glow" cx="50%" cy="50%">' +
          '<stop offset="0" stop-color="#D9AE62" stop-opacity=".26"/>' +
          '<stop offset="1" stop-color="#D9AE62" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="1200" height="800" fill="url(#g)"/>' +
      '<circle cx="' + (940 - v * 150) + '" cy="' + (200 + v * 110) + '" r="330" fill="url(#glow)"/>' +
      '<g fill="none" stroke="url(#s)" stroke-linecap="round">' +
        '<path d="M-60 ' + (250 + v * 40) + ' C 240 120, 420 400, 700 250 S 1120 90, 1300 210" stroke-width="3"/>' +
        '<path d="M-60 ' + (330 + v * 40) + ' C 220 200, 460 470, 700 330 S 1140 170, 1300 300" stroke-width="2"/>' +
        '<path d="M-60 ' + (560 + v * 40) + ' C 260 430, 420 700, 720 570 S 1160 430, 1300 550" stroke-width="3"/>' +
      '</g>' +
      '<text x="600" y="410" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" ' +
        'font-size="62" font-weight="600" fill="#F3EBE3">' + escapeXml(label) + '</text>' +
      '<text x="600" y="462" text-anchor="middle" font-family="Inter, Segoe UI, sans-serif" ' +
        'font-size="20" letter-spacing="4" fill="#D9AE62" fill-opacity=".75">PHOTOGRAPHY COMING SOON</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function service(id, name, category, overrides) {
  return Object.assign({
    id, name, title: name, category,
    price: null,              // "from" price in £
    duration: null,           // minutes in the chair
    hair: null,               // 'included' | 'client' | null (not applicable)
    patchTest: false,         // needs a patch test at least 48h before
    sort: 0,                  // display order; ties fall back to sheet order
    kids: false,              // suitable for children
    description: null,
    feats: [],
    images: [
      placeholderImage(category, name, 0),
      placeholderImage(category, name, 1),
      placeholderImage(category, name, 2)
    ],
    alt: name + ' at African Hair Care'
  }, overrides || {});
}

const SERVICES = [

  /* ─── Braids ─────────────────────────────────────────────────────────── */
  service('knotless-box-braids', 'Knotless Box Braids', 'Braids', {
    price: 90, duration: 300, hair: 'client', kids: false,
    description: 'Our most-booked style. Each braid starts with your own hair and the extension is fed in gradually, so there is no knot pulling at the root. Kinder on the hairline than traditional box braids and comfortable enough to sleep in from night one.',
    feats: ['Small, medium or large', 'Waist length available', 'No tension at the root', 'Free parting consultation'],
  }),
  service('box-braids', 'Box Braids', 'Braids', {
    price: 75, duration: 270, hair: 'client',
    description: 'The classic. Clean, square partings and a firm, long-lasting finish that holds its shape through the full life of the style.',
    feats: ['Small, medium or large', 'Shoulder to waist length', 'Colour mixing welcome'],
  }),
  service('cornrows', 'Cornrows & Straight Backs', 'Braids', {
    price: 35, duration: 90, hair: null, kids: true,
    description: 'Straight backs or a custom pattern, braided flat to the scalp using your own hair. A neat protective style in its own right, and the usual base underneath a wig or a sew-in.',
    feats: ['Straight backs or patterned', 'Great under a wig', 'Suitable for children'],
  }),
  service('feed-in-braids', 'Feed-in Braids (Ghana Weave)', 'Braids', {
    price: 45, duration: 120, hair: 'client',
    description: 'Cornrows with extension hair fed in as the braid grows, so it starts fine at the hairline and thickens along its length. Lightweight, and very forgiving on fine edges.',
    feats: ['2 to 12 braids', 'Lightweight on the scalp', 'Ponytail styling available'],
  }),
  service('fulani-braids', 'Fulani Braids', 'Braids', {
    price: 85, duration: 240, hair: 'client',
    description: 'A traditional Fulani pattern — a centre cornrow, side braids and loose braided lengths — finished with beads or cuffs if you would like them.',
    feats: ['Beads and cuffs included', 'Custom parting pattern', 'Photo references welcome'],
  }),
  service('boho-braids', 'Boho Knotless Braids', 'Braids', {
    price: 110, duration: 330, hair: 'client',
    description: 'Knotless braids with loose, curly human-hair pieces left out along the length for a softer, undone finish. The longest appointment on our menu and worth every minute.',
    feats: ['Curly human-hair pieces', 'Knotless root', 'Half or full boho'],
  }),
  service('kids-braids', "Children's Braids", 'Braids', {
    price: 40, duration: 120, hair: null, kids: true,
    description: 'A gentler, shorter appointment for under-12s. Cornrows, twists or small box braids with no heavy extensions and plenty of breaks.',
    feats: ['Under 12s', 'Gentle tension', 'Beads included', 'Breaks built in'],
  }),

  /* ─── Twists & Locs ──────────────────────────────────────────────────── */
  service('senegalese-twists', 'Senegalese Twists', 'Twists & Locs', {
    price: 80, duration: 240, hair: 'client',
    description: 'Smooth, rope-style two-strand twists with a high-shine finish. Lighter than braids of the same length and quicker to take down.',
    feats: ['Small to jumbo', 'High-shine finish', 'Quick take-down'],
  }),
  service('passion-twists', 'Passion Twists', 'Twists & Locs', {
    price: 85, duration: 240, hair: 'client',
    description: 'Soft, textured twists using water-wave hair for a bohemian, loosely curled look that keeps its bounce for weeks.',
    feats: ['Water-wave texture', 'Soft, natural movement', 'Shoulder to waist'],
  }),
  service('starter-locs', 'Starter Locs & Comb Coils', 'Twists & Locs', {
    price: 70, duration: 180, hair: null,
    description: 'The beginning of your loc journey. We section, coil and set your natural hair, and talk you through what to expect over the first six months.',
    feats: ['Full consultation included', 'Comb coils or two-strand start', 'Journey plan for the first year'],
  }),
  service('loc-retwist', 'Loc Retwist & Style', 'Twists & Locs', {
    price: 45, duration: 120, hair: null,
    description: 'Wash, root retwist and a style of your choice — barrel rolls, two-strand or pinned up. Recommended every 4–6 weeks.',
    feats: ['Wash included', 'Root retwist', 'Style of your choice'],
  }),
  service('faux-locs', 'Faux Locs', 'Twists & Locs', {
    price: 120, duration: 360, hair: 'client',
    description: 'The full loc look without committing. Wrapped or crochet faux locs in soft, goddess or butterfly finishes, installed over your own hair.',
    feats: ['Soft, goddess or butterfly', 'Wrapped or crochet method', 'Up to 4 weeks wear'],
  }),

  /* ─── Weaves & Wigs ──────────────────────────────────────────────────── */
  service('sew-in-weave', 'Sew-in Weave', 'Weaves & Wigs', {
    price: 70, duration: 180, hair: 'client',
    description: 'A braided base with wefts sewn in, finished with a closure, a frontal or your own leave-out. Includes cutting and blending into your natural hair.',
    feats: ['Closure, frontal or leave-out', 'Cut and blend included', 'Braided protective base'],
  }),
  service('wig-install', 'Wig Install', 'Weaves & Wigs', {
    price: 55, duration: 120, hair: 'client',
    description: 'Glueless or bonded install with a plucked, bleached and tinted hairline, styled and laid to sit naturally against your skin tone.',
    feats: ['Glueless or bonded', 'Hairline customised', 'Styled on the day'],
  }),
  service('wig-revamp', 'Wig Revamp & Restyle', 'Weaves & Wigs', {
    price: 45, duration: 120, hair: null,
    description: 'Bring an old wig back to life — deep wash, detangle, restore the curl pattern, refresh the parting and re-style. Colouring quoted separately.',
    feats: ['Deep wash and detangle', 'Curl pattern restored', 'Parting refreshed'],
  }),
  service('crochet-braids', 'Crochet Braids', 'Weaves & Wigs', {
    price: 60, duration: 150, hair: 'client',
    description: 'Pre-looped hair crocheted into a cornrow base. The fastest protective style we offer and the easiest to change your mind about.',
    feats: ['Fast install', 'Curly, wavy or straight', 'Cornrow base included'],
  }),

  /* ─── Natural Hair ───────────────────────────────────────────────────── */
  service('silk-press', 'Silk Press & Blow-dry', 'Natural Hair', {
    price: 45, duration: 90, hair: null,
    description: 'Wash, heat-protected blow-dry and a light flat-iron press for smooth, moving hair without chemicals. Includes a dusting of the ends.',
    feats: ['Heat protection included', 'Ends dusted', 'Lasts 1–2 weeks'],
  }),
  service('deep-conditioning', 'Deep Conditioning & Steam', 'Natural Hair', {
    price: 30, duration: 60, hair: null, kids: true,
    description: 'A clarifying wash followed by a protein or moisture mask under steam, chosen after we look at your hair. The quickest way to reset dry, brittle hair.',
    feats: ['Steam treatment', 'Protein or moisture mask', 'Great before a protective style'],
  }),
  service('wash-trim-style', 'Wash, Trim & Style', 'Natural Hair', {
    price: 35, duration: 90, hair: null, kids: true,
    description: 'Shampoo, condition, a trim of the split ends and a style of your choice — twist-out, braid-out, wash-and-go or a simple blow-dry.',
    feats: ['Trim included', 'Style of your choice', 'Suitable for children'],
  }),
  service('scalp-treatment', 'Scalp Treatment & Consultation', 'Natural Hair', {
    price: 25, duration: 45, hair: null,
    description: 'For flaking, itching, tenderness or thinning edges. We look at the scalp properly, treat what we find, and give you a written routine to follow at home.',
    feats: ['Written home routine', 'Edge and density check', 'Books as a standalone visit'],
  }),
  service('relaxer', 'Relaxer & Texturiser', 'Natural Hair', {
    price: 50, duration: 90, hair: null, patchTest: true,
    description: 'A root-only relaxer or a light texturiser, applied with a protective base and neutralised properly. Strand test first, every time.',
    feats: ['Root application', 'Strand test included', 'Neutralising treatment'],
  }),

  /* ─── Beauty ─────────────────────────────────────────────────────────── */
  service('lash-extensions', 'Lash Extensions', 'Beauty', {
    price: 45, duration: 90, hair: null, patchTest: true,
    description: 'Classic, hybrid or volume lashes mapped to your eye shape. Infills at a reduced rate every 2–3 weeks.',
    feats: ['Classic, hybrid or volume', 'Infills from £25', 'Mapped to your eye shape'],
  }),
  service('brow-shaping', 'Brow Shape, Tint & Lamination', 'Beauty', {
    price: 25, duration: 45, hair: null, patchTest: true,
    description: 'Threaded or waxed shaping, a tint matched to your hair, and optional lamination to set the shape for six weeks.',
    feats: ['Threading or waxing', 'Tint matched to your hair', 'Lamination optional'],
  }),
  service('threading-waxing', 'Threading & Waxing', 'Beauty', {
    price: 15, duration: 30, hair: null,
    description: 'Precise facial threading and waxing — brows, lip, chin or a full face. Quick, and easy to add on to any hair appointment.',
    feats: ['Brows, lip, chin or full face', 'Add on to any appointment', 'From 15 minutes'],
  }),
  service('occasion-makeup', 'Occasion & Bridal Makeup', 'Beauty', {
    price: 60, duration: 60, hair: null,
    description: 'Full-face makeup matched to deeper skin tones properly, for weddings, birthdays and photography. Bridal bookings include a trial.',
    feats: ['Deep-tone shade range', 'Bridal trial included', 'Lashes included'],
  })
];

/* ─── Derived helpers ─────────────────────────────────────────────────── */
function money(n) { return '£' + n.toLocaleString(); }
function serviceById(id) { return SERVICES.find(s => s.id === id); }
function priceOf(s) { return s.price !== null && s.price !== undefined ? s.price : null; }
function priceText(s) { return priceOf(s) ? 'from ' + money(s.price) : 'Price on request'; }

/* Durations read as "4 hrs 30 mins" rather than "270 minutes", which is how
   people actually think about how long they will be in the chair. */
function durationText(s) {
  if (!s.duration) return 'Duration on request';
  const h = Math.floor(s.duration / 60), m = s.duration % 60;
  if (!h) return m + ' mins';
  return h + (h > 1 ? ' hrs' : ' hr') + (m ? ' ' + m + ' mins' : '');
}
function hairText(s) {
  if (s.hair === 'included') return 'Included';
  if (s.hair === 'client') return 'Bring your own';
  return 'Not needed';
}
function serviceValue(s, key) { return s[key] !== undefined && s[key] !== null ? s[key] : SERVICE_DEFAULTS[key]; }

/* ─── Category tiles (homepage) ───────────────────────────────────────── */
function categoryList() {
  return CATEGORIES.filter(c => SERVICES.some(s => s.category === c.name));
}
function categoryCount(name) { return SERVICES.filter(s => s.category === name).length; }

/* A filter is only shown once EVERY service has that field. Filtering on a
   partially-populated field would silently hide services whose value is merely
   unknown, which reads to the visitor as "they don't do that". */
function hasFilterableData(field) { return SERVICES.every(s => s[field] !== null && s[field] !== undefined); }

/* Base path for links built in JavaScript. */
const SITE_BASE = (function () {
  const el = document.querySelector('link[rel="stylesheet"][href*="assets/css/style.css"]');
  const href = el ? el.getAttribute('href') : '';
  return href.replace(/assets\/css\/style\.css.*$/, '');
})();
function rootPath(rel) { return SITE_BASE + rel; }

function specCell(label, value, on, iconName) {
  return `<div class="spec-cell"><span class="spec-label">${icon(iconName, 14)}${label}</span><span class="spec-value${on ? ' on' : ''}">${value}</span></div>`;
}
function specGrid(s) {
  return `<div class="spec-grid">
    ${specCell('Time in the chair', durationText(s), false, 'clock')}
    ${specCell('From', priceOf(s) ? money(s.price) : '—', false, 'price')}
    ${specCell('Hair', hairText(s), s.hair === 'included', 'strand')}
    ${specCell('Deposit', money(SERVICE_DEFAULTS.deposit), false, 'card')}
  </div>`;
}
