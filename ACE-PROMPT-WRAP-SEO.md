# ACE TASK — Wrap SEO: turn the 11 wrap pages into a lead engine

**Goal: wrap-quote form submissions.** Not rankings for their own sake. The form
(`wrap-quote`, Netlify Forms) has produced 1 real lead since 15 May. The pages are
structurally sound — unique titles/descriptions/H1s, ~400 words of city-specific copy
each, Service + FAQPage schema, clean canonicals, all 11 in the sitemap. Do NOT rebuild
them. The gaps are: zero proof (every image is stock), zero money-intent content
(nobody answers "what does it cost"), and a thin hub (764 words vs ~1,200 on city pages).

## Read before touching anything
- Repo conventions live in HANDOFF.md §2 — they are hard rules:
  - Every image: 1600px max, JPEG q82 progressive, never upscale, a `.webp` sibling at
    identical pixel dimensions, wrapped in `<picture>` with width/height/loading/alt.
  - Internal links point at SERVED urls (`/vinyl-wrap-irvine`), never `.html` — in
    hrefs, canonical, og:url, sitemap AND JSON-LD url/item/@id/mainEntityOfPage.
  - Address is exactly `2060 Placentia Ave Ste A4, Costa Mesa, CA 92627` — no comma
    before Ste, never "Suite". Hours are `Open Daily 8am–10pm` / `Mo-Su 08:00-22:00`.
  - `aggregateRating`/`review` schema ONLY on the homepage. Never add it to wrap pages.
  - Never touch: 404.html, blog-publisher.html, agreement.html, google49d716d460298fda.html,
    google8cf0ce3903a867e7.html.
- Any NEW `.md` in the repo root is publicly served until netlify.toml gets an exact-path
  `force = true` 404 rule for it (HANDOFF.md §11). This file already has one. If you add
  docs, add rules.
- Run git reads with `--no-optional-locks`. More than one agent works in this repo —
  `git status` first and confirm the tree is yours before committing.
- Ali pushes from Terminal.app; agents never push.

## Task 1 — Replace stock with Ali's real wrap photos (biggest single win)
All 66 images across the 11 wrap pages are Pexels/Unsplash. Ali installs in-house at the
Placentia Ave shop and HAS real job photos.
1. Ali drops originals in `images/wraps/_raw/` (any format; iPhone HEIC is fine).
2. Process per §2 into `images/wraps/<job-slug>/<job-slug>-NN.jpg` + `.webp`
   (e.g. `satin-black-urus/satin-black-urus-01.jpg`). `-01` = finished exterior
   three-quarter; in-progress and detail shots after.
3. Replace every stock `<img>` on all 11 pages with real photos. Alt text = honest
   description + service + place ("Satin black full wrap on a Lamborghini Urus —
   installed in Costa Mesa, CA"). No keyword stuffing.
4. Grep both `unsplash` and `pexels` when verifying zero remain (past audits missed
   Pexels). Update each touched page's og:image/twitter:image to a real photo ≥1200px wide.

## Task 0 — Context added 10 Sep: Tint + Ceramic are now offered
Ali added **Window Tint** and **4-Stage Ceramic Coating** to the Google Business Profile
services on 10 Sep, and the hub page already has service cards, form options and
serviceType schema for both (done same day). Keep site and GBP in sync: mention tint and
ceramic where natural in Task 2/3 content (FAQ, pricing section, blog posts), and the
pricing placeholders below include them.

## Task 2 — Hub page (`vinyl-wrap.html`) becomes the money page
Grow from 764 to ~1,400 words. Add, in this order after the existing services section:
1. **Pricing section** targeting "car wrap cost orange county". Honest ranges with a
   "every car quoted individually" caveat. ⚠️ GET THE RANGES FROM ALI — do not invent
   prices. Placeholders: full color change $____–$____, chrome delete $____–$____,
   partial/accents $____–$____, PPF+wrap combo from $____, window tint $____–$____,
   4-stage ceramic coating $____–$____.
2. **Real-work gallery** — 6–10 of the Task-1 photos with captions naming car + finish.
3. **Process section** — drop-off at the Costa Mesa shop, film samples in person,
   3–5 day full wraps, 1–2 day chrome delete (claims already live on the city pages).
4. **FAQ block + FAQPage JSON-LD** (hub has none; city pages have 3 Qs each). 6 Qs,
   cost-intent first: how much does it cost · how long does it last · wrap vs paint ·
   does it damage paint · how long does install take · do you wrap daily drivers or
   only exotics.
5. Keep the LocalBusiness block; add a `Service` block mirroring the city pages
   (no aggregateRating).
Title stays close but pick up cost intent, e.g.
`Vinyl Wrap Orange County — Cost, Finishes & Install | First Class Exotics` (≤60 chars).

## Task 3 — Two blog posts feeding the hub
Write like the existing blog (see blog/*.html for template/tone), served at /blog/<slug>,
added to sitemap with real lastmod:
1. "How Much Does It Cost to Wrap a Car in Orange County? (2026 Prices)" — the ranges
   from Task 2, what moves price, why exotics cost more. Link hub + 2–3 city pages.
2. "Matte vs Satin vs Gloss: Choosing a Wrap Finish for Your Exotic" — practical,
   coastal-climate angle the city pages already use. Link hub + city pages.
Article schema per existing posts; og:image ≥1200px from the real photo set.

## Task 4 — Small mechanical items
- Sitemap `lastmod` from real git dates for every touched page; entry count grows only
  by the 2 posts (11 wrap entries stay 11).
- Internal links: add one contextual link to `/vinyl-wrap` from the two most-trafficked
  blog posts if natural. Do not spam the fleet pages.
- `landing-city` hidden field already tags wrap-quote submissions per city — leave it.

## Verify before handing back (report results, don't assert)
1. `grep -ri 'unsplash\|pexels' vinyl-wrap*.html` → 0 hits.
2. Every new image has a `.webp` sibling, `<picture>` wrapper, width/height/alt.
3. `grep -n '\.html' <touched files>` → no internal `.html` links incl. JSON-LD.
4. JSON-LD parses (json.loads every block) on all touched pages.
5. Titles ≤60 chars, descriptions ≤160, no duplicates.
6. `grep -n 'Placentia Ave, \|Suite A4' --include='*.html' -r .` → nothing.
7. Diff summary for Ali: files touched, images swapped, words added.

## NOT in scope (Ali handles these directly)
- Google Business Profile: add Vinyl Wrap / Chrome Delete / PPF services + upload the
  same real photos there. GBP drives local wrap leads more than on-page SEO does.
- Search Console baseline screenshot filtered to /vinyl-wrap (before/after proof).
- The $500 Google Ads credit decision — spend decision, not an SEO task.
