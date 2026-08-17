/* Site-wide configuration. Edit the values below when you have real accounts/links set up.

   ⚠ Every contact detail here is a PLACEHOLDER. Phone numbers use Ofcom's
   reserved 07700 900xxx range so nothing can dial a real person by accident. */
const CONFIG = {
  // 1. Sign up free at https://formspree.io, create a form, and paste its endpoint URL here.
  //    Until this is set, the booking form shows a demo confirmation and sends nothing.
  formspreeEndpoint: 'https://formspree.io/f/YOUR_FORM_ID',

  // 2. Calendly scheduling link. Every "Book" button opens this as a popup; the
  //    booking page shows it inline. Blank it out and the whole site falls back
  //    to the built-in enquiry form, which still works.
  bookingUrl: 'https://calendly.com/hannanahmad12-i4z0',

  // 3. Show the scheduler inline on book-appointment.html as well as in popups.
  //    Set false to leave that page as contact options only.
  bookingEmbedInline: true,

  // 4. Optional: a form for aftercare questions or complaints (Google Forms, Typeform…).
  complaintsFormUrl: '',

  whatsapp: 'https://wa.me/447700900123',
  phone: '+44 7700 900123',
  phoneHref: 'tel:+447700900123',
  email: 'hello@africanhaircare.co.uk',

  address: 'Unit 4, Silbury Arcade, Central Milton Keynes, MK9 3AG',
  mapsQuery: 'Silbury Arcade, Central Milton Keynes, MK9 3AG',

  // 5. Social. Leave blank and the icon is simply not rendered, rather than
  //    linking somewhere that doesn't exist.
  instagram: ''
};

/* Announcement ticker. Each entry becomes one item in the scrolling bar; today's
   opening hours are prepended automatically. Keep them short — the bar is thin
   and the loop should stay readable. */
const TICKER_MESSAGES = [
  'New client offer — 10% off your first braiding appointment',
  'Free 15-minute consultation with every booking',
  'Knotless braids are booking ~2 weeks ahead — reserve early',
  'Walk-ins welcome for brows, threading and quick treatments'
];

/* Opening hours, in one place so the header, footer and Visit Us page agree. */
const OPENING_HOURS = [
  { day: 'Monday',    hours: 'Closed' },
  { day: 'Tuesday',   hours: '9:00 – 19:00' },
  { day: 'Wednesday', hours: '9:00 – 19:00' },
  { day: 'Thursday',  hours: '9:00 – 20:00' },
  { day: 'Friday',    hours: '9:00 – 20:00' },
  { day: 'Saturday',  hours: '8:00 – 19:00' },
  { day: 'Sunday',    hours: '11:00 – 17:00' }
];

function mapEmbedUrl() { return 'https://www.google.com/maps?q=' + encodeURIComponent(CONFIG.mapsQuery) + '&output=embed'; }
function mapsLinkUrl() { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CONFIG.mapsQuery); }
