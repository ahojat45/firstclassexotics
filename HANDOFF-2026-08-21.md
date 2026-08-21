# First Class Exotics — handoff (21 Aug 2026)
Paste this whole file into a new Claude session to restore context.
**`HANDOFF.md` is the authoritative copy.** The dated files are historical snapshots.
Verified against the repo, production, or Gmail on the date each item is stamped —
nothing here is carried forward on faith.
**HEAD is `05d931e`, pushed, deployed, working tree clean.**

---

## 0. FIRST THING, EVERY SESSION
**Connect the folder.** Each Cowork session starts in a fresh cloud container with no access
to Ali's Mac. Request access to `~/Desktop` and have him approve, or ask him to click
**Add folder**. Nothing works until this is done.
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

### ⚠️ OPEN: the 5 "Not found (404)" URLs
The repo audit finds **zero** broken internal links, so these are URLs Google learned about
externally — old Wix addresses, backlinks, directory listings — with no redirect rule.
`netlify.toml` has **no `/*` catch-all**, so anything unmapped hard-404s.
**Ali has been asked twice to click that row in GSC and paste the URLs; still not supplied.**
If any have real links, each is a one-line 301 in `netlify.toml` recovering lost authority.
Low priority — nothing is broken — but it is the one defect class invisible from the repo.

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

- ⚠️ **Address string mismatch.** 27 pages say **"2060 Placentia Ave, Ste A4"** (with comma);
  `index.html` says **"2060 Placentia Ave Ste A4"** (no comma). The 19 Aug work matched the
  majority rather than rewriting the homepage. **Ask Ali which form his Google Business Profile
  uses and align all 28** — exact NAP consistency matters for local ranking.
- **Three fleet numbers on the homepage**: `46+` (stat box, line 806), `45+` (fleet subtitle,
  line 885), 48 actual cards. Long-standing.
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

**90 reviews, 5.0, #2 in the local map pack.** Mango Exotics is #1 with 187.
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

### ✅ CORRECTION: the cloud container CAN reach firstclassexotics.com
Earlier handoffs said the proxy blocks it and to verify only through Chrome. **`WebFetch` worked
fine on 19 Aug** and confirmed the live dropdown, review count, canonical and sitemap.
Caveat: WebFetch converts to markdown, so **it cannot see `<script>` contents** — JSON-LD is
invisible to it — and its summarizer miscounts (it reported 50 sitemap entries for a 49-entry
file). Use it for rendered content; use exact repo counts for numbers.

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
- Blog URLs `/blog/<slug>`. Canonical copy: "12+ years", "since 2014", "45+ exotics available
  now" (fleet section), "46+" (Fleet Access Network stat box — see §5).
  `46+` also appears in `blog/porsche-911-carrera-4-gts-satin-grey.html` from a publisher
  template; if the number changes, update the template too.

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
1. **REVIEWS — score batch 1 first.** 21 asks sent 21 Aug (§6). Check the live Google count
   (**90** at send time) and scan the inbox for replies. Then build batch 2 from the next
   most-recent one-time renters, reusing the approved wording. **This is the actual business
   needle — everything else on this list is optimization.**
2. **Ask Ali which address form his Google Business Profile uses** (§5) and align all 28 pages.
3. **Get the 5 GSC 404 URLs from Ali** (§4) — the only defect class invisible from the repo.
4. **`og:image` under 1200px on 34 pages** — the legacy root `fleet_*.jpg` 800×600 files
   (every vinyl-wrap page, `index.html`, `gift.html`, `car-ferrari-f8.html`). Not broken; it
   only softens Facebook/iMessage link previews. Same fix as the 14 blog posts got on 20 Aug.
   Two publisher-template posts also have a sub-1200px hero of their own
   (`mclaren-788hs-end-of-an-era` 1172×810, `monterey-car-week-2026` 1086×1448 portrait) —
   those are genuine subject-matter photos, do **not** swap them for a generic fleet car
   without asking.
5. **#11 stock photos** — needs Ali's decision first. Do not start unilaterally. Note the new
   wrinkle from 20 Aug: the 14 blog posts now show a real FCE car as their *search* thumbnail
   while still displaying an Unsplash/Pexels stock car *on the page*. That mismatch is an
   argument for swapping the on-page heroes too.

**Do not invent site work.** There is no meaningful engineering left; the remaining upside is
reviews and the stock-photo decision.

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

### ⛔ STILL OPEN — the files are still publicly served
Redaction removed the payload; it did **not** stop the files being served. 18 markdown docs
remain reachable at the site root, including every past handoff, `REVIEW-SYSTEM.md`,
`VOICE-AGENT-SETUP.md` and `START-HERE-MACBOOK.md`.

**Deliberately not fixed on 21 Aug** — Ali flagged it as an important business day and asked
that nothing touch the live site. The fix edits `netlify.toml`, which is routing config, so it
was deferred rather than rushed. **Do this on a quiet day:**
1. Add 404 redirects for the markdown docs. ⚠️ Netlify splats must be at the **end** of a
   path — `from = "/*.md"` is **not** reliable. Use one explicit rule per file.
2. Put them **first** in `netlify.toml` (80+ rules, first-match-wins) and use `force = true`.
3. Add `Disallow: /*.md$` to `robots.txt` — crawl hygiene only, not a security control.
4. Verify each doc returns 404 in production, and confirm the fleet, booking form and blog
   rewrites still resolve — a `force = true` rule placed first can shadow a real route.
5. Check Search Console for any indexed `.md` URL and request removal.
