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
| Services, prices, categories, contact details, hours, offers, team | **Google Sheets** - see below |
| Those same values when the sheet is unavailable (the fallback) | `assets/js/services-data.js`, `assets/js/config.js` |
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

### Ticker, floating contact icons and consultation widget

Three pieces of chrome live in the shared partials, so every page gets them:

| Piece | Markup | Styles | Behaviour |
| --- | --- | --- | --- |
| Announcement ticker | `partials/header.html` | `.ticker*` | `initTicker()` |
| Floating contact icons | `partials/footer.html` | `.floating-social-bar`, `.social-icon` | markup only |
| Consultation offer | `partials/footer.html` | `.consult*` | `initConsult()` |

**Nothing offsets the page.** All three float over the content, so the hero
background runs to the viewport edge at every width. There is no solid sidebar
and no `body { padding-left }` — if you find yourself adding one, something has
gone wrong.

- **Ticker** messages come from the `promos` tab (fallback: `TICKER_MESSAGES` in
  `config.js`), and support start/end dates. Offers only - no opening hours.
  The
  the track holds the list twice and
  the keyframe translates `-50%`, so the loop wraps with no seam — if you build
  the content by hand, keep the duplicate. It pauses on hover *and* focus.
- **Floating icons** are contact only — WhatsApp, phone, book, plus Instagram
  once `CONFIG.instagram` is set. Navigation text stays in the header; do not
  duplicate menu links here. The column itself is transparent with no border;
  each icon is its own glass pill. Hidden at **≤768px**.
- **Consultation widget** sits bottom-**left** because the WhatsApp button owns
  the bottom-right corner on mobile. It defaults to collapsed and remembers the
  choice in `localStorage` (`ahc-consult`).

Two things worth knowing if you port this to another project:

1. The floating column carries WhatsApp above 768px, so the labelled green
   `.wa` button is hidden there and returns below 769px. That keeps exactly one
   WhatsApp affordance at every width. To show both, delete the `.wa` rule in
   the `@media(min-width:769px)` block.
2. `z-index` is **180**/**210**, not the 999 in the generic reference — this
   project's modal is 300, and a 999 float would sit on top of it. The full
   stack is listed next to `--z-social` in `style.css`.

### Swapping in real photography

Two places are built to be replaced with real images:

1. **Hero** — the `.hero-veil` block in `index.html` is a decorative SVG. Replace
   the whole `<div class="hero-veil">…</div>` with an `<img>` or a CSS
   background on `.ghero`.
2. **Service cards** — `placeholderImage()` in `services-data.js` generates the
   tinted artwork. Set `images` on a service to override it; the first image is
   the card thumbnail.

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

There are no per-service detail pages: `services.html` shows the whole menu, with
the full description on each card, and anything further is an enquiry.

`assets/js/services-data.js` holds the built-in copy of the menu, used whenever
the sheet is unavailable. The live menu comes from the `services` tab.

Listing images are generated as inline SVG placeholders tinted by category, so
nothing ever renders as a broken image. Set `images` on a service to override.

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
- [ ] **Calendly account** — `bookingUrl` in `config.js` points at a personal
      scheduling link (`calendly.com/hannanahmad12-i4z0`). Swap it for the
      salon's own, and set the event name, duration and availability there.

## Booking

Every `[data-book]` button opens **Calendly** as a popup, and
`book-appointment.html` shows the same scheduler inline. The buttons themselves
are ordinary site buttons — nothing about their markup or styling is
Calendly-specific, so the booking provider can be swapped without touching them.

- The link lives in `CONFIG.bookingUrl`. Blank it out and every button falls
  back to the built-in enquiry form, which still works end to end.
- `calendlyUrl()` in `main.js` builds the URL: it passes the salon's colours so
  the scheduler follows Dark/Light, and appends the chosen service as
  `utm_content` so that context reaches the Calendly booking record.
- The fallback also fires automatically if Calendly is blocked or has not
  finished loading, so a button never does nothing.
- The in-page form is still the *only* path for **stylist applications**
  (`data-action="open-stylist"`) — that is not a client booking and does not go
  through Calendly.
- `assets.calendly.com` is loaded on every page (`widget.css` + `widget.js`).
  To avoid the third-party request on pages nobody books from, load it lazily on
  first click instead.

> **Launching this template for another business?** See `BLUEPRINT.md` — the
> step-by-step process, the per-site checklist, and the traps that have already
> caught us once.

## Editing the site from Google Sheets

Business content lives in a Google Sheet. The owner edits the sheet; the site
picks the changes up within about 15 minutes with no deploy and no code.

**Nothing breaks if the sheet is unavailable.** Every value has a built-in copy
in `config.js` / `services-data.js`, so the order of preference is:

1. Live sheet data
2. Cached sheet data (`localStorage`, 12 minutes)
3. The built-in values

The cache is applied *synchronously before first paint*, so the page always
renders real content. There is deliberately no loading state or skeleton
anywhere — there is never a moment with no data to show.

### One-time setup

1. **Create the sheet.** One tab per file in `seed/`, named exactly:
   `services`, `categories`, `contact`, `hours`, `promos`, `team`, `settings`.
   Import each CSV into its tab (File > Import > Upload > *Replace current sheet*).
   The CSVs contain the site's current values, so importing reproduces it exactly.
2. **Add the script.** Extensions > Apps Script, delete the placeholder, paste
   `apps-script/Code.gs`, save.
3. **Check it before deploying.** In the editor choose `testPayload` and Run,
   then `testDataQuality`. View > Logs shows row counts and flags likely
   data-entry mistakes. Fix anything it reports.
4. **Deploy.** Deploy > New deployment > type *Web app*.
   - Execute as: **Me**
   - Who has access: **Anyone** ← if this is wrong the site gets a sign-in *page*
     instead of data. The site detects this and logs a clear message, but it will
     not have live data until it is fixed.
   Copy the `/exec` URL.
5. **Point the site at it.** Put the URL in `sheetEndpoint` in
   `assets/js/config.js`, then run `bash build.sh` and publish.

> **Editing the script is not deploying it.** Apps Script keeps serving the old
> version until you do Deploy > *Manage deployments* > edit > Version: *New
> version*. This catches everyone once.

### Day-to-day editing

| To do this | Do this |
| --- | --- |
| Change a price | Edit `price` in `services`. `0` shows as "Free"; blank shows "On request" |
| Add a service | New row in `services`. Give it an `id` (lowercase, hyphens), a `name`, and set `active` to TRUE |
| Hide a service | Set its `active` to FALSE. It is dropped before the page is built, so it never appears in the page source |
| Reorder | Change `sort_order`. Lowest first |
| Add a category | New row in `categories`, then use that exact name in the service's `category`. It appears in the filter automatically |
| Change the phone number | `contact` > `phone`. The dialable link and the WhatsApp link are both derived from it — do not edit them separately |
| Change opening hours | `hours`. Clearing an `hours` cell marks that day **Closed** |
| Run an offer | New row in `promos` with `start_date` / `end_date`. Outside that window it hides itself |
| Change a stylist | `team`. `is_lead` TRUE puts them in the wide card at the top |
| Change the deposit | `settings` > `deposit` |

**TRUE/FALSE columns**

- `active` — FALSE hides the row completely. Removed server-side, so drafts never
  reach the published page.
- `patch_test` — TRUE adds the "Patch test needed" warning to the card.
- `kids` — TRUE adds "Kids welcome".
- `is_lead` (team) — TRUE = the owner's wide card.

Accepted forms: `TRUE`/`FALSE`, `yes`/`no`, `1`/`0`. Anything else is treated as
not-set.

**Things worth knowing**

- **Blank is not always "no value".** A blank `hours` cell means *Closed*. A blank
  `instagram_url` means *show no Instagram icon*. A blank `hair` means *no
  extension hair needed*. Blank `price` means *On request* — but `0` means *Free*.
- **Lists** (`feats`) go one per line inside the cell (Alt+Enter), not
  comma-separated — commas are common inside the text itself.
- **Addresses** are split on line breaks only, for the same reason.
- **Phone format**: `+44 7700 900123` or `07700 900123`. `+44 (0)7700 900123` is
  handled too.
- **Private columns are safe.** Only whitelisted columns are published, so you can
  keep `cost`, `supplier`, `notes` columns in the same tabs and they never reach
  the website. Add a column to `PUBLISHED` in `Code.gs` before expecting it to appear.
- **Links must start with `http://` or `https://`.** Anything else is discarded at
  both ends.
- **Page titles, meta descriptions and headings stay in the HTML.** The sheet
  controls business content, not the crawlable skeleton.

### If something looks wrong

Open the browser console. The data layer logs one line saying whether it used
live, cached or built-in data, and why. `AHC.snapshot()` prints exactly what the
site is currently using; `AHC.clearCache()` then reload forces a fresh fetch.

Customers never see an error: if the sheet is unreachable the site quietly keeps
the last good content.

### Tests

Serve the site, then open:

- `/tests/` — the data layer. 59 assertions: live-data replacement, sorting,
  filters, contact propagation, promo date windows, malformed payloads,
  injection attempts, and the three failure modes.
- `/tests/providers.html` — booking, reviews and WhatsApp. 21 assertions,
  including switching provider at runtime and refusing unsafe URLs.

All should pass.

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
