# African Hair Care — website

Static site (no framework, no npm) for an African hair care and beauty salon in
Central Milton Keynes. Service menu with prices, a booking flow, an aftercare
hub, and a chair-rental page for stylists.

## Running it locally

Assets and links use **relative paths**, so you can open `index.html` directly
from disk. To view it exactly as it will be served:

```bash
bash serve.sh
```

Then open <http://localhost:8761>.

## Editing content

| What you want to change | Where |
| --- | --- |
| Services, prices, durations, aftercare text | `assets/js/services-data.js` |
| Phone, email, address, opening hours, booking links | `assets/js/config.js` |
| Header / nav, footer, booking modal | `partials/` — then run `bash build.sh` |
| Colours, spacing, components | `assets/css/style.css` |
| Icons | `assets/js/icons.js` |

## Design

Two themes, switchable from the header (and from the drawer on a phone).
**Dark is the default**; light is opt-in and remembered in `localStorage` under
`ahc-theme`. Each page carries a one-line script in its `<head>` that applies the
saved choice *before first paint* — without it, a light-theme visitor gets a dark
flash on every page load.

To make light the default instead, swap the two blocks in `style.css` so the
light values sit in `:root`, and flip the check in the head script and in
`applyTheme()`/`initTheme()` in `main.js`.

The palette lives in the `:root` block at the top of `style.css`, with the light
theme overriding tokens under `html[data-theme="light"]`:

- **Ground** — `--color-ink-900/800/700` — near-black with a purple cast.
- **Gold** — `--color-gold` and friends — the single accent. Reserved for the
  wordmark, prices, the primary CTA and small caps labels. Everything else is
  ink, a hairline border, or nothing.
- **Type** — Cormorant Garamond for headings and quotes, Inter for everything
  functional, JetBrains Mono for figures.
- **Rhythm** — `--space-heading`, `--space-block` and `--space-section` drive the
  vertical spacing. Prefer these over one-off margins, so components can't drift
  apart again.
- **Theme-dependent surfaces** — `--tint-1`, `--scrim`, `--header-bg`,
  `--panel-grad`, `--hero-bg`, `--media-filter` and friends. If you're about to
  hardcode a colour that only works on one theme, add a token here instead.

On light, the gold deepens to a bronze (`#8C601F`) because `#D9AE62` on cream is
about 2:1 and fails as text; decoration keeps the brighter gold via
`--gold-decor`, which carries no text. The primary button also inverts to
aubergine on light, since a gold fill barely separates from an ivory page.
Every text/background pair in both themes measures at or above 5:1.

Each service category carries its own accent (`body[data-category="…"]`), used
for small labels and the artwork tint. The ground and the gold CTAs never move,
so the site still reads as one brand.

### Swapping in real photography

Two places are built to be replaced with real images:

1. **Hero** — the `.hero-veil` block in `index.html` is a decorative SVG. Replace
   the whole `<div class="hero-veil">…</div>` with an `<img>` or a CSS
   background on `.ghero`.
2. **Service cards** — `placeholderImage()` in `services-data.js` generates the
   tinted artwork. Set `images: ['/path/to/photo.jpg', …]` on a service to
   override it; the first image is the card thumbnail, the next two fill the
   gallery on the service page.

### Shared header / footer / modal

These live once in `partials/` and are injected into every page by `build.sh`
between `<!-- @header -->` … `<!-- @/header -->` marker comments.

**After editing anything in `partials/`, run:**

```bash
bash build.sh
```

The build is idempotent — re-running is always safe. It also normalises every
internal path, so it is the single place that owns link resolution.

### Deployment paths

```bash
bash build.sh                    # relative paths (default) — works from disk,
                                 # from any server, and in a subfolder
bash build.sh --base=/           # root-relative, for a domain root
bash build.sh --base=/my-repo/   # fixed base, e.g. a GitHub Pages project site
```

If you deploy to GitHub Pages as a *project* site (`user.github.io/repo/`), use
the third form with your repository name, or leave the default relative paths.

## Service data

`assets/js/services-data.js` holds all 25 services across five categories
(Braids, Twists &amp; Locs, Weaves &amp; Wigs, Natural Hair, Beauty). Each entry
carries its price, duration, whether the client brings their own hair, whether a
patch test is needed, a description, a prep list and an aftercare line — and the
service pages, the menu grid and the booking modal all read from it.

Adding a service takes two steps:

1. Add a `service(...)` entry to `SERVICES`.
2. Create `services/<id>.html` by copying any existing file in that folder and
   changing the `<title>`, the meta description and `<body data-service="…">`.
   Then run `bash build.sh`.

Listing images are generated as inline SVG placeholders tinted by category, so
nothing ever renders as a broken image. Replace the `images` array on a service
with real photograph URLs when you have them.

## ⚠ Everything below is placeholder — confirm before go-live

This site was built as a working shell. None of the following is real:

- [ ] **Address** — Unit 4, Silbury Arcade, Central Milton Keynes, MK9 3AG
- [ ] **Phone and WhatsApp** — uses Ofcom's reserved 07700 900xxx fictional range
- [ ] **Email addresses** — `@africanhaircare.co.uk` is not a registered domain
- [ ] **Opening hours** in `config.js`
- [ ] **All prices and durations** in `services-data.js`
- [ ] **Stylist names, roles and contact details** in `team.html`
- [ ] **Client reviews** on the homepage
- [ ] **Chair rental rate** (£130/week) and terms in `stylists.html`
- [ ] **Deposit amount** (£20) and cancellation window (48 hours)
- [ ] **Company number and NHBF membership number** in `partials/footer.html`
- [ ] **Salon photography** — every listing uses a generated placeholder
- [ ] **Formspree endpoint** in `config.js` (the booking form currently shows a
      demo confirmation and sends nothing)
- [ ] **Booking system link** in `config.js` — "Book online" falls back to
      WhatsApp until `bookingUrl` is set; set `bookingEmbedUrl` too and the
      widget replaces the manual options on `book-appointment.html`

## Layout

```
index.html            Home — categories, booking steps, reviews, contact
services.html         Full menu with category / price / duration filters
services/             One page per service (25, generated from services-data.js)
booking.html          How booking works — prep, deposits, patch tests
book-appointment.html Booking request page (holds the booking-widget embed)
hair-care-hub.html    Aftercare entry point, product advice, when to come back
care/                 Aftercare guide + salon terms, feedback & complaints
visit-us.html         Address, hours, getting here, accessibility
stylists.html         Chair rental and applications
team.html             The stylists
partials/             Shared header, footer, booking modal
assets/               CSS, JS, icons
```
