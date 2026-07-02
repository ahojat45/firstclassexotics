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

---

## 🐛 Known Pending Issues

### 1. Blog Publisher Duplicate Card Bug (TOP PRIORITY)
When publishing a new post, if slug already exists in blog.html, creates duplicate card + orphan link.
Fix needed:
- Before inserting new card into blog.html, check if slug already exists — skip if it does
- Sanitize Unsplash URLs: replace &amp; with & before saving

### 2. Expired GitHub Token
- "First Class Exotics Blog" token expired June 12 2026
- Can safely delete from github.com/settings/tokens
- Active token: "FCE Blog Publisher" (no expiration) — leave alone

### 3. SEO Roadmap (Remaining)
- Build dedicated car detail pages for each fleet vehicle
- Launch city landing pages for primary SoCal service areas
- Correct Yelp phone number to match official business line

---

## 🔧 Key Files
- netlify.toml — redirects config (7 Wix-era 301s + 3 internal redirects)
- sitemap.xml — 21 live URLs (dead ferrari-458 URL removed July 2)
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
- Check GSC again July 9-16; expect indexed count to climb from 25. Brief dip or "page with redirect" notices in the first few days are normal.

---

## ⚠️ Rules
- NEVER touch Wix DNS or MX records
- NEVER alter site content during technical fixes
- Blog publisher model must stay as claude-haiku-4-5-20251001 with max_tokens: 1024
- All repo work via Claude Code (Ace) — planning chat handles diagnosis only
