# First Class Exotics — Handoff Document
**Last Updated:** July 6, 2026
**Status:** Production Live

---

## 🚀 Site Info
- **Live URL:** https://www.firstclassexotics.com
- **Hosting:** Netlify (auto-deploy on push to `main`)
- **Domain Rule:** Netlify primary must remain `www.firstclassexotics.com`; apex 301 redirects to `www` (intentional — never change)
- **Wix:** Active only for email MX records — never touch Wix DNS
- **GitHub Repo:** ahojat45/firstclassexotics (`main`)
- **Analytics:** GA4 `G-E655N33GPP`
- **Brevo:** uses `BREVO_API_KEY` env var

---

## ✅ Current Production State (July 6)

### SEO + Indexing
- `sitemap.xml` contains **33 URLs** and is submitted to GSC.
- Recrawl checkpoint remains **July 9-16**.
- City pages are live for:
  - `exotic-car-rental-irvine.html`
  - `exotic-car-rental-huntington-beach.html`
  - `exotic-car-rental-laguna-beach.html`
  - `exotic-car-rental-newport-beach.html` (includes Corona del Mar section)
- No standalone Corona del Mar page (intentional doorway-risk control).

### CRITICAL URL Pattern Rule
- All city pages must follow: **`exotic-car-rental-{city}.html`** (city name LAST).
- Reversed pattern (example: `irvine-exotic-car-rental.html`) causes 404s and indexing failures.
- Future city pages (Anaheim, Costa Mesa, LA, Beverly Hills) must follow this exact naming pattern.

### Brand Landing Pages Live (full schema)
- `rent-lamborghini-orange-county.html`
- `rent-ferrari-orange-county.html`
- `rent-mclaren-orange-county.html`
- `rent-rolls-royce-orange-county.html`
- `rent-porsche-orange-county.html`
- `rent-g63-orange-county.html`
- `rent-maybach-orange-county.html`
- `rent-range-rover-orange-county.html`

### Blog Publisher v2
- URL: `/blog-publisher.html`
- Password: `FCE2026`
- **Paste Article mode only** for production publishing (do not use AI Draft topic box for final content).
- Multi-image upload writes to: `images/blog/{slug}/`
- Slug-exists guard active (prevents duplicate post/card)
- Sitemap auto-append active on publish
- Accent normalization fix in `buildSlug` is live (`normalize('NFD')` + combining-mark strip)
  - Commit: `1d8e92c`
- Model configuration:
  - `claude-haiku-4-5-20251001`
  - `max_tokens: 1024`

### Live Blog Slugs
- `exotic-cars-coming-orange-county-2026-2027`
- `ferrari-296-speciale`
- `lamborghini-urus-se-2026`
- `mclaren-w1`
- `oc-exotic-car-culture-guide`
- `porsche-911-gt3-rs-40`
- `lamborghini-temerario-the-huracan-era-is-ending`

### Homepage Status
- Elfsight Google Reviews widget live and paid:
  - ID `2c1fd891-04c1-41e3-b373-10268396653b`
- Elfsight Instagram widget live and paid:
  - ID `e190139a-b69b-47b3-9345-57192bd5ce39`
- Homepage `AutoRental` JSON-LD includes `AggregateRating` = **5.0 / 75**

---

## 🧭 Roadmap + Pacing Rules

### City Pages Pacing Rule
- Maximum **2-3 new city pages per week**.
- Next order:
  1. Anaheim + Costa Mesa
  2. Los Angeles + Beverly Hills
  3. Model-level car pages

### Open GSC Item
- Verify which URL is flagged as **Excluded by noindex**.
- If it is `blog-publisher.html`, that is intentional.
- If it is any real indexable page (city/brand/blog/fleet), remove noindex and push immediately.

---

## ⏳ Pending Tasks

### 1) Fleet Page Update (waiting on Ali)
Do not start until Ali provides:
1. Car list (make/model/year/color)
2. Photo location (`May 7 Car Photos` or `20 Car Photos`) and destination (on-site vs Google Drive lightbox)
3. Pricing/details format or instruction to mirror existing fleet cards

Implementation requirements when details arrive:
- Follow existing fleet card + lightbox pattern in `index.html`
- For Google Drive thumbnails, use:
  - `https://drive.google.com/thumbnail?id=FILE_ID&sz=w800`
- Optimize/compress any on-site images
- No base64 embeds
- Use lazy-loading
- If any new pages are created, update `sitemap.xml`

### 2) GSC noindex Verification
- Confirm excluded page identity in GSC.
- Treat `blog-publisher.html` as intentional noindex; fix any other page if flagged.

---

## 🧩 New Project — FCE OS (Internal First)

Goal:
- Build FCE OS as First Class Exotics' internal broker-rental management software first.
- Run FCE operations on it for 2-3 months.
- Then productize for OC/LA fleet-owner network.

### Module 1 Scope (Now)
- Digital rental agreements (customer completes on phone)
- E-signature
- Condition photos at pickup/return
- Deposit tracking (hold -> release)
- Customer document uploads on customer record:
  - driver's license
  - insurance card
- Expiration-date tracking for re-verification reminders

### Module 2 Scope (Next)
- CRM layer with customer records auto-created from signed agreements
- Rental history timeline
- Lead pipeline with source tracking
- Automated follow-ups
- Repeat-customer tiers for upsells

---

## 🔧 Key Files
- `netlify.toml` — redirects + Netlify behavior
- `sitemap.xml` — 33 live URLs
- `index.html` — homepage + fleet cards/lightbox
- `blog.html` — blog index
- `blog-publisher.html` — publisher v2 UI (`FCE2026`)
- `netlify/functions/blog-publisher.js` — generate/publish function

## 🔐 Netlify Env Vars (already set; do not change)
- `ANTHROPIC_API_KEY`
- `GITHUB_TOKEN`
- `BREVO_API_KEY`

---

## ⚠️ Non-Negotiables
- Never touch Wix DNS/MX configuration.
- Never change apex->www canonical redirect behavior.
- All deploys happen via push to `main`.
