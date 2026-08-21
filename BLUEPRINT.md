# Blueprint — launching a new business site from this template

This folder is the template. Copy it, change **one file**, point it at a Google
Sheet, deploy. Everything a business owner edits day-to-day lives in the sheet.

Target: about **45 minutes** per site, most of it waiting for Google.

---

## The one rule

> **`assets/js/config.js` is the only file you edit per business.**

If you find yourself editing HTML to change a phone number, a booking link, a
reviews widget or a service, stop — that value belongs in `config.js` or in the
sheet. Everything else in the repo is shared machinery and should stay identical
across all sites, so fixes and improvements can be copied between them.

## Why there is a sheet at all

`config.js` and the sheet answer two different questions, for two different people.

- **`config.js` — you, once, at launch.** Wiring that never changes again: which
  Apps Script endpoint, which booking provider, which reviews widget. Changing it
  means editing a file, rebuilding and redeploying.
- **The sheet — the owner, forever.** Everything that actually moves: prices,
  services, opening hours, this month's offer, who works there, the deposit. They
  edit a spreadsheet on their phone and the site follows, with no developer, no
  git, no deploy.

Without the sheet, every "can you put the price up to £85" is a support ticket for
you — across a hundred sites, that is the whole business model gone. The built-in
content in `config.js` and `services-data.js` is only a safety net for the seconds
before the sheet loads, and for the day Google has an outage.

---

## Step 1 — Copy the folder

```bash
cp -r "African Hair Care" "New Business Name"
cd "New Business Name"
rm -rf .git && git init -b main
```

Open the folder in Claude Code and say what the business is. Design tweaks
(palette, wording, which pages exist) are a conversation; the plumbing below
does not change.

## Step 2 — Create the Google Sheet (the script builds it for you)

1. New blank Google Sheet. Name it `<Business> — Website Content`.
2. **Extensions → Apps Script**, delete the placeholder, paste **all** of
   `apps-script/Code.gs`, save.
3. In the toolbar pick **`setupSheet`** and press **Run**. Approve the
   permission prompt once. It creates an **INSTRUCTIONS** tab plus all eight
   content tabs — headers, a hover note on every column explaining it,
   TRUE/FALSE dropdowns, frozen header row — and one example row per tab
   showing the expected format.
4. Replace the example rows with the real business content.

`setupSheet` is safe to re-run: a tab that already exists is skipped, never
overwritten.

> Prefer to start from a full salon's worth of content rather than one example
> row? Import the matching file from `seed/` into each tab instead
> (*File → Import → Upload → Replace current sheet*). That reproduces this
> site's 25 services exactly.

### The eight tabs

| Tab | One row per | Key columns |
|---|---|---|
| `services` | service | `name`, `category`, `price`, `duration_mins`, `description`, `feats`, `image_url`, `active` |
| `categories` | filter group | `name` (must match `services.category` exactly), `slug`, `blurb`, `image_url` |
| `contact` | detail | `key`, `value` — `business_name`, `phone`, `email_general`, `address`, `maps_query`, … |
| `hours` | day | `day`, `hours` (**blank = Closed**), `sort_order` |
| `promos` | ticker message | `message`, `start_date`, `end_date` — dates schedule offers |
| `team` | staff member | `name`, `role`, `specialism`, `image_url`, `is_lead` |
| `faq` | chat question | `question`, `answer` — drives the chat widget, first 8 shown |
| `settings` | site value | `key`, `value` — `deposit`, `hero_*` (home page headline), `reviews_*`, consultation and chat copy |

Rules that apply everywhere:

- **`active = FALSE` hides the row** without deleting it. The Apps Script drops
  those rows before the JSON leaves Google, so drafts never reach the page source.
- **Blank is meaningful.** Blank `hours` = Closed. Blank `price` = "On request".
  `0` = "Free". Blank `instagram_url` = hide the icon. Blank `image_url` = use
  the built-in generated artwork.
- **Lists go one line per item inside the cell** (Alt+Enter), never comma-separated.
- **Never rename a header or a `key`.** The site looks them up by name.
- **Prices are numbers.** `75`, not `£75`.
- Extra columns are ignored, so private working columns (cost, supplier, notes)
  can live in the same tab and will never be published. `team` ships with
  `phone_private` and `email_private` for exactly this reason — the site does
  not show staff contact details, so the endpoint does not publish them.

### The two that surprise people

**The business name is a cell.** `contact` → `business_name` renames the header,
the footer, the legal line and the copyright in one edit. Page `<title>` tags
and meta descriptions stay in the HTML on purpose — they are SEO, they should
not change under you, and a crawler must see them without running JavaScript.

**The reviews widget is a cell too.** `settings` → `reviews_provider` +
`reviews_id`:

| provider | what `reviews_id` holds |
|---|---|
| `jotform` | the JotForm website-widget id |
| `iframe` | a full `https://` embed URL — Google, Facebook, Elfsight, Trustpilot |
| `none` | nothing; the section hides itself |

Anything that is not a plain widget id or an `https://` URL is refused before it
can reach a `src`.

To show a **different reviews page on one particular page**, add a settings row
`reviews_id_<name>` (e.g. `reviews_id_services`) and put
`data-reviews-key="services"` on that page's `#reviews-embed`. Without the
attribute every page shares `reviews_id`.

### The home page headline

`settings` → `hero_eyebrow`, `hero_title`, `hero_text`. In `hero_title`,
`*asterisks*` mark the words that get the gold accent:
`Afro hair care, *done properly*.` That is the only place a cell may produce a
tag, and the value is HTML-escaped first, so a cell containing real markup is
still shown as plain text.

### `image_url` — the one that catches people out

It must be a link to the **image file itself**, ending `.jpg`, `.png` or
`.webp`. A normal Google Drive share link serves an HTML viewer page, not a
picture, and will render as a broken image. Anything that is not plainly
`http(s)` is dropped by the data layer before it can reach an `src`.

## Step 3 — Publish the sheet

1. Back in Apps Script (the same project from step 2), run **`testPayload`**, then **`testDataQuality`** (View → Logs). Fix anything flagged.
2. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ← the single most common mistake
3. Copy the `/exec` URL.

> **Verify before moving on:** paste the URL into a browser. You should see raw
> JSON starting `{"ok":true`. If you see a Google **sign-in page**, access is not
> set to "Anyone" — the site will silently run on built-in content until fixed.

## Step 4 — Fill in `config.js`

Only `sheetEndpoint` truly has to be right here. Everything else in this table
is a **fallback** that the sheet overrides once it is live, so getting it
roughly right and finishing in the spreadsheet is fine.

| Setting | What to put |
|---|---|
| `businessName` | Fallback only — `contact` → `business_name` renames it everywhere |
| `sheetEndpoint` | The `/exec` URL from step 3 |
| `bookingProvider` | `'calendly'`, `'google'`, or `'none'` |
| `bookingUrl` | Calendly link, or Google appointment-schedule link |
| `reviewsProvider` | Fallback only — `settings` → `reviews_provider` wins |
| `reviewsId` | Fallback only — `settings` → `reviews_id` wins |
| `phone` | One number. `tel:` and WhatsApp are derived from it |
| `whatsappNumber` | Only if WhatsApp is a *different* number to `phone` |
| `email`, `emailFeedback`, `address`, `mapsQuery` | Contact details |
| `instagram` | Full URL, or blank to hide the icon |
| `whatsappMessage` | Prefilled text. `{business}` and `{service}` are substituted |
| `companyNo`, `nhbfNo`, `insurer` | Footer legal line |
| `bookingNotice` | Shown above the booking buttons. `''` hides it |

Then:

```bash
bash build.sh
```

## Step 5 — Deploy

**GitHub Pages**

```bash
git add -A && git commit -m "Initial site"
gh repo create <name> --public --source=. --push
```
Then Settings → Pages → Source: `main` / root.

**Cloudflare Pages** — connect the repo, framework preset **None**, build
command *(blank)*, output directory `/`. It is a static site with no build step.

## Step 6 — Check it

Open `/tests/` and `/tests/providers.html` in a browser. Two suites, ~80
assertions, all should pass. Then spot-check by hand:

- [ ] Endpoint returns `{"ok":true` in a browser
- [ ] Console shows `[sheet] live data applied — …`
- [ ] Change a price in the sheet, wait ~15 min (or `AHC.clearCache()` and reload), confirm it changes
- [ ] Book button opens the scheduler
- [ ] WhatsApp button opens with the message prefilled
- [ ] Reviews section shows the widget
- [ ] Phone/email correct in the footer on more than one page
- [ ] Mobile: drawer opens full height, no sideways scrolling

---

## What lives where

| Thing | Where | Who changes it |
|---|---|---|
| Services, prices, categories | Sheet → `services`, `categories` | Owner |
| Contact details, legal numbers | Sheet → `contact` | Owner |
| Opening hours | Sheet → `hours` | Owner |
| Offers / ticker (with date ranges) | Sheet → `promos` | Owner |
| Staff, and their photos | Sheet → `team` | Owner |
| Chat questions and answers | Sheet → `faq` | Owner |
| Deposit, cancellation window, consultation + chat copy | Sheet → `settings` | Owner |
| Endpoint, booking + reviews providers, phone | `assets/js/config.js` | You, once |
| Fallback copy of all sheet content | `config.js` + `services-data.js` | You, once |
| Page titles, meta descriptions, headings | The HTML | You, once (SEO — keep static) |
| Long-form policy pages | `care/*.html` | You, once |
| Design, layout, behaviour | `style.css`, `main.js`, `data.js`, `providers.js`, `chat.js` | Shared — avoid per-site edits |

## Architecture, in one paragraph

`config.js` holds settings and built-in content. `providers.js` turns the
booking/reviews/WhatsApp settings into behaviour, loading third-party scripts on
demand so no page markup mentions a vendor. `data.js` fetches the sheet once per
page load and **mutates the existing globals in place**, so every component that
already displayed a value keeps working without modification. `main.js` splits
"bind once" from "render again", so the post-fetch re-render never double-binds
listeners. Fallback order is live sheet → localStorage cache (12 min) → built-in
values, applied synchronously before first paint, which is why there is no
loading spinner anywhere.

## Traps that have already bitten

1. **Apps Script not shared with "Anyone"** — returns a sign-in *page* with HTTP
   200. The site detects it and logs a clear message, but has no live data.
2. **Editing the script is not deploying it.** Deploy → *Manage deployments* →
   edit → Version: **New version**.
3. **Category names must match** between the `services` and `categories` tabs,
   or the service will not appear under any filter. `testDataQuality` checks this.
4. **Blank is meaningful.** Blank `hours` = Closed. Blank `instagram_url` = hide
   the icon. Blank `price` = "On request", but `0` = "Free".
5. **Lists go one per line** in a cell (Alt+Enter), not comma-separated.
6. **Do not put fixed positioned elements inside `<header>`** — it has
   `backdrop-filter`, which makes it the containing block, and they size to the
   header instead of the viewport.
7. **`z-index`**: header 100 · social 180 · chat 205 · consult 210 · scrim
   215 · drawer 220 · modal 300. Do not use 9999.
8. **`image_url` must point at the image file**, not a Drive share page.
   Anything not plainly `http(s)` is dropped before it reaches an `src`.
9. **Enquire and Book are separate routes** and must stay that way: Enquire
   offers WhatsApp and a phone call, Book offers the scheduler. Section G of
   the provider suite fails if they start offering each other again.

## Per-site checklist

```
[ ] Folder copied, git re-initialised
[ ] Sheet created, Code.gs pasted, setupSheet run, content filled in
[ ] testPayload + testDataQuality run clean
[ ] Deployed as web app, access = Anyone, /exec returns {"ok":true
[ ] config.js filled in (9 sections)
[ ] bash build.sh
[ ] Both test suites pass (110 assertions)
[ ] Chat widget opens, a question answers, WhatsApp handover works
[ ] Deployed to Pages / Cloudflare
[ ] Placeholder content replaced (see README checklist)
[ ] Privacy policy + cookie notice added if forms/embeds collect data
```
