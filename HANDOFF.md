# First Class Exotics — Handoff Document
**Last Updated:** July 2, 2026
**Status:** Production Live

---

## 🚀 Site Info
- **Live URL:** https://www.firstclassexotics.com
- **GitHub:** ahojat45/firstclassexotics (branch: main)
- **Hosting:** Netlify (auto-deploy on push to main)
- **Analytics:** GA4 — G-E655N33GPP
- **Wix:** Still active SOLELY for email MX records — NEVER touch DNS

---

## ✅ What's Been Done (Most Recent First)

### July 3 2026 Session Notes
- **CRITICAL city landing page URL pattern:** city pages must be `exotic-car-rental-{city}.html` with the city name LAST. Examples: `exotic-car-rental-irvine.html`, `exotic-car-rental-huntington-beach.html`, `exotic-car-rental-laguna-beach.html`, `exotic-car-rental-newport-beach.html`.
- A city-first guess like `irvine-exotic-car-rental.html` caused a 404 and a rejected GSC indexing request today. All future city pages (Anaheim, Costa Mesa, LA, Beverly Hills) must follow the same pattern.
- GSC status (July 3): Request Indexing was completed on desktop for all 4 city pages (Irvine, Huntington Beach, Laguna Beach, Newport Beach). All show "Indexing requested." Current report is 24 indexed / 38 not indexed, down from 81 as old Wix URLs flush out.
- Recrawl checkpoint: July 9-16. Indexed count is expected to climb toward the 33 URLs currently in sitemap.
- Open GSC noindex item: repo scan found `noindex` only in `404.html`, `privacy.html`, and `terms.html`. No real page, blog post, fleet page, or `blog-publisher.html` contains `noindex`, so no code change is needed for this item.

### Evening SEO + Publisher Fixes — July 2 2026
- Fixed slug accent transliteration in `buildSlug` in `blog-publisher.html` using Unicode normalization (`normalize('NFD')` + combining-mark strip) so `Huracán` now becomes `huracan`.
  - Commit: `1d8e92c`
- Launched new city landing pages:
  - Irvine: `https://www.firstclassexotics.com/exotic-car-rental-irvine.html` (commit `3da1eac`)
  - Huntington Beach: `https://www.firstclassexotics.com/exotic-car-rental-huntington-beach.html` (commit `11efec1`)
  - Laguna Beach: `https://www.firstclassexotics.com/exotic-car-rental-laguna-beach.html` (commit `3d89ad8`)
- Upgraded Newport Beach city page to current standard and added dedicated Corona del Mar section:
  - `https://www.firstclassexotics.com/exotic-car-rental-newport-beach.html` (commit `35e6609`)
- Repointed legacy Wix Irvine URL redirect from homepage to the new Irvine landing page:
  - `/irvineluxurycarrental` now redirects to `/exotic-car-rental-irvine.html` (301)
  - Commit: `3649eda`
- Audited Netlify legacy redirects for new city pages:
  - No legacy Huntington Beach redirect existed.
  - No legacy Laguna Beach redirect existed.
- Sitemap updated to 33 live URLs.

### Blog Publisher v2 Live — July 2 2026
- Rebuilt `blog-publisher.html` + `netlify/functions/blog-publisher.js` end-to-end for production-safe publishing.
- First real article published via Publisher v2 Paste Mode: `blog/lamborghini-temerario-the-huracan-era-is-ending.html` (Temerario/Huracan story using Ali's own Huracan photo).
- Publisher v2 workflow confirmed working end-to-end in production with a real non-test post.
- New article template now ships SEO-complete by default:
  - canonical `https://www.firstclassexotics.com/blog/{slug}.html`
  - title tag capped to 60 chars including `| First Class Exotics`
  - meta description from dedicated field (fallback: first intro text, capped)
  - exactly one template H1 (body H1 is stripped)
  - `Article` + `BreadcrumbList` JSON-LD
  - OG image always absolute URL
  - hero + support image handling with width/height attrs and lazy loading on support images
  - related section before footer (2 blog links + brand landing link when relevant + `/#fleet`)
  - CTA block with both call and text links to `(949) 294-5958`
- Added mode toggle: `AI Draft` vs `Paste Article`
  - Paste mode sanitizes HTML body (strips script/style/iframe)
  - fields include title/category/keywords/meta description + body HTML
  - Publishing workflow rule: articles researched/written by Claude chat go in via `Paste Article` tab, never via AI Draft topic box (to avoid rewrites and factual drift)
- Added image upload pipeline (max 5 images):
  - client-side resize to max width 1600, JPEG quality 0.8
  - preview thumbnails + per-image alt text (default title)
  - first upload is hero image
  - payload-size counter + hard stop at 5MB request body
- Backend hardening in Netlify function:
  - checks for existing slug first and returns `409 {"error":"Post with this slug already exists"}`
  - slug normalization tightened (lowercase, punctuation stripped, hyphenated, max 60 chars)
  - uploaded images are committed to `images/blog/{slug}/{n}.jpg` via GitHub API before article publish
  - sitemap auto-append of new blog URL in `sitemap.xml`
- Generate mode upgraded:
  - optional Notes / angle / facts input included in prompt
  - prompt rewritten to require practical detail and avoid cliche language
  - model remains `claude-haiku-4-5-20251001`
  - `max_tokens` increased to `2048` and verified with live generate test (no timeout)
- Added `Blog` JSON-LD schema to `blog.html` index page.
- Live validation completed:
  - published `test-publisher-rebuild` through live publisher in Paste mode with 2 uploaded images
  - verified live article (200), schema present, related links present, image attrs present, and sitemap append
  - verified duplicate-slug guard via live `409` response
  - clean rollback completed: removed test post file, card, sitemap entry, and uploaded test images

### 9 SEO Landing Pages Live — July 2 2026
- Launched 9 new SEO landing pages with unique long-form copy, schema (AutoRental + FAQPage + BreadcrumbList), and optimized local image galleries:
  - https://www.firstclassexotics.com/rent-lamborghini-orange-county.html
  - https://www.firstclassexotics.com/rent-ferrari-orange-county.html
  - https://www.firstclassexotics.com/rent-mclaren-orange-county.html
  - https://www.firstclassexotics.com/rent-rolls-royce-orange-county.html
  - https://www.firstclassexotics.com/rent-porsche-orange-county.html
  - https://www.firstclassexotics.com/rent-g63-orange-county.html
  - https://www.firstclassexotics.com/rent-maybach-orange-county.html
  - https://www.firstclassexotics.com/rent-range-rover-orange-county.html
  - https://www.firstclassexotics.com/exotic-car-rental-newport-beach.html
- Updated homepage fleet card `Reserve Now` links to route by brand to the new landing pages (href-only changes; no homepage design changes)
- Added internal links from both `/blog/` and root-level legacy blog posts into relevant new landing pages
- Updated sitemap.xml to include all 9 new canonical URLs (sitemap now 30 live URLs)

### GSC Indexing Fix — July 2 2026 Deployment
- Diagnosed split-hosting: Wix-era paths had no Netlify .html files, falling through to Wix
- Added 7 x 301 redirects to netlify.toml for dead paths → /
  - /irvineluxurycarrental, /costamesaexoticcarrental, /supercarrentalslosangeles
  - /about-2, /our-fleet, /contact-4, /miamibluelamborghinievo
- Redirects pushed live on Netlify July 2
- July 2 — Root cause #2 found and fixed: Netlify primary domain was the apex (firstclassexotics.com), but canonicals, sitemap, and GSC property all use www. Every sitemap URL was 301-redirecting, creating a canonical loop. Fixed by setting www.firstclassexotics.com as primary domain in Netlify dashboard. Sitemap resubmitted in GSC same day (22 pages discovered). NOTE: apex now redirects to www — this is correct and intentional, do not change.
- Rebuilt sitemap.xml — now 22 correct canonical URLs (was 16)
- Sitemap manually resubmitted in GSC June 30
- SEO audit fix batch deployed July 2: removed dead `ferrari-458-italia` sitemap URL (sitemap now 21 live URLs), fixed blog card link/heading structure, updated OC 2026-2027 post title + Article schema, added homepage AutoRental aggregateRating schema, reduced `car-ferrari-f8.html` payload by externalizing 10 embedded images, and added related internal links across all 6 `/blog/` pages.
- Expect indexing improvement over 1-2 weeks
- GSC status as of June 30: 25 indexed, 81 not indexed

### Blog Publisher Fix — June 27 2026
- Switched model to claude-haiku-4-5-20251001 (was Opus — caused timeouts)
- Fixed markdown code fence bug (strips ```html before publish)
- Published post: exotic-cars-coming-orange-county-2026-2027
- Fixed duplicate Lamborghini card + orphan link in blog.html

### Blog Overhaul — June 23-24 2026
- Magazine layout: hero, gold category filter pills, 3-column card grid
- 6 live blog posts:
  - exotic-cars-coming-orange-county-2026-2027
  - ferrari-296-speciale
  - lamborghini-urus-se-2026
  - mclaren-w1
  - oc-exotic-car-culture-guide
  - porsche-911-gt3-rs-40

### Homepage
- Elfsight Google Reviews widget live (ID: 2c1fd891-04c1-41e3-b373-10268396653b) — 5.0 stars, 75 reviews
- Elfsight Instagram widget live (ID: e190139a-b69b-47b3-9345-57192bd5ce39)
- Elfsight status update (July 2): Google Reviews widget moved to paid Basic-Yearly plan after view-limit outage; Instagram widget already paid. Both are live and verified on homepage, no replacement needed.

---

## 🐛 Known Pending Issues

### 1. Expired GitHub Token
- "First Class Exotics Blog" token expired June 12 2026
- Can safely delete from github.com/settings/tokens
- Active token: "FCE Blog Publisher" (no expiration) — leave alone

### 2. SEO Roadmap (Remaining)
- Launch city landing pages in controlled batches (2-3 per week max): Anaheim + Costa Mesa next.
- Then move to Los Angeles + Beverly Hills city pages.
- Build model-level landing pages for highest-intent vehicles and trims
- Build dedicated car detail pages for each fleet vehicle
- Correct Yelp phone number to match official business line

---

## 🧭 Publisher v2 Flow (Do This Every Time)
1. Open `https://www.firstclassexotics.com/blog-publisher.html` and log in with password `FCE2026`.
2. Choose mode:
  - `AI Draft` for generated first draft
  - `Paste Article` for final human-written HTML body
3. Fill title, slug, category, keywords, and meta description.
4. Add optional Notes (AI mode) for real facts/angle.
5. Upload 1-5 images (preferred) and set alt text per image.
6. If no uploads, provide valid Unsplash URL (`https://images.unsplash.com/...`) or rely on brand-aware local fallback.
7. Build/Generate preview and verify:
  - single H1
  - clean headings/body
  - metadata and related links shown in preview summary
8. Publish.
9. Confirm live:
  - `https://www.firstclassexotics.com/blog/{slug}.html` returns 200
  - card appears once in `blog.html`
  - URL appears in `sitemap.xml`
10. If publish returns 409, slug already exists; change slug/title and republish.

---

## 🔧 Key Files
- netlify.toml — redirects config (7 Wix-era 301s + 3 internal redirects)
- sitemap.xml — 33 live URLs (includes Irvine, Huntington Beach, and Laguna Beach city pages)
- blog-publisher.html — password: FCE2026
- blog.html — main blog index page
- index.html — homepage
- netlify/functions/blog-publisher.js — serverless function for AI generation + GitHub publish

## 🔐 Netlify Env Vars (already set, don't touch)
- ANTHROPIC_API_KEY
- GITHUB_TOKEN

---

## 📊 GSC / SEO Status
- Property: https://www.firstclassexotics.com/
- Clicks last 28 days as of June 30: 257 (down 28% — migration related, expected to recover)
- Impressions: 17.5K (down 10%)
- Indexed pages: 25 (target: 50+ once Google recrawls sitemap)
- Check GSC again during week of July 9-16; expect indexed count to climb from 25 with 33 URLs currently in sitemap. Brief dip or "page with redirect" notices in the first few days are normal.
- PENDING TOMORROW: Request indexing in GSC for the 4 city URLs:
  - `https://www.firstclassexotics.com/exotic-car-rental-irvine.html`
  - `https://www.firstclassexotics.com/exotic-car-rental-huntington-beach.html`
  - `https://www.firstclassexotics.com/exotic-car-rental-laguna-beach.html`
  - `https://www.firstclassexotics.com/exotic-car-rental-newport-beach.html`
  - Must be done from desktop with the verified GSC account; MacBook Google account is not verified for this property.

---

## ⚠️ Rules
- NEVER touch Wix DNS or MX records
- NEVER alter site content during technical fixes
- Blog publisher model must stay as claude-haiku-4-5-20251001 with max_tokens: 2048
- All repo work via Claude Code (Ace) — planning chat handles diagnosis only
