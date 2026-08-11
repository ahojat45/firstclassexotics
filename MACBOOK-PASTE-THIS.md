# Working from the MacBook — start here

Paste **this whole file** as your first message in a new Claude session on the MacBook.
That is all — everything needed is below: machine setup first, then full project context.

---

## Read this first, Claude

Ali is working from his MacBook instead of his iMac. He is not a developer. Give exact
copy-paste commands and say explicitly where to paste them (Terminal.app, never Ace,
never the VS Code terminal — both are sandboxed and cannot push).

**Do not assume the repo exists on this machine or that the paths in the handoff are
correct here.** Verify before doing anything. The username may differ, and the folder may
be somewhere other than the Desktop.

### Step 1 — find out what's actually on this machine

Ask Ali to run this in **Terminal.app** and paste back the output:

```
ls -d ~/Desktop/"First Class Exotics" 2>/dev/null && echo "FOUND on Desktop" || echo "NOT on Desktop"
echo "--- home folder is:"; echo ~
echo "--- searching:"; find ~ -maxdepth 4 -type d -name "First Class Exotics" 2>/dev/null
echo "--- git installed:"; git --version 2>/dev/null || echo "NO GIT"
```

### Step 2a — if the repo is NOT there, clone it

```
cd ~/Desktop && git clone https://github.com/ahojat45/firstclassexotics.git "First Class Exotics" && cd "First Class Exotics" && git log --oneline -3
```

He may be prompted to sign in to GitHub. **Do not ask him for a password or token, and do
not enter credentials for him** — have him do it himself in the browser window macOS opens.

### Step 2b — if the repo IS there, make sure it's current

```
cd ~/Desktop/"First Class Exotics" && git pull origin main && git log --oneline -3
```

The newest commit as of 10 Aug 2026 is `e8f5cdf`. If he's behind that, the pull fixes it.

### Step 3 — mount the folder so Claude can edit files directly

Use the `request_cowork_directory` tool with the path confirmed in Step 1. **This is the
whole reason the workflow is fast now** — without it, every change has to be described to
Ace instead of made directly.

### Step 4 — install the test dependency (once per machine)

```
cd ~/Desktop/"First Class Exotics" && npm install
```

Needed for `npm run test:analytics`, the GA4 regression test.

---

## Differences on this machine — call these out to Ali

| | Note |
|---|---|
| **Scheduled tasks** | They live on the **iMac** at `/Users/firstclassexotics/Claude/Scheduled/` and only run there, while that app is open. `fce-lead-calendar-sync`, the inbox monitors, and `ga4-mark-key-events` will **not** run from the MacBook. If the iMac is off, they run on its next launch. |
| **Pushing** | Same as always — Terminal.app only. Credentials are per-machine, so the first push from here may prompt him to sign in to GitHub. |
| **Uncommitted work** | Anything he or an agent changed on the iMac but never pushed is **not** on this machine. If something looks missing, check the iMac before concluding it was lost. |
| **`.git/index.lock`** | If he sees `fatal: Unable to create ... index.lock: File exists`, no git process is really running — a sandboxed agent left a stale lock. Fix: `rm -f .git/index.lock`. |

---

## Then

Full project context is in the section below — nothing further needs pasting. Once setup
is done, ask Ali what he wants to work on.

If he doesn't have a specific goal, the open items in priority order are: WebP conversion
(11.6 MB → ~8 MB), Search Console indexing, then meta title/description lengths. After
those three the site is genuinely best-in-class technically — **say so plainly.** He has
pushed back on the feeling that the fix list never ends. It does end.


---

# ===== PROJECT CONTEXT BELOW =====

`HANDOFF-2026-07-30.md`, `HANDOFF.md` (FCE OS dashboard, July 22 — different scope).

---

## 0. Current state

Working tree clean, remote up to date. **Last commit `d74369d`.**

Everything below was verified against production by loading real pages and firing real
events — not by trusting what an agent reported.

| Check | Result |
|---|---|
| Homepage image weight | **11.6 MB** (was 20 MB) |
| Images loading on homepage | 66 of 66, 0 broken |
| Lightbox / gallery | works, full resolution, all thumbnails |
| GA4 events firing on production | `contact_click` ✓ `generate_lead` ✓ |
| GA4 custom dimensions | 6 created |
| GA4 key events | **still 0 — see §3, finishes itself 11 Aug 10am** |
| Broken links sitewide | 0 |
| PNGs under `images/` | 0 |
| Files over 800 KB | 0 |
| Referenced fleet dirs missing | 0 |

---

## 1. What shipped today — 3 commits

| Commit | Change |
|---|---|
| `f77d97a` | **GA4 conversion tracking** — `js/fce-analytics.js` + script tag on 52 pages, regression test, jsdom devDependency |
| `79c8371` | **FC_LOGO.png** 5000×5000 / 466 KB → 256×256 / 9 KB |
| `d74369d` | **245 fleet photos** recompressed to JPEG q82 progressive |

### GA4 conversion tracking — the detail

`js/fce-analytics.js` is one shared file loaded on every public page via
`<script src="/js/fce-analytics.js" defer>` inserted before `</head>`. Pure event
delegation — no per-page or per-form wiring, so **new fleet cards and new blog posts are
tracked automatically the moment they ship.**

| Event | Fires on | Params |
|---|---|---|
| `generate_lead` | booking, vinyl-wrap, gift forms | `lead_type`, `vehicle`, `service`, `days_out`, `form_id` |
| `newsletter_signup` | blog newsletter | — |
| `contact_click` | 173 tel:, 27 sms:, 9 wa.me, 10 mailto: | `method`, `link_placement`, `link_text` |

Two design decisions worth preserving:

1. **Forms fire on success, not on submit.** Every form on the site posts by fetch then
   hides itself and reveals a success panel. A MutationObserver watches for that hide.
   So the number counts leads that actually reached Netlify, not submit attempts.
   The honeypot is checked first — bots count zero.
2. **No PII ever goes to GA4.** Sending a name, email or phone to Google violates their
   ToS. Only vehicle, service and a bucketed `days_out` (`0-3`/`4-7`/`8-30`/`31+`).
   **Do not add email or phone params.**

Regression test: `npm run test:analytics` (20/20 passing). Loads real page HTML into
jsdom, runs the real inline handlers, asserts each event. Covers the honeypot path, the
newsletter's synchronous hide (which races the observer), `/blog/` subdirectory loading,
and that `/blog-publisher` and `/fce-os` fire nothing. **Re-run after touching any form
handler.**

Also fixed: `blog/exotic-cars-coming-orange-county-2026-2027.html` had **no GA4 tag at
all** — the only page missing it. Snippet added.

### Fleet photo recompression — the detail

Root cause of the 20 MB homepage: **269 photos were saved at JPEG quality 95.** Dimensions
were never the problem — 1600px for an 800px slot is correct for retina, and there is a
lightbox on 49 images that needs the resolution. So this was recompression only, no
resizing, no HTML changes.

- 316 JPGs processed, 245 rewritten, 71 left alone (already efficient), 0 failures
- **0 dimension changes** — verified
- All images across `images/`: 102 MB → 67 MB
- Quality verified by PSNR **39.9–40.6 dB** on yellow paint, red+chrome, sunset gradients
  and white bodywork (above ~38 dB is below the threshold of human vision), plus 100%-crop
  visual comparison against the git originals
- Now progressive JPEGs — render top-to-bottom instead of popping in

**The 6 orphan directories were deliberately NOT touched** — they hold pre-standardization
originals that may be Ali's only masters. Still awaiting his decision to delete.

---

## 2. Repo folder is now MOUNTED — this changes the workflow

This was open for weeks and is now done. Claude has direct read/write access to
`~/Desktop/First Class Exotics`. **Most work no longer needs to go through Ace as a
prompt** — Claude edits files directly and Ali only pushes.

Ali still pushes from **Terminal.app** (never the VS Code terminal — sandboxed):

```
cd '/Users/firstclassexotics/Desktop/First Class Exotics' && git add -u && git commit -m "..." && git push origin main
```

**Known trap, hit twice today:** if a sandboxed agent runs `git status`, it can leave a
stale `.git/index.lock` it lacks permission to remove. Ali then sees
`fatal: Unable to create ... index.lock: File exists`. No git process is actually running.
Fix: `rm -f .git/index.lock`.

---

## 3. GA4 — what is done and the ONE thing outstanding

Property `542892966`, account `399008666`, measurement ID `G-E655N33GPP`.

**Done:** tracking code live and verified; 6 event-scoped custom dimensions created —
`vehicle`, `lead_type`, `days_out`, `method`, `link_placement`, `link_text`.

**Outstanding:** `generate_lead` and `contact_click` are **not yet marked as Key Events**,
so the Key Events count still reads 0. This GA4 property has **no "New key event" button**
— events can only be starred from Events → Recent events, and new event names take ~24h to
appear there.

A one-time scheduled task **`ga4-mark-key-events`** fires **11 Aug 2026, 10:00 AM** to do
it. Tools are pre-approved ("Always allowed"). The app must be open for it to run.
If it reports the events still aren't listed, just re-run it a day later.

**Note on `link_placement`:** 4 of the 7 homepage phone links report `sticky_bar`, because
the header nav is also `position:fixed` and the heuristic can't separate them. They are
fully distinguishable by `link_text` (`(949) 294-5958` header, `📞 Call Now` bottom bar,
`📞` floating button, `CALL NOW` hero). **Use both dimensions together.**

Three pre-existing key events — `close_convert_lead`, `purchase`, `qualify_lead` — have
never fired once. Probably leftovers. Left alone.

---

## 4. Still open

### Needs Ali, not an agent

- **FAQ insurance wording.** Live text: *"Your existing full coverage personal auto
  insurance typically extends to rental vehicles, including exotic rentals."* Contradicts
  Laura; liability exposure on $300k cars. Ali is verifying with his insurer. **Do NOT have
  an agent rewrite this into different confident language** — that swaps one unreviewed
  legal claim for another.
- **6 orphan fleet directories** (~13.6 MB, raw Google-Drive-ID filenames). Safe to delete,
  but they may be the only copies of those originals. Confirm before deleting.
- **`blog/exotic-cars-coming-orange-county-2026-2027.html`** has no phone link, no booking
  CTA, no nav, no footer. Anyone landing there cannot convert. Ali hasn't decided whether
  to add the standard CTA block.
- **Untracked files** in the repo: `.vscode/`, `HANDOFF-2026-07-30.md`,
  `STATUS-2026-07-30.md`, `VOICE-AGENT-PLAN.md`. Commit or gitignore — undecided.

### Site items, in priority order

| Item | Detail |
|---|---|
| **WebP conversion** | The remaining performance win: 11.6 MB → ~8 MB. Needs `<picture>` markup around 348 images across 52 files. A careful session, not a quick job. Do NOT cap dimensions below 1600px — the lightbox needs them. |
| **Search Console indexing** | ~64 pages not indexed across 6 reasons, none investigated. The "Alternate page with proper canonical tag" reason was fixed 10 Aug — **hit Validate Fix.** |
| **Meta lengths** | 35 of 50 titles over 60 chars, 23 of 50 descriptions over 160. Truncated in search results. Mechanical, low risk. |
| **Minor** | `/privacy` and `/terms` lack JSON-LD and `og:image`. `/blog-publisher.html` is publicly reachable behind a client-side password gate — confirm the Netlify function validates server-side. |

### Stale internal docs — read with suspicion

`CLAUDE.md`, `HANDOFF-2026-07-30.md`, `SITE-AUDIT-2026-07-27.md`, `STATUS-2026-07-30.md`
still say "44 fleet dirs / 245 images"; the real number is 46. **As of 10 Aug their image
weight figures are also stale** — CLAUDE.md's "page weight 40 MB → 18.7 MB" is superseded
by 11.6 MB. Doesn't affect visitors, but it is what a future agent reads as ground truth.

---

## 5. Environment facts

- Repo: `github.com/ahojat45/firstclassexotics`, branch `main`
- Local path: `/Users/firstclassexotics/Desktop/First Class Exotics` **(mounted)**
- Netlify site_id `fbd7706b-a7f3-471d-a38e-9583a11dbcca`, auto-deploys on push to `main`
- Redirects live in `netlify.toml`, first-match-wins, 78 rules. No `/*` catch-all — `/js/`
  is served normally.
- Connectors: Google Drive, Gmail, Calendar, Chrome MCP. QuickBooks/PayPal/HubSpot/Square/
  Stripe/Slack/Canva/DocuSign appear but are **not authorized**.

### Hard rules

- Netlify primary domain stays `www.firstclassexotics.com`; apex 301s to `www`.
- **Never touch Wix DNS.** Wix is live only for email MX records.
- **Never send email on Ali's behalf. Drafts only, always.**
- More than one agent works in this repo — confirm the working tree is yours before
  committing.

### Must never be redirected or blocked

`google49d716d460298fda.html`, `google8cf0ce3903a867e7.html` (Search Console verification —
redirect these and Ali loses GSC access), `404.html`, `blog-publisher.html`, `fce-os/`,
`agreement.html`.

### Site conventions (verified from live HTML)

- Fleet images: `images/fleet/<slug>/<slug>-NN.jpg` — relative, no leading slash, `NN` from `01`
- Dir name and filename stem must match exactly
- `<img>` carries `data-gallery`, `width="800"`, `height="533"`, `loading="lazy"`
- Dropdown `<option>`: `value` and label must be identical strings
- Variants use an em dash: `2022 Lamborghini Huracán EVO Spyder — Blue`
- Fleet card hero (`-01`) must be an exterior front three-quarter shot; interiors last
- **Canonical copy values: "46+" fleet, "12+ years", "since 2014".** No other numbers.
- Blog URLs are `/blog/<slug>`. Links FROM a blog post must use a **leading slash** —
  relative `blog/<slug>` resolves to `/blog/blog/<slug>` and 404s. `blog-publisher.js`
  normalizes hrefs so new posts don't reintroduce this.

### Scheduled tasks

| Task | Schedule |
|---|---|
| fce-lead-calendar-sync | every 2 hours |
| fce-sync-watchdog | 9am / 2pm / 7pm |
| fc-exotics-inbox-monitor | 8am / 6pm |
| bioaminex-inbox-monitor | 8am / 6pm |
| **ga4-mark-key-events** | **one-time, 11 Aug 10:00am** |
| fce-os-redesign-check | disabled |

Task definitions live in `/Users/firstclassexotics/Claude/Scheduled/<name>/SKILL.md` —
**not in this repo.** Don't grep for them here.

---

## 6. Suggested next session

1. **WebP conversion** — the last real performance item. 11.6 → ~8 MB.
2. Search Console: hit Validate Fix, then work the other 6 reasons.
3. Meta title/description lengths.

After those three the site is genuinely best-in-class technically, and what remains is
content — a marketing activity, not a repair. **Worth saying plainly to Ali, who has
pushed back on the feeling that the fix list never ends. It does end.**

---

## 7. How Ali works

- Concise and direct. Short answers, no padding.
- **Verify against production rather than trusting what an agent reports.** Never say
  something is fixed without checking. He will ask for proof and he is right to.
- Own mistakes plainly and move on.
- He is not a developer. Explain in business terms, give exact copy-paste commands, and say
  explicitly where to paste them (Terminal, not Ace).
- Distinguish **broken** from **optimization** every time. Handing him an undifferentiated
  list of "things to fix" reads as "my site is full of problems" when it isn't.
- Show, don't assert, on anything visual — he cares a great deal about how the cars look,
  and that judgement is his to make, not an agent's.
