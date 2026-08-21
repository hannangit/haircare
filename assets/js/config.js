/* ═══════════════════════════════════════════════════════════════════════════
   SITE CONFIG — the only file you edit per business.

   Everything in CONFIG is a per-business setting. Everything below the
   BUILT-IN CONTENT line is fallback content, used only when the Google Sheet is
   unavailable; once the sheet is live, the sheet wins.

   Launching a new site should not require touching any other file.
   ═══════════════════════════════════════════════════════════════════════════ */

const CONFIG = {

  /* ── 1. BUSINESS ──────────────────────────────────────────────────────── */
  businessName: 'African Hair Care',

  /* ── 2. GOOGLE SHEET ──────────────────────────────────────────────────────
     The Apps Script web app URL (ends /exec). Deploy it with
     "Who has access: Anyone", or it serves a sign-in page instead of data.
     Leave blank to run entirely on the built-in content below.              */
  sheetEndpoint: 'https://script.google.com/macros/s/AKfycbyLhglaNJhbPDWAA8ANeUsmxUE3-tld22-oNvspvTxbajhSIe_svDnkxwbkSG_DDg5T/exec',

  /* ── 3. BOOKING ───────────────────────────────────────────────────────────
     provider: 'calendly' | 'google' | 'none'
       calendly — bookingUrl is the calendly.com/... link. Opens as a popup.
       google   — bookingUrl is a Google Calendar appointment schedule link
                  (.../appointments/schedules/...). Opens in a new tab and
                  embeds inline on the booking page.
       none     — every booking button falls back to WhatsApp.
     No page markup changes between providers; the scripts load from here.    */
  bookingProvider: 'calendly',
  bookingUrl: 'https://calendly.com/hannanahmad12-i4z0',
  bookingEmbedInline: true,          // also show the scheduler on book-appointment.html

  /* ── 4. REVIEWS ───────────────────────────────────────────────────────────
     provider: 'jotform' | 'iframe' | 'none'
       jotform — reviewsId is the JotForm website-widget ID
       iframe  — reviewsId is a full https:// URL to embed (Google, Facebook,
                 Elfsight, Trustpilot — anything that gives you an iframe URL)
       none    — the reviews section removes itself from the page             */
  reviewsProvider: 'jotform',
  reviewsId: '01a00cf8ad38700088a2f53d63cc358f83ae',

  /* ── 5. CONTACT ───────────────────────────────────────────────────────────
     One phone number. The dialable link and the WhatsApp link are both derived
     from it, so do not write them out separately.
     Format: '+44 7700 900123' or '07700 900123'.                             */
  phone: '+44 7700 900123',
  whatsappNumber: '',                // blank = use `phone`. Set only if different.
  email: 'hello@africanhaircare.co.uk',
  emailFeedback: 'feedback@africanhaircare.co.uk',
  address: 'Unit 4, Silbury Arcade, Central Milton Keynes, MK9 3AG',
  mapsQuery: 'Silbury Arcade, Central Milton Keynes, MK9 3AG',
  instagram: '',                     // blank = no Instagram icon is shown

  /* ── 6. WHATSAPP MESSAGE ──────────────────────────────────────────────────
     Pre-filled into every WhatsApp button. {service} becomes the service the
     visitor was looking at, {business} the business name.                    */
  whatsappMessage: 'Hi {business}, I would like to ask about {service}.',

  /* ── 7. LEGAL (footer) ────────────────────────────────────────────────────*/
  companyNo: '[00000000]',
  nhbfNo: '[000000]',
  insurer: '[insurer]',

  /* ── 8. BOOKING NOTICE ────────────────────────────────────────────────────
     Shown above the booking buttons. Set to '' to hide it.                   */
  bookingNotice:
    'Please arrive at your booked start time. The appointment can run longer ' +
    'than the slot shown, depending on the service. You will receive a ' +
    'confirmation email, but your booking is only confirmed once payment is ' +
    'made — the online calendar just shows you our available slots.'
};

/* ═══════════════════════════════════════════════════════════════════════════
   BUILT-IN CONTENT — fallback only.
   Used before the sheet loads, when it is unreachable, and when no endpoint is
   configured. Keep it roughly in step with the sheet so the site still reads
   sensibly if the sheet ever goes down.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Announcement ticker: offers only. The live version comes from the `promos`
   tab, which also supports start/end dates. */
const TICKER_MESSAGES = [
  'New client offer — 10% off your first braiding appointment',
  'Free 15-minute consultation with every booking',
  'Knotless braids are booking ~2 weeks ahead — reserve early',
  'Walk-ins welcome for brows, threading and quick treatments'
];

/* Opening hours, in one place so the footer and Find Us page agree. */
const OPENING_HOURS = [
  { day: 'Monday',    hours: 'Closed' },
  { day: 'Tuesday',   hours: '9:00 – 19:00' },
  { day: 'Wednesday', hours: '9:00 – 19:00' },
  { day: 'Thursday',  hours: '9:00 – 20:00' },
  { day: 'Friday',    hours: '9:00 – 20:00' },
  { day: 'Saturday',  hours: '8:00 – 19:00' },
  { day: 'Sunday',    hours: '11:00 – 17:00' }
];

/* Team. `lead: true` gets the wide card at the top of the team page. */
const TEAM = [
  { name: 'Ijeoma Balogun', role: 'Owner & Senior Braider', area: 'Knotless braids · Fulani · Boho',
    quote: 'I opened this salon because I got tired of watching people leave with headaches and thinner edges than they came in with. Tension is a skill, not an accident.',
    phone: '+44 7700 900123', email: 'ijeoma@africanhaircare.co.uk', lead: true, sort: 1 },
  { name: 'Nkechi Mensah', role: 'Loc Technician', area: 'Starter locs · Retwists · Repairs',
    quote: '', phone: '+44 7700 900124', email: 'nkechi@africanhaircare.co.uk', lead: false, sort: 2 },
  { name: 'Shanice Baptiste', role: 'Natural Hair Specialist', area: 'Silk press · Trims · Scalp care',
    quote: '', phone: '+44 7700 900125', email: 'shanice@africanhaircare.co.uk', lead: false, sort: 3 },
  { name: 'Fatou Diallo', role: 'Weave & Wig Specialist', area: 'Sew-ins · Frontals · Wig revamps',
    quote: '', phone: '+44 7700 900126', email: 'fatou@africanhaircare.co.uk', lead: false, sort: 4 },
  { name: 'Priya Anand', role: 'Beauty Therapist', area: 'Lashes · Brows · Threading · Makeup',
    quote: '', phone: '+44 7700 900127', email: 'priya@africanhaircare.co.uk', lead: false, sort: 5 },
  { name: 'Tolu Adeyemi', role: 'Braider & Apprentice Lead', area: "Box braids · Twists · Children's styles",
    quote: '', phone: '+44 7700 900128', email: 'tolu@africanhaircare.co.uk', lead: false, sort: 6 }
];

function mapEmbedUrl() { return 'https://www.google.com/maps?q=' + encodeURIComponent(CONFIG.mapsQuery) + '&output=embed'; }
function mapsLinkUrl() { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.mapsQuery); }
