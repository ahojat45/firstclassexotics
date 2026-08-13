# Ace task — add the 2022 McLaren 720S MSO Spider (Satin Black) to the site

Repo: `/Users/firstclassexotics/Desktop/First Class Exotics` · branch `main`
Do **not** push. Commit only, then report (format at the bottom).

---

## 0. Read this first — the image convention changed on 13 Aug

Every fleet image now needs **two files**: the JPEG and a matching `.webp`.
Every `<img>` is wrapped in a `<picture>` element with the WebP first.
Older examples in the repo that lack this are simply not yet updated — follow the
spec in section 3, not the oldest cards you find.

---

## 1. The car

| Field | Value |
|---|---|
| Display name (exact string, used in 3 places) | `2022 McLaren 720S MSO Spider — Satin Black` |
| Slug / directory | `mclaren-720s-mso-spider-satin-black` |
| Brand line on card | `McLaren` |
| Name line on card | `720S MSO Spider` |
| Colour line on card | `Satin Black — Blue Interior` |

The em dash in the display name is a real `—` (U+2014), not `--` and not `&mdash;`.

**Specs — copy these exactly. Do not look up or calculate anything.**
These mirror the existing `McLaren 720S MSO Spider` card already on the site:

```
720 HP
2.7s 0–60
Twin-Turbo V8
```

There is already a different 720S MSO Spider on the site in Bespoke Blue
(`mclaren-720s-mso-spider-blue`). This is a **second, separate car**. Do not
overwrite, rename, or merge it.

---

## 2. Photos — download these 7, in this order

Ace cannot reach Google Drive's UI. Use these direct download URLs.
The order is deliberate: `-01` is the exterior front three-quarter (site rule),
interiors are last.

| Target filename | Direct download URL | What it is |
|---|---|---|
| `mclaren-720s-mso-spider-satin-black-01.jpg` | https://drive.google.com/uc?export=download&id=1-o9QUwQFgsDNmde93Ibgi3UmXstTGFhi | **HERO** — exterior front three-quarter, roof down, ocean behind |
| `mclaren-720s-mso-spider-satin-black-02.jpg` | https://drive.google.com/uc?export=download&id=1w67FjjSTyH45BHK7lLeOZF3WwvXqkBii | Exterior, both dihedral doors up, mansion |
| `mclaren-720s-mso-spider-satin-black-03.jpg` | https://drive.google.com/uc?export=download&id=1rig89qgfbhFfpCGwitP1faWVtuw6_sTZ | Exterior side profile, roof down |
| `mclaren-720s-mso-spider-satin-black-04.jpg` | https://drive.google.com/uc?export=download&id=1MYdubEbu8REC6eqRMYhx_k2rUum76A5r | Exterior rear three-quarter |
| `mclaren-720s-mso-spider-satin-black-05.jpg` | https://drive.google.com/uc?export=download&id=1cF0QnW35eI8MPzCEG36r2geHMg7nLsMu | Exterior detail — front wheel, blue caliper |
| `mclaren-720s-mso-spider-satin-black-06.jpg` | https://drive.google.com/uc?export=download&id=17rgw3jHVEYGP14yECRv5eWQGr1SSMil8 | Interior — cockpit and steering wheel |
| `mclaren-720s-mso-spider-satin-black-07.jpg` | https://drive.google.com/uc?export=download&id=1ImzJ-fmBid7pMPruSzHuoisXG0xY6jo8 | Interior — blue seats from above |

Sources are large PNGs (~2.2–2.5 MB each). Process each one to:

- **JPEG**, longest side **1600px**, **quality 82**, **progressive**, sRGB
- Then a **`.webp`** of the *same pixel dimensions*, **quality 82**

Both files go in `images/fleet/mclaren-720s-mso-spider-satin-black/`.
Directory name and file stem must match exactly. You should end with 14 files.

**Do not crop, do not letterbox, do not change aspect ratio.** The lightbox shows
these at full size; changing the shape is visible and will be rejected.

---

## 3. Fleet card — `index.html`

Insert a new `.fleet-card` block immediately **after** the existing
`McLaren 720S MSO Spider` (Bespoke Blue) card, so the McLarens stay grouped.

Copy this exactly, it is already in the current house style:

```html
<div class="fleet-card">
  <picture><source srcset="images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-01.webp" type="image/webp"><img width="800" height="533" loading="lazy" src="images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-01.jpg" alt="2022 McLaren 720S MSO Spider satin black rental Orange County exotic car rental First Class Exotics" data-gallery="images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-01.jpg,images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-02.jpg,images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-03.jpg,images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-04.jpg,images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-05.jpg,images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-06.jpg,images/fleet/mclaren-720s-mso-spider-satin-black/mclaren-720s-mso-spider-satin-black-07.jpg" onerror="this.style.background='#1C1C1C'"></picture>
  <div class="fleet-card-overlay"></div>
  <div class="fleet-card-body">
    <div class="fleet-brand">McLaren</div>
    <div class="fleet-name">720S MSO Spider</div>
    <div class="fleet-specs">
      <div class="fleet-spec"><strong>720 HP</strong></div>
      <div class="fleet-spec"><strong>2.7s</strong> 0&ndash;60</div>
      <div class="fleet-spec">Twin-Turbo V8</div>
    </div>
    <div class="fleet-color" style="font-size:.62rem;color:var(--gray-2);margin-bottom:.6rem;letter-spacing:.08em">Satin Black &mdash; Blue Interior</div>
    <div class="fleet-price">Contact for Rates</div>
    <a href="#booking" data-car="2022 McLaren 720S MSO Spider — Satin Black" class="fleet-cta">Reserve Now</a>
  </div>
</div>
```

`width="800" height="533"` stays as written even though the source is a different
ratio — that is the existing card sizing and CSS crops it. Do not change it.

---

## 4. Booking dropdown — `index.html` only

The car `<select>` exists in **`index.html` and nowhere else**. The `name="vehicle"`
you will find on the vinyl-wrap pages is a plain text input — leave those alone.

Add one option directly **after** `<option>McLaren 720S MSO Spider</option>`
(around line 1803):

```html
<option value="2022 McLaren 720S MSO Spider — Satin Black">2022 McLaren 720S MSO Spider — Satin Black</option>
```

**The `value` and the visible label must be byte-identical to each other and to the
card's `data-car`.** All three are the same string. If they differ by even one
character the booking form will not preselect the car and the lead arrives blank.

---

## 5. Hard rules

- Never touch Wix DNS, `netlify.toml` redirects, or the sitemap in this task.
- Never redirect or block `google49d716d460298fda.html`, `google8cf0ce3903a867e7.html`,
  `404.html`, `blog-publisher.html`, `fce-os/`, `agreement.html`.
- Do not invent specs. Use only the three values given in section 1.
- Do not resize anything below 1600px — the lightbox needs the resolution.
- Do not run `git status` in a sandboxed shell; if it leaves a stale
  `.git/index.lock`, say so in your report.
- More than one agent works in this repo. Confirm the working tree is yours
  before committing.

---

## 6. Self-check before you report

1. `ls images/fleet/mclaren-720s-mso-spider-satin-black/ | wc -l` → **14**
2. Every `.jpg` has a `.webp` sibling with identical pixel dimensions
3. `-01` is the front three-quarter, `-06` and `-07` are the interiors
4. The card's `data-car`, the `<option value>`, and the option's visible text are
   the identical string
5. `index.html` still has balanced tags, and `<picture>` count equals `</picture>` count
6. Fleet card count went from 47 to 48

---

## 7. Report back in exactly this form

```
COMMITTED — not pushed
commit: <sha>
files added: <n>
files modified: <n>
self-check 1-6: pass/fail for each
anything you could not do:
```
