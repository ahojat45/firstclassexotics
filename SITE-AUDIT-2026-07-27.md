# Full Site Audit — First Class Exotics

**Run:** July 27, 2026, evening
**Commit audited:** `760b654` (origin/main, working tree clean)
**Method:** direct file inspection of all 55 HTML pages and every asset in the repo

---

## Bottom line

**The site is in good shape. Nothing is broken and nothing is urgent.**

Everything found below is housekeeping. There is one item I'd actually do something about (the dashboard being crawlable), one worth doing for tidiness (27 MB of dead files), and one that only matters if you run the site locally. None of it affects a customer visiting the site today.

**You can stop working on the site.**

---

## Do these (short list)

### 1. The FCE OS dashboard is crawlable by Google — worth fixing

`fce-os/agreement.html` has a `noindex` tag. `fce-os/index.html` does **not**. `robots.txt` doesn't block `/fce-os/` either — it only blocks `/blog-publisher.html`.

The dashboard sits behind a password, so nobody gets in. But the URL can still be crawled and can surface in search results, which isn't a look you want for an internal tool.

Two-line fix — add to `robots.txt`:

```
Disallow: /fce-os/
```

and add to the `<head>` of `fce-os/index.html`:

```html
<meta name="robots" content="noindex, nofollow">
```

**Effort: 2 minutes. Priority: do it next session.**

### 2. 27 MB of dead files are committed to the repo

Three sets of files are tracked in git and referenced by nothing:

| What | Files | Size | Notes |
|---|---|---|---|
| `ferrari-458-italia/` (root dir) | 6 | 12.8 MB | Six ~2 MB images. **The only files in the whole repo over 800 KB.** |
| `f8_2.jpg` – `f8_6.jpg` (root) | 5 | ~750 KB | `f8_1.jpg` is used; 2 through 6 are not |
| 6 orphan fleet dirs | 32 | 13.6 MB | Raw pre-standardization originals, Google Drive ID filenames |

The 6 orphan fleet dirs:

```
images/fleet/mclaren-570s-miami-blue
images/fleet/mclaren-artura-coupe-silver
images/fleet/mclaren-artura-spider-black
images/fleet/mercedes-amg-g63-silver
images/fleet/mercedes-brabus-800-gwagon-black
images/fleet/mercedes-maybach-gls-600-white
```

Each is a duplicate of a descriptive-named directory that *is* live on the site.

**None of this affects the live site** — nothing links to any of it, so no visitor ever downloads a byte. It's repo bloat, not page weight.

**Before deleting: these may be the only copies of those original photos.** The `ferrari-458-italia` images in particular are full-resolution ~2 MB originals from May. Confirm you have them backed up elsewhere, then they're safe to remove.

**Effort: 5 minutes once you confirm backups. Priority: whenever.**

### 3. Local Netlify cache has stale paths (local dev only)

`.netlify/netlify.toml` and `.netlify/functions/manifest.json` hardcode the old folder path with the trailing space. This breaks `netlify dev` on your machine.

**It does not affect production** — Netlify builds on its own servers from the root `netlify.toml`, which uses relative paths.

Fix: delete the `.netlify/` folder, the CLI regenerates it. It's already gitignored, so this isn't a commit.

**Effort: 10 seconds. Priority: only if you run the site locally.**

---

## What I could not verify

**Live site response.** I tried twice to fetch `firstclassexotics.com` and both attempts timed out from my end — a limitation on my side, not evidence of a problem with your site. Every check in this report is from the source files, which is where problems would originate anyway. If you want live confirmation, load the homepage and one blog post in a browser.

---

## What's clean — verified, don't re-audit

### Fleet images: perfect

- 44 fleet directories referenced by `index.html`, **245 images**
- **0** broken references — every referenced directory exists
- **0** files violating the `<dir>/<dir>-NN.jpg` naming convention
- **0** PNGs anywhere under `images/`
- **0** images over 800 KB under `images/`

### Links and assets: no real breakage

A naive scan flags 61 "missing" targets. **All 61 are false positives.** I checked each category:

- `sms:9492945958` — valid link scheme, not a file
- `${slug}`, `${canonical}`, etc. in `blog-publisher.html` — JavaScript template placeholders, not paths
- `../index.html`, `../blog.html` in `blog-publisher.html` — relative paths inside generated-post templates, correct from `blog/`
- `/blog/<slug>` URLs — handled by 200-rewrite rules in `netlify.toml`, which serve the root `blog-<slug>.html` files

Anyone re-running a link checker will see these 61 again. They are not bugs.

### SEO metadata: clean

- **0** duplicate page titles across all 55 pages
- **0** duplicate meta descriptions
- Every public page has a title, meta description, canonical tag, and viewport tag
- **0** images missing `alt` attributes, sitewide

The only pages missing metadata are the two Google Search Console verification files, `404.html`, and the two `fce-os` pages — all correct as-is.

### Sitemap and robots: accurate

- 48 URLs in `sitemap.xml`
- **0** sitemap entries pointing at anything that doesn't resolve
- **0** public pages missing from the sitemap

One page is deliberately absent: `blog/lamborghini-temerario-the-huracan-era-is-ending` 301-redirects to `lamborghini-temerario-rental-california`, so excluding it is correct.

### Redirects: 44 rules, no loops

Checked the `/blog-<slug>` → `/blog/<slug>` 301s against the `/blog/<slug>` → `/blog-<slug>.html` 200-rewrites. No circular redirects — the rewrites terminate the chain by serving content directly.

### Booking form: intact

Netlify form wired correctly (`data-netlify="true"`), all nine fields present and in order: first-name, last-name, phone, email, vehicle, delivery, start-date, end-date, message.

### Repo hygiene: correct

`.gitignore` covers `.netlify` and `node_modules/`, and both are genuinely untracked — 0 files of either in git.

---

## The one thing that actually needs attention

It isn't the site.

Three scheduled tasks have been firing twice daily for eleven days and producing nothing. That's why 20 booking-form leads sat 6–9 days without a reply. The site has been fine for days; the lead pipeline is what's been leaking.

They're defined outside this repo, at `/Users/firstclassexotics/Claude/Scheduled/<name>/SKILL.md`. Debugging them needs a session with access to that folder.
