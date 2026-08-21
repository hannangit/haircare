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

## Step 2 — Create the Google Sheet

1. New Google Sheet. Create **7 tabs**, named exactly:
   `services`, `categories`, `contact`, `hours`, `promos`, `team`, `settings`
2. Import each CSV from `seed/` into its matching tab
   (*File → Import → Upload → Replace current sheet*).
3. Edit the rows for the new business. Keep the header row exactly as-is.

## Step 3 — Publish the sheet

1. **Extensions → Apps Script**, delete the placeholder, paste `apps-script/Code.gs`, save.
2. Run **`testPayload`**, then **`testDataQuality`** (View → Logs). Fix anything flagged.
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** ← the single most common mistake
4. Copy the `/exec` URL.

> **Verify before moving on:** paste the URL into a browser. You should see raw
> JSON starting `{"ok":true`. If you see a Google **sign-in page**, access is not
> set to "Anyone" — the site will silently run on built-in content until fixed.

## Step 4 — Fill in `config.js`

| Setting | What to put |
|---|---|
| `businessName` | Used in WhatsApp messages and alt text |
| `sheetEndpoint` | The `/exec` URL from step 3 |
| `bookingProvider` | `'calendly'`, `'google'`, or `'none'` |
| `bookingUrl` | Calendly link, or Google appointment-schedule link |
| `reviewsProvider` | `'jotform'`, `'iframe'`, or `'none'` |
| `reviewsId` | JotForm widget ID, or a full `https://` embed URL |
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
| Staff | Sheet → `team` | Owner |
| Deposit, cancellation window, widget copy | Sheet → `settings` | Owner |
| Endpoint, booking + reviews providers, phone | `assets/js/config.js` | You, once |
| Fallback copy of all sheet content | `config.js` + `services-data.js` | You, once |
| Page titles, meta descriptions, headings | The HTML | You, once (SEO — keep static) |
| Long-form policy pages | `care/*.html` | You, once |
| Design, layout, behaviour | `style.css`, `main.js`, `data.js`, `providers.js` | Shared — avoid per-site edits |

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
7. **`z-index`**: header 100 · social 180 · WhatsApp 200 · consult 210 · scrim
   215 · drawer 220 · modal 300. Do not use 9999.

## Per-site checklist

```
[ ] Folder copied, git re-initialised
[ ] Sheet created, 7 tabs, CSVs imported and edited
[ ] Code.gs pasted, testPayload + testDataQuality run clean
[ ] Deployed as web app, access = Anyone, /exec returns {"ok":true
[ ] config.js filled in (13 settings)
[ ] bash build.sh
[ ] Both test suites pass
[ ] Deployed to Pages / Cloudflare
[ ] Placeholder content replaced (see README checklist)
[ ] Privacy policy + cookie notice added if forms/embeds collect data
```
