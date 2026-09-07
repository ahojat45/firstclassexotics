# First Class Exotics — handoff (7 Sep 2026)
Paste this whole file into a new Claude session to restore context.
**`HANDOFF.md` is the authoritative copy.** The dated files are historical snapshots.
Verified against the repo, production, or Gmail on the date each item is stamped —
nothing here is carried forward on faith.
**Last work commit `dbd9e87`** (Handoff 7 Sep), pushed and deployed — Netlify
`6a9efd55807f7d0008193df1` **ready/current**, deploy id confirmed changed from the previous
`6a8e1dca…`. A doc-only commit correcting this very line may sit on top of it.
⚠️ **Never trust this line over git** — confirm with `git --no-optional-locks log --oneline -1`.
**Site engineering is finished.** 22–24 Aug content (§12); 25 Aug reviews (§6); 26 Aug video
(§13); **27 Aug – 7 Sep Higgsfield video via MCP (§15)**.

⚠️ **Ali was away 29 Aug → 7 Sep.** The single most valuable thing now is that **batch 1 has had
17 days to convert, not 8** — the review number is finally worth reading. See §10 item 1.

---

## 0. FIRST THING, EVERY SESSION
**Connect the folder.** Each Cowork session starts in a fresh cloud container with no access
to Ali's Mac. Nothing works until this is done.

**This is what Ali pastes to start a session — it works, do not ask him for more:**
```
Read HANDOFF.md — it's the full context for my business.
First: request folder access to
/Users/firstclassexotics/Desktop/First Class Exotics
(you won't have it in a new session), then read HANDOFF.md
from there.
Start with item 1 in section 10.
```
Call `device_request_folder_access` with that exact path, then read `HANDOFF.md`.
**Do not ask him to paste the file** — it is 54KB and the mount makes it unnecessary.

⚠️ **Folder grants last one session only.** Request again every time. Other folders, only
when the task needs them — ask once, for the minimal set:
- `/Users/firstclassexotics/Desktop/FC videos` — all video work and the Higgsfield prompts (§13)
- `/Users/firstclassexotics/Downloads` — his iPhone exports
Repo lives at `/Users/firstclassexotics/Desktop/First Class Exotics`.

⚠️ **Run git read commands with `--no-optional-locks`** (e.g. `git --no-optional-locks status`).
Without it the sandbox leaves a `.git/index.lock` it cannot delete, and Ali's next push fails.
Keep `rm -f .git/index.lock` in every push command as a belt-and-braces measure.

⚠️ **Anything you write to `/tmp` on the device VM is wiped between sessions and even across a
few idle hours.** A verification sweep that "passes" silently because the script vanished is
worse than no sweep — always confirm the script actually ran.

---

## 1. Current state

**HEAD `72a0e34` — committed AND pushed.** Verified 19 Aug: `origin/main == HEAD`, working tree
clean, Netlify deploy `6a8652a1…` state **ready/current**.

### Seven commits landed 19 Aug
```
72a0e34  Schema: address/geo/image/hours/priceRange/sameAs on 15 business blocks (26 files)
84ce5df  Handoff: mark fleet colour labels closed
6ad07d9  Fleet cards: real colour instead of "Available Colors" (5 cards)
94c28b8  Handoff 19 Aug
94e27f9  Sitemap: lastmod from real git dates (49 entries)
2c53dfe  JSON-LD: 37 url/item fields off .html (31 pages)
4230d60  Five audit defects
```

| Check | Result |
|---|---|
| Fleet | **48 cars** — 48 cards, 48 distinct `data-car`, all matched to dropdown, 0 dupes |
| Google reviews | **90** — schema and visible text agree, verified live |
| Sitemap | **49 entries** (was 51; `/privacy` + `/terms` removed, they are `noindex`) |
| `.webp` files | 371 |
| Images: missing file / no `.webp` / no `<picture>` / no alt | **0 / 0 / 0 / 0** (347 imgs + 300 gallery refs) |
| Internal links: `.html` / broken / hitting a 301 | **0 / 0 / 0** |
| Multi-hop redirect chains | **0** |
| `.html` inside JSON-LD | **0** (was 37) |
| Top-level business blocks missing `address` | **0** (was 15) |
| JSON-LD parse errors | 0 |
| Titles >60 / descs >160 / duplicates | 0 / 0 / 0 across 52 pages |
| Canonical wrong / `og:url` mismatch | 0 / 0 |
| Orphan pages | 0 |
| Fleet cards saying "Available Colors" | **0** (was 5) |

---

## 2. ⚠️ CONVENTIONS — read before editing anything

### Every image needs a `.webp` sibling and a `<picture>` wrapper
```html
<picture><source srcset="path/name-01.webp" type="image/webp"><img width="800" height="533" loading="lazy" src="path/name-01.jpg" alt="..." data-gallery="..." onerror="this.style.background='#1C1C1C'"></picture>
```
WebP at **quality 82, identical pixel dimensions**. Never upscale. **The rule covers
`data-gallery` too, not just `src`** — grepping `src=` alone misses ~300 gallery refs.

### Internal links must point at the SERVED URL, never `.html`
`href="/gift"` not `href="gift.html"`. Applies to hrefs, canonical, `og:url`, sitemap —
**and JSON-LD `url` / `item` / `@id` / `mainEntityOfPage`** (that surface was missed until
19 Aug; see §3).
Never rewrite these five: `404.html`, `blog-publisher.html`, `agreement.html`,
`google49d716d460298fda.html`, `google8cf0ce3903a867e7.html`.

### Fleet card ↔ dropdown must match exactly
A card's `data-car`, the `<option>` value and its visible label must be the identical string
(entities decode fine — `&mdash;` and `—` compare equal in the DOM). The JS at index.html
~2311 does `o.value === car`; a mismatch means Reserve Now silently selects nothing or the
wrong car. The car `<select>` lives in **`index.html` only**.
⚠️ **A parser that only reads `<option value="...">` will undercount** — most options carry no
`value` attribute and inherit their text. Two false alarms came from this.

### Review count changes in two places, together
`"reviewCount"` in the JSON-LD (index.html ~line 78) and the visible `"N Google reviews"` text
(~line 1937). **Never one without the other.**

### Only mark up schema for content a visitor can actually see
Business identity (address, geo, phone, hours, socials) is fine everywhere — it describes the
same business. **`aggregateRating` and `review` are NOT** — they belong only on the homepage,
which actually displays them. Adding ratings to pages that don't show them risks a manual
action. This is why the 15 blocks enriched on 19 Aug deliberately got no `aggregateRating`.

---

## 3. What was fixed 19 Aug

A full audit ran first — 52 pages, 647 image refs, 80 redirect rules, every JSON-LD block
parsed. Report saved as `SITE-AUDIT-2026-08-19.md`. **Eleven items found; nine closed.**

### The five broken things (`4230d60`)
1. **`blog/mclaren-w1.html` had a dead `og:image`** (`fleet_mclaren_720s.jpg`, no such file).
   Repointed to `images/fleet/mclaren-750s-spider-orange/…-01.jpg` (1595×986 — the only
   landscape McLaren; the others are portrait and crop badly in link previews).
2. **Both McLaren 750S cards shared `data-car="McLaren 750S Spider"`**, so the orange car's
   Reserve Now sent a lead naming the wrong car and the `2026 … — Orange` option was
   unreachable. Ali confirmed **two 750S Spiders: white, and the new 2026 orange.**
   White card + option → `McLaren 750S Spider — White`; orange card → `2026 McLaren 750S
   Spider — Orange`.
3. **`/privacy` and `/terms` were in `sitemap.xml` despite `noindex,follow`** — GSC reports
   this as *Submitted URL marked 'noindex'*. Removed; 51 → 49. This is also why `/terms` sat
   in "Discovered – not indexed": a real defect, not the harmless signal the 17 Aug handoff
   assumed.
4. **The Ferrari 458 Italia card carried `data-car="Custom Request"`**, dumping customers into
   the custom-request option instead of selecting the 458. Now `Ferrari 458 Italia`.
   (The audit draft wrongly called this a *missing card* — the card exists at ~line 1600.)
5. **`/irvineluxurycarrental` double-hopped** via `/exotic-car-rental-irvine.html`. Now points
   straight at the extensionless URL, matching every other legacy Wix rule.

⚠️ **#2 and #4 were live conversion bugs** — every Reserve Now click on the orange 750S or the
458 sent Ali a lead naming the wrong car, and logged the wrong `vehicle` in GA4.

### JSON-LD `.html` cleanup (`2c53dfe`)
**37 fields across 31 pages.** ⚠️ **Ali believed this was already done, and it was not.**
Commit `ce982ab` ("Point all 1029 internal links at served URLs") rewrote **only `<a href>`
tags** — it touched **0** `application/ld+json` lines, and the `.html`-in-schema count was 37
both at `ce982ab` and at HEAD before this fix. Two different surfaces, same-sounding job.
Affected every `rent-*`, every `vinyl-wrap-*`, 4 location pages and every blog post
(`BreadcrumbList.item`, `Article`/`Service.url`, `mainEntityOfPage`).

2 knowingly left alone: `blog/lamborghini-temerario-the-huracan-era-is-ending.html` self-refs.
That page 301s before it is ever served, so Google never reads its schema.

### Sitemap `lastmod` (`94e27f9`)
48 of 51 entries said `2026-07-24` although the WebP work and the link rewrite had touched them
since. Now set from each file's real last-commit date: 17 → `2026-08-13`, 1 → `2026-08-14`,
31 → `2026-08-19`.

### Fleet colour labels (`6ad07d9`)
Five cards said "Available Colors" instead of a colour. Ali gave plain colours — **his explicit
call, do not "upgrade" them**:
SF90 Stradale → **RED** · 296 GTB → **WHITE** · 750S Spider → **WHITE** ·
911 Carrera 4S → **RED** · Corvette Z06 → **BLACK**.
The other 42 cards use specific paints (Bianco Icarus White, Grigio Titans Silver, Giallo
Belenus Yellow…). Ali was asked whether to flatten those too and declined — **leave them.**

### LocalBusiness / AutoRental schema (`72a0e34`) — 26 files
15 skeletal blocks (7 `exotic-car-rental-*`, 8 `rent-*-orange-county`) had only
name/url/telephone/areaServed/description. Each now also carries `address`, `geo`, `image`
(that page's own og:image), `email`, `openingHours`, `priceRange`, `sameAs`.
Plus: `addressCountry` added to the 10 vinyl-wrap `provider` addresses; `url` added to 8
nested `Offer.seller` objects; `priceCurrency`/`availability` added to 2 Offers.

Verified by semantic diff: **every change is an addition** — zero removals, zero value changes,
no non-schema HTML touched. The commit shows 34 insertions / 254 deletions purely because the
10 vinyl-wrap `Service` blocks were pretty-printed across ~25 lines each and got re-serialised
onto one line, matching every other block in the repo.

⚠️ Two findings the first audit got wrong, corrected here:
- The **10 vinyl-wrap city pages already had an address**, nested inside `provider`. The audit
  only inspected top-level blocks.
- The `Offer.seller` objects on the `Car` blocks are **references, not listings** — they do not
  need a full address, and one was not added.

---

## 4. Search Console — read 19 Aug (data stamped 8/16/26)

**60 indexed / 56 not indexed.** Trajectory: 49 (13 Aug) → 59 (18 Aug) → **60**.
⚠️ This data **predates** the 18 Aug indexing requests and **everything shipped 19 Aug**.
Do not re-read before early September and expect movement.

**The 56 breaks down — most of it is correct behaviour, not a backlog:**

| Reason | Pages | Verdict |
|---|---|---|
| Page with redirect | 16 | ✅ correct — legacy Wix + `.html` forms 301ing |
| Alternate page with proper canonical | 5 | ✅ correct (was 9 on 13 Aug) |
| Excluded by 'noindex' | 2 | ✅ correct — `/privacy`, `/terms` |
| Discovered – currently not indexed | **13** | the real target (was 21 on 13 Aug) |
| Crawled – currently not indexed | 13 | mostly dead Wix ghost URLs, stale |
| Duplicate, Google chose different canonical | 2 | worth a look, small |
| **Not found (404)** | **5** | ⚠️ **UNRESOLVED — see below** |
| Redirect error | 0 | — |

### ✅ RESOLVED 21 Aug — the 5 "Not found (404)" URLs
Ali supplied them. **Only 2 of the 5 were real; 3 were stale GSC entries.** Each was tested
against production rather than trusted from the report — do the same next time.

| URL | Last crawled | Rule existed | Live result | Action |
|---|---|---|---|---|
| `/book-online` | 9 Jul | ✅ line 416 | **works**, 301→`/#booking` | none — GSC stale |
| `/shop` | 12 Jul | ✅ line 476 | **works**, 301→`/` | none — GSC stale |
| `/copy-of-bmw-m3-competition-g80` | 21 Jul | ✅ line 482 | **works**, 301→`/#fleet` | none — GSC stale |
| `/exoticcarrentalcostamesa` | 13 Aug | ❌ | real 404 | ✅ **301 added** → `/exotic-car-rental-costa-mesa` |
| `/exoticlinx` | 8 Aug | ❌ | real 404 | ✅ **deliberately left 404ing** |

⚠️ **Three of the five were already fixed weeks ago** — their "last crawled" dates all predate
the commits that added their rules. GSC keeps reporting a 404 until Google recrawls. **A URL in
this report is not evidence it is currently broken. Curl it before writing a rule.**

**`/exoticlinx` must stay a 404 — do not "fix" it.** Ali: it was a one-off collab with his
jeweler (Goldlinx) and is over. A dead page *should* 404; Google drops it naturally. Redirecting
an unrelated page to the homepage is worse than a 404 — Google commonly treats an irrelevant
redirect as a soft 404 anyway.

**Safety note for future `netlify.toml` work:** all rules are **exact paths — zero splats or
placeholders**. A new rule for a path that appears nowhere else therefore cannot shadow an
existing route. Verify with `grep -n 'from = ".*\*\|from = ".*:' netlify.toml` (must return
nothing) before adding anything, and re-check after.

**Request Indexing is DONE — queue empty since 18 Aug. Do not submit anything else.**
Never submit `/terms` or `/privacy`; both are `noindex` by design.
**63 of 980 clicks go to a different company** — a "First Class Exotics" in Daytona Beach FL.
Unwinnable; exclude it when measuring.

---

## 5. Still open from the audit (1 of 11)

| # | Item | Detail |
|---|---|---|
| ~~9~~ | ~~Article `image` / `publisher.logo`~~ | ✅ **CLOSED 20 Aug.** 21 `publisher.logo` blocks (not 22 — 6 of the 27 hits were Google/Yelp review publishers on `index.html` and correctly left alone). 14 Article `image` fields added, each also written to that page's `og:image` + `twitter:image`. ⚠️ The handoff's claim that "the images already exist on the pages" was **wrong** — the 14 posts' only in-page hero is an Unsplash/Pexels stock photo, and their `og:image` was a legacy **800×600** root file, under Google's 1200px bar. Ali approved 14 owned 1600px fleet photos from a contact sheet. |
| ~~10~~ | ~~`twitter:card` on 50 pages~~ | ✅ **CLOSED 20 Aug.** `summary_large_image` + title/description/image added to exactly 50 pages, mirroring each page's own `og:` values and matching its quote/self-closing style. **52 of 52 real pages** now have it. Deliberately skipped: `404.html`, `blog-publisher.html` (noindex admin), and the two `google*.html` verification files. |
| 11 | **~115 external stock photos across 24 pages** | **60 Unsplash + 55 Pexels.** Includes all four homepage hero slides (index.html:297-300), the four occasion cards, the vinyl-wrap hero, and a photo captioned "Premium vinyl wrap installation luxury car OC". Four problems: authenticity (48 owned cars, 268 real photos); LCP is a cross-origin request; bypasses all the WebP work; third-party dependency. **Needs Ali's decision, not an agent's — do not start unilaterally.** ⚠️ The first audit pass only grepped Unsplash and missed Pexels — grep both. |

### Other open items (not from the audit)

- ~~**Address string mismatch**~~ ✅ **CLOSED 21 Aug — confirmed against GBP.**
  **The canonical address is `2060 Placentia Ave Ste A4, Costa Mesa, CA 92627` — NO comma
  between "Ave" and "Ste", and "Ste" not "Suite".** Ali screenshotted the Google Business
  Profile; that is what Google has. All 40 occurrences across 30 files now match exactly,
  including all 28 JSON-LD `streetAddress` fields. Zero outliers.
  ⚠️ **How this was nearly gotten wrong — read before touching the address again.** The site
  had three forms: 34× `Ave, Ste A4`, 3× `Ave, Suite A4` (privacy/terms), and 1× `Ave Ste A4`
  (index.html JSON-LD). Majority-rules reasoning said "fix the 1 outlier to match the 30" —
  **and that was backwards.** The lone outlier was the only correct one. It was flipped the
  wrong way in `bd9c9eb` and corrected immediately after Ali produced the GBP screenshot.
  **NAP is decided by what Google Business Profile shows, never by what most files say.**
- ~~**Three fleet numbers**~~ ✅ **CLOSED 21 Aug.** Ali's call: all three say **48**, matching
  the 48 real cards. `index.html` stat box `46+`→`48+`, fleet subtitle `45+`→`48+`, and
  `blog/porsche-911-carrera-4-gts-satin-grey.html` `46+`→`48+`. Verified: no `4[567]+` fleet
  claim remains anywhere in the repo.
- **Minor**: `FC_LOGO.png` (256×256) has no `width`/`height` on 55 pages — free CLS win.
  78 images lack dimensions, 95 lack `loading`. Booking form is `data-netlify="true"` with no
  honeypot.

**The 6 orphan fleet directories are confirmed safe to delete** (~18.7 MB): duplicate image sets
under an alternate slug. Live cards use `miami-blue-2019-mclaren-570s/`,
`silver-2024-mclaren-artura-coupe/`, `black-2025-mclaren-artura-spider/` etc., while
`mclaren-570s-miami-blue/`, `mclaren-artura-coupe-silver/`, `mclaren-artura-spider-black/`,
`mercedes-amg-g63-silver/`, `mercedes-brabus-800-gwagon-black/`,
`mercedes-maybach-gls-600-white/` are unreferenced. Not the only copies.

---

## 6. 🟢 REVIEWS — still the main business workstream

**90 reviews, 5.0, #2 in the local map pack.**

⚠️ **CORRECTED 21 Aug — the old competitor line named the wrong business.** It read "Mango
Exotics is #1 with 187." **Mango Exotics does exist — Ali says they are not a competitor that
matters and should not be tracked.** The actual #1 is **Monza** Exotics. Verified in an
incognito search for *lamborghini rental in orange county*, 21 Aug:

| # | Business | Rating | Reviews | Location |
|---|---|---|---|---|
| 1 | **Monza Exotics** | 5.0 | **409** | Huntington Beach |
| 2 | **First Class Exotics** | 5.0 | **90** | Costa Mesa |
| 3 | **Jungle Exotic Rentals** | 5.0 | **648** | Newport Beach |

🟢 **Read this the right way: FCE ranks #2 while sitting BELOW a competitor with 648 reviews.**
Review count is one input among proximity, relevance and engagement — it is not the ranking.
The profile is performing well above its review count, and "catch up on reviews" is the wrong
frame. Reviews compound and are worth doing; they are not the reason for the current position.

### 🔴 THE REAL COMPETITIVE GAP IS PAID ADS, NOT REVIEWS
Same incognito search, expanded local finder. **All three competitors run Google Ads. FCE does
not.** The page reads:

```
SPONSORED  Monza Exotics          410
SPONSORED  Peacock Rentals        170   (4.5 stars — worse rating than FCE)
SPONSORED  Jungle Exotic Rentals  648
─────────────────────────────────────
ORGANIC    Monza Exotics          409
ORGANIC    First Class Exotics     90   ← FCE
ORGANIC    Jungle Exotic Rentals  648
```

Monza and Jungle each appear **twice** — paid and organic. Peacock buys placement above FCE
with a **4.5** rating. FCE is #2 organically but sits **fifth on the page**. The visible
dominance is bought slots, not review count.

💰 **Ali has an unused $500 Google Ads credit** (spend $500, get $500) showing on the GBP
dashboard as of 21 Aug.
⚠️ **This is a spend decision, not an SEO task — Ali's call, and he has not made it.** Do not
start a campaign. Exotic rental is an expensive keyword vertical and these are high-intent
terms three funded competitors already bid on; $500 buys a test, not a campaign. Whether the
math works depends on his close rate per lead and revenue per rental — numbers only he has.

⚠️ **Do not accuse competitors of buying reviews without evidence.** 409 and 648 are ordinary
for a higher-volume shop with a systematic ask over 4–5 years. FCE has ~470 contracts since
2022 and asked essentially nobody until 21 Aug — that alone explains the gap. Real fake-review
signals are burst timing, single-review reviewer accounts, generic text, and out-of-area
profiles; a raw count proves nothing.
Trajectory: 81 (11 Aug) → 84 (13) → 88 (14) → 89 (17) → **90 (18)**.
Review link: `https://g.page/r/CQ_Rg94B1MthEBM/review` — verified working.

**Where the customer list came from:** every Adobe Sign contract generates a Gmail
notification. Query `from:adobesign.com subject:"is Signed and Filed"`. The subject holds the
customer name, `toRecipients` the email — drop `ali@firstclassexotics.com` and group by the
remaining address. **No Adobe login needed. No Adobe Sign connector exists.**

⚠️ **CORRECTED 21 Aug — the old scope was wrong.** The query returns **~470 threads going
back to Oct 2022**, not "~300, Nov 2024 → present". `resultCountEstimate` reports **201 and
that is a lie** — it is an estimate. Page with `nextPageToken` until it is absent. The old
109-person list was built from the short window and therefore missed roughly **250 additional
one-time renters** from 2022–2024.

**Deliverables:** `FCE-Review-Ask-List.xlsx` (5 tabs) and the Cowork artifact
**`fce-review-ask-list`**. ⚠️ **Both are now stale** — they predate the full-history pull and
know nothing about the 21 asks sent 21 Aug. The artifact also **cannot be read from a cloud
session** (no `list_artifacts` tool on this device bridge). Rebuild from Gmail instead; it
takes one paginated query and is authoritative.

### ✅ FIRST 21 ASKS SENT — 21 Aug 2026, 10:49am PT
Before this, **zero** review asks had ever gone out — the list had been built and corrected
three times and then stalled. Ali sent all 21 himself from Gmail drafts. Verified in
`in:sent`; **zero bounces**.

**Do not ask these 21 again** (most-recent one-time renters, Apr–Aug 2026):
Wilson T · Tarunjeet Bajwa · Rita & Dylan Patel · Keith Davis & Jewel King · Lara Davis ·
Jack Yen · Adrian Perez · Omari Grandberry · Hassan Bakhshi · Lucas Johanson · Hayden G ·
Joerge Ogihara · Hooman Honary · Jesse Torres · Jennifer Lin · Daniel G · Andres Mendez ·
Garrett Weston · Shelby Seal · Rebecca Putt · Cullen Brasfield

⚠️ **Email addresses are deliberately NOT stored in this file — see §11.** The authoritative
record of exactly who was asked is Gmail itself:
`in:sent subject:"Quick favor" newer_than:1y` — that query returns the address of every person
already contacted. Diff any new batch against it before sending.

**Wording Ali approved — reuse verbatim for batch 2.** Subject `Quick favor, <First>?`; body
is four short lines: thanks + the month they rented, "30 seconds, a Google review would go a
long way", family-run out of Costa Mesa, the `g.page` link, then "appreciate the business,
reach out whenever". Signed `Ali` / `First Class Exotics`.

### ✅ BATCH 2 BUILT BY HAND 25 AUG — 26 DRAFTS EXIST, UNSENT
The 24 Aug scheduled task (`trig_01EZohwfDeYA5ArH2RWqk9p8`) fired, reported success and created
**zero** drafts. Rebuilt interactively on 25 Aug instead. **26 drafts now sit in Gmail**,
verified with `list_drafts` query `subject:"Quick favor"` — 26 returned, one per name below.
Wording is byte-identical to the 21 Ali sent on 21 Aug (checked against the Lara Davis thread).

⚠️ **Ali has NOT sent these yet, and should not until he reports the live Google review
count.** It was 90 on 21 Aug. §6's gate stands: 0–1 new reviews from batch 1 means the channel
needs rethinking before spending more names.

**The pull that produced them:** `from:adobesign.com subject:"is Signed and Filed"`, paginated to
exhaustion — **489 threads, Oct 2022 → Aug 2026**. `resultCountEstimate` said 201 and then 39 on
the last page; both are lies, page until `nextPageToken` is absent.

**Cohort:** one-time renters only, working backwards from batch 1's window. Batch 1 covered
Apr–Aug 2026 signings; batch 2 covers **Sep 2025 – Mar 2026**. Repeat customers deliberately
excluded per §6 lesson 1.

**Batch 2 — 26 names (emails deliberately not stored here, see §11):**
Taranpreet Bhatti · Ekonkar Singh · Rahul Jaggi · Ming Feng · Marcervin Pineda ·
Nathanael Van der Walt · Dominic Williams · Nate Reyes · Christian Segura · Jeffrey Overall ·
Umar Mansuri · Billy Ha · Dane Carter · Colton Whitney · Brett Murray · Salman Siddiqui ·
Karen De Paz · Yuliyan Zhiryada · Joseph Lewallen · Yara Aljouni · Dhananjay Rawal ·
Sayed Hashemeyan · John Means III · Robert Smith · Chris Wells · Yinghao Cai

**Excluded from this window and why:**
- **Repeat customers** (Ali asks these in person): Miles Ortiz, Anthony Fletcher, Joel Haro,
  Jeremy York (3× in 2026), Chad Hoppe, Steven Arriaga, Chris Danielsen, Eden Nguyen,
  Husein Hadi, Nikko Viray, Mohammad Farooqi (5×), CJ Jacinto, Alvin Yono, Dennis Derieg,
  Juan Ortiz / Juan Aldana, Maliya Saephanh, Edmund Coutan.
- **Already reviewed:** Lincoln Kienholz, Ameen / Said Hofioni.
- **Dropped by Ali:** Miguel Zuniga.
- **Not customers:** Kevin Hernandez / Partners Direct, Patrick Thomas / Acrisure (insurance),
  Mark Andrew Nones (co-op partner).

⚠️ **Four judgement calls for Ali — none are in the drafts:**
1. **Rajesh (rvshah)** and **Dhananjay Rawal** signed two contracts two minutes apart, cross-CC'd
   — one group, two cars. Only Dhananjay was drafted, same logic as the Kienholz household.
2. **Siqi Cao** and **Yinghao Cai** signed 39 seconds apart on 5 Sep 2025 — almost certainly one
   booking. Only Yinghao was drafted.
3. **`aleeassadian@…`** signed as **"lol lol"** (15 Jan 2026) and **`moevamos@…`** as **"SK"**
   (11 Jan 2026). No usable first name, so no draft. Ali will know who these are.
4. **John Means III** signed from an address in a different name (`tiffanythuy…`). Drafted to
   "John" as the contract reads; worth a glance before sending.

### ✅ ANSWERED 29 AUG — THE COUNT WAS 91
Ali screenshotted the Google Business Profile on **Sat 29 Aug**: **91 reviews, 5.0 stars,
1,411 customer interactions.** It was 90 on 21 Aug.

⚠️ **Superseded — see the 7 Sep read below.**

**Read against §6's pre-set table: 91 lands in the "91–92 / marginal but real" row → send
batch 2, reassess after.** That gate was set before the data came in; it is being honoured
rather than re-argued.

⚠️ **But be honest about the size of the signal.** 21 asks sent 21 Aug produced **+1 review in
8 days — roughly 5% conversion, against the 10–25% the plan assumed.** And that +1 is not
even confidently attributable: FCE gets some organic review flow, and the one reply received
(Andres Mendez) was from an already-existing reviewer, not a new one.

**What this implies if 5% holds:** the remaining ~250 names would yield roughly 12 reviews, not
the 25–60 the optimistic case suggested. Worth having, but it is not a growth lever — and at
**91 reviews / 5.0 stars the marginal value of review #92 is far lower than #10 was.**

**Decision:**
- ✅ **Send the 26 batch-2 drafts.** They are already written and cost nothing further. A
  47-name sample measures the channel far better than 21 does.
- ⛔ **Do NOT build batches 3+ for the 2022–2024 cohorts until batch 2 reports.** That is ~250
  names and a fresh round of list-building on a channel converting at 5%.
- ⏳ **Give batch 2 at least 14 days, not 8.** Review asks lag — people agree, then do it a
  fortnight later. The 8-day read on batch 1 may undercount.
- 💬 **Reply to the new review.** The profile is showing a "You have a new 5-star review"
  prompt. Google favours profiles that respond, and it costs a minute.

⚠️ **Ali sends them himself from Gmail drafts.** Hard rule, §8: never send on his behalf.

⚠️ **An agent cannot get this number.** The Chrome extension has not responded since 19 Aug
(`tabs_context_mcp` times out), and WebFetch produced three false readings in one day on
21 Aug — do not report a count from it. **Only Ali can read the Google Business Profile.**

**How to read the answer when he gives it:**
| Count | What it means | Do |
|---|---|---|
| 93+ | ~3 of 21 converted; the 10–25% assumption holds | send batch 2, then work the 2022–24 cohorts |
| 91–92 | marginal but real | send batch 2, reassess after |
| still 90 | 0-for-21 in 5+ days | **do not send the same email to 250 colder names.** Rethink the channel first |

### ✅ ANSWERED 7 SEP — THE COUNT IS 92. BATCH 1 IS CLOSED AT 2-FOR-21.
Ali screenshotted the Google Business Profile on **Mon 7 Sep, 11:34am PT**: **92 reviews,
5.0 stars, 1,234 customer interactions.** 90 on 21 Aug → 91 on 29 Aug → **92 on 7 Sep**.
This is the **17-day read** §6 said to wait for, so batch 1 is now measured, not sampled.

**Result: +2 reviews from 21 asks over 17 days — ~9.5% conversion.** Roughly double the 5%
the 8-day read implied, still below the 10–25% the plan assumed. It lands in the pre-set
**"91–92 / marginal but real"** row and in §10 item 1's **92** row. Both say the same thing.

**Decision — honour the gate, do not re-argue it:**
- ✅ **Send the 26 batch-2 drafts.** Verified still in Gmail 7 Sep (`list_drafts`,
  `subject:"Quick favor"` → 26 returned, all 26 names match §6's list, all unsent, wording
  byte-identical to batch 1). They cost nothing further and take the sample from 21 → 47.
- ⛔ **Then STOP. Do not build batches 3+ for the 2022–24 cohorts.** ~250 names at ~9.5%
  is ~24 reviews for a fresh round of list-building — and at 92 reviews / 5.0 the marginal
  value of review #93 is far below what #10 was. Revisit only if batch 2 beats 15%.
- 💬 **Two unreplied reviews.** The profile card shows a **"2 new reviews"** prompt. Google
  favours profiles that respond and it costs a minute. Ali does this himself in the GBP app.

⚠️ **Ali sends the 26 drafts himself from Gmail. Never send for him (§8).**

### Batch 1 result so far — 3 days in
21 sent 21 Aug · **1 reply** (Andres Mendez: "I dropped a review for yall a while back") · 0
bounces · no other replies. That one reply was an **already-reviewed** customer, not a new
review. Ali has not reported a new Google count. **Do not draw conclusions yet** — but if the
count is still 90 by end of month, email asks to cold one-time renters are not converting and
the channel needs rethinking before spending the remaining ~250 names.

⚠️ **MEASURE BATCH 1 BEFORE SENDING BATCH 2.** 90 reviews at send time. If this batch returns
2–5, the ~10–25% assumption holds and the 2022–2024 cohorts are worth working. If it returns
0–1, rethink the channel before spending 250 more names on it. A review ask two years after
the rental converts far worse than one two months after.

### Hard-won lessons — do not repeat
1. **Do NOT sort by loyalty.** Repeat customers are the ones Ali already asked in person.
   The untapped pool is the **82 one-time renters**. Sorting repeat-first was wrong twice.
2. **Name matching against Google reviewers is unreliable.** ~20 reviewers use handles
   (Patriot FKS, El Compa, akaJnx, 0xBurnz, WE POPPIN TV, JT, Ara, K, UM…). A "thanks, already
   did" reply is normal, not an error.
3. **Ali's memory is the correction layer.** Show him names in batches; don't rebuild the file
   one name at a time.

### Manual corrections applied (do not undo)
- **Miguel Zuniga** (12 rentals) — DROPPED, Ali no longer deals with him
- **Lincoln Kienholz** — already reviewed; two emails, same person
- **Ameen / Said Hofioni** — same person, already reviewed
- **Faith Schmidt** — two emails, same person; reviewed 17 Aug
- **Excluded, not customers:** Kevin Hernandez / Partners Direct, George Wood / Falconstone,
  Patrick Thomas / Acrisure (all insurance), `al…@…com [redacted]` (Ali),
  `al…@…com [redacted]` (test), Mark Andrew Nones (co-op partner)
- **Possible dupes NOT merged — ask Ali:** Edmund Coutan (`kumquatlife` / `kumquatsolar`),
  Thomas & Tanya Farmakis Tolmasoff, Rita & Dylan Patel
- **Kacy Kienholz** (`ka…@…com [redacted]`) — on Lincoln Kienholz's contract, same
  household. **Deliberately skipped** on 21 Aug; Lincoln already reviewed and asking the same
  household twice reads badly.
- **Adrian Perez** — `ad…@…com [redacted]` (Jul 2026) vs `ad…@…com [redacted]`
  (May 2024). Possibly one person, which would make him a repeat. **Unconfirmed — ask Ali.**
  He was asked on 21 Aug as a one-time renter.
- **Carlos Ruelas** — three addresses (`carlosruelas1226@`, `carlosruelas1227@`,
  `ca…@…com [redacted]`). Almost certainly one person with many rentals. Not merged.
- **Miles Ortiz** (`mi…@…com [redacted]`) — flagged as "new" on 20 Aug, but the full
  history shows him as a **long-standing repeat** (2023→2026). Another artifact of the old
  short-window pull.

### ⚠️ BEFORE ANY TEXTING
The list has **emails only** — phone numbers live inside the signed PDFs.
**TCPA exposure is $500–$1,500 per unsolicited text.** The `fce-os` rental agreement has **no
SMS consent clause**. Email carries no equivalent problem (CAN-SPAM needs accurate headers and
an opt-out). Not legal advice — Ali should confirm with his attorney before an SMS push.
**Do NOT start the Google Workspace trial** — it repoints MX records and Ali's email runs
through Wix.

---

## 7. Mistakes made — do not repeat

### 7a. Judging a page by its filename instead of its served URL
The 8 root-level `blog-*.html` files are **live posts** served at `/blog/<slug>` via
**status-200 rewrites** in `netlify.toml`. `/blog/lamborghini-temerario-the-huracan-era-is-ending`
is a **retired duplicate** that 301s.
**Rule: follow the redirect chain to the end before calling any page dead.** 80 rules,
first-match-wins, including 200-rewrites that make root files serve at nested URLs.

### 7b. Trusting a parser over the live page (19 Aug, twice)
An audit script reported the booking dropdown had **5 cars vs 48 fleet cards** — a false alarm.
The regex only matched `<option value="...">`; most options carry no `value` attribute. A live
fetch showed all 48 present in 13 `<optgroup>`s.
Separately, a scan flagged 9 business blocks as address-less; they were nested `Offer.seller`
references that legitimately don't need one.
**Verify a shocking finding against production before reporting it.**

### 7c. Grepping for one stock-photo host and declaring a total
First pass found 60 Unsplash refs and reported that as the total. A later look found **55 more
from Pexels**. Enumerate hosts, don't assume one.

### 7d. Reporting a verification that never ran
The audit scripts lived in `/tmp` on the device VM and were wiped during a 3-hour gap. A
"regression sweep" printed nothing and nearly got reported as clean. **Check the script exists
and produced output before believing it.**

### 7e. Insurance wording — RESOLVED 14 Aug (`f99e085`, `cdd2477`)
Old text asserted a customer's coverage. Now makes no claim about the customer's policy and
states a real operational fact Ali confirmed: **FCE calls the customer's insurer at booking,
verifies the policy, and confirms the specific vehicle is covered — every rental, without
exception.**
⚠️ **"every rental, without exception" is a public promise.** If it ever becomes "usually",
soften it.

### 7f. Blog Publisher security — FIXED 14 Aug (`6bb5b0a`)
Password now lives only in Netlify env var **`BLOG_PUBLISHER_PASSWORD`** (Production, secret,
Functions scope). Server **fails closed** with 500 if unset — no fallback, and none should ever
be added. Compare is `crypto.timingSafeEqual`. Page carries `noindex`.
⚠️ **If the publisher returns 500 "BLOG_PUBLISHER_PASSWORD not configured", re-add the env var
in Netlify — do NOT reintroduce a hardcoded default.** The old password is in git history
forever and must never be reused.

### 7g. `/privacy` + `/terms`
JSON-LD deliberately **not** added — both are `noindex`, so structured data can never be used.
Open Graph + Twitter tags **were** added, since those drive link previews regardless.

---

## 8. Environment

- Repo `github.com/ahojat45/firstclassexotics`, branch `main`
- Local path `/Users/firstclassexotics/Desktop/First Class Exotics` — **mount it first**
- Netlify site_id `fbd7706b-a7f3-471d-a38e-9583a11dbcca`, auto-deploys on push to `main`.
  The Netlify MCP `get-project` call returns `currentDeploy.state` — use it to confirm a push
  actually deployed. This worked reliably all day.
- **80 redirect rules** in `netlify.toml`, first-match-wins, **no `/*` catch-all**
- GA4 property `542892966`, measurement ID `G-E655N33GPP`. `generate_lead` and `contact_click`
  are Key Events and receiving data
- Connectors live: Google Drive, Gmail, Calendar, Chrome, Netlify

### ⛔ WebFetch REACHES the site but CANNOT BE TRUSTED TO VERIFY IT
It resolves `firstclassexotics.com`, but on 21 Aug it gave **three separate false readings**
and nearly caused three wrong conclusions. **Never confirm a deploy with WebFetch alone.**

| What happened | Truth |
|---|---|
| Reported `/exoticcarrentalcostamesa` as **404** right after the redirect deployed | Rule was working; it replayed a **cached** pre-deploy response (~15 min TTL) |
| Reported `HANDOFF.md?cb=1` as **still serving the document** | The **query string** stopped the redirect matching. The bare URL correctly 404s |
| Reported the **old business hours** across **four** different cache-busting URLs for ~15 min after the deploy went `ready` | Ali's browser showed the new hours immediately. Netlify confirmed a fresh deploy the whole time |

Also: it converts to markdown, so **`<script>` contents are invisible** — JSON-LD cannot be
checked this way — and its summarizer miscounts (reported 50 sitemap entries for a 49-entry file).
And since `robots.txt` gained `Disallow: /*.md$`, WebFetch now refuses those URLs entirely
(`ROBOTS_DISALLOWED`).

**How to actually verify a deploy:**
1. `git rev-parse HEAD` == `origin/main`, and `git show HEAD:<file> | grep …` to prove the
   committed file contains the change.
2. Netlify `get-project` → `currentDeploy.state` is `ready` **and** the deploy **id changed**.
   (This API returned Cloudflare 502s repeatedly on 21 Aug — just retry after ~60s.)
3. **Ask Ali to hard-refresh (⌘⇧R) and screenshot.** He is the ground truth. Do this rather
   than reporting a failure WebFetch invented.

⚠️ **The Chrome extension did not respond at all on 19 Aug** — `tabs_context_mcp` timed out
repeatedly across the whole session. Two browsers are connected ("Browser 1" / "Browser 2") and
`select_browser` succeeds, but every subsequent call times out. **Ali should check the
extension's side panel for a pending permission prompt.** Until then, GSC data must be
screenshotted by Ali rather than read directly.

### Hard rules
- **Never touch Wix DNS.** Wix is live only for email MX records.
- **Never send email or texts on Ali's behalf. Drafts only, always.**
- Netlify primary domain stays `www.firstclassexotics.com`; apex 301s to `www`.
- Never redirect or block `google49d716d460298fda.html`, `google8cf0ce3903a867e7.html`,
  `404.html`, `blog-publisher.html`, `fce-os/`, `agreement.html`.
- Only mark up schema for content a visitor can actually see (see §2).
- More than one agent works in this repo — confirm the tree is yours before committing.
- **Never enter passwords or API keys into forms on Ali's behalf.** He types them himself.

### Workflow
Claude edits files directly once the folder is mounted. **Claude cannot push.** Ali pushes from
**Terminal.app** (never the VS Code terminal):
```
cd '/Users/firstclassexotics/Desktop/First Class Exotics' && rm -f .git/index.lock && git add -u && git commit -m "..." && git push origin main
```
Use `git add -A` only when new files are genuinely intended — name the files explicitly instead
(e.g. `git add HANDOFF.md HANDOFF-2026-08-19.md`).

Ali pastes terminal screenshots to confirm pushes. **Read the commit hash in the screenshot.**

### Site conventions
- Fleet images `images/fleet/<slug>/<slug>-NN.jpg` **+ matching `.webp`**, NN from `01`
- `-01` must be an exterior front three-quarter; interiors last
- 1600px q82 progressive where the source allows — **never upscale**
- Blog URLs `/blog/<slug>`. Canonical copy: "12+ years", "since 2014", and **"48+"
  everywhere a fleet size is stated** — fleet subtitle, the Fleet Access Network stat box, and
  the blog copy. Updated 21 Aug from the old mixed `45+`/`46+`; do not reintroduce those.
  ⚠️ **48 is the live card count.** If cars are added or sold, re-count with
  `grep -o 'data-car="' index.html | wc -l` and update all three places together.
- **Hours are `Open Daily 8am–10pm`** (schema `Mo-Su 08:00-22:00`). Changed 21 Aug from
  `Mon–Fri 8am–6pm · Sat 9am–6pm · Sun 9am–5pm`. Ali confirmed he genuinely answers that late —
  he is a one-man operation and "open" means reachable to book, not a staffed storefront.
  ⚠️ **Hours live in 24 places: 16 JSON-LD `openingHours` arrays, 1 `openingHoursSpecification`
  block (index.html), and 8 visible strings** across index, gift, terms and privacy. Change all
  of them together or you reintroduce a mismatch. ⚠️ **index.html's `openingHours` is
  pretty-printed across multiple lines** while the other 15 are single-line — a one-line
  find/replace silently misses it. It did on the first pass 21 Aug.
  **Also update the Google Business Profile — the site and GBP must agree.**
  Why it changed: competitors close later and were showing as *Open* while FCE showed *Closed*
  during the evening booking window. Monza 10pm, Peacock 10pm, Jungle 7pm, FCE was 6pm.
- Address is **"2060 Placentia Ave Ste A4, Costa Mesa, CA 92627"** — **no comma before
  "Ste", and "Ste" never "Suite"** — in visible copy *and* in JSON-LD `streetAddress`. This is
  verbatim what the Google Business Profile shows (confirmed 21 Aug). All 40 occurrences match.
  Check with `grep -rn 'Placentia Ave, \|Suite A4' --include='*.html' .` — that must return
  nothing. Two footer instances use a `·` separator before the city; that is a deliberate
  design choice and is fine.

### Scheduled tasks (all on the iMac, only run while the app is open)
| Task | Schedule |
|---|---|
| fce-lead-calendar-sync | every 2 hours |
| fce-sync-watchdog | 9am / 2pm / 7pm |
| fc-exotics-inbox-monitor | 8am / 6pm |
| bioaminex-inbox-monitor | 8am / 6pm |

**If Ali works from the MacBook, these stop running.**

---

## 9. How Ali works
- Concise and direct. Short answers, no padding. Gets frustrated with process overhead when he's
  asked for something specific — **bias toward doing**.
- **Verify against production. Never say something is fixed without checking.**
- He is not a developer. Give exact copy-paste commands and say where to paste them
  (**Terminal**, never Ace, never the VS Code terminal). He will ask "am I pasting this?" if a
  code block is shown as evidence — **label evidence as evidence.**
- **Distinguish broken from optimization every time.**
- **Show, don't assert, on anything visual.** Stage the actual image and send it to him — that
  is how the 750S and the colour questions got resolved in one round each.
- He often misremembers which of two similar tasks was completed — as with the JSON-LD work
  (§3). **Check before agreeing or disagreeing, and show the receipt.** He accepts evidence
  readily; he does not accept assertion.
- **He is usually right about his own business.** He corrected the review list three times and
  the 750S question once, and was right each time. When he contradicts the data, believe him
  and re-check the data.
- He prefers plain language over jargon — he pushed back on paint-code specificity with
  "you don't need to get so technical."
- Own mistakes plainly and move on. Do not over-apologize.

---

## 10. Suggested next session

**Everything below is blocked on Ali, not on work. Do not invent tasks to fill the gap.**

1. ✅ **REVIEW COUNT RE-CHECKED 7 SEP — 92.** Screenshotted by Ali, 11:34am PT (90 → 91 →
   92; 2-for-21 over 17 days, ~9.5%). See §6. **The action is now: Ali sends the 26 batch-2
   drafts himself from Gmail, then the workstream stops** — no 2022–24 cohorts. Also two
   unreplied reviews sitting on the profile. Next count re-check: **14+ days after batch 2
   goes out**, not before.
2. **The four batch-2 judgement calls** (§6): the Rajesh/Dhananjay pair, the Siqi/Yinghao
   pair, the two junk-name signers ("lol lol" and "SK", mid-Jan), and John Means III's
   mismatched address. None are drafted; all need Ali's memory.
3. ~~💰 **Andreas Kunz — 11 rentals, silent 14 months**~~ ✅ **CLOSED 27 Aug.** Ali confirmed
   he **is** Andy Koontz, his Alpha Solar partner (§14). Not a customer win-back — do not
   email him a review ask or a "we miss you" note.
4. ✅ **404 check CONFIRMED 7 Sep — first time since the rule scheme was built.** Ali opened
   the bare `https://www.firstclassexotics.com/HANDOFF-2026-09-07.md` in Chrome and got the
   branded 404 page. Screenshotted. The `force = true` rule scheme is proven working
   end-to-end: new file → rule added → pushed → deployed → 404 live. **Nothing to do here;
   repeat this check for each new snapshot.**
5. **Review the 12s continuous-take 720S video** (§15). It is the newest recipe and Ali has
   not judged it. One question decides everything: **does the woman stay continuous from the
   moment the car enters frame to the moment she walks off?** If yes, the recipe is locked and
   applies to any of the 48 cars. If no, drop the exit beat entirely.
6. **Fleet photo authenticity** (§15). Ali confirmed the Maybach S580 photos are **not his
   car**. The satin-black 720S photos share the **same generated villa-and-coastline
   background**. A chunk of the fleet gallery is probably stock or AI, not his inventory.
   This is audit item #11 and it is bigger than "stock photos" — it is a claim about what he
   owns. **Ali's decision, do not start unilaterally.**
7. **`og:image` under 1200px on 34 pages** — the only real optimization left. Not broken.

### Minor, non-urgent
- ⚠️ **GBP address now reads `2060 Placentia Ave Unit A4`, the site says `Ste A4`.** Spotted
  in the 7 Sep screenshot. §8 fixed the site's 40 occurrences to `Ste A4` on 21 Aug precisely
  because that was verbatim what GBP showed then; GBP has since drifted (or was edited). NAP
  strings should match exactly. **Cheaper to change GBP back to `Ste A4` than to touch 40
  files — Ali's call, one edit in the profile.** Not broken, no ranking evidence, low priority.
- `images/fleet/2024-maserati-mc20-cielo-black/-01.jpg` is an **interior** shot. §8 conventions
  say `-01` must be an exterior front three-quarter, interiors last. `-06` or `-02` is correct.
  Card renders fine; cosmetic only.

**Do not invent site work.** There is no meaningful engineering left; the remaining upside is
reviews and the stock-photo decision.

---

## 13. ✅ 26 AUG — THE HIGGSFIELD COPYRIGHT FILTER IS SOLVED

§12 said *"never write a brand name in a Higgsfield prompt."* **That was necessary but not
sufficient.** Two MC20 prompts were rejected on 25 Aug that already contained
*"no badges, no emblems, no logos"*. The MC20 finally generated on 26 Aug once two things
changed together:

### The recipe — reuse this for every car
1. **De-badge the reference images.** Higgsfield inspects the ATTACHED IMAGES, not just the
   prompt text — its upload panel says *"Protected content is not allowed."* Blur every
   visible badge, script and plate before uploading.
2. **Drop replication language.** *"match its … precisely. Do not redesign the car."* reads as
   intent to reproduce a protected design. Use instead:
   *"Use the attached images as the visual reference for the car in this film."*
3. Still never write the marque or model name. Describe the form.

⚠️ **The 25 Aug guidance recommended attaching `-04`, which is the photo with "Maserati" in
large red script across the rear.** Check what is actually IN a photo before recommending it.

### Deliverables — all in `Desktop/FC videos/`, NOT the repo
| Path | What |
|---|---|
| `MC20-HIGGSFIELD-PROMPT.md` | MC20 prompt v2 + full rejection diagnosis + escalation order |
| `HURACAN-HIGGSFIELD-PROMPT.md` | pink Huracán LP 580-2 at a white mansion, cliff view |
| `MC20_refs_debadged/` | 5 de-badged MC20 references |
| `Huracan_refs_debadged/` | de-badged `IMG_2972` (gold bull on the nose blurred) |

**Do not put these in the repo folder** — every root `.md` is publicly served until a
`netlify.toml` rule is added (§11). These have no reason to be on the web.

### Gotchas found 26 Aug
- **The device VM cannot decode HEIC.** `ffmpeg` fails on `.HEIC`. Stage to the cloud
  container and convert with `pillow-heif` (`pip install pillow-heif --break-system-packages`),
  then commit back. His iPhone photos are HEIC.
- **`~/Downloads` was granted this session only.** Folder grants do not persist — request again.
- **Do not attach `IMG_2969`** (pink Huracán): GOLDLINX signage, a wall TV and framed artwork
  in frame. Visible third-party text and logos are exactly what the filter catches.
- **Credits: Generate quoted 126 on 26 Aug**, down from 330. A 55%-off promo was running.
- **`SendUserFile` → `device_commit_files` can 404** ("org-scoped file"). Re-send to get a
  fresh `file_uuid` and retry; it worked on the second attempt.
- **Pink drifts warm.** Golden hour pushes bubblegum pink toward salmon — pin the hue in the
  prompt, or switch to "bright overcast, soft even light".
- **"Cliff view" invites an aerial**, which is the documented failure mode (§12). Ban drone
  pull-backs explicitly in the negative line.

### ⚠️ Unresolved: the original 720S prompt is gone
Ali asked for "the prompt you did for the black 720S." **It was never saved to a file** — the
`ACE-PROMPT-*.md` files in the repo are Ace *site-build* tasks, not video prompts. It was
reconstructed from `hf_20260824_181259_7cd70e62….mp4` by pulling frames. **Save every prompt
that works to `FC videos/` from now on.**

---

## 14. ✅ ANDREAS KUNZ = ANDY KOONTZ — RESOLVED 27 AUG. NOT A CUSTOMER.

Asked 26 Aug: *"how many rentals from Andreas Kunz?"* Verified by direct Gmail query
`from:adobesign.com subject:"is Signed and Filed" to:<his address>` → **11 threads.**

2025: Jul 2 · May 14 · Apr 30 · Apr 18 · Feb 5 · Jan 11
2024: Dec 8 · Nov 9 · Aug 1 · Jun 7 · Apr 26

Eleven signings, then nothing since 2 Jul 2025 — roughly 14 months. On paper one of the
heaviest repeat customers in the book.

### ✅ ANSWERED 27 AUG — Ali: *"he is the same person, he is my partner at alpha."*
**"Andreas Kunz" (`andy.kunz.ventures@…`) is Andy Koontz, Ali's partner in Alpha Solar CA.**
The name spelling differs on the Adobe Sign contracts; it is one person.

**What this changes:**
- ❌ **No win-back campaign.** The 14-month gap is a partner's usage pattern, not churn. Ali
  talks to him already; an agent-drafted "we miss you" email would be embarrassing.
- ❌ **No review ask, ever.** A partner reviewing the business is not an arm's-length review.
  He was correctly excluded from both batches under the repeat rule — keep him excluded, now
  for a second and stronger reason.
- ⚠️ **Do not count his 11 signings as customer revenue** in any future analysis of repeat
  customers or lifetime value. They are partner usage. The same caution applies to anyone else
  on the Adobe Sign list who turns out to be a partner or vendor — §6 already excludes
  Kevin Hernandez, Patrick Thomas and Mark Andrew Nones on the same grounds.

⚠️ **Lesson: the Adobe Sign contract list is not a customer list.** It is a list of everyone who
ever signed a rental agreement — partners, co-op contacts and Ali himself included. Every
cohort built from it needs Ali's eyes before anything is sent. This is the fourth name the pull
surfaced that turned out not to be a customer.

---

## 15. 🎬 HIGGSFIELD VIA MCP — 27 AUG – 7 SEP. THE UPLOAD BLOCKER IS GONE.

§12 said the container cannot get images into Higgsfield, so image-to-video had to go through
Ali's browser. **That is no longer true for anything already on the website.**

### ✅ THE UNLOCK: `media_import_url`
Higgsfield fetches an HTTPS URL **server-side**. The entire fleet is already public at
`https://www.firstclassexotics.com/images/fleet/<slug>/<slug>-NN.jpg`, so **any of the 48 cars
can be used as a video reference with zero uploading and nothing for Ali to do.**
Verified 7 Sep on the satin-black 720S — imported, accepted, generated, no copyright rejection.

Flow: `media_import_url` → returns `media_id` → pass in `generate_video` with
`mode: "omni_reference"` and `medias: [{role: "image_references", value: <media_id>}]`.

### ✅ The whole Higgsfield MCP works from a cloud session
`balance`, `models_explore`, `generate_image`, `generate_video`, `jobs_wait`,
`show_generation_by_ids`, `media_import_url`, `get_workflow_instructions` all respond.
**The dead Chrome extension (§8) is not needed for any of it.**

### ⛔ What still does not work: getting the file back
`d8j0ntlcm91z4.cloudfront.net` is **blocked by egress from BOTH the cloud container and the
device VM** (`curl` → 403 from proxy). An agent can generate and display a video but **cannot
download it, rename it, put it in `FC videos`, or AirDrop it.**
**Ali downloads from Higgsfield History in Chrome, then AirDrops from Finder.** Do not promise
otherwise — this was tried both ways on 7 Sep and failed both ways.

### 💰 Real costs — preflight with `get_cost: true`, which submits nothing
| What | Credits |
|---|---|
| `nano_banana_pro` still image | **2** |
| `seedance_2_5` video, 10s, 720p | **65** |
| `seedance_2_5` video, 10s, 1080p | **90** |
| `seedance_2_5` video, 12s, 1080p | **108** |

⚠️ **`resolution` defaults to 720p — pass it explicitly or you silently ship 720p.**
⚠️ **A still is 2 credits: 32 stills for the price of one video.** Test any risky beat as a
still before committing to a generation. This is the single best way to protect his credits.
**Balance: ~88 credits as of 7 Sep** (445 at the start of the session).

### 🔴 Four hard-won lessons — do not repeat
1. **A numbered shot list makes people teleport.** Numbered beats read as separate scenes with
   no continuity, so a person appears from nowhere. **For anything with a human in it, write
   `ONE CONTINUOUS UNBROKEN SHOT` and describe a single camera move.** This was Ali's exact
   complaint and it is a prompt-structure bug, not a model limit.
2. **`no badges` in the negative line does NOT stop invented badge text.** The Maybach garage
   video came back with **"M430L"** stamped on the trunk. Text suppression does not work.
   **The only reliable fix is framing — never put the badge area in shot.** Add an explicit
   rule: *"the camera never travels behind the rear wheel."*
3. **Higgsfield tries to hijack prompts with presets.** A moody night prompt triggered a
   "use the IN THE DARK preset?" response and **submitted nothing.** Presets replace the whole
   shot structure. Decline with `declined_preset_id: <id>` and resubmit.
4. **Never spend credits on a compromise without saying so first.** 90 credits went on a 720S
   video generated with no reference images, because uploads were assumed impossible. It came
   back as a generic supercar and Ali rightly rejected it. The import path existed the whole
   time. **Say what the compromise is BEFORE spending, not after.**

### Generated this session — all in Higgsfield History, none downloaded
| Video | Verdict |
|---|---|
| Maybach S580, parking garage, 720p | ❌ invented "M430L" badge text |
| Maybach S580, hotel pickup at night, 720p | ✅ Ali: "the video is good" |
| 720S restaurant arrival, no refs, 1080p | ❌ Ali: "not one of my cars" |
| 720S restaurant arrival, imported refs, 1080p | not judged |
| **720S, one continuous take, woman drives in and gets out, 12s 1080p** | **unreviewed — §10 item 5** |

### The strategic point Ali should keep hearing
AI lifestyle video works only with **faceless people** — from behind, silhouette, cropped.
Faces and hands break, and for a business whose pitch is *family-run, Costa Mesa, 12+ years*,
obviously-AI people spend the trust that is his actual differentiator.
**The real lifestyle content is his 489 signed contracts** — weddings, proposals, birthdays.
That footage already exists on customers' phones, costs nothing, has real faces, and he is
already emailing that exact list for reviews. **If the review channel closes (§10 item 1), a
"send us your photos" ask to the same list is the natural replacement.**

### Prompt file
`FC videos/S580-HIGGSFIELD-PROMPT.md` — the Maybach garage prompt plus the de-badging checklist
and escalation ladder. ⚠️ **`FC videos` is NOT the repo — never put video in the repo folder.**

---

## 11. ⚠️ THE REPO ROOT IS PUBLICLY SERVED — NO CUSTOMER DATA IN MARKDOWN
Discovered 21 Aug. Netlify publishes the repo root and **nothing blocks `.md`**, so every
markdown file here is live on the open web:
`https://www.firstclassexotics.com/HANDOFF.md` returns this document in full. `robots.txt`
says `Allow: /` for everything except `/blog-publisher.html` and `/fce-os/`.

**How it happened:** the 21 Aug handoff listed all 21 review-ask customer email addresses as a
do-not-re-ask record. That published 21 customers' addresses. All third-party addresses across
`HANDOFF.md`, `HANDOFF-2026-08-17.md`, `-08-19.md` and `-08-21.md` were redacted the same day.

### Rules
- **Never write a customer email, phone number, or home address into any `.md` file in this
  repo.** Reference the Gmail query that produces the data instead.
- Names alone are acceptable. Contact details are not.
- The same applies to secrets — env var *names* are fine, values never.

### ✅ CLOSED 21 Aug — all 19 root docs now return 404
`netlify.toml` gained **19 explicit rules**, one per root `.md` file, each
`to = "/404.html"`, `status = 404`, **`force = true`**.
⚠️ **`force = true` is mandatory here.** Without it Netlify serves the real file *before*
consulting redirects, and the rule does nothing. If a doc ever becomes readable again, that
flag is the first thing to check.
⚠️ **One rule per file — no wildcard.** Netlify splats must sit at the **end** of a path, so
`from = "/*.md"` does **not** reliably match. **Any new `.md` added to the repo root is public
until a rule is added for it.** Either add the rule or keep new docs out of the repo.
`robots.txt` also gained `Disallow: /*.md$` — crawl hygiene, not a control.

⚠️ **TWO TRAPS WHEN VERIFYING THIS — both hit on 21 Aug:**
1. **Never test with a query string.** `…/HANDOFF.md?cb=1` **returns the document**; the query
   string stops the redirect matching, and it reads as "the rule failed." The bare
   `…/HANDOFF.md` correctly returns the 404 page. Test the bare URL.
2. **`WebFetch` can no longer reach these URLs at all** — it obeys the `robots.txt` line we
   just added and returns `ROBOTS_DISALLOWED`. A cloud session therefore **cannot verify this
   itself**. Ask Ali to open the URL in Chrome; do not try to route around robots.

✅ Confirmed live 21 Aug: `firstclassexotics.com/HANDOFF.md` returns the branded 404 page
(Ali screenshotted it).
✅ **Confirmed again 7 Sep** on `HANDOFF-2026-09-07.md` — bare URL, branded 404, screenshotted.
The full add-rule → push → deploy → verify loop is proven; deploy id changed
`6a8e1dca…` → `6a9efd55…` before the check. Homepage, booking form, fleet (48+), and the `/blog/mclaren-w1`
status-200 rewrite all still resolve normally.

Verified before push: 81 → 100 well-formed rules, zero duplicate paths, every pre-existing rule
still present in its original order, **119 insertions / 0 deletions**, and none of the
never-touch paths (`404.html`, `blog-publisher.html`, `agreement.html`, the two `google*.html`
verification files) or any `fce-os/` path caught by a new rule.

### ⚠️ STILL EXPOSED — not markdown
- **`fce-os/db/migrations/*.sql`** — three database schema files under the published root.
  `robots.txt` disallows `/fce-os/`, so Google will not index them, but robots is not access
  control and a direct fetch still works. **Deliberately not blocked:** §8 says never redirect
  or block `fce-os/`, and breaking that app was not worth the trade without Ali's say-so.
  **Ask him.** If the app does not read them at runtime — it almost certainly does not, they
  are migrations — three more `force`d 404 rules close it.
- `package.json`, `package-lock.json`, `vercel.json` (a leftover), `scripts/test-analytics.mjs`
  are also served. Harmless, but `vercel.json` is dead weight and could simply be deleted.
- ✅ Confirmed NOT exposed: `.claude/`, `.vscode/`, `.gitignore` — Netlify does not serve
  dot-directories. `https://www.firstclassexotics.com/.claude/settings.local.json` returns 404.

---

## 12. 🎬 CONTENT & VIDEO — new workstream, 22–24 Aug
Ali wants Instagram Reels of the fleet. Two routes were tested end to end. **Read this before
touching video work — it will save a day and a lot of his Higgsfield credits.**

### ✅ What works: cut his real footage with ffmpeg
`ffmpeg 6.1.1` is installed **on the device VM**, where the files already live — no staging
needed. Process the footage in place and only send the small finished file back.

**Delivered:** `FCE_Huracan_Reel_v2.mp4` — 15.00s, 1080×1920, 30fps, H.264 High + AAC, in
`Desktop → FC videos`. Push-ins on every static shot, accelerating cut rhythm, real engine
audio under a 6.6s drive-off. Ali's verdict on v1 was "ok"; v2 (motion + pacing + audio) landed.

**The working method — reuse it:**
1. `ffprobe` every clip for dimensions, duration, fps, rotation.
2. Pull ~6–10 stills per clip with **fast seek** (`-ss` BEFORE `-i`), tile them with
   `ffmpeg … tile=`, stage the sheets, and **actually look at the frames** before choosing cuts.
3. Cut each segment separately to a normalised mp4, then `concat`.
4. Verify duration, then send.

⚠️ **Device-VM gotchas, all hit on 22 Aug:**
- `device_bash` has a **45-second timeout**. Decoding 4K HEVC blows it instantly. One or two
  segments per call, never a loop over all of them.
- **Do not run many ffmpeg jobs in parallel** — 22 concurrent 4K decodes got OOM-killed.
  Small serial batches.
- Fast seek (`-ss` before `-i`) is the difference between 2 seconds and a timeout.
- iPhone clips report `3840x2160` but are **vertically shot** — ffmpeg auto-rotates on decode,
  so the real display frame is 2160×3840. **Already 9:16. Never crop them.**
- `SendUserFile` caps at **30 MB**. Encode a lighter preview copy for chat; the full-quality
  file is already on his Mac anyway.

### ⛔ What does NOT work: Higgsfield for editing
- **Shorts Studio** takes **one** video and **AI-restyles** it into generated clips. It does not
  cut footage together.
- **Personal Clipper** accepts **YouTube URLs only**.
- There is **no multi-clip timeline anywhere in the product.** It is a generation tool.
- The container **cannot upload to Higgsfield** — its S3 host is outside the egress allowlist
  (connection reset). Uploads must go through Ali's browser via `media_upload_widget`.

### 🔴 The copyright filter — this killed a generation
Higgsfield **rejects prompts that name a car marque or ask for its badge.** A Ferrari 296
prompt came back **"Rejected due to copyright restrictions"** (credits refunded). The upload
panel likewise says *"Protected content is not allowed."*

**Never write a brand name in a Higgsfield prompt.** Describe the car's *form* instead —
"compact mid-engine supercar, Kamm-tail rear, aero bridge, high central exhaust" — and add
`no badges, no emblems, no manufacturer logos, unbranded design` plus a hard negative line.

### Prompt patterns that actually hold up
- **Structure that works:** subject description → numbered shot sequence → lighting → style
  (camera/lens/grade/fps) → a long explicit `Negative:` line.
- **10–12s at 1080p, then Upscale.** 15s at 4K cost 330 credits and looked worse.
- ⚠️ **No wide aerials.** A coastal-drive generation produced a road that forked, dead-ended and
  U-turned into itself. These models hold no global scene map — long thin structures seen from
  altitude always break. Keep the camera **low, close, and moving with the car**, and let the
  road exit frame.
- ⚠️ **Cars float and slide.** Ali spotted this unprompted. Counter it explicitly: tires in firm
  contact, wheel rotation matching forward travel, car moves only where the wheels steer, body
  dips under braking. Put it near the **top** of the prompt — buried it gets ignored.
- **Satin/matte black needs rim light**, or it renders as a flat black shape. Say so.
- **Interiors break worst** — hands melt, controls deform. Keep interior beats as *details*
  (stitching, door sill, looking outward), never a driver POV with hands on the wheel.

### Image-to-video is the only way to get HIS car
Text-to-video always invents a lookalike. Attaching his own photos as references keeps the real
paint, wheels and interior. ⚠️ **Uploading to the Uploads tab does NOT attach them** — Ali lost
time here. Attach via the **media slot** in the left panel, or type **`@`** in the prompt box
(the field's own placeholder says "Use @ to reference assets").

### 💰 Credits
**Plus plan. 445 credits remaining, checked directly via the Higgsfield MCP on 27 Aug.**
(Started at 1200; the 24 Aug "over 90% used" note was wrong or has since been topped up.)
At ~126 per generation that is roughly **3 more runs**. Warn him before spending.
Failed and copyright-rejected generations are refunded.

⚠️ **The Higgsfield MCP works from a cloud session — `balance`, `get_workflow_instructions`,
`show_medias` and the `generate_*` tools all respond.** This is the way to check credits and
drive generation; the Chrome extension has been dead since 19 Aug and is not needed for it.
**Uploads still cannot go through the container** (§12 — S3 host outside the egress allowlist);
reference images must be uploaded from Ali's browser, but once uploaded they are addressable by
media ID via `show_medias`.

### 📋 The shot list — the real fix
The gap between his footage and a lifestyle shoot is **shooting**, not editing. A twelve-shot
iPhone field guide is published as an artifact he opens on his phone at the car:
**https://claude.ai/code/artifact/a3b97159-996e-445e-820e-317d514e735b**
~20 min per car. The two rules that matter: **move at half the speed that feels right**, and
**one camera move per shot**. Update it by republishing that same URL.

### Where the files are
`Desktop → FC videos` (granted via `device_request_folder_access`, **not** a default mount —
request it each session). Contains the 5 source iPhone clips (`IMG_2734/35/37/38/40.MOV`, 4K60
vertical), `FCE_Huracan_Reel_v1.mp4` and `_v2.mp4`, older fleet clips, and Higgsfield outputs
named `hf_2026*.mp4`. Scratch dirs `_sheets/` and `_cut/` are safe to delete.
⚠️ **Never put video in the `First Class Exotics` folder — that is the git repo.**
